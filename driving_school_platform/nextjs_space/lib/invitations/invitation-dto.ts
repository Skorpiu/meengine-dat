import type { Prisma, UserInvitation } from "@prisma/client";

export const INVITATION_USER_DISPLAY_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

export const INVITATION_LIST_INCLUDE = {
  createdBy: { select: INVITATION_USER_DISPLAY_SELECT },
  acceptedUser: { select: INVITATION_USER_DISPLAY_SELECT },
} satisfies Prisma.UserInvitationInclude;

export type InvitationWithRelations = UserInvitation & {
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  acceptedUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type InvitationUserDisplayDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type InvitationDto = {
  id: string;
  studentId: string | null;
  email: string;
  role: UserInvitation["role"];
  status: UserInvitation["status"];
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: InvitationUserDisplayDto | null;
  acceptedUser: InvitationUserDisplayDto | null;
};

export function mapInvitationDto(
  invitation: InvitationWithRelations,
): InvitationDto {
  return {
    id: invitation.id,
    studentId: invitation.studentId ?? null,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    createdBy: invitation.createdBy ?? null,
    acceptedUser: invitation.acceptedUser ?? null,
  };
}

/** Ensures a plain object never exposes tokenHash (defensive for tests and mappers). */
export function assertNoTokenHashInPayload(
  value: Record<string, unknown>,
): void {
  if ("tokenHash" in value) {
    throw new Error("Invitation payload must not include tokenHash");
  }
}
