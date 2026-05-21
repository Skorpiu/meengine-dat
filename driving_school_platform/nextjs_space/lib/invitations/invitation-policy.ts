import type { UserRole } from "@prisma/client";

/** Roles allowed on organization invite-only flows (never SUPER_ADMIN / PLATFORM_ADMIN). */
export const INVITABLE_USER_ROLES = [
  "STUDENT",
  "INSTRUCTOR",
] as const satisfies readonly UserRole[];

export type InvitableUserRole = (typeof INVITABLE_USER_ROLES)[number];

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isInvitableUserRole(value: string): value is InvitableUserRole {
  return (INVITABLE_USER_ROLES as readonly string[]).includes(value);
}
