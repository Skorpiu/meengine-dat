import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";

/** Profiles row primary action label (replaces legacy Edit app account). */
export const INSTRUCTOR_PROFILE_ROW_EDIT_LABEL = "Edit Instructor";

export const INSTRUCTOR_PROFILE_ROW_DELETE_LABEL = "Delete";

/** Legacy row action — must not appear on Instructors → Profiles after unified editor. */
export const INSTRUCTOR_PROFILES_LEGACY_ROW_EDIT_LABEL = "Edit app account";

export type InstructorEditForm = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  instructorLicenseNumber: string;
  instructorLicenseExpiry: string;
  selectedCategories: string[];
};

export function formatInstructorLicenseExpiryInputValue(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function formatInstructorQualifiedCategoriesLabel(
  categories: { name: string }[] | null | undefined,
): string {
  if (!categories || categories.length === 0) {
    return "—";
  }
  return categories.map((category) => category.name).join(", ");
}

function sortedCategoryNames(names: string[]): string[] {
  return [...names]
    .map((name) => name.trim())
    .filter(Boolean)
    .sort();
}

export function instructorQualifiedCategoryNamesEqual(
  left: string[],
  right: string[],
): boolean {
  const a = sortedCategoryNames(left);
  const b = sortedCategoryNames(right);
  if (a.length !== b.length) return false;
  return a.every((name, index) => name === b[index]);
}

export function toInstructorEditForm(
  user: InstructorRecordUserDto,
): InstructorEditForm {
  return {
    firstName: user.firstName?.trim() ?? "",
    lastName: user.lastName?.trim() ?? "",
    phoneNumber: user.phoneNumber?.trim() ?? "",
    address: user.address?.trim() ?? "",
    instructorLicenseNumber:
      user.instructor?.instructorLicenseNumber?.trim() ?? "",
    instructorLicenseExpiry: formatInstructorLicenseExpiryInputValue(
      user.instructor?.instructorLicenseExpiry,
    ),
    selectedCategories:
      user.instructor?.qualifiedCategories?.map((category) => category.name) ??
      [],
  };
}

/** Body for PUT /api/users/update — profile fields on User; login email is not included. */
export function buildInstructorUserUpdateBody(input: {
  userId: string;
  form: InstructorEditForm;
}): Record<string, unknown> {
  const phone = input.form.phoneNumber.trim();
  return {
    userId: input.userId,
    firstName: input.form.firstName.trim(),
    lastName: input.form.lastName.trim(),
    phoneNumber: phone,
    address: input.form.address.trim(),
    role: "INSTRUCTOR",
    instructorLicenseNumber: input.form.instructorLicenseNumber.trim(),
    instructorLicenseExpiry: input.form.instructorLicenseExpiry,
  };
}

/** Body for PATCH /api/admin/instructors/[id] — operational qualified categories only. */
export function buildInstructorQualifiedCategoriesPatchBody(input: {
  form: InstructorEditForm;
}): { qualifiedCategoryNames: string[] } {
  return {
    qualifiedCategoryNames: [...input.form.selectedCategories],
  };
}

export function hasInstructorProfileFormChanges(
  form: InstructorEditForm,
  original: InstructorEditForm,
): boolean {
  return (
    form.firstName.trim() !== original.firstName.trim() ||
    form.lastName.trim() !== original.lastName.trim() ||
    form.phoneNumber.trim() !== original.phoneNumber.trim() ||
    form.address.trim() !== original.address.trim() ||
    form.instructorLicenseNumber.trim() !==
      original.instructorLicenseNumber.trim() ||
    form.instructorLicenseExpiry !== original.instructorLicenseExpiry
  );
}

export function hasInstructorQualifiedCategoryChanges(
  form: InstructorEditForm,
  original: InstructorEditForm,
): boolean {
  return !instructorQualifiedCategoryNamesEqual(
    form.selectedCategories,
    original.selectedCategories,
  );
}

export function hasInstructorEditFormChanges(
  form: InstructorEditForm,
  original: InstructorEditForm,
): boolean {
  return (
    hasInstructorProfileFormChanges(form, original) ||
    hasInstructorQualifiedCategoryChanges(form, original)
  );
}

/** Login email is read-only in App access — never part of the editable form payload. */
export function shouldShowLoginEmailInAppAccessSection(
  email: string | null | undefined,
): boolean {
  return Boolean(email?.trim());
}

export function instructorQualifiedCategoriesApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  if (code === "category_not_found") {
    return "One or more selected license categories are invalid or inactive.";
  }
  if (code === "invalid_request_body") {
    return "Invalid qualified categories request.";
  }
  return fallback;
}
