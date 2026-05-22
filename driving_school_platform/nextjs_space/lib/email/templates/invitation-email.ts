import type { InvitableUserRole } from "@/lib/invitations/invitation-policy";

const DEFAULT_APP_NAME = "Driving Academy Tool";
const INVITATION_TAGS = ["invitation"] as const;

export type BuildInvitationEmailInput = {
  inviteLink: string;
  organizationName: string;
  role: InvitableUserRole;
  expiresAt: Date;
  invitedEmail: string;
  invitedByName?: string | null;
  appName?: string;
};

export type BuildInvitationEmailResult = {
  subject: string;
  html: string;
  text: string;
  tags: readonly string[];
};

export function invitationEmailRoleLabel(role: InvitableUserRole): string {
  switch (role) {
    case "STUDENT":
      return "Student";
    case "INSTRUCTOR":
      return "Instructor";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Stable, locale-fixed expiry line for transactional email (UTC). */
export function formatInvitationEmailExpiry(expiresAt: Date): string {
  if (Number.isNaN(expiresAt.getTime())) {
    return String(expiresAt);
  }
  return expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function buildInvitationSubject(
  organizationName: string,
  appName: string,
): string {
  return `Invitation to join ${organizationName} on ${appName}`;
}

function buildInvitationHtml(params: {
  appName: string;
  organizationName: string;
  roleLabel: string;
  invitedEmail: string;
  invitedByLine: string | null;
  expiresLabel: string;
  inviteLink: string;
}): string {
  const {
    appName,
    organizationName,
    roleLabel,
    invitedEmail,
    invitedByLine,
    expiresLabel,
    inviteLink,
  } = params;

  const invitedByHtml = invitedByLine
    ? `<p>${escapeHtml(invitedByLine)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(buildInvitationSubject(organizationName, appName))}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #222222;">
<p>Hello,</p>
<p>You have been invited to join <strong>${escapeHtml(organizationName)}</strong> on ${escapeHtml(appName)} as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
<p>This invitation was sent to ${escapeHtml(invitedEmail)}.</p>
${invitedByHtml}
<p>Please accept your invitation before <strong>${escapeHtml(expiresLabel)}</strong> (UTC).</p>
<p><a href="${escapeHtml(inviteLink)}" style="color: #1155cc;">Accept invitation</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p style="word-break: break-all;">${escapeHtml(inviteLink)}</p>
<p style="font-size: 14px; color: #555555;">If you did not expect this invitation, you can safely ignore this email.</p>
</body>
</html>`;
}

function buildInvitationText(params: {
  appName: string;
  organizationName: string;
  roleLabel: string;
  invitedEmail: string;
  invitedByLine: string | null;
  expiresLabel: string;
  inviteLink: string;
}): string {
  const lines = [
    "Hello,",
    "",
    `You have been invited to join ${params.organizationName} on ${params.appName} as a ${params.roleLabel}.`,
    "",
    `This invitation was sent to ${params.invitedEmail}.`,
  ];

  if (params.invitedByLine) {
    lines.push("", params.invitedByLine);
  }

  lines.push(
    "",
    `Please accept your invitation before ${params.expiresLabel} (UTC).`,
    "",
    "Accept your invitation using this link:",
    params.inviteLink,
    "",
    "If you did not expect this invitation, you can safely ignore this email.",
  );

  return lines.join("\n");
}

/**
 * Build invitation email content (HTML + plain text). Does not send mail or touch the database.
 */
export function buildInvitationEmail(
  input: BuildInvitationEmailInput,
): BuildInvitationEmailResult {
  const appName = input.appName?.trim() || DEFAULT_APP_NAME;
  const roleLabel = invitationEmailRoleLabel(input.role);
  const expiresLabel = formatInvitationEmailExpiry(input.expiresAt);
  const invitedByLine = input.invitedByName?.trim()
    ? `Invited by ${input.invitedByName.trim()}.`
    : null;

  const shared = {
    appName,
    organizationName: input.organizationName,
    roleLabel,
    invitedEmail: input.invitedEmail,
    invitedByLine,
    expiresLabel,
    inviteLink: input.inviteLink,
  };

  return {
    subject: buildInvitationSubject(input.organizationName, appName),
    html: buildInvitationHtml(shared),
    text: buildInvitationText(shared),
    tags: [...INVITATION_TAGS],
  };
}
