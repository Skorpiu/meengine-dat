/**
 * Derives display initials for People profile rows (Students / Instructors).
 * Uppercase; predictable fallback when names are missing.
 */
export function getPeopleProfileInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  const combined = (first + last).toUpperCase();
  return combined || "?";
}
