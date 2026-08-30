import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";
import {
  errorLooksLikePostgresState,
  inspectPrismaPgError,
} from "@/tests/integration/helpers/inspect-prisma-pg-error";

const clientA = createIntegrationPrismaClient();
const clientB = createIntegrationPrismaClient();

beforeAll(async () => {
  await clientA.organization.deleteMany({
    where: { name: "it-row-lock-organization" },
  });
});

afterAll(async () => {
  await Promise.all([clientA.$disconnect(), clientB.$disconnect()]);
});

describe("integration proof D — row lock / concurrency", () => {
  it("times out a second FOR UPDATE while the first transaction holds the lock, then succeeds after release", async () => {
    const organization = await clientA.organization.create({
      data: { name: "it-row-lock-organization" },
    });

    let signalLockAcquired!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve;
    });

    let signalContenderFinished!: () => void;
    const contenderFinished = new Promise<void>((resolve) => {
      signalContenderFinished = resolve;
    });

    const holder = clientA.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM organizations WHERE id = $1 FOR UPDATE",
          organization.id,
        );
        signalLockAcquired();
        await contenderFinished;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    await lockAcquired;

    let contenderError: unknown;
    try {
      await clientB.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '200ms'");
          await tx.$queryRawUnsafe(
            "SELECT id FROM organizations WHERE id = $1 FOR UPDATE",
            organization.id,
          );
        },
        { maxWait: 10_000, timeout: 15_000 },
      );
    } catch (error) {
      contenderError = error;
    } finally {
      signalContenderFinished();
    }

    expect(contenderError).toBeDefined();
    const inspected = inspectPrismaPgError(contenderError);
    expect(
      inspected.sqlState === "55P03" ||
        inspected.driverCode === "55P03" ||
        errorLooksLikePostgresState(contenderError, "55P03"),
      `expected PostgreSQL lock_timeout 55P03, observed ${JSON.stringify(inspected)}`,
    ).toBe(true);

    await holder;

    await clientB.$transaction(
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          "SELECT id FROM organizations WHERE id = $1 FOR UPDATE",
          organization.id,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(organization.id);
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  });
});
