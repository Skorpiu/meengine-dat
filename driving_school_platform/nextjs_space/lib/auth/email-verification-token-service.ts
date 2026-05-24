import { createHash, randomBytes } from "crypto";

/** Default verification link lifetime when callers omit explicit hours. */
export const DEFAULT_EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

const EMAIL_VERIFICATION_TOKEN_BYTE_LENGTH = 32;

export type EmailVerificationTokenBlockReason =
  | "invalid_token"
  | "expired"
  | "already_used";

export type CanUseEmailVerificationTokenResult =
  | { allowed: true }
  | { allowed: false; reason: EmailVerificationTokenBlockReason };

export function generateEmailVerificationToken(): string {
  return randomBytes(EMAIL_VERIFICATION_TOKEN_BYTE_LENGTH).toString(
    "base64url",
  );
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildEmailVerificationUrl(input: {
  baseUrl: string;
  token: string;
}): string {
  const base = input.baseUrl.trim().replace(/\/+$/, "");
  const params = new URLSearchParams({ token: input.token });
  return `${base}/auth/verify-email?${params.toString()}`;
}

export function isEmailVerificationTokenExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function calculateEmailVerificationExpiry(
  hours: number = DEFAULT_EMAIL_VERIFICATION_EXPIRY_HOURS,
  now: Date = new Date(),
): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCHours(expiresAt.getUTCHours() + hours);
  return expiresAt;
}

export function canUseEmailVerificationToken(input: {
  usedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): CanUseEmailVerificationTokenResult {
  const now = input.now ?? new Date();

  if (input.usedAt) {
    return { allowed: false, reason: "already_used" };
  }
  if (isEmailVerificationTokenExpired(input.expiresAt, now)) {
    return { allowed: false, reason: "expired" };
  }
  return { allowed: true };
}
