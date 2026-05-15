/**
 * Operator script: link demo instructor qualified categories for practical (DRIVING) lessons.
 * Does not print passwords, password hashes, or tokens.
 *
 * Default: dry-run. Apply requires both:
 *   - CLI: --apply
 *   - env: DEMO_PRACTICAL_READINESS_APPLY=true
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_INSTRUCTOR_EMAIL=<email> pnpm demo:practical:configure
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_INSTRUCTOR_EMAIL=<email> DEMO_PRACTICAL_READINESS_APPLY=true pnpm demo:practical:configure -- --apply
 *
 * Optional: DEMO_DRIVING_CATEGORY_CODE (Category.name, e.g. B) or DEMO_DRIVING_CATEGORY_NAME
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient, UserRole } from "@prisma/client";
import { commonSchemas } from "../lib/validation";
import {
  planPracticalReadiness,
  resolveDrivingCategory,
} from "../lib/demo/demo-practical-readiness";

loadEnvConfig(process.cwd());

const INSTRUCTOR_ROLE: UserRole = "INSTRUCTOR";

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_PRACTICAL_READINESS_APPLY?.trim().toLowerCase() === "true";
  const argvOk = process.argv.includes("--apply");
  return envOk && argvOk;
}

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

function maskEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const at = lower.indexOf("@");
  if (at < 0) return "***";
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (local.length === 0) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const orgId = process.env.DEMO_ORGANIZATION_ID?.trim();
    if (!orgId) {
      console.error(
        "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
      );
      return 1;
    }

    const instructorEmailRaw = process.env.DEMO_INSTRUCTOR_EMAIL?.trim();
    if (!instructorEmailRaw) {
      console.error(
        "DEMO_INSTRUCTOR_EMAIL is not set. Set it to the demo instructor user email before running.",
      );
      return 1;
    }

    const emailCheck = commonSchemas.email.safeParse(instructorEmailRaw);
    if (!emailCheck.success) {
      console.error("DEMO_INSTRUCTOR_EMAIL is not a valid email address.");
      return 1;
    }

    const instructorEmail = normalizeEmail(instructorEmailRaw);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, isDemo: true },
    });

    if (!org) {
      console.error(`No organization found with id "${orgId}".`);
      return 1;
    }

    if (!org.isDemo) {
      console.error(
        "Refusing to configure practical readiness for a non-demo organization.",
      );
      return 1;
    }

    const user = await prisma.user.findUnique({
      where: { email: instructorEmail },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user) {
      console.error(
        `No user found for instructor email ${maskEmail(instructorEmail)}.`,
      );
      return 1;
    }

    if (user.organizationId !== orgId) {
      console.error(
        `Instructor user ${maskEmail(instructorEmail)} is not in organization "${org.name}".`,
      );
      return 1;
    }

    if (user.role !== INSTRUCTOR_ROLE) {
      console.error(
        `User ${maskEmail(instructorEmail)} has role ${user.role}; expected ${INSTRUCTOR_ROLE}.`,
      );
      return 1;
    }

    const instructor = await prisma.instructor.findUnique({
      where: { userId: user.id },
      include: {
        qualifiedCategories: {
          select: { id: true, name: true, fullName: true },
        },
      },
    });

    if (!instructor) {
      console.error(
        `Instructor profile missing for ${maskEmail(instructorEmail)}. Run demo:personas:configure first.`,
      );
      return 1;
    }

    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        fullName: true,
        isActive: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    const resolved = resolveDrivingCategory(categories, {
      code: process.env.DEMO_DRIVING_CATEGORY_CODE,
      name: process.env.DEMO_DRIVING_CATEGORY_NAME,
    });

    if ("error" in resolved) {
      console.error(resolved.error);
      return 1;
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { organizationId: orgId, isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, categoryId: true, registrationNumber: true },
    });

    const plan = planPracticalReadiness({
      targetCategory: resolved.category,
      instructorCategoryIds: instructor.qualifiedCategories.map((c) => c.id),
      vehicle,
    });

    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    console.log("Configure demo practical lesson readiness");
    console.log(`Organization: ${org.name}`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log(`Instructor: ${maskEmail(instructorEmail)}`);
    console.log(`Target category: ${plan.categoryLabel}`);
    console.log(`Mode: ${mode}`);
    console.log("");
    console.log("Current state:");
    console.log(
      `  - instructor qualified categories: ${
        instructor.qualifiedCategories.length === 0
          ? "(none)"
          : instructor.qualifiedCategories.map((c) => c.name).join(", ")
      }`,
    );
    if (vehicle) {
      console.log(
        `  - sample org vehicle: ${vehicle.registrationNumber} (categoryId=${vehicle.categoryId ?? "null"})`,
      );
    } else {
      console.log("  - sample org vehicle: (none active)");
    }
    console.log("");
    console.log("Planned changes:");
    if (plan.linkInstructor) {
      console.log(
        `  - connect instructor to category ${plan.categoryLabel} (_InstructorCategories)`,
      );
    } else {
      console.log(
        `  - instructor already qualified for ${plan.categoryLabel} (no link needed)`,
      );
    }
    if (plan.updateVehicleCategory && plan.vehicleId) {
      console.log(
        `  - set vehicle id ${plan.vehicleId} categoryId → ${plan.categoryId} (optional alignment)`,
      );
    } else if (vehicle) {
      console.log("  - vehicle category already aligned or not required");
    }

    const writesNeeded = plan.linkInstructor || plan.updateVehicleCategory;

    if (!apply) {
      const envApply =
        process.env.DEMO_PRACTICAL_READINESS_APPLY?.trim().toLowerCase() ===
        "true";
      const cliApply = process.argv.includes("--apply");
      if (cliApply && !envApply) {
        console.log("");
        console.log(
          "Note: --apply was passed but DEMO_PRACTICAL_READINESS_APPLY is not true; no writes performed.",
        );
      } else if (envApply && !cliApply) {
        console.log("");
        console.log(
          "Note: DEMO_PRACTICAL_READINESS_APPLY=true but --apply was not passed (use `pnpm ... -- --apply`); no writes performed.",
        );
      }
      if (!writesNeeded) {
        console.log("");
        console.log(
          "No changes required — demo instructor is ready for DRIVING lessons.",
        );
      } else {
        console.log("");
        console.log(
          "Dry-run complete. Re-run with DEMO_PRACTICAL_READINESS_APPLY=true and --apply to apply.",
        );
      }
      return 0;
    }

    if (!writesNeeded) {
      console.log("");
      console.log(
        "No changes required — demo instructor is ready for DRIVING lessons.",
      );
      return 0;
    }

    await prisma.$transaction(async (tx) => {
      if (plan.linkInstructor) {
        await tx.instructor.update({
          where: { id: instructor.id },
          data: {
            qualifiedCategories: {
              connect: { id: plan.categoryId },
            },
          },
        });
      }
      if (plan.updateVehicleCategory && plan.vehicleId) {
        await tx.vehicle.update({
          where: { id: plan.vehicleId },
          data: { categoryId: plan.categoryId },
        });
      }
    });

    console.log("");
    console.log(
      "Apply complete. Run pnpm demo:client-ready to verify demo readiness.",
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
