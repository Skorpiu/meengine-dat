import { describe, it, expect } from "vitest";
import {
  buildInstructorQualifiedCategoriesPatchBody,
  buildInstructorUserUpdateBody,
  formatInstructorLicenseExpiryInputValue,
  formatInstructorQualifiedCategoriesLabel,
  hasInstructorEditFormChanges,
  hasInstructorProfileFormChanges,
  hasInstructorQualifiedCategoryChanges,
  instructorQualifiedCategoriesApiErrorMessage,
  INSTRUCTOR_PROFILE_ROW_DELETE_LABEL,
  INSTRUCTOR_PROFILE_ROW_EDIT_LABEL,
  INSTRUCTOR_PROFILES_LEGACY_ROW_EDIT_LABEL,
  shouldShowLoginEmailInAppAccessSection,
  toInstructorEditForm,
} from "./instructor-record-edit-ui-utils";
import type { InstructorRecordUserDto } from "./instructor-record-ui-types";

const baseInstructor = (
  overrides: Partial<InstructorRecordUserDto> = {},
): InstructorRecordUserDto => ({
  id: "user-1",
  email: "inst@school.test",
  firstName: "Ana",
  lastName: "Silva",
  phoneNumber: "+351912000000",
  address: "Rua A 1",
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorIdNumber: "INS-001",
    instructorLicenseNumber: "LIC-001",
    instructorLicenseExpiry: "2027-06-15",
    qualifiedCategories: [{ id: 2, name: "B" }],
  },
  ...overrides,
});

describe("Instructor profile row action labels", () => {
  it("uses Edit Instructor as primary Profiles action", () => {
    expect(INSTRUCTOR_PROFILE_ROW_EDIT_LABEL).toBe("Edit Instructor");
    expect(INSTRUCTOR_PROFILE_ROW_DELETE_LABEL).toBe("Delete");
  });

  it("does not use legacy Edit app account on Profiles row", () => {
    expect(INSTRUCTOR_PROFILE_ROW_EDIT_LABEL).not.toBe(
      INSTRUCTOR_PROFILES_LEGACY_ROW_EDIT_LABEL,
    );
  });
});

describe("formatInstructorLicenseExpiryInputValue", () => {
  it("formats ISO date for date input", () => {
    expect(formatInstructorLicenseExpiryInputValue("2027-06-15")).toBe(
      "2027-06-15",
    );
  });

  it("returns empty for invalid", () => {
    expect(formatInstructorLicenseExpiryInputValue("bad")).toBe("");
  });
});

describe("formatInstructorQualifiedCategoriesLabel", () => {
  it("joins category names", () => {
    expect(
      formatInstructorQualifiedCategoriesLabel([{ name: "B" }, { name: "A1" }]),
    ).toBe("B, A1");
  });

  it("returns em dash when empty", () => {
    expect(formatInstructorQualifiedCategoriesLabel([])).toBe("—");
  });
});

describe("toInstructorEditForm", () => {
  it("maps user, instructor, and qualified categories without email", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(form).toEqual({
      firstName: "Ana",
      lastName: "Silva",
      phoneNumber: "+351912000000",
      address: "Rua A 1",
      instructorLicenseNumber: "LIC-001",
      instructorLicenseExpiry: "2027-06-15",
      selectedCategories: ["B"],
    });
    expect(form).not.toHaveProperty("email");
  });
});

describe("buildInstructorUserUpdateBody", () => {
  it("builds PUT /api/users/update payload with role INSTRUCTOR", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(buildInstructorUserUpdateBody({ userId: "user-1", form })).toEqual({
      userId: "user-1",
      firstName: "Ana",
      lastName: "Silva",
      phoneNumber: "+351912000000",
      address: "Rua A 1",
      role: "INSTRUCTOR",
      instructorLicenseNumber: "LIC-001",
      instructorLicenseExpiry: "2027-06-15",
    });
  });

  it("does not include login email in payload", () => {
    const body = buildInstructorUserUpdateBody({
      userId: "user-1",
      form: toInstructorEditForm(baseInstructor()),
    });
    expect(body).not.toHaveProperty("email");
  });
});

describe("buildInstructorQualifiedCategoriesPatchBody", () => {
  it("builds PATCH payload from selected categories", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(
      buildInstructorQualifiedCategoriesPatchBody({
        form: { ...form, selectedCategories: ["B", "C1"] },
      }),
    ).toEqual({ qualifiedCategoryNames: ["B", "C1"] });
  });
});

describe("hasInstructorEditFormChanges", () => {
  it("detects no changes when equal", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(hasInstructorEditFormChanges(form, form)).toBe(false);
  });

  it("detects license change", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(
      hasInstructorProfileFormChanges(
        { ...form, instructorLicenseNumber: "LIC-002" },
        form,
      ),
    ).toBe(true);
  });

  it("detects qualified category change", () => {
    const form = toInstructorEditForm(baseInstructor());
    expect(
      hasInstructorQualifiedCategoryChanges(
        { ...form, selectedCategories: ["B", "A1"] },
        form,
      ),
    ).toBe(true);
  });
});

describe("instructorQualifiedCategoriesApiErrorMessage", () => {
  it("maps category_not_found", () => {
    expect(
      instructorQualifiedCategoriesApiErrorMessage(
        "category_not_found",
        "fallback",
      ),
    ).toContain("invalid or inactive");
  });
});

describe("shouldShowLoginEmailInAppAccessSection", () => {
  it("shows when email present", () => {
    expect(shouldShowLoginEmailInAppAccessSection("a@b.test")).toBe(true);
    expect(shouldShowLoginEmailInAppAccessSection("  ")).toBe(false);
  });
});
