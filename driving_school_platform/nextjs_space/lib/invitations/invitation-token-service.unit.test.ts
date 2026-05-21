import { describe, it, expect } from "vitest";
import {
  buildInvitationAcceptUrl,
  calculateInvitationExpiry,
  canAcceptInvitation,
  DEFAULT_INVITATION_EXPIRY_DAYS,
  generateInvitationToken,
  hashInvitationToken,
  isInvitationExpired,
} from "./invitation-token-service";

const URL_SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

describe("generateInvitationToken", () => {
  it("returns a non-empty string", () => {
    const token = generateInvitationToken();
    expect(token.length).toBeGreaterThan(0);
  });

  it("generates distinct tokens", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).not.toBe(b);
  });

  it("uses URL-safe base64url characters only", () => {
    const token = generateInvitationToken();
    expect(token).toMatch(URL_SAFE_TOKEN_PATTERN);
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");
    expect(token).not.toContain("=");
  });
});

describe("hashInvitationToken", () => {
  it("is deterministic for the same token", () => {
    const token = "sample-invite-token-value";
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
  });

  it("produces different hashes for different tokens", () => {
    const hashA = hashInvitationToken("token-a");
    const hashB = hashInvitationToken("token-b");
    expect(hashA).not.toBe(hashB);
  });

  it("returns a 64-character hex digest (SHA-256)", () => {
    const hash = hashInvitationToken(generateInvitationToken());
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("buildInvitationAcceptUrl", () => {
  it("builds URL without trailing slash on baseUrl", () => {
    expect(
      buildInvitationAcceptUrl({
        baseUrl: "https://school.example.com",
        token: "abc",
      }),
    ).toBe("https://school.example.com/invitations/accept?token=abc");
  });

  it("strips trailing slashes from baseUrl", () => {
    expect(
      buildInvitationAcceptUrl({
        baseUrl: "https://school.example.com///",
        token: "abc",
      }),
    ).toBe("https://school.example.com/invitations/accept?token=abc");
  });

  it("encodes token query values", () => {
    const url = buildInvitationAcceptUrl({
      baseUrl: "https://school.example.com",
      token: "a+b/c",
    });
    expect(url).toBe(
      "https://school.example.com/invitations/accept?token=a%2Bb%2Fc",
    );
  });
});

describe("calculateInvitationExpiry", () => {
  it(`defaults to ${DEFAULT_INVITATION_EXPIRY_DAYS} days from now`, () => {
    const now = new Date("2026-05-21T12:00:00.000Z");
    const expiresAt = calculateInvitationExpiry(undefined, now);
    expect(expiresAt.toISOString()).toBe("2026-05-28T12:00:00.000Z");
  });

  it("supports a custom day count", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const expiresAt = calculateInvitationExpiry(3, now);
    expect(expiresAt.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });
});

describe("isInvitationExpired", () => {
  it("returns false before expiresAt", () => {
    const now = new Date("2026-05-21T12:00:00.000Z");
    const expiresAt = new Date("2026-05-22T12:00:00.000Z");
    expect(isInvitationExpired(expiresAt, now)).toBe(false);
  });

  it("returns true at or after expiresAt", () => {
    const expiresAt = new Date("2026-05-21T12:00:00.000Z");
    expect(
      isInvitationExpired(expiresAt, new Date("2026-05-21T12:00:00.000Z")),
    ).toBe(true);
    expect(
      isInvitationExpired(expiresAt, new Date("2026-05-22T12:00:00.000Z")),
    ).toBe(true);
  });
});

describe("canAcceptInvitation", () => {
  const futureExpiry = new Date("2099-01-01T00:00:00.000Z");
  const pastExpiry = new Date("2020-01-01T00:00:00.000Z");
  const now = new Date("2026-05-21T12:00:00.000Z");

  it("allows PENDING and non-expired", () => {
    expect(
      canAcceptInvitation({
        status: "PENDING",
        expiresAt: futureExpiry,
        now,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks PENDING when past expiresAt", () => {
    expect(
      canAcceptInvitation({
        status: "PENDING",
        expiresAt: pastExpiry,
        now,
      }),
    ).toEqual({ allowed: false, reason: "expired" });
  });

  it("blocks ACCEPTED", () => {
    expect(
      canAcceptInvitation({
        status: "ACCEPTED",
        expiresAt: futureExpiry,
        now,
      }),
    ).toEqual({ allowed: false, reason: "already_accepted" });
  });

  it("blocks REVOKED", () => {
    expect(
      canAcceptInvitation({
        status: "REVOKED",
        expiresAt: futureExpiry,
        now,
      }),
    ).toEqual({ allowed: false, reason: "revoked" });
  });

  it("blocks EXPIRED status", () => {
    expect(
      canAcceptInvitation({
        status: "EXPIRED",
        expiresAt: futureExpiry,
        now,
      }),
    ).toEqual({ allowed: false, reason: "expired" });
  });
});
