import { describe, it, expect } from "vitest";
import {
  canShowReactivateInstructorInEditDialog,
  formatReactivateSuccessToast,
  getInstructorReactivateUiState,
  instructorRecordReactivateApiErrorMessage,
} from "./instructor-record-reactivate-ui-utils";
import type { InstructorRecordUserDto } from "./instructor-record-ui-types";

const activeInstructor: InstructorRecordUserDto = {
  id: "user-1",
  email: "instructor@school.test",
  firstName: "Ana",
  lastName: "Silva",
  phoneNumber: null,
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorLicenseNumber: "LIC-001",
    instructorLicenseExpiry: "2027-01-01",
    isAvailableForBooking: true,
  },
};

const inactiveInstructor: InstructorRecordUserDto = {
  ...activeInstructor,
  isApproved: false,
  instructor: {
    ...activeInstructor.instructor!,
    isAvailableForBooking: false,
  },
};

describe("canShowReactivateInstructorInEditDialog", () => {
  it("shows for inactive instructor with record", () => {
    expect(canShowReactivateInstructorInEditDialog(inactiveInstructor)).toBe(
      true,
    );
  });

  it("hides for active instructor", () => {
    expect(canShowReactivateInstructorInEditDialog(activeInstructor)).toBe(
      false,
    );
  });
});

describe("getInstructorReactivateUiState", () => {
  it("shows confirmation for inactive instructor", () => {
    const state = getInstructorReactivateUiState(inactiveInstructor);
    expect(state.allowed).toBe(true);
    expect(state.title).toBe("Reactivate Instructor?");
    expect(state.confirmMessages.join(" ")).toContain("booking");
  });

  it("blocks when already active", () => {
    const state = getInstructorReactivateUiState(activeInstructor);
    expect(state.allowed).toBe(false);
    expect(state.title).toBe("Already active");
  });
});

describe("instructorRecordReactivateApiErrorMessage", () => {
  it("maps not allowed code", () => {
    expect(
      instructorRecordReactivateApiErrorMessage(
        "instructor_reactivate_not_allowed",
        "fallback",
      ),
    ).toContain("inconsistent");
  });
});

describe("formatReactivateSuccessToast", () => {
  it("handles already active", () => {
    expect(formatReactivateSuccessToast({ alreadyActive: true })).toContain(
      "already active",
    );
  });
});
