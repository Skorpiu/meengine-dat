import type { NextRequest } from "next/server";

/**
 * Origin used to build email-verification links for the current HTTP request.
 *
 * Uses `new URL(request.url).origin` (same pattern as password reset).
 */
export function getEmailVerificationRequestBaseUrl(
  request: NextRequest,
): string {
  return new URL(request.url).origin;
}
