/**
 * DTO mapping for GET /api/admin/instructors/all (booking list).
 */

export type InstructorBookingListItem = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  isAvailableForBooking: boolean;
  /** Present when `forBooking=true` — active qualified category names (may be empty). */
  qualifiedCategoryNames?: string[];
  /** Present when `forBooking=true` — ISO date (YYYY-MM-DD) or null when unset. */
  instructorLicenseExpiry?: string | null;
};

type InstructorUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  instructor: {
    isAvailableForBooking: boolean;
    instructorLicenseExpiry?: Date | null;
    qualifiedCategories?: { name: string }[];
  } | null;
};

export function formatInstructorLicenseExpiryForBooking(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function mapInstructorUserToBookingListItem(
  user: InstructorUserRow,
  options: { includeBookingMetadata: boolean },
): InstructorBookingListItem {
  const item: InstructorBookingListItem = {
    id: user.id,
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name:
      `${user.firstName} ${user.lastName}`.trim() || user.email || "Instructor",
    isAvailableForBooking: user.instructor?.isAvailableForBooking ?? false,
  };

  if (options.includeBookingMetadata) {
    item.qualifiedCategoryNames =
      user.instructor?.qualifiedCategories?.map((category) => category.name) ??
      [];
    item.instructorLicenseExpiry = formatInstructorLicenseExpiryForBooking(
      user.instructor?.instructorLicenseExpiry,
    );
  }

  return item;
}

export function mapInstructorUsersToBookingList(
  users: InstructorUserRow[],
  options: { includeBookingMetadata: boolean },
): InstructorBookingListItem[] {
  return users.map((user) => mapInstructorUserToBookingListItem(user, options));
}
