import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";

/** Stable API codes for instructor change email. */
export const INSTRUCTOR_EMAIL_CHANGE_CODE = {
  INSTRUCTOR_NOT_FOUND: "instructor_not_found",
  INVALID_EMAIL: "invalid_email",
  EMAIL_UNCHANGED: "email_unchanged",
  USER_EMAIL_ALREADY_EXISTS: "user_email_already_exists",
  PENDING_INVITATION_EXISTS: "pending_invitation_exists",
  LINKED_USER_NOT_FOUND: "linked_user_not_found",
  LINKED_USER_ROLE_MISMATCH: "linked_user_role_mismatch",
  LINKED_USER_TENANT_MISMATCH: "linked_user_tenant_mismatch",
  INSTRUCTOR_CHANGE_EMAIL_FAILED: "instructor_change_email_failed",
} as const;

export type InstructorEmailChangeCode =
  (typeof INSTRUCTOR_EMAIL_CHANGE_CODE)[keyof typeof INSTRUCTOR_EMAIL_CHANGE_CODE];

export type InstructorEmailChangeAuditContext = {
  hasLinkedUser: boolean;
  emailChanged: boolean;
  pendingInvitationBlocked: boolean;
  userEmailUpdated: boolean;
  instructorEmailUpdated: boolean;
  invitationRevoked: boolean;
  linkedUserId: string;
};

export type ChangeInstructorEmailResult =
  | {
      ok: true;
      user: InstructorRecordUserDto;
      audit: InstructorEmailChangeAuditContext;
    }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: InstructorEmailChangeCode;
      error: string;
      status: 400 | 409;
    };

const CHANGE_ROW_SELECT = {
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
      isApproved: true,
    },
  },
} satisfies Prisma.InstructorSelect;

const UPDATED_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  address: true,
  role: true,
  isApproved: true,
  instructor: {
    select: {
      id: true,
      instructorIdNumber: true,
      instructorLicenseNumber: true,
      instructorLicenseExpiry: true,
      isAvailableForBooking: true,
    },
  },
} satisfies Prisma.UserSelect;

type ChangeRow = Prisma.InstructorGetPayload<{
  select: typeof CHANGE_ROW_SELECT;
}>;

type UpdatedUserRow = Prisma.UserGetPayload<{
  select: typeof UPDATED_USER_SELECT;
}>;

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeInstructorEmail(email: string): string {
  return normalizeInvitationEmail(email);
}

function mapUpdatedUserDto(user: UpdatedUserRow): InstructorRecordUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    address: user.address,
    role: user.role,
    isApproved: user.isApproved,
    instructor: user.instructor
      ? {
          id: user.instructor.id,
          instructorIdNumber: user.instructor.instructorIdNumber,
          instructorLicenseNumber: user.instructor.instructorLicenseNumber,
          instructorLicenseExpiry: user.instructor.instructorLicenseExpiry,
          isAvailableForBooking: user.instructor.isAvailableForBooking,
        }
      : null,
  };
}

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

async function revokePendingInstructorInvitationsForEmail(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; email: string },
): Promise<number> {
  const normalizedEmail = normalizeInstructorEmail(input.email);
  const revokedAt = new Date();
  const result = await tx.userInvitation.updateMany({
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
  return result.count;
}

async function assertNewEmailAvailable(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    normalizedEmail: string;
    excludeUserId: string;
  },
): Promise<Exclude<ChangeInstructorEmailResult, { ok: true }> | null> {
  const existingUser = await tx.user.findUnique({
    where: { email: input.normalizedEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== input.excludeUserId) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const pendingInvitation = await tx.userInvitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email: input.normalizedEmail,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (pendingInvitation) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.PENDING_INVITATION_EXISTS,
      error: "A pending invitation already exists for this email.",
      status: 409,
    };
  }

  return null;
}

function validateLinkedUser(
  row: ChangeRow,
  organizationId: string,
): Exclude<ChangeInstructorEmailResult, { ok: true }> | null {
  const linkedUser = row.user;

  if (!linkedUser) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_NOT_FOUND,
      error: "Linked app account not found.",
      status: 409,
    };
  }

  if (linkedUser.id !== row.userId) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_NOT_FOUND,
      error: "Linked app account not found.",
      status: 409,
    };
  }

  if (linkedUser.role !== "INSTRUCTOR") {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_ROLE_MISMATCH,
      error: "Linked app account is not an instructor account.",
      status: 409,
    };
  }

  if (linkedUser.organizationId !== organizationId) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_TENANT_MISMATCH,
      error: "Linked app account does not belong to this school.",
      status: 409,
    };
  }

  return null;
}

/**
 * Changes the instructor login email (`User.email`) while preserving lifecycle flags.
 */
export async function changeInstructorEmail(input: {
  organizationId: string;
  instructorId: string;
  newEmail: string;
}): Promise<ChangeInstructorEmailResult> {
  const normalizedEmail = normalizeInstructorEmail(input.newEmail);

  if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.INVALID_EMAIL,
      error: "Invalid email address.",
      status: 400,
    };
  }

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      const locked = await lockInstructorRowForUpdate(tx, input);
      if (!locked) {
        return { kind: "not_found" as const };
      }

      const row = await tx.instructor.findFirst({
        where: {
          id: input.instructorId,
          organizationId: input.organizationId,
        },
        select: CHANGE_ROW_SELECT,
      });

      if (!row) {
        return { kind: "not_found" as const };
      }

      const linkedUserError = validateLinkedUser(row, input.organizationId);
      if (linkedUserError) {
        return { kind: "validation" as const, error: linkedUserError };
      }

      const linkedUser = row.user!;
      const currentEmail = normalizeInstructorEmail(linkedUser.email);

      if (currentEmail === normalizedEmail) {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: INSTRUCTOR_EMAIL_CHANGE_CODE.EMAIL_UNCHANGED,
            error: "The new email is the same as the current email.",
            status: 400 as const,
          },
        };
      }

      const collision = await assertNewEmailAvailable(tx, {
        organizationId: input.organizationId,
        normalizedEmail,
        excludeUserId: linkedUser.id,
      });
      if (collision) {
        return { kind: "validation" as const, error: collision };
      }

      await invalidateLinkedUserAccess(tx, linkedUser.id);

      const verifiedAt = new Date();
      await tx.user.update({
        where: { id: linkedUser.id },
        data: {
          email: normalizedEmail,
          isEmailVerified: true,
          emailVerified: verifiedAt,
        },
      });

      const invitationRevokedCount =
        await revokePendingInstructorInvitationsForEmail(tx, {
          organizationId: input.organizationId,
          email: currentEmail,
        });

      return {
        kind: "ok" as const,
        preserved: {
          isApproved: linkedUser.isApproved,
          isAvailableForBooking: row.isAvailableForBooking,
        },
        audit: {
          hasLinkedUser: true,
          emailChanged: true,
          pendingInvitationBlocked: false,
          userEmailUpdated: true,
          instructorEmailUpdated: false,
          invitationRevoked: invitationRevokedCount > 0,
          linkedUserId: linkedUser.id,
        },
      };
    });

    if (txResult.kind === "not_found") {
      return { ok: false, notFound: true };
    }

    if (txResult.kind === "validation") {
      return txResult.error;
    }

    const updated = await prisma.user.findFirst({
      where: {
        instructor: {
          id: input.instructorId,
          organizationId: input.organizationId,
        },
      },
      select: UPDATED_USER_SELECT,
    });

    if (!updated) {
      return { ok: false, notFound: true };
    }

    if (
      updated.isApproved !== txResult.preserved.isApproved ||
      updated.instructor?.isAvailableForBooking !==
        txResult.preserved.isAvailableForBooking
    ) {
      return {
        ok: false,
        notFound: false,
        code: INSTRUCTOR_EMAIL_CHANGE_CODE.INSTRUCTOR_CHANGE_EMAIL_FAILED,
        error: "Failed to change instructor email.",
        status: 409,
      };
    }

    return {
      ok: true,
      user: mapUpdatedUserDto(updated),
      audit: txResult.audit,
    };
  } catch {
    return {
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.INSTRUCTOR_CHANGE_EMAIL_FAILED,
      error: "Failed to change instructor email.",
      status: 409,
    };
  }
}
