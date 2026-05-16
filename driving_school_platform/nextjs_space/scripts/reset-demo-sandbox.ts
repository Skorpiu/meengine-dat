/**
 * Operator script: delete lessons and vehicles for a **demo** organization only.
 * Clears data created or allowed by the controlled demo write sandbox (and seed lessons/vehicles
 * for that org — there is no `createdByDemoSandbox` marker yet). Does not touch users, domains,
 * features, entitlements, settings, or billing tables.
 *
 * Default: dry-run (counts only). Apply requires **both**:
 *   - CLI: `--apply`
 *   - env: `DEMO_SANDBOX_RESET_APPLY=true`
 *
 * Required env:
 *   - `DEMO_ORGANIZATION_ID` — CUID of the demo organization
 *
 * Usage (from `driving_school_platform/nextjs_space`):
 *   DEMO_ORGANIZATION_ID=<demo-org-id> pnpm demo:sandbox:reset
 *   DEMO_ORGANIZATION_ID=<demo-org-id> DEMO_SANDBOX_RESET_APPLY=true pnpm demo:sandbox:reset -- --apply
 *
 * Requires `DATABASE_URL` — load `.env` via `@next/env`.
 * Do not print emails, tokens, or connection strings.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

import {
  DemoSandboxResetError,
  resetDemoSandbox,
} from "../lib/demo/demo-sandbox-reset";

loadEnvConfig(process.cwd());

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_SANDBOX_RESET_APPLY?.trim().toLowerCase() === "true";
  const argvOk = process.argv.includes("--apply");
  return envOk && argvOk;
}

function printApplyHints(): void {
  const envApply =
    process.env.DEMO_SANDBOX_RESET_APPLY?.trim().toLowerCase() === "true";
  const cliApply = process.argv.includes("--apply");
  if (cliApply && !envApply) {
    console.error(
      "Note: --apply was passed but DEMO_SANDBOX_RESET_APPLY is not true; no writes performed.",
    );
  } else if (envApply && !cliApply) {
    console.error(
      "Note: DEMO_SANDBOX_RESET_APPLY=true but --apply was not passed (use `pnpm demo:sandbox:reset -- --apply`); no writes performed.",
    );
  } else {
    console.error(
      "Note: to apply, pass --apply and set DEMO_SANDBOX_RESET_APPLY=true (both are required).",
    );
  }
}

async function main(): Promise<number> {
  const orgId = process.env.DEMO_ORGANIZATION_ID?.trim();
  if (!orgId) {
    console.error(
      "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
    );
    return 1;
  }

  const prisma = new PrismaClient();
  try {
    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    let result;
    try {
      result = await resetDemoSandbox({
        organizationId: orgId,
        apply,
        prisma,
      });
    } catch (e: unknown) {
      if (e instanceof DemoSandboxResetError) {
        console.error(e.message);
        return 1;
      }
      console.error(
        e instanceof Error ? e.message : "Unknown error during reset.",
      );
      return 1;
    }

    console.log("Reset demo sandbox (lessons + vehicles only)");
    console.log(
      `Organization: ${result.organizationName} (${result.organizationId})`,
    );
    console.log(`Mode:         ${mode}`);
    console.log("");
    console.log("Planned scope (this phase, no per-row sandbox marker):");
    console.log(
      "  - Deletes ALL lessons for this organization (FKs on payments / lesson_requests use ON DELETE SET NULL where applicable).",
    );
    console.log(
      "  - Deletes ALL vehicles for this organization (FKs on lessons / lesson_requests / exams use ON DELETE SET NULL where applicable).",
    );
    console.log(
      "  - Does NOT delete users, students, instructors, domains, features, entitlements, settings, or billing_events.",
    );
    console.log("");
    console.log("Counts:");
    console.log(`  lessons:  ${result.plannedLessons}`);
    console.log(`  vehicles: ${result.plannedVehicles}`);
    console.log("");

    if (!apply) {
      printApplyHints();
      console.log("Dry run only. No data was changed.");
      return 0;
    }

    console.log("Apply completed.");
    console.log(`  deleted lessons:  ${result.deletedLessons}`);
    console.log(`  deleted vehicles: ${result.deletedVehicles}`);
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
