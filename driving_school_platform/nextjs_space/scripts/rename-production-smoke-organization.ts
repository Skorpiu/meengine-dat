/**
 * Operator script: rename the production smoke organization display name only.
 *
 * Default: dry-run (no writes).
 * Apply: DAT_SMOKE_RENAME_APPLY=true
 *
 * Required env:
 * - DAT_SMOKE_ORG_ID
 * - DAT_SMOKE_EXPECTED_HOST
 * Optional:
 * - DAT_SMOKE_EXPECTED_CURRENT_NAME
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
  buildProductionSmokeRenameReport,
  decideProductionSmokeOrganizationRename,
} from "@/lib/ops/rename-production-smoke-organization";

loadEnvConfig(process.cwd());

function isApplyMode(): boolean {
  return process.env.DAT_SMOKE_RENAME_APPLY?.trim().toLowerCase() === "true";
}

async function main() {
  const prisma = new PrismaClient();
  const organizationId = process.env.DAT_SMOKE_ORG_ID;
  const expectedHost = process.env.DAT_SMOKE_EXPECTED_HOST;
  const explicitExpectedCurrentName =
    process.env.DAT_SMOKE_EXPECTED_CURRENT_NAME?.trim() || undefined;
  const applyMode = isApplyMode();

  try {
    const orgId = organizationId?.trim();
    if (!orgId) {
      console.error("Refusing to run: DAT_SMOKE_ORG_ID is required.");
      process.exitCode = 1;
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        domains: { select: { host: true } },
        _count: { select: { users: true } },
      },
    });

    const reportInput = {
      organizationIdEnv: organizationId,
      expectedHostEnv: expectedHost,
      explicitExpectedCurrentName,
      applyMode,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            domains: organization.domains,
            userCount: organization._count.users,
          }
        : null,
    };

    const report = buildProductionSmokeRenameReport(reportInput);
    if ("error" in report) {
      console.error(`Refusing to run: ${report.error}`);
      process.exitCode = 1;
      return;
    }

    console.log("Production smoke organization rename");
    console.log(`  organizationId: ${report.organizationId}`);
    console.log(`  currentName: ${report.currentName}`);
    console.log(`  targetName: ${report.targetName}`);
    console.log(`  matchedHost: ${report.matchedHost}`);
    console.log(`  domainCount: ${report.domainCount}`);
    console.log(`  userCount: ${report.userCount}`);
    console.log(`  applyMode: ${report.applyMode ? "true" : "false"}`);

    const decision = decideProductionSmokeOrganizationRename(reportInput);
    if (decision.action === "noop") {
      console.log(`No changes required: ${decision.reason}`);
      return;
    }

    if (decision.action === "dry-run") {
      console.log(
        "Dry-run only. Set DAT_SMOKE_RENAME_APPLY=true to update Organization.name.",
      );
      return;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { name: PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME },
      select: { id: true, name: true },
    });

    console.log("Apply complete.");
    console.log(`  verifiedName: ${updated.name}`);
    if (updated.name !== PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME) {
      console.error(
        "Post-update verification failed: unexpected organization name.",
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Rename script failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
