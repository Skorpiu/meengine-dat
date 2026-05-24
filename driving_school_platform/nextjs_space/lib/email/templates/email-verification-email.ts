const DEFAULT_APP_NAME = "Driving Academy Tool";
const EMAIL_VERIFICATION_TAGS = ["email-verification"] as const;

export type BuildEmailVerificationEmailInput = {
  verificationLink: string;
  expiresAt: Date;
  recipientEmail: string;
  appName?: string;
};

export type BuildEmailVerificationEmailResult = {
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

export function formatEmailVerificationEmailExpiry(expiresAt: Date): string {
  if (Number.isNaN(expiresAt.getTime())) {
    return String(expiresAt);
  }
  return expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

function sanitizePlainTextField(value: string): string {
  return value.replace(/[<>]/g, "");
}

function buildEmailVerificationSubject(appName: string): string {
  return `Verify your ${sanitizePlainTextField(appName)} email`;
}

function buildEmailVerificationHtml(params: {
  appName: string;
  recipientEmail: string;
  expiresLabel: string;
  verificationLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(buildEmailVerificationSubject(params.appName))}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #222222;">
<p>Hello,</p>
<p>Please verify the email address ${escapeHtml(params.recipientEmail)} for your ${escapeHtml(params.appName)} account.</p>
<p>This link expires at <strong>${escapeHtml(params.expiresLabel)}</strong> (UTC).</p>
<p><a href="${escapeHtml(params.verificationLink)}" style="color: #1155cc;">Verify email</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p style="word-break: break-all;">${escapeHtml(params.verificationLink)}</p>
<p style="font-size: 14px; color: #555555;">If you did not create this account or request this email, you can safely ignore it.</p>
</body>
</html>`;
}

function buildEmailVerificationText(params: {
  appName: string;
  recipientEmail: string;
  expiresLabel: string;
  verificationLink: string;
}): string {
  return [
    "Hello,",
    "",
    `Please verify the email address ${params.recipientEmail} for your ${params.appName} account.`,
    "",
    `This link expires at ${params.expiresLabel} (UTC).`,
    "",
    "Verify your email using this link:",
    params.verificationLink,
    "",
    "If you did not create this account or request this email, you can safely ignore it.",
  ].join("\n");
}

export function buildEmailVerificationEmail(
  input: BuildEmailVerificationEmailInput,
): BuildEmailVerificationEmailResult {
  const appName = sanitizePlainTextField(
    input.appName?.trim() || DEFAULT_APP_NAME,
  );
  const expiresLabel = formatEmailVerificationEmailExpiry(input.expiresAt);

  const shared = {
    appName,
    recipientEmail: input.recipientEmail,
    expiresLabel,
    verificationLink: input.verificationLink,
  };

  return {
    subject: buildEmailVerificationSubject(appName),
    html: buildEmailVerificationHtml(shared),
    text: buildEmailVerificationText(shared),
    tags: [...EMAIL_VERIFICATION_TAGS],
  };
}
