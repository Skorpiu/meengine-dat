/**
 * Extracts client IP from proxy headers for rate-limit key material.
 * Returns a normalized string; never persisted in DB (only hashed).
 */
export function getClientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return normalizeIpForRateLimit(first);
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return normalizeIpForRateLimit(realIp);
  }

  return "unknown";
}

export function normalizeIpForRateLimit(ip: string): string {
  return ip.trim().toLowerCase();
}
