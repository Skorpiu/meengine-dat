import { describe, it, expect } from "vitest";
import {
  INSTRUCTOR_DEACTIVATE_BLOCK_CODE,
  INSTRUCTOR_DEACTIVATE_WARNING_CODE,
  collectDeactivateWarningCodes,
  evaluateInstructorRecordDeactivateEligibility,
} from "./instructor-record-deactivate-policy";

const baseInput = {
  linkedUserId: "user-target",
  currentUserId: "admin-1",
  userRelationConsistent: true,
  isAvailableForBooking: true,
};

describe("evaluateInstructorRecordDeactivateEligibility", () => {
  it("allows active instructor", () => {
    const result = evaluateInstructorRecordDeactivateEligibility(baseInput);
    expect(result).toEqual({ allowed: true, alreadyInactive: false });
  });

  it("returns alreadyInactive when not available for booking", () => {
    const result = evaluateInstructorRecordDeactivateEligibility({
      ...baseInput,
      isAvailableForBooking: false,
    });
    expect(result).toEqual({ allowed: true, alreadyInactive: true });
  });

  it("blocks self-deactivate for active instructor", () => {
    const result = evaluateInstructorRecordDeactivateEligibility({
      ...baseInput,
      linkedUserId: "admin-1",
      currentUserId: "admin-1",
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(
        INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED,
      );
    }
  });

  it("blocks inconsistent linked user", () => {
    const result = evaluateInstructorRecordDeactivateEligibility({
      ...baseInput,
      userRelationConsistent: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DEACTIVATE_BLOCK_CODE.NOT_ALLOWED);
    }
  });
});

describe("collectDeactivateWarningCodes", () => {
  it("includes future lessons warning when count > 0", () => {
    expect(collectDeactivateWarningCodes({ futureLessonsCount: 2 })).toEqual([
      INSTRUCTOR_DEACTIVATE_WARNING_CODE.HAS_FUTURE_LESSONS,
    ]);
  });

  it("returns empty when no future lessons", () => {
    expect(collectDeactivateWarningCodes({ futureLessonsCount: 0 })).toEqual(
      [],
    );
  });
});
