import { createHash, randomBytes } from "crypto";
import type { UserInvitationStatus } from "@prisma/client";

/** Default invite lifetime when callers omit an explicit day count. */
export const DEFAULT_INVITATION_EXPIRY_DAYS = 7;

/** Raw token entropy (32 bytes → 256 bits before encoding). */
const INVITATION_TOKEN_BYTE_LENGTH = 32;

export type InvitationAcceptBlockReason =
  | "already_accepted"
  | "revoked"
  | "expired"
  | "not_pending";

export type CanAcceptInvitationResult =
  | { allowed: true }
  | { allowed: false; reason: InvitationAcceptBlockReason };

/**
 * Generates a high-entropy, URL-safe invite token (never persisted; store hash only).
 */
export function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTE_LENGTH).toString("base64url");
}

/**
 * Stable SHA-256 hex digest for DB lookup on `UserInvitation.tokenHash`.
 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Builds the invitee-facing accept URL for a tenant base origin.
 */
export function buildInvitationAcceptUrl(input: {
  baseUrl: string;
  token: string;
}): string {
  const base = input.baseUrl.trim().replace(/\/+$/, "");
  const params = new URLSearchParams({ token: input.token });
  return `${base}/invitations/accept?${params.toString()}`;
}

export function isInvitationExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function calculateInvitationExpiry(
  days: number = DEFAULT_INVITATION_EXPIRY_DAYS,
  now: Date = new Date(),
): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt;
}

/**
 * Whether an invitation may be accepted (status + wall-clock expiry).
 * DB may still show PENDING when date-expired; callers should treat `expired` accordingly.
 */
export function canAcceptInvitation(input: {
  status: UserInvitationStatus;
  expiresAt: Date;
  now?: Date;
}): CanAcceptInvitationResult {
  const now = input.now ?? new Date();

  if (input.status === "ACCEPTED") {
    return { allowed: false, reason: "already_accepted" };
  }
  if (input.status === "REVOKED") {
    return { allowed: false, reason: "revoked" };
  }
  if (input.status === "EXPIRED") {
    return { allowed: false, reason: "expired" };
  }
  if (input.status !== "PENDING") {
    return { allowed: false, reason: "not_pending" };
  }
  if (isInvitationExpired(input.expiresAt, now)) {
    return { allowed: false, reason: "expired" };
  }
  return { allowed: true };
}
