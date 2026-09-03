import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  assertJwtAuthSessionVersion,
  AuthSessionRevokedError,
} from "@/lib/auth/jwt-session-revocation";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/auth/password-reset-token-service";
import { confirmPasswordReset } from "@/lib/password-reset/password-reset-service";
import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";

/**
 * Real PostgreSQL proof for AUTH-SESSION-001 / USER_SESSION_VERSION_EPOCH.
 * Uses only the DEC-070 disposable harness (no remote DB).
 */

const clientA = createIntegrationPrismaClient();
const clientB = createIntegrationPrismaClient();

const ORG_PREFIX = "it-jwt-session-revocation-";
const EMAIL_PREFIX = "it-jwt-revocation-";

async function cleanupJwtRevocationRows() {
  const users = await clientA.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length > 0) {
    await clientA.passwordResetToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await clientA.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  await clientA.organization.deleteMany({
    where: { name: { startsWith: ORG_PREFIX } },
  });
}

async function createOrg(suffix: string) {
  return clientA.organization.create({
    data: { name: `${ORG_PREFIX}${suffix}` },
  });
}

async function createUser(input: {
  emailSuffix: string;
  organizationId: string;
  passwordHash?: string;
}) {
  return clientA.user.create({
    data: {
      email: `${EMAIL_PREFIX}${input.emailSuffix}@example.test`,
      firstName: "Jwt",
      lastName: "Revocation",
      role: "STUDENT",
      organizationId: input.organizationId,
      passwordHash: input.passwordHash ?? "existing-hash",
      isEmailVerified: true,
      isApproved: true,
    },
  });
}

beforeAll(async () => {
  await cleanupJwtRevocationRows();
});

afterEach(async () => {
  await cleanupJwtRevocationRows();
});

afterAll(async () => {
  await cleanupJwtRevocationRows();
  await clientA.$disconnect();
  await clientB.$disconnect();
});

describe("integration — jwt session revocation (AUTH-SESSION-001)", () => {
  it("CASE A — new User defaults authSessionVersion to 0", async () => {
    const org = await createOrg("default");
    const user = await createUser({
      emailSuffix: "default",
      organizationId: org.id,
    });

    const loaded = await clientA.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { authSessionVersion: true },
    });
    expect(loaded.authSessionVersion).toBe(0);

    const columns = await clientA.$queryRaw<
      Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>
    >`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'authSessionVersion'
    `;

    expect(columns).toHaveLength(1);
    expect(columns[0]?.data_type).toBe("integer");
    expect(columns[0]?.is_nullable).toBe("NO");
    expect(columns[0]?.column_default).toContain("0");
  });

  it("CASE B/C — persistent and repeated revocation increments", async () => {
    const org = await createOrg("persist");
    const user = await createUser({
      emailSuffix: "persist",
      organizationId: org.id,
    });

    await clientA.user.update({
      where: { id: user.id },
      data: { authSessionVersion: { increment: 1 } },
    });
    let loaded = await clientA.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { authSessionVersion: true },
    });
    expect(loaded.authSessionVersion).toBe(1);

    await clientA.user.update({
      where: { id: user.id },
      data: { authSessionVersion: { increment: 1 } },
    });
    loaded = await clientA.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { authSessionVersion: true },
    });
    expect(loaded.authSessionVersion).toBe(2);
  });

  it("CASE D — transaction rollback reverts business mutation and version increment", async () => {
    const org = await createOrg("rollback");
    const user = await createUser({
      emailSuffix: "rollback",
      organizationId: org.id,
    });

    await expect(
      clientA.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            isApproved: false,
            authSessionVersion: { increment: 1 },
          },
        });
        throw new Error("dat_it_controlled_jwt_revocation_rollback");
      }),
    ).rejects.toThrow("dat_it_controlled_jwt_revocation_rollback");

    const loaded = await clientA.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { isApproved: true, authSessionVersion: true },
    });
    expect(loaded.isApproved).toBe(true);
    expect(loaded.authSessionVersion).toBe(0);
  });

  it("CASE E — password reset commits passwordHash + authSessionVersion together", async () => {
    const org = await createOrg("password-reset");
    const user = await createUser({
      emailSuffix: "password-reset",
      organizationId: org.id,
      passwordHash: "old-hash",
    });

    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    await clientA.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });

    const result = await confirmPasswordReset({
      token: rawToken,
      newPassword: "SecurePass1!",
    });
    expect(result.ok).toBe(true);

    const loaded = await clientA.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true, authSessionVersion: true },
    });
    expect(loaded.passwordHash).not.toBe("old-hash");
    expect(loaded.passwordHash).toBeTruthy();
    expect(loaded.authSessionVersion).toBe(1);
  });

  it("CASE F — validation before commit may see N; after COMMIT old N fails", async () => {
    const org = await createOrg("concurrency");
    const user = await createUser({
      emailSuffix: "concurrency",
      organizationId: org.id,
    });

    const before = await assertJwtAuthSessionVersion({
      tokenSub: user.id,
      tokenAuthSessionVersion: 0,
      loadAuthority: (userId) =>
        clientA.user.findUnique({
          where: { id: userId },
          select: { id: true, authSessionVersion: true },
        }),
    });
    expect(before).toBe(0);

    await clientA.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { authSessionVersion: { increment: 1 } },
      });

      // Concurrent client may still observe pre-commit N inside the open transaction window.
      const midTxn = await clientB.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { authSessionVersion: true },
      });
      // READ COMMITTED: uncommitted increment is not visible to clientB.
      expect(midTxn.authSessionVersion).toBe(0);
    });

    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: user.id,
        tokenAuthSessionVersion: 0,
        loadAuthority: (userId) =>
          clientA.user.findUnique({
            where: { id: userId },
            select: { id: true, authSessionVersion: true },
          }),
      }),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);

    const after = await assertJwtAuthSessionVersion({
      tokenSub: user.id,
      tokenAuthSessionVersion: 1,
      loadAuthority: (userId) =>
        clientA.user.findUnique({
          where: { id: userId },
          select: { id: true, authSessionVersion: true },
        }),
    });
    expect(after).toBe(1);
  });

  it("CASE G — deleted User makes authority lookup missing", async () => {
    const org = await createOrg("deleted");
    const user = await createUser({
      emailSuffix: "deleted",
      organizationId: org.id,
    });

    await clientA.user.delete({ where: { id: user.id } });

    await expect(
      assertJwtAuthSessionVersion({
        tokenSub: user.id,
        tokenAuthSessionVersion: 0,
        loadAuthority: (userId) =>
          clientA.user.findUnique({
            where: { id: userId },
            select: { id: true, authSessionVersion: true },
          }),
      }),
    ).rejects.toBeInstanceOf(AuthSessionRevokedError);
  });
});
