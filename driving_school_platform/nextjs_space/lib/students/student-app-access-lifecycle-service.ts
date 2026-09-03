import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  mapStudentRecordDto,
  STUDENT_RECORD_SELECT,
  type StudentRecordDto,
} from "@/lib/students/student-record-dto";
import { normalizeStudentRecordEmail } from "@/lib/students/student-record-validation";

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
      authSessionVersion: { increment: 1 },
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

/** Stable API codes for reactivate app access (409 unless noted). */
export const STUDENT_APP_ACCESS_REACTIVATE_CODE = {
  STUDENT_NOT_FOUND: "student_not_found",
  MISSING_EMAIL: "missing_email",
  INVALID_EMAIL: "invalid_email",
  STUDENT_ALREADY_HAS_APP_ACCESS: "student_already_has_app_access",
  STUDENT_NOT_MANUAL_ONLY: "student_not_manual_only",
  STUDENT_HAS_PENDING_INVITATION: "student_has_pending_invitation",
  REACTIVATE_ORPHAN_USER_NOT_FOUND: "reactivate_orphan_user_not_found",
  USER_LINKED_TO_OTHER_STUDENT: "user_linked_to_other_student",
  ORPHAN_USER_ROLE_MISMATCH: "orphan_user_role_mismatch",
  ORPHAN_USER_TENANT_MISMATCH: "orphan_user_tenant_mismatch",
  STUDENT_EMAIL_USER_MISMATCH: "student_email_user_mismatch",
} as const;

export type StudentAppAccessReactivateCode =
  (typeof STUDENT_APP_ACCESS_REACTIVATE_CODE)[keyof typeof STUDENT_APP_ACCESS_REACTIVATE_CODE];

export type ReactivateStudentAppAccessResult =
  | { ok: true; student: StudentRecordDto }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: StudentAppAccessReactivateCode;
      error: string;
      status: 400 | 409;
    };

const REACTIVATE_ROW_SELECT = {
  id: true,
  organizationId: true,
  appAccessMode: true,
  userId: true,
  email: true,
} satisfies Prisma.StudentSelect;

type ReactivateRow = Prisma.StudentGetPayload<{
  select: typeof REACTIVATE_ROW_SELECT;
}>;

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapReactivateValidationError(
  row: ReactivateRow,
  canonicalEmail: string | null,
): Exclude<ReactivateStudentAppAccessResult, { ok: true }> | null {
  if (row.appAccessMode === "APP_USER" || row.userId != null) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.STUDENT_ALREADY_HAS_APP_ACCESS,
      error: "This student already has active app access.",
      status: 409,
    };
  }

  if (row.appAccessMode === "INVITED") {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.STUDENT_HAS_PENDING_INVITATION,
      error:
        "This student has a pending invitation. Revoke it before reactivating app access.",
      status: 409,
    };
  }

  if (row.appAccessMode !== "MANUAL_ONLY") {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.STUDENT_NOT_MANUAL_ONLY,
      error:
        "Only manual student records without app access can be reactivated.",
      status: 409,
    };
  }

  if (!canonicalEmail) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.MISSING_EMAIL,
      error: "An email address is required to reactivate app access.",
      status: 400,
    };
  }

  if (!isValidEmailFormat(canonicalEmail)) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.INVALID_EMAIL,
      error: "Invalid email address.",
      status: 400,
    };
  }

  return null;
}

/**
 * Re-links an existing orphan User to a MANUAL_ONLY Student (Path A).
 * Path B: no orphan User → stable 409 directing admin to Send invitation.
 */
export async function reactivateStudentAppAccess(input: {
  organizationId: string;
  studentId: string;
}): Promise<ReactivateStudentAppAccessResult> {
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
      select: REACTIVATE_ROW_SELECT,
    });

    if (!row) {
      return { kind: "not_found" as const };
    }

    const canonicalEmail = normalizeStudentRecordEmail(row.email);
    const validationError = mapReactivateValidationError(row, canonicalEmail);
    if (validationError) {
      return { kind: "validation" as const, error: validationError };
    }

    const pendingInvitationCount = await tx.userInvitation.count({
      where: {
        organizationId: input.organizationId,
        studentId: row.id,
        status: "PENDING",
      },
    });

    if (pendingInvitationCount > 0) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.STUDENT_HAS_PENDING_INVITATION,
          error:
            "This student has a pending invitation. Revoke it before reactivating app access.",
          status: 409 as const,
        },
      };
    }

    const orphanUser = await tx.user.findFirst({
      where: {
        email: canonicalEmail!,
        role: "STUDENT",
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!orphanUser) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.REACTIVATE_ORPHAN_USER_NOT_FOUND,
          error:
            "No existing app account was found for this email. Use Send invitation on the profile row instead.",
          status: 409 as const,
        },
      };
    }

    if (orphanUser.role !== "STUDENT") {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.ORPHAN_USER_ROLE_MISMATCH,
          error: "Existing app account is not a student account.",
          status: 409 as const,
        },
      };
    }

    if (orphanUser.organizationId !== input.organizationId) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.ORPHAN_USER_TENANT_MISMATCH,
          error: "Existing app account does not belong to this school.",
          status: 409 as const,
        },
      };
    }

    const orphanEmail = normalizeStudentRecordEmail(orphanUser.email);
    if (orphanEmail !== canonicalEmail) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.STUDENT_EMAIL_USER_MISMATCH,
          error:
            "Student email does not match the existing app account. Change email is not available yet — contact support or use a matching profile.",
          status: 409 as const,
        },
      };
    }

    const linkedElsewhere = await tx.student.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: orphanUser.id,
        id: { not: row.id },
      },
      select: { id: true },
    });

    if (linkedElsewhere) {
      return {
        kind: "validation" as const,
        error: {
          ok: false as const,
          notFound: false as const,
          code: STUDENT_APP_ACCESS_REACTIVATE_CODE.USER_LINKED_TO_OTHER_STUDENT,
          error:
            "An app account with this email is already linked to another student record.",
          status: 409 as const,
        },
      };
    }

    await tx.user.update({
      where: { id: orphanUser.id },
      data: { isApproved: true },
    });

    await tx.student.update({
      where: { id: row.id },
      data: {
        userId: orphanUser.id,
        appAccessMode: "APP_USER",
        email: canonicalEmail,
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
