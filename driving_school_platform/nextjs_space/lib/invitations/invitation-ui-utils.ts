import type { InvitationDto } from "./invitation-dto";
import type { InvitableRole } from "./invitation-ui-types";
import { isInvitationExpired } from "./invitation-token-service";

export type InvitationDisplayStatus = "Pending" | "Expired";

/** Admin copy when linked student invites exist but are omitted from Onboarding list. */
export const STUDENT_LINKED_INVITES_ON_PROFILES_COPY =
  "Invitations tied to an existing student profile are managed on Students → Profiles (Send invitation / Revoke on the profile row).";

/** Admin copy when a pending invitation is past its expiry (client-side only). */
export const INVITATION_EXPIRED_ADMIN_ACTION_COPY =
  "This invitation has expired. Revoke it before sending a new one.";

export function formatInvitationDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Client-side filter for role-scoped invitation tabs (no API query param). */
export function filterInvitationsByRole(
  invitations: InvitationDto[],
  role: InvitableRole,
): InvitationDto[] {
  return invitations.filter((invitation) => invitation.role === role);
}

export function filterPendingInvitations(
  invitations: InvitationDto[],
): InvitationDto[] {
  return invitations.filter((invitation) => invitation.status === "PENDING");
}

export function isInvitationExpiredForDisplay(
  expiresAtIso: string,
  now: Date = new Date(),
): boolean {
  const expiresAt = new Date(expiresAtIso);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }
  return isInvitationExpired(expiresAt, now);
}

/** Pending vs Expired for admin lists (does not write EXPIRED to the database). */
export function getInvitationDisplayStatus(
  invitation: Pick<InvitationDto, "status" | "expiresAt">,
  now: Date = new Date(),
): InvitationDisplayStatus {
  if (invitation.status !== "PENDING") {
    return invitation.status === "EXPIRED" ? "Expired" : "Pending";
  }
  if (isInvitationExpiredForDisplay(invitation.expiresAt, now)) {
    return "Expired";
  }
  return "Pending";
}

export function invitationDisplayStatusLabel(
  status: InvitationDisplayStatus,
): string {
  return status === "Expired" ? "Expired" : "Pending";
}

export function partitionStudentPendingInvitations(
  invitations: InvitationDto[],
): { linked: InvitationDto[]; unlinked: InvitationDto[] } {
  const pendingStudents = invitations.filter(
    (invitation) =>
      invitation.role === "STUDENT" && invitation.status === "PENDING",
  );
  return {
    linked: pendingStudents.filter(
      (invitation) => invitation.studentId != null,
    ),
    unlinked: pendingStudents.filter(
      (invitation) => invitation.studentId == null,
    ),
  };
}

export function filterUnlinkedPendingStudentInvitations(
  invitations: InvitationDto[],
): InvitationDto[] {
  return partitionStudentPendingInvitations(invitations).unlinked;
}

export function countLinkedPendingStudentInvitations(
  invitations: InvitationDto[],
): number {
  return partitionStudentPendingInvitations(invitations).linked.length;
}

/**
 * Rows shown in People → Onboarding invitation lists.
 * Student tab: unlinked pending only; instructor tab: all pending for role.
 */
export function getOnboardingVisibleInvitations(
  invitations: InvitationDto[],
  roleFilter?: InvitableRole,
): InvitationDto[] {
  const pending = filterPendingInvitations(invitations);
  const byRole = roleFilter
    ? filterInvitationsByRole(pending, roleFilter)
    : pending;

  if (roleFilter === "STUDENT") {
    return filterUnlinkedPendingStudentInvitations(byRole);
  }

  return byRole;
}

export function invitationStatusLabel(status: InvitationDto["status"]): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "EXPIRED":
      return "Expired";
    case "REVOKED":
      return "Revoked";
    default:
      return status;
  }
}

export type InvitationApiErrorMessageOptions = {
  /** Admin create/revoke UI — slightly different copy for operators. */
  forAdmin?: boolean;
};

/** User-facing copy for invitation API `code` values (admin + public accept). */
export function invitationApiErrorMessage(
  code: string | undefined,
  fallback: string,
  options?: InvitationApiErrorMessageOptions,
): string {
  switch (code) {
    case "missing_invitation_token":
      return "Missing invitation link. Use the full URL from your driving school.";
    case "invalid_token":
      return "This invitation link is not valid. Check the URL or ask for a new invite.";
    case "invitation_expired":
      return "This invitation has expired. Ask your school admin for a new invite.";
    case "invitation_revoked":
      return "This invitation was revoked by your school admin and can no longer be used.";
    case "invitation_already_accepted":
      return "This invitation was already used. Sign in with your account, or ask for a new invite.";
    case "invitation_not_pending":
      return "This invitation is no longer active.";
    case "user_already_exists":
      return options?.forAdmin
        ? "An account with this email already exists. Ask the user to sign in instead."
        : "An account with this email already exists. Try signing in instead.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email. Revoke it or wait until it expires.";
    case "instructor_license_exists":
      return "An instructor with this license number already exists.";
    case "instructor_license_pending_invitation":
      return "A pending invitation already exists for this license number. Revoke it or use a different license number.";
    case "invalid_instructor_license":
      return fallback;
    case "demo_mutation_disabled":
    case "demo_restricted_action":
      return fallback;
    default:
      return fallback;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
