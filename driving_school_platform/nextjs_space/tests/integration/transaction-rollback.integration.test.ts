import { afterAll, describe, expect, it } from "vitest";

import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";

const prisma = createIntegrationPrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("integration proof C — transaction rollback", () => {
  it("does not persist a write from a transaction that throws", async () => {
    const name = "it-tx-rollback-organization";

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.organization.create({ data: { name } });
        throw new Error("dat_it_controlled_rollback");
      }),
    ).rejects.toThrow("dat_it_controlled_rollback");

    const remaining = await prisma.organization.findUnique({
      where: { name },
    });
    expect(remaining).toBeNull();
  });
});
