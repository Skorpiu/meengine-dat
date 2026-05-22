import type { NextRequest } from "next/server";

/**
 * Origin used to build password-reset links for the current HTTP request.
 *
 * Uses `new URL(request.url).origin` (same pattern as admin invitations).
 * Behind reverse proxies, a wrong `Host` / `X-Forwarded-*` configuration can
 * produce incorrect links — see docs/engineering/password-reset-flow.md.
 */
export function getPasswordResetRequestBaseUrl(request: NextRequest): string {
  return new URL(request.url).origin;
}
