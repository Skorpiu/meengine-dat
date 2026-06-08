import { describe, it, expect } from "vitest";
import {
  getInstructorDeleteBlockedModalBody,
  getInstructorDeleteBlockedModalFooterNote,
  getInstructorDeleteUiState,
} from "./instructor-record-delete-ui-utils";

describe("getInstructorDeleteUiState", () => {
  it("is always blocked in v1", () => {
    const state = getInstructorDeleteUiState();
    expect(state.allowed).toBe(false);
    expect(state.title).toBe("Delete not available");
  });

  it("explains operational history and future policy", () => {
    const state = getInstructorDeleteUiState();
    expect(state.blockMessages[0]).toContain("lessons");
    expect(state.blockMessages[0]).toContain("delete policy");
    expect(state.footerNote).toContain("instructor-delete-policy-v1");
    expect(state.footerNote).toContain("is deleted from this action");
  });
});

describe("getInstructorDeleteBlockedModalBody", () => {
  it("matches primary blocked copy", () => {
    expect(getInstructorDeleteBlockedModalBody()).toContain(
      "Instructor deletion is not available yet",
    );
  });
});

describe("getInstructorDeleteBlockedModalFooterNote", () => {
  it("states no records are deleted from row action", () => {
    expect(getInstructorDeleteBlockedModalFooterNote()).toContain(
      "No instructor profile",
    );
  });
});
