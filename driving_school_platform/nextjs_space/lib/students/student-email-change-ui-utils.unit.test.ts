import { describe, it, expect } from "vitest";
import {
  CHANGE_STUDENT_EMAIL_WARNING,
  canShowChangeStudentEmailAction,
  changeStudentEmailApiErrorMessage,
  getChangeStudentEmailWarningCopy,
  shouldHideStudentProfileEmailField,
  shouldOmitEmailFromStudentPatch,
} from "@/lib/students/student-email-change-ui-utils";

describe("getChangeStudentEmailWarningCopy", () => {
  it("returns APP_USER warning", () => {
    expect(getChangeStudentEmailWarningCopy("APP_USER")).toBe(
      CHANGE_STUDENT_EMAIL_WARNING.APP_USER,
    );
  });

  it("returns INVITED warning", () => {
    expect(getChangeStudentEmailWarningCopy("INVITED")).toBe(
      CHANGE_STUDENT_EMAIL_WARNING.INVITED,
    );
  });

  it("returns MANUAL_ONLY warning by default", () => {
    expect(getChangeStudentEmailWarningCopy("MANUAL_ONLY")).toBe(
      CHANGE_STUDENT_EMAIL_WARNING.MANUAL_ONLY,
    );
  });
});

describe("shouldHideStudentProfileEmailField", () => {
  it("hides for APP_USER and INVITED", () => {
    expect(
      shouldHideStudentProfileEmailField({ appAccessMode: "APP_USER" }),
    ).toBe(true);
    expect(
      shouldHideStudentProfileEmailField({ appAccessMode: "INVITED" }),
    ).toBe(true);
  });

  it("shows for MANUAL_ONLY", () => {
    expect(
      shouldHideStudentProfileEmailField({ appAccessMode: "MANUAL_ONLY" }),
    ).toBe(false);
  });
});

describe("shouldOmitEmailFromStudentPatch", () => {
  it("matches hide profile email rules", () => {
    expect(shouldOmitEmailFromStudentPatch({ appAccessMode: "INVITED" })).toBe(
      true,
    );
    expect(
      shouldOmitEmailFromStudentPatch({ appAccessMode: "MANUAL_ONLY" }),
    ).toBe(false);
  });
});

describe("canShowChangeStudentEmailAction", () => {
  it("allows all access modes", () => {
    expect(canShowChangeStudentEmailAction({ appAccessMode: "APP_USER" })).toBe(
      true,
    );
    expect(canShowChangeStudentEmailAction({ appAccessMode: "INVITED" })).toBe(
      true,
    );
    expect(
      canShowChangeStudentEmailAction({ appAccessMode: "MANUAL_ONLY" }),
    ).toBe(true);
  });
});

describe("changeStudentEmailApiErrorMessage", () => {
  it("maps stable codes", () => {
    expect(
      changeStudentEmailApiErrorMessage("user_email_already_exists", ""),
    ).toContain("already exists");
    expect(
      changeStudentEmailApiErrorMessage("student_email_already_in_use", ""),
    ).toContain("Another student");
    expect(
      changeStudentEmailApiErrorMessage("pending_invitation_exists", ""),
    ).toContain("pending invitation");
    expect(changeStudentEmailApiErrorMessage("unknown_code", "Fallback")).toBe(
      "Fallback",
    );
  });
});
