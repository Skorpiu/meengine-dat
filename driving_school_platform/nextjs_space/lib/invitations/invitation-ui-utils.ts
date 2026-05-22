import type { InvitationDto } from "./invitation-dto";

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

/** User-facing copy for invitation API `code` values (admin + public accept). */
export function invitationApiErrorMessage(
  code: string | undefined,
  fallback: string,
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
      return "An account with this email already exists. Try signing in instead.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email. Revoke it or wait until it expires.";
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
