import { describe, it, expect } from "vitest";
import {
  canShowInvitationChangeEmailAction,
  changeInvitationEmailApiErrorMessage,
  CHANGE_INVITATION_EMAIL_WARNING_LINES,
  getChangeInvitationEmailWarningCopy,
} from "./invitation-email-update-ui-utils";
import type { InvitationDto } from "./invitation-dto";

const instructorPending: InvitationDto = {
  id: "inv-1",
  studentId: null,
  email: "inst@school.test",
  role: "INSTRUCTOR",
  status: "PENDING",
  expiresAt: "2026-06-09T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-05-21T12:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

const studentPending: InvitationDto = {
  ...instructorPending,
  id: "inv-2",
  role: "STUDENT",
};

describe("invitation-email-update-ui-utils", () => {
  it("includes required warning copy lines", () => {
    expect(CHANGE_INVITATION_EMAIL_WARNING_LINES).toContain(
      "The previous invite link will stop working.",
    );
    expect(CHANGE_INVITATION_EMAIL_WARNING_LINES).toContain(
      "Copy the new link after saving.",
    );
    expect(CHANGE_INVITATION_EMAIL_WARNING_LINES).toContain(
      "Email is not sent automatically.",
    );
    expect(getChangeInvitationEmailWarningCopy()).toContain(
      "The previous invite link will stop working.",
    );
  });

  it("shows Change email for onboarding pending unlinked rows matching role tab", () => {
    expect(
      canShowInvitationChangeEmailAction(instructorPending, "INSTRUCTOR"),
    ).toBe(true);
    expect(canShowInvitationChangeEmailAction(studentPending, "STUDENT")).toBe(
      true,
    );
    expect(
      canShowInvitationChangeEmailAction(studentPending, "INSTRUCTOR"),
    ).toBe(false);
    expect(
      canShowInvitationChangeEmailAction(instructorPending, "STUDENT"),
    ).toBe(false);
    expect(canShowInvitationChangeEmailAction(instructorPending)).toBe(false);
    expect(
      canShowInvitationChangeEmailAction(
        { ...studentPending, studentId: "stu-1" },
        "STUDENT",
      ),
    ).toBe(false);
    expect(
      canShowInvitationChangeEmailAction(
        { ...instructorPending, studentId: "stu-1" },
        "INSTRUCTOR",
      ),
    ).toBe(false);
    expect(
      canShowInvitationChangeEmailAction(
        { ...studentPending, status: "REVOKED" },
        "STUDENT",
      ),
    ).toBe(false);
  });

  it("maps stable API error codes to operator copy", () => {
    expect(changeInvitationEmailApiErrorMessage("invalid_email", "x")).toBe(
      "Invalid email address.",
    );
    expect(changeInvitationEmailApiErrorMessage("email_unchanged", "x")).toBe(
      "The new email is the same as the current email.",
    );
    expect(
      changeInvitationEmailApiErrorMessage("user_already_exists", "x"),
    ).toBe("An account with this email already exists.");
    expect(
      changeInvitationEmailApiErrorMessage("pending_invitation_exists", "x"),
    ).toBe("A pending invitation already exists for this email.");
    expect(
      changeInvitationEmailApiErrorMessage("invitation_not_pending", "x"),
    ).toBe("Only pending invitations can be updated.");
    expect(
      changeInvitationEmailApiErrorMessage("unsupported_invitation_role", "x"),
    ).toBe("This invitation type is not supported for change email.");
    expect(
      changeInvitationEmailApiErrorMessage("student_email_already_in_use", "x"),
    ).toBe("A student record with this email already exists.");
    expect(
      changeInvitationEmailApiErrorMessage(
        "unsupported_linked_student_invitation",
        "x",
      ),
    ).toBe("Linked student invitations cannot be updated here.");
    expect(
      changeInvitationEmailApiErrorMessage("demo_restricted_action", "x"),
    ).toBe("x");
    expect(changeInvitationEmailApiErrorMessage(undefined, "fallback")).toBe(
      "fallback",
    );
  });
});
