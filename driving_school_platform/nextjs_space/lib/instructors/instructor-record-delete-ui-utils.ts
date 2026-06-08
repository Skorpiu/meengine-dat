import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import { INSTRUCTOR_DELETE_BLOCK_CODE } from "@/lib/instructors/instructor-record-delete-policy";
import { hasOperationalInstructorRecord } from "@/lib/instructors/instructor-record-ui-utils";

export type InstructorDeleteUiState = {
  /** Client-side hint — server policy is authoritative on DELETE. */
  allowed: boolean;
  title: string;
  blockMessages: string[];
  confirmMessages: string[];
  footerNote: string;
};

const HISTORY_BLOCK_NOTE =
  "If this instructor has lessons, exams, payments, lesson requests, preferred students, or other operational history, hard delete is blocked. When an instructor leaves the school, use Deactivate (planned) — not Delete.";

const ALLOWED_CONFIRM_BODY =
  "Hard delete permanently removes this instructor profile and linked app account. Use only for mistaken or onboarding-error records with no operational history.";

const ALLOWED_CONFIRM_WARNING =
  "This action cannot be undone. All login access for this instructor will be removed.";

const BLOCKED_NO_RECORD =
  "This app account has no operational Instructor record linked. Use Edit Instructor to add license details, or contact support if this persists. Hard delete requires a valid Instructor record.";

const BLOCKED_FOOTER =
  "No instructor profile or app account is deleted until you confirm a successful hard delete. Instructors with history will require Deactivate in a future batch.";

export function getInstructorDeleteUiState(
  user: InstructorRecordUserDto,
): InstructorDeleteUiState {
  const blockMessages: string[] = [];

  if (!hasOperationalInstructorRecord(user) || !user.instructor?.id) {
    blockMessages.push(BLOCKED_NO_RECORD);
    return {
      allowed: false,
      title: "Delete not available",
      blockMessages,
      confirmMessages: [],
      footerNote: BLOCKED_FOOTER,
    };
  }

  return {
    allowed: true,
    title: "Delete Instructor?",
    blockMessages: [],
    confirmMessages: [ALLOWED_CONFIRM_BODY, ALLOWED_CONFIRM_WARNING],
    footerNote: HISTORY_BLOCK_NOTE,
  };
}

export function getInstructorDeleteBlockedModalFooterNote(): string {
  return BLOCKED_FOOTER;
}

export function mapInstructorDeleteBlockCodesToMessages(
  codes: string[] | undefined,
  fallback: string,
): string[] {
  if (!codes?.length) {
    return [fallback];
  }
  const messages = codes.map((code) =>
    instructorRecordDeleteApiErrorMessage(code, fallback),
  );
  return [...new Set(messages)];
}

export function instructorRecordDeleteApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS:
      return "This instructor has lessons and cannot be hard-deleted. Use Deactivate when available.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS:
      return "This instructor has payment records and cannot be hard-deleted.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_EXAMS:
      return "This instructor has exam history as examiner and cannot be hard-deleted.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS:
      return "This instructor has lesson requests and cannot be hard-deleted.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PREFERRED_STUDENTS:
      return "Students still prefer this instructor — hard delete is blocked.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PENDING_INVITATION:
      return "A pending instructor invitation exists for this email — revoke it first.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED:
      return "You cannot delete your own instructor account.";
    case INSTRUCTOR_DELETE_BLOCK_CODE.NOT_ALLOWED:
      return "This instructor record cannot be hard-deleted due to an inconsistent or invalid account link.";
    case "use_instructor_delete_policy":
      return "Instructor accounts cannot be deleted from App Accounts. Use People → Instructors → Profiles.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    default:
      return fallback;
  }
}

/** Destructive confirmation button label when policy allows hard delete. */
export function getInstructorDeleteConfirmActionLabel(): string {
  return "Delete Instructor permanently";
}
