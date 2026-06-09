import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  PEOPLE_APP_ACCESS_SECTION_THEME,
  PEOPLE_OPERATIONAL_ACTIVE_BADGE,
  PEOPLE_OPERATIONAL_INACTIVE_BADGE,
} from "@/lib/people/people-app-access-ui-theme";

export function filterInstructorRecordUsers(
  users: InstructorRecordUserDto[],
): InstructorRecordUserDto[] {
  return users.filter((user) => user.role === "INSTRUCTOR");
}

export function getInstructorRecordDisplayName(
  user: InstructorRecordUserDto,
): string {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const combined = [first, last].filter(Boolean).join(" ");
  return combined || user.email || "Instructor";
}

export function formatInstructorLicenseExpiry(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getInstructorAppAccountStatusLabel(
  isApproved: boolean,
): string {
  return isApproved ? "App access active" : "App access pending approval";
}

export function isInstructorProfileInactive(
  user: InstructorRecordUserDto,
): boolean {
  return user.instructor?.isAvailableForBooking === false;
}

export function isInstructorPendingApproval(
  user: InstructorRecordUserDto,
): boolean {
  return user.instructor?.isAvailableForBooking !== false && !user.isApproved;
}

/** Instructors → Profiles row subtitle (app account lifecycle, not operational profile data). */
export function getInstructorProfileAppAccountSubtitle(
  user: InstructorRecordUserDto,
): string {
  if (isInstructorProfileInactive(user)) {
    return "App account inactive";
  }
  if (isInstructorPendingApproval(user)) {
    return "App account awaiting approval";
  }
  return "App account linked";
}

/** Phone + app-account subtitle line on instructor profile rows. */
export function formatInstructorProfileContactLine(
  user: InstructorRecordUserDto,
): string {
  const phone = user.phoneNumber?.trim() ? user.phoneNumber : "No phone";
  return `${phone} · ${getInstructorProfileAppAccountSubtitle(user)}`;
}

export type InstructorPeopleStatusBadge = {
  label: string;
  variant: "secondary" | "default" | "destructive" | "outline";
  className?: string;
  tooltip: string;
};

export type InstructorAppAccessSectionTheme = {
  containerClass: string;
  triggerTitleClass: string;
  triggerIconClass: string;
  bodyTextClass: string;
  labelTextClass: string;
  mutedTextClass: string;
};

/** Edit Instructor → App access: same blue section as Edit Student → App access. */
export function getInstructorAppAccessSectionTheme(): InstructorAppAccessSectionTheme {
  return PEOPLE_APP_ACCESS_SECTION_THEME;
}

/**
 * Instructors → Profiles row badge.
 * Active/Inactive follow Vehicles; pending approval follows Students app-access badges.
 */
export function getInstructorPeopleStatusBadge(
  user: InstructorRecordUserDto,
): InstructorPeopleStatusBadge {
  if (isInstructorProfileInactive(user)) {
    return {
      label: PEOPLE_OPERATIONAL_INACTIVE_BADGE.label,
      variant: PEOPLE_OPERATIONAL_INACTIVE_BADGE.variant,
      tooltip:
        "Instructor is deactivated — not available for new bookings; app login disabled. History is preserved.",
    };
  }
  if (isInstructorPendingApproval(user)) {
    return {
      label: "App access pending approval",
      variant: "default",
      tooltip: "Account exists but is not approved yet.",
    };
  }
  return {
    label: PEOPLE_OPERATIONAL_ACTIVE_BADGE.label,
    variant: PEOPLE_OPERATIONAL_ACTIVE_BADGE.variant,
    tooltip: "Instructor is active — available for booking and can sign in.",
  };
}

/**
 * Edit Instructor → App access status badge.
 * Wording/colors match Edit Student → App access (`Access status` row).
 */
export function getInstructorEditAppAccessStatusBadge(
  user: InstructorRecordUserDto,
): InstructorPeopleStatusBadge {
  if (isInstructorProfileInactive(user)) {
    return {
      label: PEOPLE_OPERATIONAL_INACTIVE_BADGE.label,
      variant: PEOPLE_OPERATIONAL_INACTIVE_BADGE.variant,
      tooltip:
        "Instructor is deactivated — login disabled; history preserved. Reactivate from App access when needed.",
    };
  }
  if (isInstructorPendingApproval(user)) {
    return {
      label: "Pending approval",
      variant: "default",
      tooltip: "Account exists but is not approved yet.",
    };
  }
  return {
    label: "Approved — can sign in",
    variant: "secondary",
    tooltip: "Instructor can sign in and is available for booking.",
  };
}

const INSTRUCTOR_SEARCH_NORMALIZE = (value: string) =>
  value.trim().toLowerCase();

export function matchesInstructorRecordSearch(
  user: InstructorRecordUserDto,
  query: string,
): boolean {
  const q = INSTRUCTOR_SEARCH_NORMALIZE(query);
  if (!q) {
    return true;
  }
  const name = getInstructorRecordDisplayName(user).toLowerCase();
  const email = (user.email ?? "").toLowerCase();
  const license = (
    user.instructor?.instructorLicenseNumber ?? ""
  ).toLowerCase();
  const instructorId = (
    user.instructor?.instructorIdNumber ?? ""
  ).toLowerCase();
  return (
    name.includes(q) ||
    email.includes(q) ||
    license.includes(q) ||
    instructorId.includes(q)
  );
}

export function filterInstructorRecordUsersBySearch(
  users: InstructorRecordUserDto[],
  query: string,
): InstructorRecordUserDto[] {
  const trimmed = query.trim();
  const base = filterInstructorRecordUsers(users);
  if (!trimmed) {
    return base;
  }
  return base.filter((user) => matchesInstructorRecordSearch(user, trimmed));
}

export function hasOperationalInstructorRecord(
  user: InstructorRecordUserDto,
): boolean {
  return Boolean(
    user.instructor?.instructorLicenseNumber &&
      user.instructor?.instructorLicenseExpiry,
  );
}
