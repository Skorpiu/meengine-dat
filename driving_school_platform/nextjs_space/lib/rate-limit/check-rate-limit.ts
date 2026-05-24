import { prisma } from "@/lib/db";

import { buildRateLimitKeyHash } from "./key-hash";
import { computeRetryAfterSeconds, computeWindowStart } from "./window";

export type CheckRateLimitInput = {
  action: string;
  keyParts: readonly string[];
  limit: number;
  windowSeconds: number;
  now?: Date;
};

export type CheckRateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window DB-backed rate limit with atomic upsert + increment.
 */
export async function checkRateLimit(
  input: CheckRateLimitInput,
): Promise<CheckRateLimitResult> {
  const now = input.now ?? new Date();
  const windowStart = computeWindowStart(now, input.windowSeconds);
  const keyHash = buildRateLimitKeyHash(input.keyParts);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      action_keyHash_windowStart: {
        action: input.action,
        keyHash,
        windowStart,
      },
    },
    create: {
      action: input.action,
      keyHash,
      windowStart,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  });

  const retryAfterSeconds = computeRetryAfterSeconds(
    now,
    windowStart,
    input.windowSeconds,
  );

  return {
    allowed: bucket.count <= input.limit,
    count: bucket.count,
    retryAfterSeconds,
  };
}

export type RateLimitCheckSpec = CheckRateLimitInput;

/**
 * Runs multiple rate-limit checks; returns the first blocked result, or null if all allowed.
 */
export async function checkRateLimits(
  checks: readonly RateLimitCheckSpec[],
): Promise<CheckRateLimitResult | null> {
  if (checks.length === 0) {
    return null;
  }

  const results = await Promise.all(
    checks.map((check) => checkRateLimit(check)),
  );
  return results.find((result) => !result.allowed) ?? null;
}
