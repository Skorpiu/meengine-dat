import type { UserRole } from "@/lib/types";

const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "School Admin",
  PLATFORM_ADMIN: "Platform Admin",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
};

/**
 * Canonical product-facing label for a persisted DAT user role.
 * Internal auth values (e.g. SUPER_ADMIN) must not be shown directly in UI.
 */
export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/**
 * Maps external or legacy role strings to a friendly product label when possible.
 * Unknown values are returned unchanged (deterministic fallback).
 */
export function getUserRoleLabelFromString(
  role: string | null | undefined,
): string {
  if (!role?.trim()) {
    return "—";
  }

  const normalized = role.trim() as UserRole;
  if (normalized in USER_ROLE_LABELS) {
    return USER_ROLE_LABELS[normalized];
  }

  return role;
}
