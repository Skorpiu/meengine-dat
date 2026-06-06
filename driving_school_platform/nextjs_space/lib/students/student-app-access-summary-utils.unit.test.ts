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
  it("builds compact summary with transmission and category", () => {
    expect(
      formatAppAccessCompactSummaryLine({
        isApproved: true,
        transmissionType: "Automatic",
        selectedCategories: ["B"],
      }),
    ).toBe("Active app access · Automatic · Category B");
  });

  it("omits empty transmission and categories", () => {
    expect(
      formatAppAccessCompactSummaryLine({
        isApproved: true,
        transmissionType: "",
        selectedCategories: [],
      }),
    ).toBe("Active app access");
  });

  it("shows pending approval when not approved", () => {
    expect(
      formatAppAccessCompactSummaryLine({
        isApproved: false,
        transmissionType: "Manual",
        selectedCategories: [],
      }),
    ).toBe("App access pending approval · Manual");
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

  it("returns status badge only when linked details missing", () => {
    expect(
      getStudentAppAccessCompactBadges(
        { appAccessMode: "APP_USER", userId: "u1" },
        null,
      ),
    ).toEqual([
      expect.objectContaining({
        key: "app-access-status",
        label: "Active app access",
      }),
    ]);
  });

  it("includes transmission and category badges when present", () => {
    const badges = getStudentAppAccessCompactBadges(
      { appAccessMode: "APP_USER", userId: "u1" },
      {
        isApproved: true,
        transmissionType: "Automatic",
        selectedCategories: ["B"],
      },
    );
    expect(badges.map((b) => b.label)).toEqual([
      "Active app access",
      "Automatic",
      "Category B",
    ]);
  });
});
