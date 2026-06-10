import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  INVITATION_LIST_INCLUDE,
  mapInvitationDto,
  type InvitationDto,
} from "./invitation-dto";
import { normalizeInvitationEmail } from "./invitation-policy";
import {
  buildInvitationAcceptUrl,
  calculateInvitationExpiry,
  DEFAULT_INVITATION_EXPIRY_DAYS,
  generateInvitationToken,
  hashInvitationToken,
} from "./invitation-token-service";

/** Stable API codes for pending invitation email update. */
export const INVITATION_EMAIL_UPDATE_CODE = {
  INVITATION_NOT_FOUND: "invitation_not_found",
  INVITATION_NOT_PENDING: "invitation_not_pending",
  UNSUPPORTED_INVITATION_ROLE: "unsupported_invitation_role",
  UNSUPPORTED_LINKED_STUDENT_INVITATION:
    "unsupported_linked_student_invitation",
  INVALID_EMAIL: "invalid_email",
  EMAIL_UNCHANGED: "email_unchanged",
  USER_ALREADY_EXISTS: "user_already_exists",
  PENDING_INVITATION_EXISTS: "pending_invitation_exists",
  STUDENT_EMAIL_ALREADY_IN_USE: "student_email_already_in_use",
  INVITATION_EMAIL_UPDATE_FAILED: "invitation_email_update_failed",
} as const;

const SUPPORTED_UNLINKED_INVITATION_ROLES = ["STUDENT", "INSTRUCTOR"] as const;

export type InvitationEmailUpdateCode =
  (typeof INVITATION_EMAIL_UPDATE_CODE)[keyof typeof INVITATION_EMAIL_UPDATE_CODE];

export type ChangeInvitationEmailResult =
  | { ok: true; invitation: InvitationDto; inviteLink: string }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound: false;
      code: InvitationEmailUpdateCode;
      error: string;
      status: 400 | 409;
    };

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function lockInvitationRowForUpdate(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; invitationId: string },
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "user_invitations"
    WHERE "id" = ${input.invitationId} AND "organizationId" = ${input.organizationId}
    FOR UPDATE
  `;
  return rows.length > 0;
}

async function assertNewEmailAvailable(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    normalizedEmail: string;
    excludeInvitationId: string;
    invitationRole: (typeof SUPPORTED_UNLINKED_INVITATION_ROLES)[number];
  },
): Promise<Exclude<ChangeInvitationEmailResult, { ok: true }> | null> {
  const existingUser = await tx.user.findUnique({
    where: { email: input.normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.USER_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const pendingInvitation = await tx.userInvitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email: input.normalizedEmail,
      status: "PENDING",
      id: { not: input.excludeInvitationId },
    },
    select: { id: true },
  });

  if (pendingInvitation) {
    return {
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.PENDING_INVITATION_EXISTS,
      error: "A pending invitation already exists for this email.",
      status: 409,
    };
  }

  if (input.invitationRole === "STUDENT") {
    const existingStudent = await tx.student.findFirst({
      where: {
        organizationId: input.organizationId,
        email: { equals: input.normalizedEmail, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingStudent) {
      return {
        ok: false,
        notFound: false,
        code: INVITATION_EMAIL_UPDATE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
        error: "A student record with this email already exists.",
        status: 409,
      };
    }
  }

  return null;
}

/**
 * Updates email on a pending unlinked STUDENT or INSTRUCTOR invitation and regenerates token.
 */
export async function changeInvitationEmail(input: {
  organizationId: string;
  invitationId: string;
  newEmail: string;
  baseUrl: string;
}): Promise<ChangeInvitationEmailResult> {
  const normalizedEmail = normalizeInvitationEmail(input.newEmail);

  if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
    return {
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.INVALID_EMAIL,
      error: "Invalid email address.",
      status: 400,
    };
  }

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      const locked = await lockInvitationRowForUpdate(tx, {
        organizationId: input.organizationId,
        invitationId: input.invitationId,
      });
      if (!locked) {
        return { kind: "not_found" as const };
      }

      const existing = await tx.userInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
        },
        include: INVITATION_LIST_INCLUDE,
      });

      if (!existing) {
        return { kind: "not_found" as const };
      }

      if (existing.status !== "PENDING") {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: INVITATION_EMAIL_UPDATE_CODE.INVITATION_NOT_PENDING,
            error: "Only pending invitations can be updated.",
            status: 409 as const,
          },
        };
      }

      if (existing.studentId != null) {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: INVITATION_EMAIL_UPDATE_CODE.UNSUPPORTED_LINKED_STUDENT_INVITATION,
            error: "Linked student invitations cannot be updated here.",
            status: 409 as const,
          },
        };
      }

      if (
        !(SUPPORTED_UNLINKED_INVITATION_ROLES as readonly string[]).includes(
          existing.role,
        )
      ) {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: INVITATION_EMAIL_UPDATE_CODE.UNSUPPORTED_INVITATION_ROLE,
            error: "This invitation type is not supported for change email.",
            status: 409 as const,
          },
        };
      }

      const currentEmail = normalizeInvitationEmail(existing.email);
      if (currentEmail === normalizedEmail) {
        return {
          kind: "validation" as const,
          error: {
            ok: false as const,
            notFound: false as const,
            code: INVITATION_EMAIL_UPDATE_CODE.EMAIL_UNCHANGED,
            error: "The new email is the same as the current email.",
            status: 400 as const,
          },
        };
      }

      const collision = await assertNewEmailAvailable(tx, {
        organizationId: input.organizationId,
        normalizedEmail,
        excludeInvitationId: existing.id,
        invitationRole:
          existing.role as (typeof SUPPORTED_UNLINKED_INVITATION_ROLES)[number],
      });
      if (collision) {
        return { kind: "validation" as const, error: collision };
      }

      const rawToken = generateInvitationToken();
      const tokenHash = hashInvitationToken(rawToken);
      const expiresAt = calculateInvitationExpiry(
        DEFAULT_INVITATION_EXPIRY_DAYS,
      );

      const updated = await tx.userInvitation.update({
        where: { id: existing.id },
        data: {
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
        include: INVITATION_LIST_INCLUDE,
      });

      const inviteLink = buildInvitationAcceptUrl({
        baseUrl: input.baseUrl,
        token: rawToken,
      });

      return {
        kind: "ok" as const,
        invitation: mapInvitationDto(updated),
        inviteLink,
        previousTokenHash: existing.tokenHash,
        newTokenHash: tokenHash,
      };
    });

    if (txResult.kind === "not_found") {
      return { ok: false, notFound: true };
    }

    if (txResult.kind === "validation") {
      return txResult.error;
    }

    return {
      ok: true,
      invitation: txResult.invitation,
      inviteLink: txResult.inviteLink,
    };
  } catch {
    return {
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.INVITATION_EMAIL_UPDATE_FAILED,
      error: "Failed to update invitation email.",
      status: 409,
    };
  }
}
