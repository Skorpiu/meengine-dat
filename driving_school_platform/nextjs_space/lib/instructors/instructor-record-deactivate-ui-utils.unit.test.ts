import { describe, it, expect } from "vitest";
import {
  formatDeactivateSuccessToast,
  getInstructorDeactivateConfirmActionLabel,
  getInstructorDeactivateUiState,
  canShowDeactivateInstructorInEditDialog,
  instructorRecordDeactivateApiErrorMessage,
} from "./instructor-record-deactivate-ui-utils";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";

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

describe("getInstructorDeactivateUiState", () => {
  it("shows confirmation for active instructor", () => {
    const state = getInstructorDeactivateUiState(activeInstructor);
    expect(state.allowed).toBe(true);
    expect(state.title).toBe("Deactivate Instructor?");
    expect(state.confirmMessages.join(" ")).toContain("new bookings");
    expect(state.confirmMessages.join(" ")).toContain(
      "not automatically cancelled",
    );
  });

  it("blocks when already inactive", () => {
    const state = getInstructorDeactivateUiState(inactiveInstructor);
    expect(state.allowed).toBe(false);
    expect(state.title).toBe("Already inactive");
  });
});

describe("instructorRecordDeactivateApiErrorMessage", () => {
  it("maps self-deactivate code", () => {
    expect(
      instructorRecordDeactivateApiErrorMessage(
        "instructor_deactivate_self_not_allowed",
        "fallback",
      ),
    ).toContain("your own");
  });
});

describe("formatDeactivateSuccessToast", () => {
  it("mentions future lessons in success toast", () => {
    expect(
      formatDeactivateSuccessToast({
        warningCodes: ["instructor_has_future_lessons"],
        futureLessonsCount: 2,
      }),
    ).toContain("2 future scheduled lessons");
  });
});

describe("canShowDeactivateInstructorInEditDialog", () => {
  it("shows for active instructor with record", () => {
    expect(canShowDeactivateInstructorInEditDialog(activeInstructor)).toBe(
      true,
    );
  });

  it("hides for inactive instructor", () => {
    expect(canShowDeactivateInstructorInEditDialog(inactiveInstructor)).toBe(
      false,
    );
  });
});

describe("getInstructorDeactivateConfirmActionLabel", () => {
  it("uses deactivate label", () => {
    expect(getInstructorDeactivateConfirmActionLabel()).toBe(
      "Deactivate Instructor",
    );
  });
});
