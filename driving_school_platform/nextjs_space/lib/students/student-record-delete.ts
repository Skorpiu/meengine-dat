import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  evaluateStudentRecordDeleteEligibility,
  type StudentDeleteBlockCode,
} from "@/lib/students/student-record-delete-policy";

async function lockStudentRowForUpdate(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; studentId: string },
): Promise<boolean> {
  // Lock the tenant-scoped student row to prevent TOCTOU inserts of dependent
  // operational records (FK checks take KEY SHARE locks that conflict with FOR UPDATE).
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "students"
    WHERE "id" = ${input.studentId} AND "organizationId" = ${input.organizationId}
    FOR UPDATE
  `;
  return rows.length > 0;
}

const STUDENT_DELETE_ELIGIBILITY_SELECT = {
  id: true,
  organizationId: true,
  appAccessMode: true,
  userId: true,
  _count: {
    select: {
      lessons: true,
      userInvitations: true,
      lessonCounters: true,
      lessonRequests: true,
      examRegistrations: true,
    },
  },
} satisfies Prisma.StudentSelect;

type DeleteEligibilityRow = Prisma.StudentGetPayload<{
  select: typeof STUDENT_DELETE_ELIGIBILITY_SELECT;
}>;

export type DeleteStudentRecordResult =
  | { ok: true }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: StudentDeleteBlockCode;
      codes: StudentDeleteBlockCode[];
    };

async function loadDeleteEligibilityRow(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; studentId: string },
): Promise<DeleteEligibilityRow | null> {
  return tx.student.findFirst({
    where: {
      id: input.studentId,
      organizationId: input.organizationId,
    },
    select: STUDENT_DELETE_ELIGIBILITY_SELECT,
  });
}

async function evaluateRowForDelete(
  tx: Prisma.TransactionClient,
  row: DeleteEligibilityRow,
): Promise<DeleteStudentRecordResult> {
  const payments = await tx.payment.count({
    where: { studentId: row.id },
  });

  const eligibility = evaluateStudentRecordDeleteEligibility({
    appAccessMode: row.appAccessMode,
    userId: row.userId,
    counts: {
      lessons: row._count.lessons,
      userInvitations: row._count.userInvitations,
      lessonCounters: row._count.lessonCounters,
      lessonRequests: row._count.lessonRequests,
      examRegistrations: row._count.examRegistrations,
      payments,
    },
  });

  if (!eligibility.allowed) {
    return {
      ok: false,
      notFound: false,
      code: eligibility.code,
      codes: eligibility.codes,
    };
  }

  await tx.student.delete({ where: { id: row.id } });
  return { ok: true };
}

/**
 * Deletes a student record only when v1 delete policy allows it.
 * Loads counts and deletes inside a transaction.
 */
export async function deleteStudentRecordIfEligible(input: {
  organizationId: string;
  studentId: string;
}): Promise<DeleteStudentRecordResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await lockStudentRowForUpdate(tx, input);
    if (!locked) {
      return { ok: false, notFound: true };
    }
    const row = await loadDeleteEligibilityRow(tx, input);
    if (!row) {
      return { ok: false, notFound: true };
    }
    return evaluateRowForDelete(tx, row);
  });
}
