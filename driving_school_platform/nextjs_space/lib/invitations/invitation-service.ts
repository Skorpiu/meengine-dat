import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  INVITATION_LIST_INCLUDE,
  mapInvitationDto,
  type InvitationDto,
} from "./invitation-dto";
import {
  isInvitableUserRole,
  normalizeInvitationEmail,
  type InvitableUserRole,
} from "./invitation-policy";
import {
  buildInvitationAcceptUrl,
  calculateInvitationExpiry,
  DEFAULT_INVITATION_EXPIRY_DAYS,
  generateInvitationToken,
  hashInvitationToken,
} from "./invitation-token-service";

export type CreateInvitationInput = {
  organizationId: string;
  createdByUserId: string;
  email: string;
  role: InvitableUserRole;
  baseUrl: string;
  expiresInDays?: number;
  studentId?: string;
  tx?: Prisma.TransactionClient;
};

export type CreateInvitationResult =
  | {
      ok: true;
      invitation: InvitationDto;
      inviteLink: string;
      organizationName: string;
    }
  | {
      ok: false;
      error: string;
      code:
        | "invalid_role"
        | "pending_invitation_exists"
        | "user_already_exists"
        | "invalid_email";
      status: number;
    };

export type ListInvitationsResult = {
  invitations: InvitationDto[];
};

export type RevokeInvitationResult =
  | { ok: true; invitation: InvitationDto }
  | {
      ok: false;
      error: string;
      code: "invitation_not_found" | "invitation_not_pending";
      status: number;
    };

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  const db = input.tx ?? prisma;
  const email = normalizeInvitationEmail(input.email);
  if (!email) {
    return {
      ok: false,
      error: "Invalid email address",
      code: "invalid_email",
      status: 400,
    };
  }

  if (!isInvitableUserRole(input.role)) {
    return {
      ok: false,
      error: "Invalid role for invitation",
      code: "invalid_role",
      status: 400,
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      code: "user_already_exists",
      status: 409,
    };
  }

  const existingPending = await db.userInvitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (existingPending) {
    return {
      ok: false,
      error: "A pending invitation already exists for this email",
      code: "pending_invitation_exists",
      status: 409,
    };
  }

  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  const organizationName = organization?.name?.trim() || "Your organization";

  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = calculateInvitationExpiry(
    input.expiresInDays ?? DEFAULT_INVITATION_EXPIRY_DAYS,
  );

  const created = await db.userInvitation.create({
    data: {
      organizationId: input.organizationId,
      email,
      role: input.role,
      tokenHash,
      status: "PENDING",
      expiresAt,
      createdByUserId: input.createdByUserId,
      ...(input.studentId ? { studentId: input.studentId } : {}),
    },
    include: INVITATION_LIST_INCLUDE,
  });

  const inviteLink = buildInvitationAcceptUrl({
    baseUrl: input.baseUrl,
    token: rawToken,
  });

  return {
    ok: true,
    invitation: mapInvitationDto(created),
    inviteLink,
    organizationName,
  };
}

export async function listInvitations(input: {
  organizationId: string;
}): Promise<ListInvitationsResult> {
  const rows = await prisma.userInvitation.findMany({
    where: { organizationId: input.organizationId },
    include: INVITATION_LIST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return {
    invitations: rows.map(mapInvitationDto),
  };
}

export async function revokeInvitation(input: {
  organizationId: string;
  invitationId: string;
  revokedByUserId?: string;
}): Promise<RevokeInvitationResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userInvitation.findFirst({
      where: {
        id: input.invitationId,
        organizationId: input.organizationId,
      },
      include: INVITATION_LIST_INCLUDE,
    });

    if (!existing) {
      return {
        ok: false,
        error: "Invitation not found",
        code: "invitation_not_found",
        status: 404,
      };
    }

    if (existing.status !== "PENDING") {
      return {
        ok: false,
        error: "Only pending invitations can be revoked",
        code: "invitation_not_pending",
        status: 400,
      };
    }

    const revokedAt = new Date();
    const updated = await tx.userInvitation.update({
      where: { id: existing.id },
      data: {
        status: "REVOKED",
        revokedAt,
      },
      include: INVITATION_LIST_INCLUDE,
    });

    const linkedStudentId = existing.studentId;
    if (linkedStudentId) {
      const otherPendingCount = await tx.userInvitation.count({
        where: {
          organizationId: input.organizationId,
          studentId: linkedStudentId,
          status: "PENDING",
          id: { not: existing.id },
        },
      });

      if (otherPendingCount === 0) {
        const student = await tx.student.findFirst({
          where: {
            id: linkedStudentId,
            organizationId: input.organizationId,
          },
          select: { userId: true, appAccessMode: true },
        });

        if (
          student &&
          student.userId === null &&
          student.appAccessMode === "INVITED"
        ) {
          await tx.student.update({
            where: { id: linkedStudentId },
            data: { appAccessMode: "MANUAL_ONLY" },
          });
        }
      }
    }

    return {
      ok: true,
      invitation: mapInvitationDto(updated),
    };
  });
}
