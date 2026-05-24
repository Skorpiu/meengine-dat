import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimitBucket: {
      upsert: h.upsertMock,
    },
  },
}));

import { checkRateLimit } from "./check-rate-limit";
import { AUTH_RATE_LIMIT_ACTIONS } from "./auth-rate-limit-policy";

const NOW = new Date("2026-05-24T12:07:00.000Z");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit", async () => {
    h.upsertMock.mockResolvedValue({ count: 5 });

    const result = await checkRateLimit({
      action: AUTH_RATE_LIMIT_ACTIONS.loginEmail,
      keyParts: ["email", "user@example.com"],
      limit: 10,
      windowSeconds: 900,
      now: NOW,
    });

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(5);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("blocks when count exceeds limit", async () => {
    h.upsertMock.mockResolvedValue({ count: 11 });

    const result = await checkRateLimit({
      action: AUTH_RATE_LIMIT_ACTIONS.loginEmail,
      keyParts: ["email", "user@example.com"],
      limit: 10,
      windowSeconds: 900,
      now: NOW,
    });

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(11);
  });

  it("passes hashed key to prisma upsert, not raw email", async () => {
    h.upsertMock.mockResolvedValue({ count: 1 });

    await checkRateLimit({
      action: AUTH_RATE_LIMIT_ACTIONS.loginEmail,
      keyParts: ["email", "Secret@Example.com"],
      limit: 10,
      windowSeconds: 900,
      now: NOW,
    });

    const call = h.upsertMock.mock.calls[0][0];
    expect(call.where.action_keyHash_windowStart.keyHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(call.where.action_keyHash_windowStart.keyHash).not.toContain(
      "secret",
    );
    expect(JSON.stringify(call)).not.toContain("Secret@Example.com");
  });
});
