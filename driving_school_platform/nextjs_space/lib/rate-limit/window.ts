/**
 * Fixed-window helpers for DB-backed rate limiting.
 */

export function computeWindowStart(now: Date, windowSeconds: number): Date {
  const epochSec = Math.floor(now.getTime() / 1000);
  const windowIndex = Math.floor(epochSec / windowSeconds);
  return new Date(windowIndex * windowSeconds * 1000);
}

export function computeRetryAfterSeconds(
  now: Date,
  windowStart: Date,
  windowSeconds: number,
): number {
  const windowEndMs = windowStart.getTime() + windowSeconds * 1000;
  const remainingMs = windowEndMs - now.getTime();
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
