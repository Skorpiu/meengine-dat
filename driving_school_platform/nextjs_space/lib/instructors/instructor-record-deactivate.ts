import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import {
  collectDeactivateWarningCodes,
  evaluateInstructorRecordDeactivateEligibility,
  type InstructorDeactivateBlockCode,
  type InstructorDeactivateWarningCode,
} from "@/lib/instructors/instructor-record-deactivate-policy";

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

const INSTRUCTOR_DEACTIVATE_SELECT = {
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

type DeactivateRow = Prisma.InstructorGetPayload<{
  select: typeof INSTRUCTOR_DEACTIVATE_SELECT;
}>;

export type DeactivateInstructorRecordResult =
  | {
      ok: true;
      alreadyInactive: boolean;
      warningCodes: InstructorDeactivateWarningCode[];
      futureLessonsCount: number;
    }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: InstructorDeactivateBlockCode;
    };

function isUserRelationConsistent(
  row: DeactivateRow,
  organizationId: string,
): boolean {
  const user = row.user;
  if (!user) return false;
  if (user.id !== row.userId) return false;
  if (user.organizationId !== organizationId) return false;
  if (user.role !== "INSTRUCTOR") return false;
  return true;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

async function countFutureScheduledLessons(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; instructorId: string },
): Promise<number> {
  return tx.lesson.count({
    where: {
      organizationId: input.organizationId,
      instructorId: input.instructorId,
      status: "SCHEDULED",
      lessonDate: { gte: startOfUtcDay(new Date()) },
    },
  });
}

async function revokePendingInstructorInvitations(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; email: string },
): Promise<void> {
  const normalizedEmail = normalizeInvitationEmail(input.email);
  const revokedAt = new Date();
  await tx.userInvitation.updateMany({
    where: {
      organizationId: input.organizationId,
      status: "PENDING",
      role: "INSTRUCTOR",
      email: normalizedEmail,
    },
    data: {
      status: "REVOKED",
      revokedAt,
    },
  });
}

async function applyDeactivate(
  tx: Prisma.TransactionClient,
  row: DeactivateRow,
  input: { organizationId: string },
): Promise<void> {
  await tx.instructor.update({
    where: { id: row.id },
    data: { isAvailableForBooking: false },
  });

  await tx.user.update({
    where: { id: row.userId },
    data: {
      isApproved: false,
      authSessionVersion: { increment: 1 },
    },
  });

  await tx.session.deleteMany({ where: { userId: row.userId } });

  if (row.user?.email) {
    await revokePendingInstructorInvitations(tx, {
      organizationId: input.organizationId,
      email: row.user.email,
    });
  }
}

/**
 * Deactivates an instructor: stops booking and app login while preserving history.
 */
export async function deactivateInstructorRecord(input: {
  organizationId: string;
  instructorId: string;
  currentUserId: string;
}): Promise<DeactivateInstructorRecordResult> {
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
      select: INSTRUCTOR_DEACTIVATE_SELECT,
    });

    if (!row) {
      return { ok: false, notFound: true };
    }

    const userRelationConsistent = isUserRelationConsistent(
      row,
      input.organizationId,
    );

    const eligibility = evaluateInstructorRecordDeactivateEligibility({
      linkedUserId: row.userId,
      currentUserId: input.currentUserId,
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

    const futureLessonsCount = await countFutureScheduledLessons(tx, {
      organizationId: input.organizationId,
      instructorId: row.id,
    });

    const warningCodes = collectDeactivateWarningCodes({ futureLessonsCount });

    if (!eligibility.alreadyInactive) {
      await applyDeactivate(tx, row, {
        organizationId: input.organizationId,
      });
    }

    return {
      ok: true,
      alreadyInactive: eligibility.alreadyInactive,
      warningCodes,
      futureLessonsCount,
    };
  });
}
