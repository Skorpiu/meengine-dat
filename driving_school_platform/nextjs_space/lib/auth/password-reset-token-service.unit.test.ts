import { describe, expect, it, vi } from "vitest";

import {
  buildPasswordResetUrl,
  calculatePasswordResetExpiry,
  canUsePasswordResetToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenExpired,
} from "./password-reset-token-service";

describe("password-reset-token-service", () => {
  it("generates URL-safe tokens and stable SHA-256 hash", () => {
    const token = generatePasswordResetToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");

    const hash = hashPasswordResetToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPasswordResetToken(token)).toBe(hash);
    expect(hashPasswordResetToken("other")).not.toBe(hash);
  });

  it("builds reset URL with token query param", () => {
    const url = buildPasswordResetUrl({
      baseUrl: "https://school.example.com/",
      token: "test-token",
    });
    expect(url).toBe(
      "https://school.example.com/auth/reset-password?token=test-token",
    );
  });

  it("expires tokens after wall-clock expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T10:00:00.000Z"));

    const expiresAt = calculatePasswordResetExpiry(1);
    expect(isPasswordResetTokenExpired(expiresAt)).toBe(false);

    vi.setSystemTime(new Date("2026-05-22T11:00:01.000Z"));
    expect(isPasswordResetTokenExpired(expiresAt)).toBe(true);

    vi.useRealTimers();
  });

  it("canUsePasswordResetToken blocks used and expired", () => {
    const expiresAt = new Date("2026-05-22T12:00:00.000Z");

    expect(
      canUsePasswordResetToken({
        usedAt: new Date("2026-05-22T10:00:00.000Z"),
        expiresAt,
        now: new Date("2026-05-22T10:30:00.000Z"),
      }),
    ).toEqual({ allowed: false, reason: "already_used" });

    expect(
      canUsePasswordResetToken({
        usedAt: null,
        expiresAt,
        now: new Date("2026-05-22T13:00:00.000Z"),
      }),
    ).toEqual({ allowed: false, reason: "expired" });

    expect(
      canUsePasswordResetToken({
        usedAt: null,
        expiresAt,
        now: new Date("2026-05-22T11:00:00.000Z"),
      }),
    ).toEqual({ allowed: true });
  });
});
