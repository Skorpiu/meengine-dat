/**
 * Discovers committed Prisma migration directory names from the repository.
 * Used by the disposable integration harness to prove exact migrate-deploy history.
 * Does not connect to a database and does not modify migration files.
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export function listCommittedPrismaMigrationNames(
  migrationsDir: string,
): string[] {
  if (!existsSync(migrationsDir)) {
    throw new Error("Committed Prisma migrations directory was not found.");
  }

  const entries = readdirSync(migrationsDir, { withFileTypes: true });
  const names = entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      if (entry.name.startsWith(".")) return false;
      const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
      return existsSync(sqlPath);
    })
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) {
    throw new Error("No committed Prisma migration directories were found.");
  }

  return names;
}

export function resolveDefaultPrismaMigrationsDir(appRoot: string): string {
  return path.join(appRoot, "prisma", "migrations");
}
