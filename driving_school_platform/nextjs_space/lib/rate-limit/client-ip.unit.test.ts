import { describe, it, expect } from "vitest";

import { getClientIpFromRequest, normalizeIpForRateLimit } from "./client-ip";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("getClientIpFromRequest", () => {
  it("uses first x-forwarded-for IP", () => {
    const req = requestWithHeaders({
      "x-forwarded-for": "203.0.113.1, 198.51.100.2",
    });
    expect(getClientIpFromRequest(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const req = requestWithHeaders({ "x-real-ip": "198.51.100.3" });
    expect(getClientIpFromRequest(req)).toBe("198.51.100.3");
  });

  it("returns unknown when no proxy headers", () => {
    expect(getClientIpFromRequest(requestWithHeaders({}))).toBe("unknown");
  });
});

describe("normalizeIpForRateLimit", () => {
  it("trims and lowercases", () => {
    expect(normalizeIpForRateLimit(" 203.0.113.1 ")).toBe("203.0.113.1");
  });
});
