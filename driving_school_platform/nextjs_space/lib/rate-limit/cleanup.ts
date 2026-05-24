import { prisma } from "@/lib/db";

export type CleanupRateLimitBucketsInput = {
  olderThan: Date;
};

/**
 * Deletes rate-limit buckets whose window started before `olderThan`.
 * Intended for operational/cron cleanup (not required at request time).
 */
export async function cleanupRateLimitBuckets(
  input: CleanupRateLimitBucketsInput,
): Promise<{ deletedCount: number }> {
  const result = await prisma.rateLimitBucket.deleteMany({
    where: {
      windowStart: { lt: input.olderThan },
    },
  });

  return { deletedCount: result.count };
}
