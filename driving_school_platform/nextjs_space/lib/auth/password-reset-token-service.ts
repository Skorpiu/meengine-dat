import { createHash, randomBytes } from "crypto";

/** Default reset link lifetime when callers omit explicit hours. */
export const DEFAULT_PASSWORD_RESET_EXPIRY_HOURS = 1;

const PASSWORD_RESET_TOKEN_BYTE_LENGTH = 32;

export type PasswordResetTokenBlockReason =
  | "invalid_token"
  | "expired"
  | "already_used";

export type CanUsePasswordResetTokenResult =
  | { allowed: true }
  | { allowed: false; reason: PasswordResetTokenBlockReason };

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTE_LENGTH).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildPasswordResetUrl(input: {
  baseUrl: string;
  token: string;
}): string {
  const base = input.baseUrl.trim().replace(/\/+$/, "");
  const params = new URLSearchParams({ token: input.token });
  return `${base}/auth/reset-password?${params.toString()}`;
}

export function isPasswordResetTokenExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function calculatePasswordResetExpiry(
  hours: number = DEFAULT_PASSWORD_RESET_EXPIRY_HOURS,
  now: Date = new Date(),
): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCHours(expiresAt.getUTCHours() + hours);
  return expiresAt;
}

export function canUsePasswordResetToken(input: {
  usedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): CanUsePasswordResetTokenResult {
  const now = input.now ?? new Date();

  if (input.usedAt) {
    return { allowed: false, reason: "already_used" };
  }
  if (isPasswordResetTokenExpired(input.expiresAt, now)) {
    return { allowed: false, reason: "expired" };
  }
  return { allowed: true };
}
