import { describe, it, expect } from "vitest";
import {
  canShowRemoveStudentAppAccessAction,
  REMOVE_STUDENT_APP_ACCESS_MODAL,
} from "./student-app-access-remove-ui-utils";

describe("canShowRemoveStudentAppAccessAction", () => {
  it("shows for APP_USER with userId", () => {
    expect(
      canShowRemoveStudentAppAccessAction({
        appAccessMode: "APP_USER",
        userId: "u1",
      }),
    ).toBe(true);
  });

  it("hides for MANUAL_ONLY", () => {
    expect(
      canShowRemoveStudentAppAccessAction({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
      }),
    ).toBe(false);
  });

  it("hides for INVITED", () => {
    expect(
      canShowRemoveStudentAppAccessAction({
        appAccessMode: "INVITED",
        userId: null,
      }),
    ).toBe(false);
  });

  it("hides for APP_USER without userId", () => {
    expect(
      canShowRemoveStudentAppAccessAction({
        appAccessMode: "APP_USER",
        userId: null,
      }),
    ).toBe(false);
  });
});

describe("REMOVE_STUDENT_APP_ACCESS_MODAL", () => {
  it("uses approved confirmation copy", () => {
    expect(REMOVE_STUDENT_APP_ACCESS_MODAL.title).toBe("Remove app access?");
    expect(REMOVE_STUDENT_APP_ACCESS_MODAL.description).toContain(
      "preserving the student profile, lessons, payments, and history",
    );
    expect(REMOVE_STUDENT_APP_ACCESS_MODAL.confirmLabel).toBe(
      "Remove app access",
    );
  });
});
