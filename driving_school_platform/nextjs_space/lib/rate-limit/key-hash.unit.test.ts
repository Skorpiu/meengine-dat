import { describe, it, expect } from "vitest";

import { buildRateLimitKeyHash } from "./key-hash";

describe("buildRateLimitKeyHash", () => {
  it("returns stable hex digest", () => {
    const a = buildRateLimitKeyHash(["email", "user@example.com"]);
    const b = buildRateLimitKeyHash(["email", "user@example.com"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not contain raw email or IP in hash output", () => {
    const email = "Secret.User@Example.COM";
    const ip = "203.0.113.10";
    const emailHash = buildRateLimitKeyHash(["email", email]);
    const ipHash = buildRateLimitKeyHash(["ip", ip]);

    expect(emailHash).not.toContain("secret");
    expect(emailHash).not.toContain("@");
    expect(ipHash).not.toContain("203.0.113");
  });

  it("normalizes part casing and whitespace", () => {
    const a = buildRateLimitKeyHash(["email", "  User@Example.COM  "]);
    const b = buildRateLimitKeyHash(["email", "user@example.com"]);
    expect(a).toBe(b);
  });
});
