import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  mapStudentRecordDto,
  STUDENT_RECORD_SELECT,
  type StudentRecordDto,
} from "@/lib/students/student-record-dto";

/** Stable API codes for remove app access (409 unless noted). */
export const STUDENT_APP_ACCESS_REMOVE_CODE = {
  STUDENT_NOT_FOUND: "student_not_found",
  STUDENT_NOT_APP_USER: "student_not_app_user",
  STUDENT_NO_LINKED_USER: "student_no_linked_user",
  LINKED_USER_NOT_FOUND: "linked_user_not_found",
  LINKED_USER_ROLE_MISMATCH: "linked_user_role_mismatch",
  LINKED_USER_TENANT_MISMATCH: "linked_user_tenant_mismatch",
  STUDENT_APP_ACCESS_ALREADY_REMOVED: "student_app_access_already_removed",
} as const;

export type StudentAppAccessRemoveCode =
  (typeof STUDENT_APP_ACCESS_REMOVE_CODE)[keyof typeof STUDENT_APP_ACCESS_REMOVE_CODE];

export type RemoveStudentAppAccessResult =
  | { ok: true; student: StudentRecordDto }
  | {
      ok: false;
      notFound: true;
    }
  | {
      ok: false;
      notFound: false;
      code: StudentAppAccessRemoveCode;
      error: string;
    };

const REMOVE_ROW_SELECT = {
  id: true,
  organizationId: true,
  appAccessMode: true,
  userId: true,
  email: true,
} satisfies Prisma.StudentSelect;

type RemoveRow = Prisma.StudentGetPayload<{ select: typeof REMOVE_ROW_SELECT }>;

async function lockStudentRowForUpdate(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; studentId: string },
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "students"
    WHERE "id" = ${input.studentId} AND "organizationId" = ${input.organizationId}
    FOR UPDATE
  `;
  return rows.length > 0;
}

/**
 * Preserves Student.email when set; copies User email when Student email is empty.
 * Does not overwrite a non-empty Student email (operational email may differ).
 */
export function resolveStudentEmailAfterAppAccessRemove(input: {
  studentEmail: string | null;
  userEmail: string;
}): string | null | undefined {
  const trimmedStudent = input.studentEmail?.trim();
  if (trimmedStudent) {
    return undefined;
  }
  const trimmedUser = input.userEmail.trim();
  return trimmedUser || null;
}

function mapRemoveValidationError(
  row: RemoveRow,
): Exclude<RemoveStudentAppAccessResult, { ok: true }> | null {
  if (row.appAccessMode === "MANUAL_ONLY" && row.userId === null) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_APP_ACCESS_ALREADY_REMOVED,
      error: "App access has already been removed for this student.",
    };
  }

  if (row.appAccessMode !== "APP_USER") {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_NOT_APP_USER,
      error: "Only students with active app access can be removed.",
    };
  }

  if (row.userId == null) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_NO_LINKED_USER,
      error: "This student record has no linked app account.",
    };
  }

  return null;
}

async function revokePendingInvitationsForStudent(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; studentId: string },
): Promise<void> {
  const revokedAt = new Date();
  await tx.userInvitation.updateMany({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
      revokedAt,
    },
  });
}

async function invalidateLinkedUserAccess(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.session.deleteMany({ where: { userId } });

  const now = new Date();
  await tx.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });
  await tx.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      isApproved: false,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });
}

/**
 * Removes app access for an APP_USER student while preserving profile and history.
 * Does not hard-delete User or Student; does not delete lessons/payments.
 */
export async function removeStudentAppAccess(input: {
  organizationId: string;
  studentId: string;
}): Promise<RemoveStudentAppAccessResult> {
  const txResult = await prisma.$transaction(async (tx) => {
    const locked = await lockStudentRowForUpdate(tx, input);
    if (!locked) {
      return { kind: "not_found" as const };
    }

    const row = await tx.student.findFirst({
      where: {
        id: input.studentId,
        organizationId: input.organizationId,
      },
      select: REMOVE_ROW_SELECT,
    });

    if (!row) {
      return { kind: "not_found" as const };
    }

    const validationError = mapRemoveValidationError(row);
    if (validationError) {
      return { kind: "validation" as const, error: validationError };
    }

    const userId = row.userId!;
    const linkedUser = await tx.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!linkedUser) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_NOT_FOUND,
          error: "Linked app account not found.",
        },
      };
    }

    if (linkedUser.role !== "STUDENT") {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_ROLE_MISMATCH,
          error: "Linked app account is not a student account.",
        },
      };
    }

    if (linkedUser.organizationId !== input.organizationId) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_TENANT_MISMATCH,
          error: "Linked app account does not belong to this school.",
        },
      };
    }

    await revokePendingInvitationsForStudent(tx, {
      organizationId: input.organizationId,
      studentId: input.studentId,
    });

    await invalidateLinkedUserAccess(tx, userId);

    const emailUpdate = resolveStudentEmailAfterAppAccessRemove({
      studentEmail: row.email,
      userEmail: linkedUser.email,
    });

    await tx.student.update({
      where: { id: row.id },
      data: {
        userId: null,
        appAccessMode: "MANUAL_ONLY",
        ...(emailUpdate !== undefined ? { email: emailUpdate } : {}),
      },
    });

    return { kind: "ok" as const };
  });

  if (txResult.kind === "not_found") {
    return { ok: false, notFound: true };
  }

  if (txResult.kind === "validation") {
    return txResult.error;
  }

  const updated = await prisma.student.findFirst({
    where: {
      id: input.studentId,
      organizationId: input.organizationId,
    },
    select: STUDENT_RECORD_SELECT,
  });

  if (!updated) {
    return { ok: false, notFound: true };
  }

  return { ok: true, student: mapStudentRecordDto(updated) };
}
