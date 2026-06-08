/** Stable API codes returned when reactivate is blocked (409). */
export const INSTRUCTOR_REACTIVATE_BLOCK_CODE = {
  NOT_ALLOWED: "instructor_reactivate_not_allowed",
} as const;

export type InstructorReactivateBlockCode =
  (typeof INSTRUCTOR_REACTIVATE_BLOCK_CODE)[keyof typeof INSTRUCTOR_REACTIVATE_BLOCK_CODE];

export type InstructorRecordReactivateEligibilityInput = {
  userRelationConsistent: boolean;
  isAvailableForBooking: boolean;
};

export type InstructorRecordReactivateEligibilityResult =
  | { allowed: true; alreadyActive: boolean }
  | {
      allowed: false;
      code: InstructorReactivateBlockCode;
    };

export function evaluateInstructorRecordReactivateEligibility(
  input: InstructorRecordReactivateEligibilityInput,
): InstructorRecordReactivateEligibilityResult {
  if (!input.userRelationConsistent) {
    return {
      allowed: false,
      code: INSTRUCTOR_REACTIVATE_BLOCK_CODE.NOT_ALLOWED,
    };
  }

  if (input.isAvailableForBooking) {
    return { allowed: true, alreadyActive: true };
  }

  return { allowed: true, alreadyActive: false };
}
