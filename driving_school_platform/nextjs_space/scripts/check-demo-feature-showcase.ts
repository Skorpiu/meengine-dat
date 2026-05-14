/**
 * Read-only: inspect OrganizationFeature + EntitlementGrant for a demo org.
 * Does not print emails, passwords, tokens, grant ids, or connection strings.
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<org-cuid> pnpm demo:features:check
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
      console.error(
        "Feature showcase check failed: organization is not marked as demo.",
      );
      return 1;
    }

    const now = new Date();

    const [features, scheduledGrants, activeGrants, expiredGrants] =
      await Promise.all([
        prisma.organizationFeature.findMany({
          where: { organizationId: id },
          select: { featureKey: true, isEnabled: true },
          orderBy: { featureKey: "asc" },
        }),
        prisma.entitlementGrant.count({
          where: { organizationId: id, startsAt: { gt: now } },
        }),
        prisma.entitlementGrant.count({
          where: {
            organizationId: id,
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        prisma.entitlementGrant.count({
          where: {
            organizationId: id,
            expiresAt: { not: null, lte: now },
            startsAt: { lte: now },
          },
        }),
      ]);

    const grantTotal = scheduledGrants + activeGrants + expiredGrants;

    console.log("Public demo feature showcase check");
    console.log(`Organization: ${org.name}`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log("");
    console.log(`Organization features (rows): ${features.length}`);
    if (features.length > 0) {
      console.log("Feature keys (safe list):");
      for (const f of features) {
        console.log(`  - ${f.featureKey}: isEnabled=${f.isEnabled}`);
      }
    }
    console.log("");
    console.log("Entitlement grants (counts by window, no ids):");
    console.log(`  - scheduled (startsAt > now): ${scheduledGrants}`);
    console.log(`  - active (started, not expired): ${activeGrants}`);
    console.log(
      `  - expired (expiresAt <= now, was started): ${expiredGrants}`,
    );
    console.log(`  - total rows: ${grantTotal}`);

    if (features.length === 0 && grantTotal === 0) {
      console.log("");
      console.log(
        "Warning: no demo showcase features or entitlement grants found.",
      );
    }

    console.log("");
    console.log(
      "Read-only check complete. No data was changed. Demo users cannot mutate licensing/feature flags while demo guards remain in place.",
    );
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
