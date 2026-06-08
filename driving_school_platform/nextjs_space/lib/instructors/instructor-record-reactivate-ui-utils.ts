import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import { INSTRUCTOR_REACTIVATE_BLOCK_CODE } from "@/lib/instructors/instructor-record-reactivate-policy";
import { isInstructorProfileInactive } from "@/lib/instructors/instructor-record-ui-utils";

export const INSTRUCTOR_EDIT_REACTIVATE_ACTION_LABEL = "Reactivate instructor";

export type InstructorReactivateUiState = {
  allowed: boolean;
  title: string;
  confirmMessages: string[];
  blockMessages: string[];
  footerNote: string;
};

const REACTIVATE_CONFIRM_MESSAGES = [
  "This instructor will be available for new bookings and lesson assignment again.",
  "App login will be enabled for the linked account.",
  "All existing lessons, exams, payments, and history remain unchanged.",
  "Future lessons already assigned to this instructor are not automatically updated — review the schedule if needed.",
];

const REACTIVATE_FOOTER =
  "Reactivate restores booking and login. It does not recreate past sessions or auto-assign lessons.";

const REACTIVATE_BLOCKED_NO_RECORD =
  "This app account has no operational Instructor record linked. Reactivate requires a valid Instructor profile.";

export function canShowReactivateInstructorInEditDialog(
  user: InstructorRecordUserDto,
): boolean {
  if (!user.instructor?.id) return false;
  return isInstructorProfileInactive(user);
}

export function getInstructorReactivateUiState(
  user: InstructorRecordUserDto,
): InstructorReactivateUiState {
  if (!user.instructor?.id) {
    return {
      allowed: false,
      title: "Reactivate not available",
      confirmMessages: [],
      blockMessages: [REACTIVATE_BLOCKED_NO_RECORD],
      footerNote: REACTIVATE_FOOTER,
    };
  }

  if (!isInstructorProfileInactive(user)) {
    return {
      allowed: false,
      title: "Already active",
      confirmMessages: [],
      blockMessages: ["This instructor is already active and available."],
      footerNote: REACTIVATE_FOOTER,
    };
  }

  return {
    allowed: true,
    title: "Reactivate Instructor?",
    confirmMessages: REACTIVATE_CONFIRM_MESSAGES,
    blockMessages: [],
    footerNote: REACTIVATE_FOOTER,
  };
}

export function getInstructorReactivateConfirmActionLabel(): string {
  return INSTRUCTOR_EDIT_REACTIVATE_ACTION_LABEL;
}

export function instructorRecordReactivateApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case INSTRUCTOR_REACTIVATE_BLOCK_CODE.NOT_ALLOWED:
      return "This instructor cannot be reactivated due to an inconsistent account link.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}

export function formatReactivateSuccessToast(input: {
  alreadyActive?: boolean;
}): string {
  if (input.alreadyActive) {
    return "Instructor is already active.";
  }
  return "Instructor reactivated.";
}

export function getInstructorEditReactivateHelpText(): string {
  return "Reactivating restores booking and login. History and existing lesson assignments are preserved.";
}
