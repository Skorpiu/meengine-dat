import type { SendEmailInput } from "./types";

const SENSITIVE_QUERY_PARAMS = [
  "token",
  "resetToken",
  "verificationToken",
  "inviteToken",
] as const;

/**
 * Redact bearer-style query parameters in URLs (invite/reset/verify links).
 */
export function redactSensitiveUrls(value: string): string {
  let result = value;
  for (const param of SENSITIVE_QUERY_PARAMS) {
    const re = new RegExp(`([?&]${param}=)[^&\\s"'<>]+`, "gi");
    result = result.replace(re, `$1[REDACTED]`);
  }
  return result;
}

/**
 * Minimize recipient identity while keeping domain visible for ops debugging.
 */
export function redactEmailRecipient(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "[invalid-email]";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return "[invalid-email]";
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}

export function sanitizeEmailErrorMessage(message: string): string {
  return redactSensitiveUrls(message).slice(0, 200);
}

export type EmailLogContext = {
  provider: string;
  subject: string;
  to: string;
  tags?: string[];
  htmlLength: number;
  textLength: number;
  replyTo?: string;
};

/**
 * Safe structured context for logs/metrics — never includes full html/text bodies.
 */
export function buildEmailLogContext(
  input: SendEmailInput,
  provider: string,
): EmailLogContext {
  const ctx: EmailLogContext = {
    provider,
    subject: input.subject,
    to: redactEmailRecipient(input.to),
    htmlLength: input.html.length,
    textLength: input.text.length,
  };
  if (input.tags?.length) ctx.tags = [...input.tags];
  if (input.replyTo) ctx.replyTo = redactEmailRecipient(input.replyTo);
  return ctx;
}
