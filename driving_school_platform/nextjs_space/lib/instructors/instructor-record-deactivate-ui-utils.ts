import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  INSTRUCTOR_DEACTIVATE_BLOCK_CODE,
  INSTRUCTOR_DEACTIVATE_WARNING_CODE,
} from "@/lib/instructors/instructor-record-deactivate-policy";
import {
  getInstructorEditAppAccessStatusBadge,
  isInstructorProfileInactive,
} from "@/lib/instructors/instructor-record-ui-utils";

export type InstructorDeactivateUiState = {
  allowed: boolean;
  title: string;
  confirmMessages: string[];
  blockMessages: string[];
  footerNote: string;
};

export const INSTRUCTOR_EDIT_DEACTIVATE_ACTION_LABEL = "Deactivate instructor";

const DEACTIVATE_CONFIRM_MESSAGES = [
  "This instructor will no longer be available for new bookings or lesson assignment.",
  "App login will be disabled for the linked account.",
  "All lessons, exams, payments, and other operational history will be preserved.",
  "Existing future scheduled lessons are not automatically cancelled or reassigned — manually reassign them if needed.",
];

const DEACTIVATE_FOOTER =
  "Deactivate is not Delete. Use Delete only for zero-dependency onboarding-error records. You can reactivate from App access when needed.";

const DEACTIVATE_BLOCKED_NO_RECORD =
  "This app account has no operational Instructor record linked. Deactivate requires a valid Instructor profile.";

export function getInstructorDeactivateUiState(
  user: InstructorRecordUserDto,
): InstructorDeactivateUiState {
  if (!user.instructor?.id) {
    return {
      allowed: false,
      title: "Deactivate not available",
      confirmMessages: [],
      blockMessages: [DEACTIVATE_BLOCKED_NO_RECORD],
      footerNote: DEACTIVATE_FOOTER,
    };
  }

  if (isInstructorProfileInactive(user)) {
    return {
      allowed: false,
      title: "Already inactive",
      confirmMessages: [],
      blockMessages: [
        "This instructor is already inactive and unavailable for new bookings.",
      ],
      footerNote: DEACTIVATE_FOOTER,
    };
  }

  return {
    allowed: true,
    title: "Deactivate Instructor?",
    confirmMessages: DEACTIVATE_CONFIRM_MESSAGES,
    blockMessages: [],
    footerNote: DEACTIVATE_FOOTER,
  };
}

export function getInstructorDeactivateConfirmActionLabel(): string {
  return "Deactivate Instructor";
}

export function instructorRecordDeactivateApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED:
      return "You cannot deactivate your own instructor account.";
    case INSTRUCTOR_DEACTIVATE_BLOCK_CODE.NOT_ALLOWED:
      return "This instructor cannot be deactivated due to an inconsistent account link.";
    case INSTRUCTOR_DEACTIVATE_WARNING_CODE.HAS_FUTURE_LESSONS:
      return "This instructor has future scheduled lessons. Reassign them manually after deactivation.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}

export function formatDeactivateSuccessToast(input: {
  warningCodes?: string[];
  futureLessonsCount?: number;
  alreadyInactive?: boolean;
}): string {
  if (input.alreadyInactive) {
    return "Instructor is already inactive.";
  }
  if (
    input.warningCodes?.includes(
      INSTRUCTOR_DEACTIVATE_WARNING_CODE.HAS_FUTURE_LESSONS,
    )
  ) {
    const count = input.futureLessonsCount ?? 0;
    return `Instructor deactivated. ${count} future scheduled lesson${count === 1 ? "" : "s"} remain — reassign manually if needed.`;
  }
  return "Instructor deactivated.";
}

export function getInstructorEditAppAccessStatusLabel(
  user: InstructorRecordUserDto,
): string {
  return getInstructorEditAppAccessStatusBadge(user).label;
}

/** Edit Instructor → App access: show Deactivate when instructor is active. */
export function canShowDeactivateInstructorInEditDialog(
  user: InstructorRecordUserDto,
): boolean {
  if (!user.instructor?.id) return false;
  return !isInstructorProfileInactive(user);
}

export function getInstructorEditDeactivateHelpText(): string {
  return "Deactivating disables booking and login while preserving all history. Reactivate restores availability when needed.";
}
