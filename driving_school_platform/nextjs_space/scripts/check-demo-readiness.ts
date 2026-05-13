/**
 * Read-only public demo readiness / preflight for a single organization.
 * Prints aggregate counts only — no emails, names, hashes, tokens, or connection strings.
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<org-cuid> pnpm demo:readiness
 *
 * Requires DATABASE_URL (load .env via @next/env), same as reset-demo-organization.ts.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient, type UserRole } from "@prisma/client";

loadEnvConfig(process.cwd());

const TENANT_ROLES_FOR_SUMMARY: UserRole[] = [
  "SUPER_ADMIN",
  "INSTRUCTOR",
  "STUDENT",
];

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
        "Demo readiness failed: organization is not marked as demo.",
      );
      console.log("");
      console.log("Result:");
      console.log("FAIL — organization is not marked as demo.");
      return 1;
    }

    const platformAdminInOrg = await prisma.user.count({
      where: { organizationId: id, role: "PLATFORM_ADMIN" },
    });

    if (platformAdminInOrg > 0) {
      console.error(
        "Demo readiness failed: PLATFORM_ADMIN users must not be part of a public demo organization.",
      );
      return 1;
    }

    const [
      roleGroups,
      userTotal,
      vehicles,
      lessons,
      systemSettings,
      featureFlags,
      organizationFeatures,
      entitlementGrants,
      billingEvents,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        where: { organizationId: id },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { organizationId: id } }),
      prisma.vehicle.count({ where: { organizationId: id } }),
      prisma.lesson.count({ where: { organizationId: id } }),
      prisma.systemSetting.count({ where: { organizationId: id } }),
      prisma.featureFlag.count({ where: { organizationId: id } }),
      prisma.organizationFeature.count({
        where: { organizationId: id },
      }),
      prisma.entitlementGrant.count({
        where: { organizationId: id },
      }),
      prisma.billingEvent.count({ where: { organizationId: id } }),
    ]);

    const byRole: Partial<Record<UserRole, number>> = {};
    for (const row of roleGroups) {
      byRole[row.role] = row._count._all;
    }

    console.log("Public demo readiness check");
    console.log(`Organization: ${org.name}`);
    console.log(`id: ${org.id}`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log("");
    console.log("Counts:");
    console.log(`- users: ${userTotal}`);
    const roleParts = TENANT_ROLES_FOR_SUMMARY.map(
      (r) => `${r}=${byRole[r] ?? 0}`,
    ).join(", ");
    console.log(`- users by role: ${roleParts}`);
    console.log(`- vehicles: ${vehicles}`);
    console.log(`- lessons: ${lessons}`);
    console.log(`- system settings (org-scoped): ${systemSettings}`);
    console.log(`- feature flags (org-scoped): ${featureFlags}`);
    console.log(`- organization features: ${organizationFeatures}`);
    console.log(`- entitlement grants: ${entitlementGrants}`);
    console.log(`- billing events (org-scoped, count only): ${billingEvents}`);

    if (userTotal === 0) {
      console.log("");
      console.log("Warning: demo organization has no users.");
    }

    console.log("");
    console.log("Result:");
    console.log(
      "PASS — organization is marked as demo and no privileged platform credentials were detected.",
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
