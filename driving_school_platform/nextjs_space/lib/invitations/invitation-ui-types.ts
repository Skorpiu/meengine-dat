import type { InvitationDto } from "./invitation-dto";

export type InvitableRole = "STUDENT" | "INSTRUCTOR";

export type { InvitationDto };

export type ListInvitationsResponse = {
  invitations: InvitationDto[];
};

export type InvitationEmailDeliveryDto = {
  attempted: true;
  ok: boolean;
  provider: string;
  noop?: boolean;
  errorCode?: string;
};

export type CreateInvitationResponse = {
  invitation: InvitationDto;
  inviteLink: string;
  emailDelivery: InvitationEmailDeliveryDto;
};

export type RevokeInvitationResponse = {
  invitation: InvitationDto;
};

export type InvitationApiError = {
  error: string;
  code?: string;
};
