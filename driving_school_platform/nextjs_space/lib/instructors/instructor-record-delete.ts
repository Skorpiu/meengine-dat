import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import {
  evaluateInstructorRecordDeleteEligibility,
  type InstructorDeleteBlockCode,
} from "@/lib/instructors/instructor-record-delete-policy";

async function lockInstructorRowForUpdate(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; instructorId: string },
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "instructors"
    WHERE "id" = ${input.instructorId} AND "organizationId" = ${input.organizationId}
    FOR UPDATE
  `;
  return rows.length > 0;
}

const INSTRUCTOR_DELETE_ELIGIBILITY_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
    },
  },
  _count: {
    select: {
      lessons: true,
      exams: true,
      lessonRequests: true,
      preferredStudents: true,
    },
  },
} satisfies Prisma.InstructorSelect;

type DeleteEligibilityRow = Prisma.InstructorGetPayload<{
  select: typeof INSTRUCTOR_DELETE_ELIGIBILITY_SELECT;
}>;

export type DeleteInstructorRecordResult =
  | { ok: true }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: InstructorDeleteBlockCode;
      codes: InstructorDeleteBlockCode[];
    };

async function loadDeleteEligibilityRow(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; instructorId: string },
): Promise<DeleteEligibilityRow | null> {
  return tx.instructor.findFirst({
    where: {
      id: input.instructorId,
      organizationId: input.organizationId,
    },
    select: INSTRUCTOR_DELETE_ELIGIBILITY_SELECT,
  });
}

function isUserRelationConsistent(
  row: DeleteEligibilityRow,
  organizationId: string,
): boolean {
  const user = row.user;
  if (!user) {
    return false;
  }
  if (user.id !== row.userId) {
    return false;
  }
  if (user.organizationId !== organizationId) {
    return false;
  }
  if (user.role !== "INSTRUCTOR") {
    return false;
  }
  return true;
}

async function evaluateRowForDelete(
  tx: Prisma.TransactionClient,
  row: DeleteEligibilityRow,
  input: { organizationId: string; currentUserId: string },
): Promise<DeleteInstructorRecordResult> {
  const userRelationConsistent = isUserRelationConsistent(
    row,
    input.organizationId,
  );

  const payments = userRelationConsistent
    ? await tx.payment.count({
        where: { userId: row.userId },
      })
    : 0;

  const pendingInvitations = userRelationConsistent
    ? await tx.userInvitation.count({
        where: {
          organizationId: input.organizationId,
          status: "PENDING",
          role: "INSTRUCTOR",
          email: normalizeInvitationEmail(row.user!.email),
        },
      })
    : 0;

  const eligibility = evaluateInstructorRecordDeleteEligibility({
    linkedUserId: row.userId,
    currentUserId: input.currentUserId,
    userRelationConsistent,
    counts: {
      lessons: row._count.lessons,
      payments,
      exams: row._count.exams,
      lessonRequests: row._count.lessonRequests,
      preferredStudents: row._count.preferredStudents,
      pendingInvitations,
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

  const deleted = await tx.user.deleteMany({
    where: {
      id: row.userId,
      organizationId: input.organizationId,
      role: "INSTRUCTOR",
    },
  });

  if (deleted.count === 0) {
    return {
      ok: false,
      notFound: false,
      code: "instructor_delete_not_allowed",
      codes: ["instructor_delete_not_allowed"],
    };
  }

  return { ok: true };
}

/**
 * Hard-deletes an instructor (via linked User cascade) only when zero-dependency policy allows.
 */
export async function deleteInstructorRecordIfEligible(input: {
  organizationId: string;
  instructorId: string;
  currentUserId: string;
}): Promise<DeleteInstructorRecordResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await lockInstructorRowForUpdate(tx, input);
    if (!locked) {
      return { ok: false, notFound: true };
    }

    const row = await loadDeleteEligibilityRow(tx, input);
    if (!row) {
      return { ok: false, notFound: true };
    }

    return evaluateRowForDelete(tx, row, input);
  });
}
