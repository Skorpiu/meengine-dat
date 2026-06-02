import type { StudentAppAccessMode } from "@prisma/client";

/** Stable API codes returned when delete is blocked (409). */
export const STUDENT_DELETE_BLOCK_CODE = {
  NOT_MANUAL_ONLY: "student_not_manual_only",
  HAS_LINKED_USER: "student_has_linked_user",
  HAS_INVITATIONS: "student_has_invitations",
  HAS_LESSONS: "student_has_lessons",
  HAS_LESSON_COUNTERS: "student_has_lesson_counters",
  HAS_LESSON_REQUESTS: "student_has_lesson_requests",
  HAS_EXAM_REGISTRATIONS: "student_has_exam_registrations",
  HAS_PAYMENTS: "student_has_payments",
} as const;

export type StudentDeleteBlockCode =
  (typeof STUDENT_DELETE_BLOCK_CODE)[keyof typeof STUDENT_DELETE_BLOCK_CODE];

export type StudentRecordDeleteCounts = {
  lessons: number;
  userInvitations: number;
  lessonCounters: number;
  lessonRequests: number;
  examRegistrations: number;
  payments: number;
};

export type StudentRecordDeleteEligibilityInput = {
  appAccessMode: StudentAppAccessMode;
  userId: string | null;
  counts: StudentRecordDeleteCounts;
};

export type StudentRecordDeleteEligibilityResult =
  | { allowed: true }
  | {
      allowed: false;
      code: StudentDeleteBlockCode;
      codes: StudentDeleteBlockCode[];
    };

function collectBlockCodes(
  input: StudentRecordDeleteEligibilityInput,
): StudentDeleteBlockCode[] {
  const codes: StudentDeleteBlockCode[] = [];

  if (input.appAccessMode !== "MANUAL_ONLY") {
    codes.push(STUDENT_DELETE_BLOCK_CODE.NOT_MANUAL_ONLY);
  }
  if (input.userId != null) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_LINKED_USER);
  }
  if (input.counts.userInvitations > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_INVITATIONS);
  }
  if (input.counts.lessons > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_LESSONS);
  }
  if (input.counts.lessonCounters > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_LESSON_COUNTERS);
  }
  if (input.counts.lessonRequests > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS);
  }
  if (input.counts.examRegistrations > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_EXAM_REGISTRATIONS);
  }
  if (input.counts.payments > 0) {
    codes.push(STUDENT_DELETE_BLOCK_CODE.HAS_PAYMENTS);
  }

  return codes;
}

export function evaluateStudentRecordDeleteEligibility(
  input: StudentRecordDeleteEligibilityInput,
): StudentRecordDeleteEligibilityResult {
  const codes = collectBlockCodes(input);
  if (codes.length === 0) {
    return { allowed: true };
  }
  return { allowed: false, code: codes[0]!, codes };
}

/** UI hint only — server policy is authoritative. */
export function canShowStudentRecordDeleteAction(input: {
  appAccessMode: StudentAppAccessMode | string;
  userId: string | null;
}): boolean {
  return input.appAccessMode === "MANUAL_ONLY" && input.userId === null;
}
