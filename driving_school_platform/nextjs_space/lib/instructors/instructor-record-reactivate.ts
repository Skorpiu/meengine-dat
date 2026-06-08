import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  evaluateInstructorRecordReactivateEligibility,
  type InstructorReactivateBlockCode,
} from "@/lib/instructors/instructor-record-reactivate-policy";

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

const INSTRUCTOR_REACTIVATE_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  isAvailableForBooking: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
    },
  },
} satisfies Prisma.InstructorSelect;

type ReactivateRow = Prisma.InstructorGetPayload<{
  select: typeof INSTRUCTOR_REACTIVATE_SELECT;
}>;

export type ReactivateInstructorRecordResult =
  | { ok: true; alreadyActive: boolean }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: InstructorReactivateBlockCode;
    };

function isUserRelationConsistent(
  row: ReactivateRow,
  organizationId: string,
): boolean {
  const user = row.user;
  if (!user) return false;
  if (user.id !== row.userId) return false;
  if (user.organizationId !== organizationId) return false;
  if (user.role !== "INSTRUCTOR") return false;
  return true;
}

async function applyReactivate(
  tx: Prisma.TransactionClient,
  row: ReactivateRow,
): Promise<void> {
  await tx.instructor.update({
    where: { id: row.id },
    data: { isAvailableForBooking: true },
  });

  await tx.user.update({
    where: { id: row.userId },
    data: { isApproved: true },
  });
}

/**
 * Reactivates a deactivated instructor: restores booking and app login.
 */
export async function reactivateInstructorRecord(input: {
  organizationId: string;
  instructorId: string;
}): Promise<ReactivateInstructorRecordResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await lockInstructorRowForUpdate(tx, input);
    if (!locked) {
      return { ok: false, notFound: true };
    }

    const row = await tx.instructor.findFirst({
      where: {
        id: input.instructorId,
        organizationId: input.organizationId,
      },
      select: INSTRUCTOR_REACTIVATE_SELECT,
    });

    if (!row) {
      return { ok: false, notFound: true };
    }

    const userRelationConsistent = isUserRelationConsistent(
      row,
      input.organizationId,
    );

    const eligibility = evaluateInstructorRecordReactivateEligibility({
      userRelationConsistent,
      isAvailableForBooking: row.isAvailableForBooking,
    });

    if (!eligibility.allowed) {
      return {
        ok: false,
        notFound: false,
        code: eligibility.code,
      };
    }

    if (!eligibility.alreadyActive) {
      await applyReactivate(tx, row);
    }

    return {
      ok: true,
      alreadyActive: eligibility.alreadyActive,
    };
  });
}
