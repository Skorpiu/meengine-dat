/** Stable API codes returned when deactivate is blocked (409). */
export const INSTRUCTOR_DEACTIVATE_BLOCK_CODE = {
  SELF_NOT_ALLOWED: "instructor_deactivate_self_not_allowed",
  NOT_ALLOWED: "instructor_deactivate_not_allowed",
} as const;

export type InstructorDeactivateBlockCode =
  (typeof INSTRUCTOR_DEACTIVATE_BLOCK_CODE)[keyof typeof INSTRUCTOR_DEACTIVATE_BLOCK_CODE];

/** Warning codes returned on success — do not block deactivation. */
export const INSTRUCTOR_DEACTIVATE_WARNING_CODE = {
  HAS_FUTURE_LESSONS: "instructor_has_future_lessons",
} as const;

export type InstructorDeactivateWarningCode =
  (typeof INSTRUCTOR_DEACTIVATE_WARNING_CODE)[keyof typeof INSTRUCTOR_DEACTIVATE_WARNING_CODE];

export type InstructorRecordDeactivateEligibilityInput = {
  linkedUserId: string;
  currentUserId: string;
  userRelationConsistent: boolean;
  isAvailableForBooking: boolean;
};

export type InstructorRecordDeactivateEligibilityResult =
  | { allowed: true; alreadyInactive: boolean }
  | {
      allowed: false;
      code: InstructorDeactivateBlockCode;
    };

export function evaluateInstructorRecordDeactivateEligibility(
  input: InstructorRecordDeactivateEligibilityInput,
): InstructorRecordDeactivateEligibilityResult {
  if (!input.userRelationConsistent) {
    return {
      allowed: false,
      code: INSTRUCTOR_DEACTIVATE_BLOCK_CODE.NOT_ALLOWED,
    };
  }

  if (!input.isAvailableForBooking) {
    return { allowed: true, alreadyInactive: true };
  }

  if (input.linkedUserId === input.currentUserId) {
    return {
      allowed: false,
      code: INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED,
    };
  }

  return { allowed: true, alreadyInactive: false };
}

export function collectDeactivateWarningCodes(input: {
  futureLessonsCount: number;
}): InstructorDeactivateWarningCode[] {
  const codes: InstructorDeactivateWarningCode[] = [];
  if (input.futureLessonsCount > 0) {
    codes.push(INSTRUCTOR_DEACTIVATE_WARNING_CODE.HAS_FUTURE_LESSONS);
  }
  return codes;
}
