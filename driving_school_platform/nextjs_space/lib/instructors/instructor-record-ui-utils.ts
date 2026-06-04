import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";

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
