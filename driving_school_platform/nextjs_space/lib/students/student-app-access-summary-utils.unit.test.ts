import { describe, it, expect } from "vitest";
import {
  formatAppAccessCompactSummaryLine,
  formatCategoryCompactLabel,
  getStudentAppAccessCompactBadges,
} from "./student-app-access-summary-utils";

describe("formatCategoryCompactLabel", () => {
  it("returns null for empty categories", () => {
    expect(formatCategoryCompactLabel([])).toBeNull();
    expect(formatCategoryCompactLabel(["", "  "])).toBeNull();
  });

  it("formats single category", () => {
    expect(formatCategoryCompactLabel(["B"])).toBe("Category B");
  });

  it("formats multiple categories", () => {
    expect(formatCategoryCompactLabel(["A", "B"])).toBe("Categories A, B");
  });
});

describe("formatAppAccessCompactSummaryLine", () => {
  it("builds login status summary only", () => {
    expect(
      formatAppAccessCompactSummaryLine({
        isApproved: true,
      }),
    ).toBe("Active app access");
  });

  it("shows pending approval when not approved", () => {
    expect(
      formatAppAccessCompactSummaryLine({
        isApproved: false,
      }),
    ).toBe("App access pending approval");
  });
});

describe("getStudentAppAccessCompactBadges", () => {
  it("returns no badges for MANUAL_ONLY", () => {
    expect(
      getStudentAppAccessCompactBadges(
        { appAccessMode: "MANUAL_ONLY", userId: null },
        null,
      ),
    ).toEqual([]);
  });

  it("returns status badge only for APP_USER", () => {
    expect(
      getStudentAppAccessCompactBadges(
        { appAccessMode: "APP_USER", userId: "u1" },
        { isApproved: true },
      ),
    ).toEqual([
      expect.objectContaining({
        key: "app-access-status",
        label: "Active app access",
      }),
    ]);
  });

  it("does not include category or transmission badges", () => {
    const badges = getStudentAppAccessCompactBadges(
      { appAccessMode: "APP_USER", userId: "u1" },
      { isApproved: true },
    );
    expect(badges.map((b) => b.key)).toEqual(["app-access-status"]);
  });
});
