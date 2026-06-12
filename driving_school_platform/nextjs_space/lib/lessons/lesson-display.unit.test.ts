import { describe, it, expect } from "vitest";
import {
  EXAM_DASHBOARD_LESSON_TYPES,
  getExamLessonTypeLabel,
  getLessonDateLabel,
  getLessonInstructorName,
  getLessonLocationLabel,
  getLessonParticipantName,
  getLessonStatusDisplayLabel,
  getLessonVehicleLabel,
  getLessonVehicleWarning,
  getPracticalLessonNumberLabel,
  isExamLessonType,
  isLessonInstructorInactive,
  isLessonVehicleProblematic,
  LESSON_VEHICLE_INACTIVE_WARNING,
  LESSON_VEHICLE_MAINTENANCE_WARNING,
  LESSON_VEHICLE_OUT_OF_SERVICE_WARNING,
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
    expect(getLessonParticipantName(null)).toBe("Student");
  });

  it("isLessonInstructorInactive detects deactivated instructor", () => {
    expect(isLessonInstructorInactive({ isAvailableForBooking: false })).toBe(
      true,
    );
    expect(isLessonInstructorInactive({ isAvailableForBooking: true })).toBe(
      false,
    );
    expect(isLessonInstructorInactive(null)).toBe(false);
  });

  it("uses operational student fields when user is absent", () => {
    expect(
      getLessonParticipantName({
        firstName: "João",
        lastName: "Silva",
        schoolStudentId: "26001",
      }),
    ).toBe("João Silva");
  });

  describe("vehicle operational warnings", () => {
    const healthyVehicle = {
      isActive: true,
      underMaintenance: false,
      status: "AVAILABLE",
    };

    it("returns no warning for healthy or missing vehicle", () => {
      expect(getLessonVehicleWarning(healthyVehicle)).toBeNull();
      expect(isLessonVehicleProblematic(healthyVehicle)).toBe(false);
      expect(getLessonVehicleWarning(null)).toBeNull();
      expect(getLessonVehicleWarning(undefined)).toBeNull();
    });

    it("warns when vehicle is inactive", () => {
      expect(
        getLessonVehicleWarning({ ...healthyVehicle, isActive: false }),
      ).toBe(LESSON_VEHICLE_INACTIVE_WARNING);
    });

    it("warns when vehicle is under maintenance", () => {
      expect(
        getLessonVehicleWarning({ ...healthyVehicle, underMaintenance: true }),
      ).toBe(LESSON_VEHICLE_MAINTENANCE_WARNING);
    });

    it("warns when vehicle status is MAINTENANCE", () => {
      expect(
        getLessonVehicleWarning({ ...healthyVehicle, status: "MAINTENANCE" }),
      ).toBe(LESSON_VEHICLE_MAINTENANCE_WARNING);
    });

    it("warns when vehicle status is OUT_OF_SERVICE", () => {
      expect(
        getLessonVehicleWarning({
          ...healthyVehicle,
          status: "OUT_OF_SERVICE",
        }),
      ).toBe(LESSON_VEHICLE_OUT_OF_SERVICE_WARNING);
    });

    it("does not warn when vehicle status is IN_USE", () => {
      expect(
        getLessonVehicleWarning({ ...healthyVehicle, status: "IN_USE" }),
      ).toBeNull();
    });

    it("prioritizes inactive over maintenance and out of service", () => {
      expect(
        getLessonVehicleWarning({
          isActive: false,
          underMaintenance: true,
          status: "OUT_OF_SERVICE",
        }),
      ).toBe(LESSON_VEHICLE_INACTIVE_WARNING);
    });
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

  it("getPracticalLessonNumberLabel shows label for DRIVING with number", () => {
    expect(
      getPracticalLessonNumberLabel({
        lessonType: LESSON_TYPES.DRIVING,
        practicalLessonNumber: 1,
      }),
    ).toBe("Practice No. 1");
  });

  it("getLessonStatusDisplayLabel maps enums to Title Case", () => {
    expect(getLessonStatusDisplayLabel("SCHEDULED")).toBe("Scheduled");
    expect(getLessonStatusDisplayLabel("IN_PROGRESS")).toBe("In Progress");
    expect(getLessonStatusDisplayLabel("COMPLETED")).toBe("Completed");
    expect(getLessonStatusDisplayLabel("CANCELLED")).toBe("Cancelled");
    expect(getLessonStatusDisplayLabel("PENDING")).toBe("Pending");
    expect(getLessonStatusDisplayLabel(null)).toBe("Scheduled");
  });

  it("getPracticalLessonNumberLabel returns null for non-DRIVING or missing number", () => {
    expect(
      getPracticalLessonNumberLabel({
        lessonType: LESSON_TYPES.THEORY,
        practicalLessonNumber: 1,
      }),
    ).toBeNull();
    expect(
      getPracticalLessonNumberLabel({
        lessonType: LESSON_TYPES.DRIVING,
        practicalLessonNumber: null,
      }),
    ).toBeNull();
  });
});
