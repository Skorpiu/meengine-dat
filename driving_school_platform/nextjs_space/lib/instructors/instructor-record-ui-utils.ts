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
  return isApproved ? "App account active" : "App account pending approval";
}

export function hasOperationalInstructorRecord(
  user: InstructorRecordUserDto,
): boolean {
  return Boolean(
    user.instructor?.instructorLicenseNumber &&
      user.instructor?.instructorLicenseExpiry,
  );
}
