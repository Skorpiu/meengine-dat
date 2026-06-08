import { describe, it, expect } from "vitest";
import { evaluateInstructorRecordReactivateEligibility } from "./instructor-record-reactivate-policy";

describe("evaluateInstructorRecordReactivateEligibility", () => {
  it("allows reactivate when inactive", () => {
    const result = evaluateInstructorRecordReactivateEligibility({
      userRelationConsistent: true,
      isAvailableForBooking: false,
    });
    expect(result).toEqual({ allowed: true, alreadyActive: false });
  });

  it("returns alreadyActive when available for booking", () => {
    const result = evaluateInstructorRecordReactivateEligibility({
      userRelationConsistent: true,
      isAvailableForBooking: true,
    });
    expect(result).toEqual({ allowed: true, alreadyActive: true });
  });

  it("blocks inconsistent user relation", () => {
    const result = evaluateInstructorRecordReactivateEligibility({
      userRelationConsistent: false,
      isAvailableForBooking: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("instructor_reactivate_not_allowed");
    }
  });
});
