import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { listCommittedPrismaMigrationNames } from "@/lib/ops/committed-prisma-migrations";
import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";

const prisma = createIntegrationPrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("integration proof A — committed migration history", () => {
  it("matches every committed migration directory as finished and not rolled back", async () => {
    const expected = listCommittedPrismaMigrationNames(
      path.join(process.cwd(), "prisma", "migrations"),
    );

    const rows = await prisma.$queryRaw<
      Array<{
        migration_name: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>
    >`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at ASC
    `;

    const appliedNames = rows.map((row) => row.migration_name);
    expect(appliedNames).toEqual(expected);
    expect(rows).toHaveLength(expected.length);

    for (const row of rows) {
      expect(row.finished_at, row.migration_name).not.toBeNull();
      expect(row.rolled_back_at, row.migration_name).toBeNull();
    }
  });
});
