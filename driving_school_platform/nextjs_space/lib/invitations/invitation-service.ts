import { prisma } from "@/lib/db";
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
};

export type CreateInvitationResult =
  | { ok: true; invitation: InvitationDto; inviteLink: string }
  | {
      ok: false;
      error: string;
      code: "invalid_role" | "pending_invitation_exists" | "invalid_email";
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

  const existingPending = await prisma.userInvitation.findFirst({
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

  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = calculateInvitationExpiry(
    input.expiresInDays ?? DEFAULT_INVITATION_EXPIRY_DAYS,
  );

  const created = await prisma.userInvitation.create({
    data: {
      organizationId: input.organizationId,
      email,
      role: input.role,
      tokenHash,
      status: "PENDING",
      expiresAt,
      createdByUserId: input.createdByUserId,
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
  const existing = await prisma.userInvitation.findFirst({
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
  const updated = await prisma.userInvitation.update({
    where: { id: existing.id },
    data: {
      status: "REVOKED",
      revokedAt,
    },
    include: INVITATION_LIST_INCLUDE,
  });

  return {
    ok: true,
    invitation: mapInvitationDto(updated),
  };
}
