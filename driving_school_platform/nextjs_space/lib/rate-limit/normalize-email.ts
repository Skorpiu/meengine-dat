/**
 * Normalizes email for rate-limit key material (never stored in DB — only hashed).
 */
export function normalizeEmailForRateLimit(email: string): string {
  return email.trim().toLowerCase();
}
