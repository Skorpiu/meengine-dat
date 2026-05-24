import { createHash } from "crypto";

/**
 * Stable SHA-256 hex digest for rate-limit bucket keys.
 * Parts are normalized (trim + lowercase) and joined; raw email/IP are never stored.
 */
export function buildRateLimitKeyHash(parts: readonly string[]): string {
  const normalized = parts.map((part) => part.trim().toLowerCase());
  const payload = normalized.join("\0");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
