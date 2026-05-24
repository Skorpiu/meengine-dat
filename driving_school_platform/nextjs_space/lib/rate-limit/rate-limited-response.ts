import { NextResponse } from "next/server";

export const RATE_LIMITED_ERROR_MESSAGE =
  "Too many requests. Please try again later.";

export const RATE_LIMITED_ERROR_CODE = "rate_limited" as const;

/**
 * Stable 429 response for auth/email rate limits (no sensitive internals).
 */
export function rateLimitedResponse(retryAfterSeconds?: number): NextResponse {
  const headers: Record<string, string> = {};
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }

  return NextResponse.json(
    {
      error: RATE_LIMITED_ERROR_MESSAGE,
      code: RATE_LIMITED_ERROR_CODE,
    },
    { status: 429, headers },
  );
}
