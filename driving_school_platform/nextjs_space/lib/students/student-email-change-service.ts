import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  mapStudentRecordDto,
  STUDENT_RECORD_SELECT,
  type StudentRecordDto,
} from "@/lib/students/student-record-dto";
import { normalizeStudentRecordEmail } from "@/lib/students/student-record-validation";

/** Stable API codes for change email and PATCH email guard. */
export const STUDENT_EMAIL_CHANGE_CODE = {
  STUDENT_NOT_FOUND: "student_not_found",
  INVALID_EMAIL: "invalid_email",
  EMAIL_UNCHANGED: "email_unchanged",
  USE_CHANGE_EMAIL_FLOW: "use_change_email_flow",
  USER_EMAIL_ALREADY_EXISTS: "user_email_already_exists",
  STUDENT_EMAIL_ALREADY_IN_USE: "student_email_already_in_use",
  PENDING_INVITATION_EXISTS: "pending_invitation_exists",
  LINKED_USER_NOT_FOUND: "linked_user_not_found",
  LINKED_USER_ROLE_MISMATCH: "linked_user_role_mismatch",
  LINKED_USER_TENANT_MISMATCH: "linked_user_tenant_mismatch",
  STUDENT_NO_LINKED_USER: "student_no_linked_user",
  STUDENT_CHANGE_EMAIL_FAILED: "student_change_email_failed",
} as const;

export type StudentEmailChangeCode =
  (typeof STUDENT_EMAIL_CHANGE_CODE)[keyof typeof STUDENT_EMAIL_CHANGE_CODE];

export type StudentEmailChangeAuditContext = {
  policyMode: "APP_USER" | "INVITED" | "MANUAL_ONLY";
  hasLinkedUser: boolean;
  invitationRevoked: boolean;
};

export type ChangeStudentEmailResult =
  | {
      ok: true;
      student: StudentRecordDto;
      audit: StudentEmailChangeAuditContext;
    }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: StudentEmailChangeCode;
      error: string;
      status: 400 | 409;
    };

export type ValidateStudentRecordEmailPatchResult =
  | { ok: true }
  | {
      ok: false;
      code: typeof STUDENT_EMAIL_CHANGE_CODE.USE_CHANGE_EMAIL_FLOW;
      error: string;
      status: 409;
      notFound?: boolean;
    };

const CHANGE_ROW_SELECT = {
  id: true,
  organizationId: true,
  appAccessMode: true,
  userId: true,
  email: true,
} satisfies Prisma.StudentSelect;

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });
}

async function assertNewEmailAvailable(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    studentId: string;
    normalizedEmail: string;
    excludeUserId?: string | null;
  },
): Promise<Exclude<ChangeStudentEmailResult, { ok: true }> | null> {
  const existingUser = await tx.user.findUnique({
    where: { email: input.normalizedEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== input.excludeUserId) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const otherStudent = await tx.student.findFirst({
    where: {
      organizationId: input.organizationId,
      id: { not: input.studentId },
      email: { equals: input.normalizedEmail, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (otherStudent) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
      error: "Another student in this school already uses this email.",
      status: 409,
    };
  }

  const pendingInvitation = await tx.userInvitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email: input.normalizedEmail,
      status: "PENDING",
    },
    select: { id: true, studentId: true },
  });

  if (pendingInvitation && pendingInvitation.studentId !== input.studentId) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.PENDING_INVITATION_EXISTS,
      error: "A pending invitation already exists for this email.",
      status: 409,
    };
  }

  return null;
}

/**
 * PATCH guard: email on generic student update only when MANUAL_ONLY without
 * linked user and without pending invitations.
 */
export async function validateStudentRecordEmailPatchAllowed(input: {
  organizationId: string;
  studentId: string;
}): Promise<ValidateStudentRecordEmailPatchResult> {
  const row = await prisma.student.findFirst({
    where: {
      id: input.studentId,
      organizationId: input.organizationId,
    },
    select: {
      ...CHANGE_ROW_SELECT,
      userInvitations: {
        where: { status: "PENDING" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!row) {
    return {
      ok: false,
      notFound: true,
      code: STUDENT_EMAIL_CHANGE_CODE.USE_CHANGE_EMAIL_FLOW,
      error: "Use Change email to update this student's email address.",
      status: 409,
    };
  }

  if (
    row.appAccessMode === "APP_USER" ||
    row.appAccessMode === "INVITED" ||
    row.userId !== null ||
    row.userInvitations.length > 0
  ) {
    return {
      ok: false,
      code: STUDENT_EMAIL_CHANGE_CODE.USE_CHANGE_EMAIL_FLOW,
      error: "Use Change email to update this student's email address.",
      status: 409,
    };
  }

  return { ok: true };
}

/**
 * Changes the canonical student email according to app access mode policy.
 */
export async function changeStudentEmail(input: {
  organizationId: string;
  studentId: string;
  newEmail: string;
}): Promise<ChangeStudentEmailResult> {
  const normalizedEmail = normalizeStudentRecordEmail(input.newEmail);

  if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.INVALID_EMAIL,
      error: "Invalid email address.",
      status: 400,
    };
  }

  try {
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
        select: CHANGE_ROW_SELECT,
      });

      if (!row) {
        return { kind: "not_found" as const };
      }

      const currentEmail = normalizeStudentRecordEmail(row.email);
      if (currentEmail === normalizedEmail) {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: STUDENT_EMAIL_CHANGE_CODE.EMAIL_UNCHANGED,
            error: "The new email is the same as the current email.",
            status: 400 as const,
          },
        };
      }

      if (row.appAccessMode === "APP_USER") {
        if (row.userId == null) {
          return {
            kind: "validation" as const,
            error: {
              ok: false as const,
              notFound: false as const,
              code: STUDENT_EMAIL_CHANGE_CODE.STUDENT_NO_LINKED_USER,
              error: "This student record has no linked app account.",
              status: 409 as const,
            },
          };
        }

        const collision = await assertNewEmailAvailable(tx, {
          organizationId: input.organizationId,
          studentId: input.studentId,
          normalizedEmail,
          excludeUserId: row.userId,
        });
        if (collision) {
          return { kind: "validation" as const, error: collision };
        }

        const linkedUser = await tx.user.findFirst({
          where: { id: row.userId },
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
              code: STUDENT_EMAIL_CHANGE_CODE.LINKED_USER_NOT_FOUND,
              error: "Linked app account not found.",
              status: 409 as const,
            },
          };
        }

        if (linkedUser.role !== "STUDENT") {
          return {
            kind: "validation" as const,
            error: {
              ok: false as const,
              notFound: false as const,
              code: STUDENT_EMAIL_CHANGE_CODE.LINKED_USER_ROLE_MISMATCH,
              error: "Linked app account is not a student account.",
              status: 409 as const,
            },
          };
        }

        if (linkedUser.organizationId !== input.organizationId) {
          return {
            kind: "validation" as const,
            error: {
              ok: false as const,
              notFound: false as const,
              code: STUDENT_EMAIL_CHANGE_CODE.LINKED_USER_TENANT_MISMATCH,
              error: "Linked app account does not belong to this school.",
              status: 409 as const,
            },
          };
        }

        await invalidateLinkedUserAccess(tx, linkedUser.id);

        const verifiedAt = new Date();
        await tx.user.update({
          where: { id: linkedUser.id },
          data: {
            email: normalizedEmail,
            isEmailVerified: true,
            emailVerified: verifiedAt,
            authSessionVersion: { increment: 1 },
          },
        });

        await tx.student.update({
          where: { id: row.id },
          data: { email: normalizedEmail },
        });

        return {
          kind: "ok" as const,
          audit: {
            policyMode: "APP_USER" as const,
            hasLinkedUser: true,
            invitationRevoked: false,
          },
        };
      }

      if (row.appAccessMode === "INVITED") {
        const collision = await assertNewEmailAvailable(tx, {
          organizationId: input.organizationId,
          studentId: input.studentId,
          normalizedEmail,
        });
        if (collision) {
          return { kind: "validation" as const, error: collision };
        }

        await revokePendingInvitationsForStudent(tx, {
          organizationId: input.organizationId,
          studentId: input.studentId,
        });

        await tx.student.update({
          where: { id: row.id },
          data: {
            email: normalizedEmail,
            appAccessMode: "MANUAL_ONLY",
          },
        });

        return {
          kind: "ok" as const,
          audit: {
            policyMode: "INVITED" as const,
            hasLinkedUser: false,
            invitationRevoked: true,
          },
        };
      }

      if (row.appAccessMode !== "MANUAL_ONLY") {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: STUDENT_EMAIL_CHANGE_CODE.STUDENT_CHANGE_EMAIL_FAILED,
            error:
              "This student record cannot change email in its current state.",
            status: 409 as const,
          },
        };
      }

      const collision = await assertNewEmailAvailable(tx, {
        organizationId: input.organizationId,
        studentId: input.studentId,
        normalizedEmail,
      });
      if (collision) {
        return { kind: "validation" as const, error: collision };
      }

      await tx.student.update({
        where: { id: row.id },
        data: { email: normalizedEmail },
      });

      return {
        kind: "ok" as const,
        audit: {
          policyMode: "MANUAL_ONLY" as const,
          hasLinkedUser: false,
          invitationRevoked: false,
        },
      };
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

    return {
      ok: true,
      student: mapStudentRecordDto(updated),
      audit: txResult.audit,
    };
  } catch {
    return {
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.STUDENT_CHANGE_EMAIL_FAILED,
      error: "Failed to change student email.",
      status: 409,
    };
  }
}
