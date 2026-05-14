/**
 * Read-only: list organizations marked as demo (`Organization.isDemo = true`).
 * Prints id, name, domain hosts, and createdAt only — no users, emails, tokens, or secrets.
 *
 * Usage:
 *   pnpm demo:orgs:list
 *
 * Requires DATABASE_URL — load .env via @next/env (same as other operator scripts).
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const orgs = await prisma.organization.findMany({
      where: { isDemo: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        domains: {
          select: { host: true, isPrimary: true },
          orderBy: [{ isPrimary: "desc" }, { host: "asc" }],
        },
      },
    });

    if (orgs.length === 0) {
      console.log(
        "No demo organizations found (no rows with isDemo = true). Mark a tenant with Organization.isDemo or run the demo org bootstrap flow when ready.",
      );
      return 0;
    }

    console.log(`Demo organizations (${orgs.length}):`);
    console.log("");

    for (const org of orgs) {
      const hosts =
        org.domains.length === 0
          ? "(none)"
          : org.domains.map((d) => d.host).join(", ");
      console.log(`id:        ${org.id}`);
      console.log(`name:      ${org.name}`);
      console.log(`domains:   ${hosts}`);
      console.log(`createdAt: ${org.createdAt.toISOString()}`);
      console.log("");
    }

    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
