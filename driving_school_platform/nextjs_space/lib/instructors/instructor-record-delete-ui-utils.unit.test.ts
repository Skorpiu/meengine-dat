import { describe, it, expect } from "vitest";
import {
  getInstructorDeleteConfirmActionLabel,
  getInstructorDeleteUiState,
  instructorRecordDeleteApiErrorMessage,
  mapInstructorDeleteBlockCodesToMessages,
} from "./instructor-record-delete-ui-utils";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import { INSTRUCTOR_DELETE_BLOCK_CODE } from "@/lib/instructors/instructor-record-delete-policy";

const instructorUser: InstructorRecordUserDto = {
  id: "user-1",
  email: "instructor@school.test",
  firstName: "Ana",
  lastName: "Silva",
  phoneNumber: "+351900000000",
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorLicenseNumber: "LIC-001",
    instructorLicenseExpiry: "2027-01-01",
  },
};

const userWithoutRecord: InstructorRecordUserDto = {
  ...instructorUser,
  instructor: null,
};

describe("getInstructorDeleteUiState", () => {
  it("shows allowed confirmation when operational instructor record exists", () => {
    const state = getInstructorDeleteUiState(instructorUser);
    expect(state.allowed).toBe(true);
    expect(state.title).toBe("Delete Instructor?");
    expect(state.confirmMessages.join(" ")).toContain("onboarding-error");
    expect(state.confirmMessages.join(" ")).toContain("cannot be undone");
  });

  it("shows blocked modal when no instructor record", () => {
    const state = getInstructorDeleteUiState(userWithoutRecord);
    expect(state.allowed).toBe(false);
    expect(state.title).toBe("Delete not available");
    expect(state.blockMessages[0]).toContain(
      "no operational Instructor record",
    );
  });

  it("mentions Deactivate for instructors with history in footer", () => {
    const state = getInstructorDeleteUiState(instructorUser);
    expect(state.footerNote).toContain("Deactivate");
  });
});

describe("instructorRecordDeleteApiErrorMessage", () => {
  it("maps stable blocker codes", () => {
    expect(
      instructorRecordDeleteApiErrorMessage(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS,
        "fallback",
      ),
    ).toContain("lessons");
    expect(
      instructorRecordDeleteApiErrorMessage(
        "use_instructor_delete_policy",
        "fallback",
      ),
    ).toContain("Instructors → Profiles");
  });
});

describe("mapInstructorDeleteBlockCodesToMessages", () => {
  it("deduplicates mapped messages", () => {
    const messages = mapInstructorDeleteBlockCodesToMessages(
      [
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS,
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS,
      ],
      "fallback",
    );
    expect(messages).toHaveLength(1);
  });
});

describe("getInstructorDeleteConfirmActionLabel", () => {
  it("uses destructive confirmation text", () => {
    expect(getInstructorDeleteConfirmActionLabel()).toBe(
      "Delete Instructor permanently",
    );
  });
});

describe("blocked vs allowed modal behavior", () => {
  it("does not mark blocked rows as allowed", () => {
    expect(getInstructorDeleteUiState(userWithoutRecord).allowed).toBe(false);
  });
});
