export type InstructorDeleteUiState = {
  /** v1: always false — server delete policy deferred to instructor-delete-policy-v1. */
  allowed: false;
  title: string;
  blockMessages: string[];
  footerNote: string;
};

const INSTRUCTOR_DELETE_BLOCKED_BODY =
  "Instructor deletion is not available yet because instructor profiles may be linked to lessons, exams, lesson requests, app access, and operational history. A dedicated delete policy will be implemented before destructive actions are allowed.";

const INSTRUCTOR_DELETE_BLOCKED_FOOTER =
  "No instructor profile, user account, or app login is deleted from this action. Delete policy is planned in instructor-delete-policy-v1.";

export function getInstructorDeleteUiState(): InstructorDeleteUiState {
  return {
    allowed: false,
    title: "Delete not available",
    blockMessages: [INSTRUCTOR_DELETE_BLOCKED_BODY],
    footerNote: INSTRUCTOR_DELETE_BLOCKED_FOOTER,
  };
}

export function getInstructorDeleteBlockedModalBody(): string {
  return INSTRUCTOR_DELETE_BLOCKED_BODY;
}

export function getInstructorDeleteBlockedModalFooterNote(): string {
  return INSTRUCTOR_DELETE_BLOCKED_FOOTER;
}
