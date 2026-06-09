import type { InvitationDto } from "./invitation-dto";
import type { InvitableRole } from "./invitation-ui-types";

export const CHANGE_INVITATION_EMAIL_MODAL = {
  title: "Change email",
  currentEmailLabel: "Current email",
  newEmailLabel: "New email",
  confirmLabel: "Change email",
  cancelLabel: "Cancel",
} as const;

export const CHANGE_INVITATION_EMAIL_WARNING_LINES = [
  "This updates the invitation email.",
  "The previous invite link will stop working.",
  "Copy the new link after saving.",
  "Email is not sent automatically.",
] as const;

export function getChangeInvitationEmailWarningCopy(): string {
  return CHANGE_INVITATION_EMAIL_WARNING_LINES.join(" ");
}

/** Onboarding instructor rows only — unlinked pending INSTRUCTOR invitations. */
export function canShowInvitationChangeEmailAction(
  invitation: InvitationDto,
  roleFilter?: InvitableRole,
): boolean {
  return (
    roleFilter === "INSTRUCTOR" &&
    invitation.role === "INSTRUCTOR" &&
    invitation.status === "PENDING" &&
    invitation.studentId == null
  );
}

export function changeInvitationEmailApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "invalid_email":
      return "Invalid email address.";
    case "email_unchanged":
      return "The new email is the same as the current email.";
    case "user_already_exists":
      return "An account with this email already exists.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email.";
    case "invitation_not_found":
      return "Invitation not found.";
    case "invitation_not_pending":
      return "Only pending invitations can be updated.";
    case "unsupported_invitation_role":
      return "Only instructor invitations are supported for this action.";
    case "unsupported_linked_student_invitation":
      return "Linked student invitations cannot be updated here.";
    case "invitation_email_update_failed":
      return "Failed to update invitation email.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}

export type ChangeInvitationEmailMutationResponse = {
  invitation: InvitationDto;
  inviteLink: string;
};

export type ChangeInvitationEmailApiError = {
  error: string;
  code?: string;
};
