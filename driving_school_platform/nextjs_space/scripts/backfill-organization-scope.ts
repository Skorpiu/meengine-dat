/**
 * Backfill Script: Organization Scope on core models
 *
 * Sets organizationId on legacy rows where it's null.
 * Safe to run multiple times (idempotent).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🔧 Backfilling organizationId on core models...\n");

  const preferredOrgId =
    process.env.TARGET_ORG_ID ||
    process.env.DEFAULT_ORG_ID ||
    process.env.ORG_ID ||
    null;

  const org =
    preferredOrgId
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

    const results = await prisma.$transaction([
    prisma.vehicle.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
    prisma.lesson.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
    prisma.exam.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
    prisma.lessonRequest.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),

    // Settings / history (B2)
    prisma.systemSetting.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
    prisma.configurationHistory.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
    prisma.featureFlag.updateMany({
      where: { organizationId: null },
      data: { organizationId: org.id },
    }),
  ]);

  const [vehicles, lessons, exams, lessonRequests, systemSettings, configHistory, featureFlags] = results;

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
