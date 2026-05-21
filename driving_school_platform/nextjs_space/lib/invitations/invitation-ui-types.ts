import type { InvitationDto } from "./invitation-dto";

export type InvitableRole = "STUDENT" | "INSTRUCTOR";

export type { InvitationDto };

export type ListInvitationsResponse = {
  invitations: InvitationDto[];
};

export type CreateInvitationResponse = {
  invitation: InvitationDto;
  inviteLink: string;
};

export type RevokeInvitationResponse = {
  invitation: InvitationDto;
};

export type InvitationApiError = {
  error: string;
  code?: string;
};
