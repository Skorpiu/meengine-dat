/** Stable API codes returned when instructor hard delete is blocked (409). */
export const INSTRUCTOR_DELETE_BLOCK_CODE = {
  HAS_LESSONS: "instructor_has_lessons",
  HAS_PAYMENTS: "instructor_has_payments",
  HAS_EXAMS: "instructor_has_exams",
  HAS_LESSON_REQUESTS: "instructor_has_lesson_requests",
  HAS_PREFERRED_STUDENTS: "instructor_has_preferred_students",
  HAS_PENDING_INVITATION: "instructor_has_pending_invitation",
  SELF_NOT_ALLOWED: "instructor_delete_self_not_allowed",
  NOT_ALLOWED: "instructor_delete_not_allowed",
} as const;

export type InstructorDeleteBlockCode =
  (typeof INSTRUCTOR_DELETE_BLOCK_CODE)[keyof typeof INSTRUCTOR_DELETE_BLOCK_CODE];

export type InstructorRecordDeleteCounts = {
  lessons: number;
  payments: number;
  exams: number;
  lessonRequests: number;
  preferredStudents: number;
  pendingInvitations: number;
};

export type InstructorRecordDeleteEligibilityInput = {
  /** Linked User.id of the instructor — compared to session admin id for self-delete guard. */
  linkedUserId: string;
  currentUserId: string;
  /** When false, user/instructor linkage is inconsistent — hard delete blocked. */
  userRelationConsistent: boolean;
  counts: InstructorRecordDeleteCounts;
};

export type InstructorRecordDeleteEligibilityResult =
  | { allowed: true }
  | {
      allowed: false;
      code: InstructorDeleteBlockCode;
      codes: InstructorDeleteBlockCode[];
    };

function collectBlockCodes(
  input: InstructorRecordDeleteEligibilityInput,
): InstructorDeleteBlockCode[] {
  const codes: InstructorDeleteBlockCode[] = [];

  if (!input.userRelationConsistent) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.NOT_ALLOWED);
  }
  if (input.linkedUserId === input.currentUserId) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED);
  }
  if (input.counts.lessons > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS);
  }
  if (input.counts.payments > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS);
  }
  if (input.counts.exams > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_EXAMS);
  }
  if (input.counts.lessonRequests > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS);
  }
  if (input.counts.preferredStudents > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PREFERRED_STUDENTS);
  }
  if (input.counts.pendingInvitations > 0) {
    codes.push(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PENDING_INVITATION);
  }

  return codes;
}

export function evaluateInstructorRecordDeleteEligibility(
  input: InstructorRecordDeleteEligibilityInput,
): InstructorRecordDeleteEligibilityResult {
  const codes = collectBlockCodes(input);
  if (codes.length === 0) {
    return { allowed: true };
  }
  return { allowed: false, code: codes[0]!, codes };
}
