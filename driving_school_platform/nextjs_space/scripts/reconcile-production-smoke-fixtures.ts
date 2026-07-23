/**
 * Operator CLI: reconcile DAT Production Smoke canonical fixtures.
 *
 * Default: dry-run (zero writes).
 * Writes: explicit `--apply` only.
 *
 * Operator-safe env loading (Node 20+): do NOT rely on Next.js / tsx / pnpm to
 * auto-load `.env.operator.production.local`. Prefer:
 *
 *   node --env-file=.env.operator.production.local --import tsx \
 *     scripts/reconcile-production-smoke-fixtures.ts
 *
 * Or the package script `ops:reconcile-production-smoke-fixtures`, which passes
 * the same `--env-file` explicitly.
 *
 * Requires remote target identity env (same as inspect CLI).
 * Does not recreate Platform Admin. Does not touch commercial catalogue.
 * Does not run migrations. Never prints .env contents, full IDs, or full emails.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { DAT_SMOKE_EXPECTED_ADMIN_EMAIL_ENV } from "@/lib/ops/production-smoke-fixtures-canonical";
import {
  formatSmokeFixturesReconcileFailureMessage,
  formatSmokeFixturesReconcilePlanText,
} from "@/lib/ops/production-smoke-fixtures-reconciliation-output";
import {
  parseSmokeFixturesReconcileArgs,
  planProductionSmokeFixturesReconciliation,
  type SmokeFixturesReconcileDb,
} from "@/lib/ops/production-smoke-fixtures-reconciliation";
import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  assertRemoteOperatorTargetAllowed,
  formatRemoteOperatorTargetRefusalMessage,
} from "@/lib/ops/remote-operator-target-guard";

export function isSmokeFixturesReconcileDirectExecution(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  if (!argv1) return false;
  try {
    return pathToFileURL(path.resolve(argv1)).href === moduleUrl;
  } catch {
    return false;
  }
}

export function adaptPrismaToSmokeFixturesReconcileDb(
  prisma: import("@prisma/client").PrismaClient,
): SmokeFixturesReconcileDb {
  const adaptClient = (
    client:
      | import("@prisma/client").PrismaClient
      | import("@prisma/client").Prisma.TransactionClient,
  ): SmokeFixturesReconcileDb => ({
    organization: {
      findMany: (args) => client.organization.findMany(args),
      count: (args) => client.organization.count(args),
    },
    organizationFeature: {
      findMany: (args) => client.organizationFeature.findMany(args),
      upsert: (args) => client.organizationFeature.upsert(args),
    },
    user: {
      findMany: (args) => client.user.findMany(args),
      update: (args) => client.user.update(args),
    },
    instructor: {
      findMany: (args) => client.instructor.findMany(args),
    },
    student: {
      findMany: (args) => client.student.findMany(args),
      update: (args) => client.student.update(args),
    },
    vehicle: {
      findMany: (args) => client.vehicle.findMany(args),
      update: (args) => client.vehicle.update(args),
    },
    userInvitation: {
      findMany: (args) => client.userInvitation.findMany(args),
    },
    auditLog: {
      create: (args) =>
        client.auditLog.create(
          args as Parameters<typeof client.auditLog.create>[0],
        ),
    },
    $transaction: async (fn) => {
      if (!("$transaction" in client)) {
        throw new Error("nested_transaction_unsupported");
      }
      return (client as import("@prisma/client").PrismaClient).$transaction(
        async (tx) => fn(adaptClient(tx)),
      );
    },
  });

  return adaptClient(prisma);
}

export async function runSmokeFixturesReconcileCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const { apply, unknownFlags } = parseSmokeFixturesReconcileArgs(argv);
  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(", ")}. Supported: --apply. Dry-run is the default.`,
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

  // Prisma Client is created only after argv + remote-target gates pass.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const result = await planProductionSmokeFixturesReconciliation(
      adaptPrismaToSmokeFixturesReconcileDb(prisma),
      {
        apply,
        expectedAdminEmail: env[DAT_SMOKE_EXPECTED_ADMIN_EMAIL_ENV],
      },
    );

    if (!result.ok) {
      if (result.plan) {
        console.log(formatSmokeFixturesReconcilePlanText(result.plan));
        console.log("");
      }
      console.error(formatSmokeFixturesReconcileFailureMessage(result.code));
      console.error(result.message);
      process.exitCode = 1;
      return;
    }

    console.log(formatSmokeFixturesReconcilePlanText(result.plan));
    if (!result.applied) {
      console.log("");
      console.log(
        "Dry-run complete. Re-run with --apply to perform writes in a single transaction.",
      );
      return;
    }

    console.log("");
    console.log(
      `Apply complete. changesApplied=${result.changesApplied}. Re-run inspect to verify readiness.`,
    );
  } catch {
    console.error(
      formatSmokeFixturesReconcileFailureMessage("inspection_failed"),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  // Env must already be present (node --env-file=... or package script).
  // Do not source/.dotenv-print operator secrets here.
  try {
    await runSmokeFixturesReconcileCli(process.argv.slice(2), process.env);
  } catch {
    console.error(
      formatSmokeFixturesReconcileFailureMessage("inspection_failed"),
    );
    process.exitCode = 1;
  }
}

if (isSmokeFixturesReconcileDirectExecution(process.argv[1], import.meta.url)) {
  void main();
}
