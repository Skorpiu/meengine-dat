import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  cleanupRateLimitBucketsMock: vi.fn(),
}));

vi.mock("@/lib/rate-limit/cleanup", () => ({
  cleanupRateLimitBuckets: (...args: unknown[]) =>
    h.cleanupRateLimitBucketsMock(...args),
}));

import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };
const NOW = new Date("2026-05-25T12:00:00.000Z");
const EXPECTED_OLDER_THAN = new Date("2026-05-18T12:00:00.000Z");

function cronRequest(auth?: string): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) {
    headers.authorization = auth;
  }

  return new Request("http://localhost/api/cron/rate-limit-cleanup", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /api/cron/rate-limit-cleanup", () => {
  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(503);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe("Cron secret is not configured.");
    expect(h.cleanupRateLimitBucketsMock).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization is missing or invalid", async () => {
    const missing = await GET(cronRequest() as never);
    expect(missing.status).toBe(401);

    const invalid = await GET(cronRequest("Bearer wrong") as never);
    expect(invalid.status).toBe(401);

    const body: { error?: string } = await invalid.json();
    expect(body.error).toBe("Unauthorized");
    expect(h.cleanupRateLimitBucketsMock).not.toHaveBeenCalled();
  });

  it("calls cleanup with the 7-day retention cutoff", async () => {
    h.cleanupRateLimitBucketsMock.mockResolvedValue({ deletedCount: 12 });

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(200);

    expect(h.cleanupRateLimitBucketsMock).toHaveBeenCalledWith({
      olderThan: EXPECTED_OLDER_THAN,
    });

    const body: { success?: boolean; deletedCount?: number } = await res.json();
    expect(body).toEqual({
      success: true,
      deletedCount: 12,
    });
  });

  it("returns a controlled 500 when cleanup fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    h.cleanupRateLimitBucketsMock.mockRejectedValue(new Error("boom"));

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(500);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe("Rate limit bucket cleanup failed.");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Rate limit bucket cleanup failed.",
    );
  });
});
