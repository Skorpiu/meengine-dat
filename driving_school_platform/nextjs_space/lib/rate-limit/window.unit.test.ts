import { describe, it, expect } from "vitest";

import { computeRetryAfterSeconds, computeWindowStart } from "./window";

describe("computeWindowStart", () => {
  it("floors to fixed window boundary", () => {
    const windowSeconds = 900;
    const now = new Date("2026-05-24T12:07:30.000Z");
    const start = computeWindowStart(now, windowSeconds);
    expect(start.toISOString()).toBe("2026-05-24T12:00:00.000Z");
  });

  it("aligns hour windows", () => {
    const windowSeconds = 3600;
    const now = new Date("2026-05-24T12:59:59.000Z");
    const start = computeWindowStart(now, windowSeconds);
    expect(start.toISOString()).toBe("2026-05-24T12:00:00.000Z");
  });
});

describe("computeRetryAfterSeconds", () => {
  it("returns seconds until window end", () => {
    const windowSeconds = 900;
    const now = new Date("2026-05-24T12:07:30.000Z");
    const windowStart = computeWindowStart(now, windowSeconds);
    const retry = computeRetryAfterSeconds(now, windowStart, windowSeconds);
    expect(retry).toBe(450);
  });

  it("returns at least 1 second", () => {
    const windowSeconds = 60;
    const windowStart = new Date("2026-05-24T12:00:00.000Z");
    const now = new Date("2026-05-24T12:00:59.900Z");
    expect(
      computeRetryAfterSeconds(now, windowStart, windowSeconds),
    ).toBeGreaterThanOrEqual(1);
  });
});
