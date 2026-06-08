import type { StudentAppAccessMode } from "@/lib/students/student-record-ui-types";

export const CHANGE_STUDENT_EMAIL_MODAL = {
  title: "Change email",
  currentEmailLabel: "Current email",
  newEmailLabel: "New email",
  confirmLabel: "Change email",
  cancelLabel: "Cancel",
} as const;

export const CHANGE_STUDENT_EMAIL_WARNING = {
  MANUAL_ONLY: "Updates the student profile email.",
  INVITED:
    "Revokes the pending invitation. Send a new invitation after saving.",
  APP_USER:
    "Updates login email. The student will need to sign in with the new address. Active sessions may remain until they expire.",
} as const;

export function getChangeStudentEmailWarningCopy(
  appAccessMode: StudentAppAccessMode | string,
): string {
  if (appAccessMode === "APP_USER") {
    return CHANGE_STUDENT_EMAIL_WARNING.APP_USER;
  }
  if (appAccessMode === "INVITED") {
    return CHANGE_STUDENT_EMAIL_WARNING.INVITED;
  }
  return CHANGE_STUDENT_EMAIL_WARNING.MANUAL_ONLY;
}

/** Edit Student: show Change email for all student access modes. */
export function canShowChangeStudentEmailAction(_student: {
  appAccessMode: StudentAppAccessMode | string;
}): boolean {
  return true;
}

/** Student profile form: hide direct email edit when Change email flow is required. */
export function shouldHideStudentProfileEmailField(student: {
  appAccessMode: StudentAppAccessMode | string;
}): boolean {
  return (
    student.appAccessMode === "APP_USER" || student.appAccessMode === "INVITED"
  );
}

/** Save Student PATCH: omit email when profile email field is hidden. */
export function shouldOmitEmailFromStudentPatch(student: {
  appAccessMode: StudentAppAccessMode | string;
}): boolean {
  return shouldHideStudentProfileEmailField(student);
}

export function changeStudentEmailApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "invalid_email":
      return "Invalid email address.";
    case "email_unchanged":
      return "The new email is the same as the current email.";
    case "use_change_email_flow":
      return "Use Change email to update this student's email address.";
    case "user_email_already_exists":
      return "An account with this email already exists.";
    case "student_email_already_in_use":
      return "Another student in this school already uses this email.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email.";
    case "student_not_found":
      return "Student record not found.";
    case "student_no_linked_user":
      return "This student record has no linked app account.";
    case "linked_user_not_found":
      return "Linked app account not found.";
    case "linked_user_role_mismatch":
      return "Linked app account is not a student account.";
    case "linked_user_tenant_mismatch":
      return "Linked app account does not belong to this school.";
    case "student_change_email_failed":
      return "Failed to change student email.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}
