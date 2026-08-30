/**
 * Dedicated Prisma clients for disposable-database integration tests.
 * Do not import the application singleton `lib/db.ts`.
 */

import { PrismaClient } from "@prisma/client";

export function requireIntegrationDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Integration tests require DATABASE_URL from the disposable harness child environment.",
    );
  }
  return url;
}

export function createIntegrationPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: requireIntegrationDatabaseUrl(),
      },
    },
  });
}
