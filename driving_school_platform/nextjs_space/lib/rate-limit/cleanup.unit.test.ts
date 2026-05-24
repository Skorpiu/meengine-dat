import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimitBucket: {
      deleteMany: h.deleteManyMock,
    },
  },
}));

import { cleanupRateLimitBuckets } from "./cleanup";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cleanupRateLimitBuckets", () => {
  it("deletes buckets older than cutoff", async () => {
    h.deleteManyMock.mockResolvedValue({ count: 42 });
    const olderThan = new Date("2026-05-01T00:00:00.000Z");

    const result = await cleanupRateLimitBuckets({ olderThan });

    expect(result.deletedCount).toBe(42);
    expect(h.deleteManyMock).toHaveBeenCalledWith({
      where: { windowStart: { lt: olderThan } },
    });
  });
});
