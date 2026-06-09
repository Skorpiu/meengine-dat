import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  isInstructorPendingApproval,
  isInstructorProfileInactive,
} from "@/lib/instructors/instructor-record-ui-utils";

export const CHANGE_INSTRUCTOR_EMAIL_MODAL = {
  title: "Change email",
  currentEmailLabel: "Current email",
  newEmailLabel: "New email",
  confirmLabel: "Change email",
  cancelLabel: "Cancel",
} as const;

export const CHANGE_INSTRUCTOR_EMAIL_BASE_WARNING = [
  "This changes the instructor login email.",
  "The instructor will need to use the new email next time they sign in.",
  "Approval and booking availability will not change.",
] as const;

export const CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING = {
  deactivated: "This will not reactivate the instructor.",
  pendingApproval: "This will not approve the instructor.",
} as const;

export function getChangeInstructorEmailWarningCopy(
  user: InstructorRecordUserDto,
): string {
  const lines: string[] = [...CHANGE_INSTRUCTOR_EMAIL_BASE_WARNING];

  if (isInstructorProfileInactive(user)) {
    lines.push(CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.deactivated);
  } else if (isInstructorPendingApproval(user)) {
    lines.push(CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.pendingApproval);
  }

  return lines.join(" ");
}

/** Edit Instructor → App access: show when instructor profile exists. */
export function canShowChangeInstructorEmailAction(
  user: InstructorRecordUserDto,
): boolean {
  return Boolean(user.instructor?.id);
}

export function changeInstructorEmailApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "invalid_email":
      return "Invalid email address.";
    case "email_unchanged":
      return "The new email is the same as the current email.";
    case "user_email_already_exists":
      return "An account with this email already exists.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email.";
    case "instructor_not_found":
      return "Instructor record not found.";
    case "linked_user_not_found":
      return "Linked app account not found.";
    case "linked_user_role_mismatch":
      return "Linked app account is not an instructor account.";
    case "linked_user_tenant_mismatch":
      return "Linked app account does not belong to this school.";
    case "instructor_change_email_failed":
      return "Failed to change instructor email.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}

export type InstructorEmailChangeMutationResponse = {
  success: true;
  data: { user: InstructorRecordUserDto };
};

export type InstructorEmailChangeApiError = {
  error: string;
  code?: string;
};
