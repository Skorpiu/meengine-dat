/**
 * DEPRECATED — unsafe broad single-organization backfill.
 *
 * This script used blind updateMany to the first/default organization and
 * touched config tables. It is disabled by default.
 *
 * Safe operator (dry-run only):
 *   pnpm tenant:org-backfill:dry-run
 *
 * Legacy unsafe execution (discouraged; Preview/operator only):
 *   ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1 tsx scripts/backfill-organization-scope.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { executeSqlBackfillNullOrganizationId } from "@/lib/tenant-operational-organization-id-sql";

const prisma = new PrismaClient();

function exitDeprecated(): never {
  console.error(
    "\n❌ scripts/backfill-organization-scope.ts is DEPRECATED and disabled by default.",
  );
  console.error(
    "   It performed unsafe broad single-org updateMany (including config tables).",
  );
  console.error("\n   Use the read-only planners instead:");
  console.error("   pnpm tenant:org-null-report");
  console.error("   pnpm tenant:org-backfill:dry-run");
  console.error("\n   To run legacy unsafe backfill (operator risk):");
  console.error(
    "   ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1 tsx scripts/backfill-organization-scope.ts\n",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.env.ALLOW_UNSAFE_BROAD_ORG_BACKFILL !== "1") {
    exitDeprecated();
  }

  console.warn(
    "⚠️  ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1 — running legacy broad backfill (writes data).\n",
  );

  const preferredOrgId =
    process.env.TARGET_ORG_ID ||
    process.env.DEFAULT_ORG_ID ||
    process.env.ORG_ID ||
    null;

  const org = preferredOrgId
    ? await prisma.organization.findUnique({
        where: { id: preferredOrgId },
        select: { id: true, name: true },
      })
    : await prisma.organization.findFirst({
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });

  if (!org) {
    throw new Error("No organization found. Run seed-organization.ts first.");
  }

  console.log(`✅ Using organization: ${org.name} (${org.id})\n`);

  const results = await prisma.$transaction(async (tx) => {
    const vehicles = await executeSqlBackfillNullOrganizationId(
      tx,
      "vehicle",
      org.id,
    );
    const lessons = await executeSqlBackfillNullOrganizationId(
      tx,
      "lesson",
      org.id,
    );
    const exams = await executeSqlBackfillNullOrganizationId(
      tx,
      "exam",
      org.id,
    );
    const lessonRequests = await executeSqlBackfillNullOrganizationId(
      tx,
      "lessonRequest",
      org.id,
    );
    const systemSettings = await tx.systemSetting.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    });
    const configHistory = await tx.configurationHistory.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    });
    const featureFlags = await tx.featureFlag.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    });

    return {
      vehicles: { count: vehicles },
      lessons: { count: lessons },
      exams: { count: exams },
      lessonRequests: { count: lessonRequests },
      systemSettings,
      configHistory,
      featureFlags,
    };
  });

  const {
    vehicles,
    lessons,
    exams,
    lessonRequests,
    systemSettings,
    configHistory,
    featureFlags,
  } = results;

  console.log("📌 Backfill results:");
  console.log(`- vehicles:       ${vehicles.count}`);
  console.log(`- lessons:        ${lessons.count}`);
  console.log(`- exams:          ${exams.count}`);
  console.log(`- lessonRequests: ${lessonRequests.count}`);
  console.log(`- systemSettings: ${systemSettings.count}`);
  console.log(`- configHistory:  ${configHistory.count}`);
  console.log(`- featureFlags:   ${featureFlags.count}`);
  console.log("\n🎉 Done.\n");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Backfill failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
