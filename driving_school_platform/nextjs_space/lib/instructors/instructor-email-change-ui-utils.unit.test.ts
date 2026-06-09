import { describe, it, expect } from "vitest";
import {
  CHANGE_INSTRUCTOR_EMAIL_BASE_WARNING,
  CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING,
  canShowChangeInstructorEmailAction,
  changeInstructorEmailApiErrorMessage,
  getChangeInstructorEmailWarningCopy,
} from "@/lib/instructors/instructor-email-change-ui-utils";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";

const baseUser: InstructorRecordUserDto = {
  id: "user-1",
  email: "inst@school.test",
  firstName: "Ana",
  lastName: "Costa",
  phoneNumber: null,
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    isAvailableForBooking: true,
  },
};

describe("getChangeInstructorEmailWarningCopy", () => {
  it("includes base warning for active instructor", () => {
    const copy = getChangeInstructorEmailWarningCopy(baseUser);
    for (const line of CHANGE_INSTRUCTOR_EMAIL_BASE_WARNING) {
      expect(copy).toContain(line);
    }
    expect(copy).not.toContain(
      CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.deactivated,
    );
    expect(copy).not.toContain(
      CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.pendingApproval,
    );
  });

  it("includes pending approval note", () => {
    const copy = getChangeInstructorEmailWarningCopy({
      ...baseUser,
      isApproved: false,
    });
    expect(copy).toContain(
      CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.pendingApproval,
    );
  });

  it("includes deactivated note", () => {
    const copy = getChangeInstructorEmailWarningCopy({
      ...baseUser,
      isApproved: false,
      instructor: {
        ...baseUser.instructor!,
        isAvailableForBooking: false,
      },
    });
    expect(copy).toContain(CHANGE_INSTRUCTOR_EMAIL_STATE_WARNING.deactivated);
  });
});

describe("canShowChangeInstructorEmailAction", () => {
  it("requires instructor profile id", () => {
    expect(canShowChangeInstructorEmailAction(baseUser)).toBe(true);
    expect(
      canShowChangeInstructorEmailAction({
        ...baseUser,
        instructor: undefined,
      }),
    ).toBe(false);
  });
});

describe("changeInstructorEmailApiErrorMessage", () => {
  it("maps stable codes", () => {
    expect(
      changeInstructorEmailApiErrorMessage("user_email_already_exists", ""),
    ).toContain("already exists");
    expect(
      changeInstructorEmailApiErrorMessage("pending_invitation_exists", ""),
    ).toContain("pending invitation");
    expect(
      changeInstructorEmailApiErrorMessage("linked_user_role_mismatch", ""),
    ).toContain("instructor account");
    expect(
      changeInstructorEmailApiErrorMessage("unknown_code", "Fallback"),
    ).toBe("Fallback");
  });
});
