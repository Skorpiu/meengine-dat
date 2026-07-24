/**
 * Operator CLI: repair UserInvitation.studentId for the ACCEPTED smoke student invite.
 *
 * Default: dry-run (zero writes).
 * Writes: explicit `--apply` only.
 *
 *   node --env-file=.env.operator.production.local --import tsx \
 *     scripts/repair-accepted-student-invitation-link.ts
 *
 * Or: pnpm ops:repair-accepted-student-invitation-link
 * Apply: pnpm ops:repair-accepted-student-invitation-link -- --apply
 *
 * Requires remote target identity env. Never prints full emails or full IDs.
 * Does not accept email via argv. Does not touch names, category, features, or plates.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import { DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV } from "@/lib/ops/production-smoke-fixtures-canonical";
import {
  formatRepairAcceptedStudentInvitationLinkFailureMessage,
  formatRepairAcceptedStudentInvitationLinkPlanText,
  parseRepairAcceptedStudentInvitationLinkArgs,
  repairAcceptedStudentInvitationLink,
  type RepairAcceptedStudentInvitationLinkDb,
} from "@/lib/ops/repair-accepted-student-invitation-link";
import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  assertRemoteOperatorTargetAllowed,
  formatRemoteOperatorTargetRefusalMessage,
} from "@/lib/ops/remote-operator-target-guard";

export function isRepairAcceptedStudentInvitationLinkDirectExecution(
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

export function adaptPrismaToRepairAcceptedStudentInvitationLinkDb(
  prisma: import("@prisma/client").PrismaClient,
): RepairAcceptedStudentInvitationLinkDb {
  const adaptClient = (
    client:
      | import("@prisma/client").PrismaClient
      | import("@prisma/client").Prisma.TransactionClient,
  ): RepairAcceptedStudentInvitationLinkDb => ({
    organization: {
      findMany: (args) => client.organization.findMany(args),
      count: (args) => client.organization.count(args),
    },
    userInvitation: {
      findMany: (args) => client.userInvitation.findMany(args),
      update: (args) => client.userInvitation.update(args),
    },
    user: {
      findMany: (args) => client.user.findMany(args),
    },
    student: {
      findMany: (args) => client.student.findMany(args),
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

export async function runRepairAcceptedStudentInvitationLinkCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const { apply, unknownFlags } =
    parseRepairAcceptedStudentInvitationLinkArgs(argv);
  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(", ")}. Supported: --apply. Dry-run is the default. Email must come from ${DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV} only.`,
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
    const result = await repairAcceptedStudentInvitationLink(
      adaptPrismaToRepairAcceptedStudentInvitationLinkDb(prisma),
      {
        apply,
        invitedStudentEmail: env[DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV],
      },
    );

    if (!result.ok) {
      if (result.plan) {
        console.log(
          formatRepairAcceptedStudentInvitationLinkPlanText(result.plan),
        );
        console.log("");
      }
      console.error(
        formatRepairAcceptedStudentInvitationLinkFailureMessage(result.code),
      );
      console.error(result.message);
      process.exitCode = 1;
      return;
    }

    console.log(formatRepairAcceptedStudentInvitationLinkPlanText(result.plan));
    if (!result.applied) {
      console.log("");
      if (result.plan.alreadyLinked) {
        console.log(
          "Already linked. Dry-run/apply are no-ops (idempotent). No writes performed.",
        );
      } else {
        console.log(
          "Dry-run complete. Re-run with --apply to set UserInvitation.studentId only.",
        );
      }
      return;
    }

    console.log("");
    console.log(
      `Apply complete. wrote=${String(result.wrote)}. Re-run smoke fixture dry-run to verify invite coherence.`,
    );
  } catch {
    console.error(
      formatRepairAcceptedStudentInvitationLinkFailureMessage("apply_failed"),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  try {
    await runRepairAcceptedStudentInvitationLinkCli(
      process.argv.slice(2),
      process.env,
    );
  } catch {
    console.error(
      formatRepairAcceptedStudentInvitationLinkFailureMessage("apply_failed"),
    );
    process.exitCode = 1;
  }
}

if (
  isRepairAcceptedStudentInvitationLinkDirectExecution(
    process.argv[1],
    import.meta.url,
  )
) {
  void main();
}
