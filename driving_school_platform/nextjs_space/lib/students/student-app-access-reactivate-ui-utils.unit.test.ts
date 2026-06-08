import { describe, it, expect } from "vitest";
import {
  canShowReactivateStudentAppAccessAction,
  canShowStudentReactivateAppAccessSection,
  REACTIVATE_STUDENT_APP_ACCESS_MODAL,
} from "./student-app-access-reactivate-ui-utils";

describe("canShowReactivateStudentAppAccessAction", () => {
  it("shows for MANUAL_ONLY with email and no userId", () => {
    expect(
      canShowReactivateStudentAppAccessAction({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
        email: "student@school.test",
      }),
    ).toBe(true);
  });

  it("hides for APP_USER", () => {
    expect(
      canShowReactivateStudentAppAccessAction({
        appAccessMode: "APP_USER",
        userId: "u1",
        email: "student@school.test",
      }),
    ).toBe(false);
  });

  it("hides for INVITED", () => {
    expect(
      canShowReactivateStudentAppAccessAction({
        appAccessMode: "INVITED",
        userId: null,
        email: "student@school.test",
      }),
    ).toBe(false);
  });

  it("hides without email", () => {
    expect(
      canShowReactivateStudentAppAccessAction({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
        email: null,
      }),
    ).toBe(false);
  });
});

describe("canShowStudentReactivateAppAccessSection", () => {
  it("matches reactivate action visibility", () => {
    const student = {
      appAccessMode: "MANUAL_ONLY" as const,
      userId: null,
      email: "a@b.com",
    };
    expect(canShowStudentReactivateAppAccessSection(student)).toBe(
      canShowReactivateStudentAppAccessAction(student),
    );
  });
});

describe("REACTIVATE_STUDENT_APP_ACCESS_MODAL", () => {
  it("uses approved confirmation copy", () => {
    expect(REACTIVATE_STUDENT_APP_ACCESS_MODAL.title).toBe(
      "Reactivate app access?",
    );
    expect(REACTIVATE_STUDENT_APP_ACCESS_MODAL.description).toContain(
      "existing student profile",
    );
    expect(REACTIVATE_STUDENT_APP_ACCESS_MODAL.confirmLabel).toBe(
      "Reactivate app access",
    );
  });
});
