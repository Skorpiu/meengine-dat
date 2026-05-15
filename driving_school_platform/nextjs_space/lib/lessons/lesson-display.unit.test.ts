import { describe, it, expect } from "vitest";
import {
  EXAM_DASHBOARD_LESSON_TYPES,
  getExamLessonTypeLabel,
  getLessonDateLabel,
  getLessonInstructorName,
  getLessonLocationLabel,
  getLessonParticipantName,
  getLessonVehicleLabel,
  isExamLessonType,
} from "./lesson-display";
import { LESSON_TYPES } from "@/lib/constants";

describe("lesson-display", () => {
  it("EXAM_DASHBOARD_LESSON_TYPES includes EXAM and THEORY_EXAM", () => {
    expect(EXAM_DASHBOARD_LESSON_TYPES).toEqual([
      LESSON_TYPES.EXAM,
      LESSON_TYPES.THEORY_EXAM,
    ]);
  });

  it("isExamLessonType recognizes exam lesson types only", () => {
    expect(isExamLessonType(LESSON_TYPES.EXAM)).toBe(true);
    expect(isExamLessonType(LESSON_TYPES.THEORY_EXAM)).toBe(true);
    expect(isExamLessonType(LESSON_TYPES.DRIVING)).toBe(false);
    expect(isExamLessonType(undefined)).toBe(false);
  });

  it("getExamLessonTypeLabel maps lesson types to display labels", () => {
    expect(getExamLessonTypeLabel(LESSON_TYPES.EXAM)).toBe("Practical exam");
    expect(getExamLessonTypeLabel(LESSON_TYPES.THEORY_EXAM)).toBe(
      "Theoretical exam",
    );
    expect(getExamLessonTypeLabel("DRIVING")).toBe("Exam");
  });

  it("formats participant and instructor names", () => {
    const nested = {
      user: { firstName: "Ada", lastName: "Lovelace" },
    };
    expect(getLessonParticipantName(nested)).toBe("Ada Lovelace");
    expect(getLessonInstructorName(nested)).toBe("Ada Lovelace");
    expect(getLessonParticipantName(null)).toBe("");
  });

  it("getLessonVehicleLabel prefers registration number", () => {
    expect(
      getLessonVehicleLabel({
        registrationNumber: "AB-12-CD",
        make: "VW",
        model: "Golf",
      }),
    ).toBe("AB-12-CD");
    expect(getLessonVehicleLabel({ make: "VW", model: "Golf" })).toBe(
      "VW Golf",
    );
  });

  it("getLessonDateLabel formats valid dates and handles invalid input", () => {
    expect(getLessonDateLabel("2026-05-15T10:00:00.000Z")).toMatch(/May/);
    expect(getLessonDateLabel(null)).toBe("—");
    expect(getLessonDateLabel("not-a-date")).toBe("—");
  });

  it("getLessonLocationLabel uses pickup then dropoff", () => {
    expect(
      getLessonLocationLabel({
        pickupLocation: " Test Center ",
        dropoffLocation: "Other",
      }),
    ).toBe("Test Center");
    expect(getLessonLocationLabel({ dropoffLocation: "Drop only" })).toBe(
      "Drop only",
    );
    expect(getLessonLocationLabel({})).toBeNull();
  });
});
