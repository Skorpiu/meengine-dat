import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  listCommittedPrismaMigrationNames,
  resolveDefaultPrismaMigrationsDir,
} from "@/lib/ops/committed-prisma-migrations";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

describe("committed Prisma migration discovery", () => {
  it("lists the exact committed migration directory set in lexicographic order", () => {
    const names = listCommittedPrismaMigrationNames(
      resolveDefaultPrismaMigrationsDir(appRoot),
    );

    expect(names).toHaveLength(30);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names[0]).toBe("20251111214609_init_supabase");
    expect(names[names.length - 1]).toBe(
      "20260903120000_add_user_auth_session_version",
    );
    expect(new Set(names).size).toBe(names.length);
  });
});
