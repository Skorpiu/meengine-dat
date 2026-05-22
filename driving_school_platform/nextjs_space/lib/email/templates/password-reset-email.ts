const DEFAULT_APP_NAME = "Driving Academy Tool";
const PASSWORD_RESET_TAGS = ["password-reset"] as const;

export type BuildPasswordResetEmailInput = {
  resetLink: string;
  expiresAt: Date;
  recipientEmail: string;
  appName?: string;
};

export type BuildPasswordResetEmailResult = {
  subject: string;
  html: string;
  text: string;
  tags: readonly string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatPasswordResetEmailExpiry(expiresAt: Date): string {
  if (Number.isNaN(expiresAt.getTime())) {
    return String(expiresAt);
  }
  return expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function buildPasswordResetSubject(appName: string): string {
  return `Reset your ${appName} password`;
}

function buildPasswordResetHtml(params: {
  appName: string;
  recipientEmail: string;
  expiresLabel: string;
  resetLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(buildPasswordResetSubject(params.appName))}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #222222;">
<p>Hello,</p>
<p>We received a request to reset the password for ${escapeHtml(params.recipientEmail)} on ${escapeHtml(params.appName)}.</p>
<p>This link expires at <strong>${escapeHtml(params.expiresLabel)}</strong> (UTC).</p>
<p><a href="${escapeHtml(params.resetLink)}" style="color: #1155cc;">Reset password</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p style="word-break: break-all;">${escapeHtml(params.resetLink)}</p>
<p style="font-size: 14px; color: #555555;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
</body>
</html>`;
}

function buildPasswordResetText(params: {
  appName: string;
  recipientEmail: string;
  expiresLabel: string;
  resetLink: string;
}): string {
  return [
    "Hello,",
    "",
    `We received a request to reset the password for ${params.recipientEmail} on ${params.appName}.`,
    "",
    `This link expires at ${params.expiresLabel} (UTC).`,
    "",
    "Reset your password using this link:",
    params.resetLink,
    "",
    "If you did not request a password reset, you can safely ignore this email. Your password will not change.",
  ].join("\n");
}

export function buildPasswordResetEmail(
  input: BuildPasswordResetEmailInput,
): BuildPasswordResetEmailResult {
  const appName = input.appName?.trim() || DEFAULT_APP_NAME;
  const expiresLabel = formatPasswordResetEmailExpiry(input.expiresAt);

  const shared = {
    appName,
    recipientEmail: input.recipientEmail,
    expiresLabel,
    resetLink: input.resetLink,
  };

  return {
    subject: buildPasswordResetSubject(appName),
    html: buildPasswordResetHtml(shared),
    text: buildPasswordResetText(shared),
    tags: [...PASSWORD_RESET_TAGS],
  };
}
