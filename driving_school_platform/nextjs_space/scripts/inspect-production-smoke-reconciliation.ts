/**
 * Inspect-only operator CLI for DAT technical production smoke reconciliation.
 *
 * Application-level inspect-only — does not claim PostgreSQL read-only mode.
 * Does not recreate embedded Platform Admin. Does not write. Does not export full fixture IDs.
 *
 * Required expected-target env (in addition to DATABASE_URL):
 *   DAT_OPS_EXPECTED_DB_HOST
 *   DAT_OPS_EXPECTED_DB_NAME
 *   DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF
 *
 * Optional:
 *   DAT_OPS_INSPECT_OUTPUT=json|text — when set, overrides --json/--text (default text)
 *   DIRECT_URL — when set, must agree on project ref + database
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";

import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  assertRemoteOperatorTargetAllowed,
  formatRemoteOperatorTargetRefusalMessage,
} from "@/lib/ops/remote-operator-target-guard";
import {
  inspectProductionSmokeReconciliation,
  type ProductionSmokeInspectionDb,
} from "@/lib/ops/production-smoke-reconciliation-inspection";
import {
  formatProductionSmokeInspectionFailureMessage,
  formatProductionSmokeInspectionJson,
  formatProductionSmokeInspectionText,
} from "@/lib/ops/production-smoke-reconciliation-output";

export function isProductionSmokeReconciliationInspectDirectExecution(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  if (!argv1) return false;
  try {
    const entryHref = pathToFileURL(path.resolve(argv1)).href;
    return entryHref === moduleUrl;
  } catch {
    return false;
  }
}

/**
 * Pure argv parser. Does not read process.env.
 * Pass `envOutput` from the runner's injected env when resolving DAT_OPS_INSPECT_OUTPUT.
 * When `envOutput` is `json` or `text`, it overrides --json/--text.
 * Standalone `--` is ignored (POSIX end-of-options marker).
 */
export function parseProductionSmokeReconciliationInspectArgs(
  argv: readonly string[],
  options?: { envOutput?: string | undefined },
): { unknownFlags: string[]; output: "text" | "json" } {
  const unknownFlags: string[] = [];
  let output: "text" | "json" = "text";

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }
    if (arg === "--json") {
      output = "json";
      continue;
    }
    if (arg === "--text") {
      output = "text";
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlags.push(arg);
    }
  }

  const envOutput = options?.envOutput?.trim().toLowerCase();
  if (envOutput === "json") output = "json";
  if (envOutput === "text") output = "text";

  return { unknownFlags, output };
}

/**
 * Explicit read-only wrappers — each property is only the inspect methods.
 * Full Prisma delegates (with create/update/delete) are never passed through.
 */
export function adaptPrismaToInspectionDb(
  prisma: import("@prisma/client").PrismaClient,
): ProductionSmokeInspectionDb {
  return {
    organization: {
      findMany: (args) => prisma.organization.findMany(args),
      count: (args) => prisma.organization.count(args),
    },
    organizationDomain: {
      findMany: (args) => prisma.organizationDomain.findMany(args),
    },
    organizationFeature: {
      findMany: (args) => prisma.organizationFeature.findMany(args),
    },
    user: {
      findMany: (args) => prisma.user.findMany(args),
      count: (args) => prisma.user.count(args),
    },
    category: {
      findMany: (args) => prisma.category.findMany(args),
    },
    instructor: {
      findMany: (args) => prisma.instructor.findMany(args),
      count: (args) => prisma.instructor.count(args),
    },
    student: {
      findMany: (args) => prisma.student.findMany(args),
      count: (args) => prisma.student.count(args),
    },
    vehicle: {
      findMany: (args) => prisma.vehicle.findMany(args),
      count: (args) => prisma.vehicle.count(args),
    },
    lesson: {
      count: (args) => prisma.lesson.count(args),
    },
    lessonRequest: {
      count: (args) => prisma.lessonRequest.count(args),
    },
    exam: {
      count: (args) => prisma.exam.count(args),
    },
    examRegistration: {
      count: (args) => prisma.examRegistration.count(args),
    },
    auditLog: {
      count: (args) => prisma.auditLog.count(args),
    },
    payment: {
      count: (args) => prisma.payment.count(args),
    },
    notification: {
      count: (args) => prisma.notification.count(args),
    },
    billingEvent: {
      count: (args) => prisma.billingEvent.count(args),
    },
    verificationToken: {
      count: (args) => prisma.verificationToken.count(args),
    },
    rateLimitBucket: {
      count: (args) => prisma.rateLimitBucket.count(args),
    },
  };
}

export async function runProductionSmokeReconciliationInspectCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const { unknownFlags, output } =
    parseProductionSmokeReconciliationInspectArgs(argv, {
      envOutput: env.DAT_OPS_INSPECT_OUTPUT,
    });

  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(", ")}. Supported: --json, --text. No --apply or write modes exist.`,
    );
    process.exitCode = 1;
    return;
  }

  const targetDecision = assertRemoteOperatorTargetAllowed({
    databaseUrl: env.DATABASE_URL,
    expectedHost: env[REMOTE_OPS_EXPECTED_DB_HOST_ENV],
    expectedDatabase: env[REMOTE_OPS_EXPECTED_DB_NAME_ENV],
    expectedSupabaseProjectRef:
      env[REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV],
    directUrl: env.DIRECT_URL,
  });

  if (!targetDecision.ok) {
    console.error(formatRemoteOperatorTargetRefusalMessage(targetDecision));
    process.exitCode = 1;
    return;
  }

  // Dynamic import only after target identity validation.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const result = await inspectProductionSmokeReconciliation(
      adaptPrismaToInspectionDb(prisma),
    );

    const rendered =
      output === "json"
        ? formatProductionSmokeInspectionJson({
            target: targetDecision.safeSummary,
            result,
          })
        : formatProductionSmokeInspectionText({
            target: targetDecision.safeSummary,
            result,
          });

    console.log(rendered);

    if (
      result.organizationStatus === "smoke_organization_missing" ||
      result.organizationStatus === "smoke_organization_ambiguous"
    ) {
      process.exitCode = 1;
    }
  } catch {
    console.error(formatProductionSmokeInspectionFailureMessage());
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  try {
    await runProductionSmokeReconciliationInspectCli(
      process.argv.slice(2),
      process.env,
    );
  } catch {
    console.error(formatProductionSmokeInspectionFailureMessage());
    process.exitCode = 1;
  }
}

if (
  isProductionSmokeReconciliationInspectDirectExecution(
    process.argv[1],
    import.meta.url,
  )
) {
  void main();
}
