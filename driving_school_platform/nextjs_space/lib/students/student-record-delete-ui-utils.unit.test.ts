import { describe, it, expect } from "vitest";
import {
  getStudentDeleteBlockedModalFooterNote,
  getStudentDeleteUiState,
} from "./student-record-delete-ui-utils";

describe("getStudentDeleteUiState", () => {
  it("allows MANUAL_ONLY without userId", () => {
    expect(
      getStudentDeleteUiState({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
      }),
    ).toEqual({ allowed: true, blockMessages: [] });
  });

  it("blocks APP_USER with app access removal guidance", () => {
    const state = getStudentDeleteUiState({
      appAccessMode: "APP_USER",
      userId: "u1",
    });
    expect(state.allowed).toBe(false);
    expect(
      state.blockMessages.some((m) => m.includes("app access is active")),
    ).toBe(true);
    expect(
      state.blockMessages.some((m) => m.includes("Remove app access")),
    ).toBe(true);
    expect(
      state.blockMessages.some((m) => m.includes("historical records")),
    ).toBe(true);
  });

  it("blocks INVITED with revoke guidance", () => {
    const state = getStudentDeleteUiState({
      appAccessMode: "INVITED",
      userId: null,
    });
    expect(state.allowed).toBe(false);
    expect(state.blockMessages.some((m) => m.includes("invitation"))).toBe(
      true,
    );
  });

  it("blocks MANUAL_ONLY with linked userId", () => {
    const state = getStudentDeleteUiState({
      appAccessMode: "MANUAL_ONLY",
      userId: "u1",
    });
    expect(state.allowed).toBe(false);
  });
});

describe("getStudentDeleteBlockedModalFooterNote", () => {
  it("states delete does not remove app access automatically", () => {
    expect(getStudentDeleteBlockedModalFooterNote()).toContain(
      "does not remove app access automatically",
    );
  });
});
