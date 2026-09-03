import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const updateMock = vi.fn();
  return {
    findUniqueMock,
    updateMock,
    prismaMock: {
      user: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

vi.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/tenant", () => ({
  getRequestHost: vi.fn(() => null),
  resolveOrganizationIdFromHost: vi.fn(async () => null),
}));

vi.mock("@/lib/auth/credentials-login-eligibility", () => ({
  getCredentialsLoginBlockReason: vi.fn(() => null),
}));

import { authOptions } from "@/lib/auth";
import {
  AUTH_SESSION_REVOKED_CODE,
  AuthSessionRevokedError,
  assertJwtAuthSessionVersion,
  resolveEffectiveAuthSessionVersion,
} from "@/lib/auth/jwt-session-revocation";

const jwtCallback = authOptions.callbacks?.jwt;
if (!jwtCallback) {
  throw new Error("authOptions.callbacks.jwt is required for AUTH-SESSION-001");
}

type JwtCallbackParams = Parameters<NonNullable<typeof jwtCallback>>[0];

function baseToken(overrides: Partial<JWT> = {}): JWT {
  return {
    sub: "user-1",
    role: "STUDENT",
    firstName: "Ada",
    lastName: "Lovelace",
    isApproved: true,
    organizationId: "org-a",
    ...overrides,
  } as JWT;
}

function establishedJwtArgs(token: JWT): JwtCallbackParams {
  return {
    token,
    // Established JWT path: NextAuth omits `user` after initial sign-in.
    user: undefined as unknown as User,
    account: null,
    profile: undefined,
    trigger: "update",
    session: undefined,
    isNewUser: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveEffectiveAuthSessionVersion", () => {
  it("treats legacy missing claim as version 0", () => {
    expect(resolveEffectiveAuthSessionVersion(undefined)).toBe(0);
    expect(resolveEffectiveAuthSessionVersion(null)).toBe(0);
  });

  it("preserves finite numeric claim values", () => {
    expect(resolveEffectiveAuthSessionVersion(0)).toBe(0);
    expect(resolveEffectiveAuthSessionVersion(3)).toBe(3);
  });
});

describe("assertJwtAuthSessionVersion", () => {
  it("accepts matching current version", async () => {
    const version = await assertJwtAuthSessionVersion({
      tokenSub: "user-1",
      tokenAuthSessionVersion: 2,
      loadAuthority: async () => ({ id: "user-1", authSessionVersion: 2 }),
    });
    expect(version).toBe(2);
  });

  it("rejects version mismatch", async () => {
    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: "user-1",
        tokenAuthSessionVersion: 0,
        loadAuthority: async () => ({ id: "user-1", authSessionVersion: 1 }),
      }),
    ).rejects.toMatchObject({
      code: AUTH_SESSION_REVOKED_CODE,
      name: "AuthSessionRevokedError",
    });
  });

  it("rejects missing User", async () => {
    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: "user-1",
        tokenAuthSessionVersion: 0,
        loadAuthority: async () => null,
      }),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });

  it("rejects missing token.sub", async () => {
    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: undefined,
        tokenAuthSessionVersion: 0,
        loadAuthority: async () => ({ id: "user-1", authSessionVersion: 0 }),
      }),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });

  it("propagates database/loader failures fail-closed", async () => {
    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: "user-1",
        tokenAuthSessionVersion: 0,
        loadAuthority: async () => {
          throw new Error("db unavailable");
        },
      }),
    ).rejects.toThrow("db unavailable");
  });

  it("does not consult Session table authority", async () => {
    const loadAuthority = vi.fn(async () => ({
      id: "user-1",
      authSessionVersion: 0,
    }));
    await assertJwtAuthSessionVersion({
      tokenSub: "user-1",
      tokenAuthSessionVersion: 0,
      loadAuthority,
    });
    expect(loadAuthority).toHaveBeenCalledWith("user-1");
    expect(loadAuthority.mock.calls[0]).toHaveLength(1);
  });
});

describe("authOptions.callbacks.jwt — USER_SESSION_VERSION_EPOCH", () => {
  it("captures authSessionVersion from login user onto the JWT", async () => {
    const token = await jwtCallback({
      token: baseToken({ authSessionVersion: undefined }),
      user: {
        id: "user-1",
        email: "ada@school.test",
        role: "STUDENT",
        firstName: "Ada",
        lastName: "Lovelace",
        isApproved: true,
        organizationId: "org-a",
        authSessionVersion: 4,
      },
      account: null,
      profile: undefined,
      trigger: "signIn",
      session: undefined,
      isNewUser: false,
    });

    expect(token.authSessionVersion).toBe(4);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("accepts current-version JWT and normalizes the claim", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "user-1",
      authSessionVersion: 0,
    });

    const token = await jwtCallback(
      establishedJwtArgs(baseToken({ authSessionVersion: undefined })),
    );

    expect(h.findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, authSessionVersion: true },
    });
    expect(token.authSessionVersion).toBe(0);
    expect(token.role).toBe("STUDENT");
    expect(token.organizationId).toBe("org-a");
    expect(token.isApproved).toBe(true);
  });

  it("throws on revoked version mismatch (does not return null)", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "user-1",
      authSessionVersion: 1,
    });

    await expect(
      jwtCallback(establishedJwtArgs(baseToken({ authSessionVersion: 0 }))),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });

  it("throws when User is missing", async () => {
    h.findUniqueMock.mockResolvedValue(null);

    await expect(
      jwtCallback(establishedJwtArgs(baseToken({ authSessionVersion: 0 }))),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });

  it("propagates Prisma/DB failures fail-closed", async () => {
    h.findUniqueMock.mockRejectedValue(new Error("connection refused"));

    await expect(
      jwtCallback(establishedJwtArgs(baseToken({ authSessionVersion: 0 }))),
    ).rejects.toThrow("connection refused");
  });

  it("rejects legacy version-0 JWT after DB increments to 1", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "user-1",
      authSessionVersion: 1,
    });

    await expect(
      jwtCallback(
        establishedJwtArgs(baseToken({ authSessionVersion: undefined })),
      ),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });

  it("does not live-refresh role/org/isApproved on established JWT validation", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "user-1",
      authSessionVersion: 2,
    });

    const token = await jwtCallback(
      establishedJwtArgs(
        baseToken({
          authSessionVersion: 2,
          role: "STUDENT",
          organizationId: "org-stale",
          isApproved: false,
        }),
      ),
    );

    expect(token.role).toBe("STUDENT");
    expect(token.organizationId).toBe("org-stale");
    expect(token.isApproved).toBe(false);
    expect(token.authSessionVersion).toBe(2);
    expect(h.findUniqueMock.mock.calls[0][0].select).toEqual({
      id: true,
      authSessionVersion: true,
    });
  });
});
