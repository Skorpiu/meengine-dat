import { describe, it, expect } from "vitest";
import {
  buildEmailVerificationUrl,
  calculateEmailVerificationExpiry,
  canUseEmailVerificationToken,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerificationTokenExpired,
} from "./email-verification-token-service";

describe("email-verification-token-service", () => {
  it("generates URL-safe tokens and stable SHA-256 hashes", () => {
    const token = generateEmailVerificationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(20);

    const hash = hashEmailVerificationToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashEmailVerificationToken(token)).toBe(hash);
    expect(hashEmailVerificationToken("other")).not.toBe(hash);
  });

  it("builds verify-email URL without leaking hash", () => {
    const url = buildEmailVerificationUrl({
      baseUrl: "https://school.example.com/",
      token: "abc123",
    });
    expect(url).toBe(
      "https://school.example.com/auth/verify-email?token=abc123",
    );
    expect(url).not.toContain("tokenHash");
  });

  it("calculates expiry and detects expiration", () => {
    const expiresAt = calculateEmailVerificationExpiry(1);
    expect(isEmailVerificationTokenExpired(expiresAt)).toBe(false);

    expiresAt.setUTCHours(expiresAt.getUTCHours() - 2);
    expect(isEmailVerificationTokenExpired(expiresAt)).toBe(true);
  });

  it("canUseEmailVerificationToken blocks used and expired", () => {
    const future = new Date("2099-01-01T00:00:00.000Z");

    expect(
      canUseEmailVerificationToken({
        usedAt: new Date(),
        expiresAt: future,
      }).allowed,
    ).toBe(false);

    expect(
      canUseEmailVerificationToken({
        usedAt: null,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }).allowed,
    ).toBe(false);

    expect(
      canUseEmailVerificationToken({
        usedAt: null,
        expiresAt: future,
      }).allowed,
    ).toBe(true);
  });
});
