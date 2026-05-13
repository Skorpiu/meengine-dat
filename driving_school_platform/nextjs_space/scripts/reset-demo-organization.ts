/**
 * Dry-run only: validates DEMO_ORGANIZATION_ID and prints what a future reset would cover.
 * Does not delete or update any data.
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<org-cuid> pnpm demo:reset:dry-run
 *
 * Requires DATABASE_URL (and optional DIRECT_URL) like other Prisma scripts — load .env via @next/env.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const id = process.env.DEMO_ORGANIZATION_ID?.trim();
    if (!id) {
      console.error(
        "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
      );
      return 1;
    }

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, isDemo: true },
    });

    if (!org) {
      console.error(`No organization found with id "${id}".`);
      return 1;
    }

    if (!org.isDemo) {
      console.error("Refusing to reset a non-demo organization.");
      return 1;
    }

    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(
      "isDemo: true — eligible for a future destructive reset (not executed here).",
    );
    console.log("");
    console.log("A future destructive reset would typically:");
    console.log(
      "  - Delete or recreate tenant-scoped rows for this organizationId only.",
    );
    console.log(
      "  - Examples: users (and related sessions/accounts), students, instructors,",
    );
    console.log(
      "    lessons, lesson requests, vehicles, system settings, feature flags,",
    );
    console.log(
      "    configuration history, organization-scoped license/feature data, etc.",
    );
    console.log("  - Never modify rows belonging to other organizations.");
    console.log("");
    console.log("Dry run only. No data was changed.");
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
