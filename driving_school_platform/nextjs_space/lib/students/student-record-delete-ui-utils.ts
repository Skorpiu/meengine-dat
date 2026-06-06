import type { StudentAppAccessMode } from "@/lib/students/student-record-ui-types";

export type StudentDeleteUiState = {
  /** Client-side hint — server policy is authoritative on DELETE. */
  allowed: boolean;
  blockMessages: string[];
};

const HISTORY_BLOCK_NOTE =
  "Even after app access is removed, deletion may still be blocked by lessons, practical history, payments, invitations, lesson counters, exam registrations, or other records that must be preserved.";

/**
 * Row-level Delete visibility: always show the action; use blockMessages when not allowed.
 * Does not inspect operational counts (lessons, payments, etc.) — server returns those on DELETE.
 */
export function getStudentDeleteUiState(student: {
  appAccessMode: StudentAppAccessMode | string;
  userId: string | null;
}): StudentDeleteUiState {
  const blockMessages: string[] = [];

  if (student.appAccessMode === "APP_USER") {
    blockMessages.push(
      "This student cannot be deleted while app access is active.",
    );
    blockMessages.push(
      "Use Remove app access in Edit Student → App access first. The student profile and all historical records will be preserved.",
    );
    blockMessages.push(HISTORY_BLOCK_NOTE);
  } else if (student.appAccessMode === "INVITED") {
    blockMessages.push(
      "This student has app access pending via invitation and cannot be deleted yet.",
    );
    blockMessages.push(
      "Revoke the pending invitation first if you need to remove the profile.",
    );
    blockMessages.push(HISTORY_BLOCK_NOTE);
  } else if (student.appAccessMode !== "MANUAL_ONLY") {
    blockMessages.push(
      "Only students without app access can be deleted from People.",
    );
    blockMessages.push(HISTORY_BLOCK_NOTE);
  }

  if (student.userId != null && student.appAccessMode !== "APP_USER") {
    blockMessages.push("This student record is linked to an app account.");
  }

  return {
    allowed: student.appAccessMode === "MANUAL_ONLY" && student.userId === null,
    blockMessages,
  };
}

/** Footer copy for blocked delete modal — Delete does not remove app access implicitly. */
export function getStudentDeleteBlockedModalFooterNote(): string {
  return "Delete does not remove app access automatically. Use Remove app access in Edit Student when needed. Reactivate app access is planned for a future batch.";
}
