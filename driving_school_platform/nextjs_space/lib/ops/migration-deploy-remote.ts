/**
 * Migration-deploy execution orchestration (DB-MIGRATION-001 / DEC-069).
 *
 * Default invocation is preflight-only: parse env, validate identity, print a
 * redacted summary, perform no DB connection, spawn no Prisma process.
 *
 * `--execute` is a separate human-authorization path. Prisma is spawnable only
 * after identity match, unattended-host refusal, interactive TTY, and typed
 * confirmation. Identity match never equals write authority.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";

import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
} from "@/lib/ops/remote-operator-target-guard";
import {
  REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV,
  evaluateMigrationDeployTarget,
  formatMigrationDeployTargetRefusalMessage,
  formatMigrationDeployTargetSummary,
  type MigrationDeployTargetDecision,
} from "@/lib/ops/migration-deploy-target-guard";

export const MIGRATION_DEPLOY_PRISMA_ARGS = ["migrate", "deploy"] as const;

export type MigrationDeployRemoteArgs = {
  execute: boolean;
  unknownFlags: string[];
};

export type UnattendedHostSignalName = "CI" | "GITLAB_CI" | "VERCEL";

export type PrismaMigrateDeployInvocation = {
  argv: readonly string[];
  shell: false;
  cwd: string;
};

export type PrismaMigrateDeployRunner = (
  invocation: PrismaMigrateDeployInvocation,
) => Promise<{ exitCode: number }>;

export type MigrationDeployRemoteIo = {
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
  writeOut: (text: string) => void;
  writeErr: (text: string) => void;
  readConfirmation: (prompt: string) => Promise<string>;
};

export type MigrationDeployRemoteEnv = {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  DAT_OPS_EXPECTED_DB_HOST?: string;
  DAT_OPS_EXPECTED_DIRECT_DB_HOST?: string;
  DAT_OPS_EXPECTED_DB_NAME?: string;
  DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF?: string;
  CI?: string;
  GITLAB_CI?: string;
  VERCEL?: string;
};

export type MigrationDeployRemoteResultStatus =
  | "preflight_ok"
  | "executed"
  | "refused";

export type MigrationDeployRemoteResult = {
  status: MigrationDeployRemoteResultStatus;
  code?: string;
  runnerCallCount: number;
  invocation?: PrismaMigrateDeployInvocation;
  prismaExitCode?: number;
};

export function parseMigrationDeployRemoteArgs(
  argv: readonly string[],
): MigrationDeployRemoteArgs {
  const unknownFlags: string[] = [];
  let execute = false;

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }
    if (arg === "--execute") {
      execute = true;
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlags.push(arg);
    }
  }

  return { execute, unknownFlags };
}

export function detectUnattendedHostSignal(
  env: MigrationDeployRemoteEnv,
): UnattendedHostSignalName | null {
  if (isPresentSignal(env.CI)) return "CI";
  if (isPresentSignal(env.GITLAB_CI)) return "GITLAB_CI";
  if (isPresentSignal(env.VERCEL)) return "VERCEL";
  return null;
}

function isPresentSignal(value: string | undefined): boolean {
  return Boolean(value && value.trim() !== "");
}

/**
 * Resolves the Prisma CLI entry for `migrate deploy` without executing it.
 *
 * Prisma 6.19.0 `exports["."]` maps to `build/types.js`, not the CLI.
 * `require.resolve("prisma")` is therefore not a safe CLI entry from this
 * module (`MODULE_NOT_FOUND`). The published CLI is `bin.prisma` =
 * `build/index.js`, also exported as `./build/index.js`.
 */
export function resolvePrismaCliEntry(fromModuleUrl: string): string {
  const require = createRequire(fromModuleUrl);
  return require.resolve("prisma/build/index.js");
}

export function buildPrismaMigrateDeployInvocation(input: {
  nodeExecutable: string;
  prismaCliEntry: string;
  cwd: string;
}): PrismaMigrateDeployInvocation {
  return {
    argv: [
      input.nodeExecutable,
      input.prismaCliEntry,
      ...MIGRATION_DEPLOY_PRISMA_ARGS,
    ],
    shell: false,
    cwd: input.cwd,
  };
}

export function createSpawnPrismaMigrateDeployRunner(): PrismaMigrateDeployRunner {
  return (invocation) =>
    new Promise((resolve, reject) => {
      const [command, ...args] = invocation.argv;
      if (!command) {
        reject(new Error("prisma_migrate_deploy_command_missing"));
        return;
      }

      const child: ChildProcess = spawn(command, args, {
        cwd: invocation.cwd,
        shell: invocation.shell,
        stdio: "inherit",
        windowsHide: true,
      });

      child.on("error", reject);
      child.on("close", (code) => {
        resolve({ exitCode: code ?? 1 });
      });
    });
}

export function formatMigrationDeployPreflightSuccessMessage(
  decision: Extract<MigrationDeployTargetDecision, { ok: true }>,
): string {
  return [
    formatMigrationDeployTargetSummary(decision),
    "writeAuthority=false",
    "Default invocation is preflight-only. Pass --execute for interactive human execution authorization.",
  ].join("\n");
}

export async function runMigrationDeployRemote(input: {
  argv: readonly string[];
  env: MigrationDeployRemoteEnv;
  io: MigrationDeployRemoteIo;
  appRoot: string;
  nodeExecutable: string;
  prismaCliEntry: string;
  runPrismaMigrateDeploy: PrismaMigrateDeployRunner;
}): Promise<MigrationDeployRemoteResult> {
  const parsedArgs = parseMigrationDeployRemoteArgs(input.argv);
  if (parsedArgs.unknownFlags.length > 0) {
    input.io.writeErr(
      `Unknown flag(s): ${parsedArgs.unknownFlags.join(", ")}. Supported: --execute. Default is preflight-only.\n`,
    );
    return { status: "refused", code: "unknown_flag", runnerCallCount: 0 };
  }

  const decision = evaluateMigrationDeployTarget({
    databaseUrl: input.env.DATABASE_URL,
    directUrl: input.env.DIRECT_URL,
    expectedHost: input.env[REMOTE_OPS_EXPECTED_DB_HOST_ENV],
    expectedDirectHost: input.env[REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV],
    expectedDatabase: input.env[REMOTE_OPS_EXPECTED_DB_NAME_ENV],
    expectedSupabaseProjectRef:
      input.env[REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV],
  });

  if (!decision.ok) {
    input.io.writeErr(
      `${formatMigrationDeployTargetRefusalMessage(decision)}\n`,
    );
    return {
      status: "refused",
      code: decision.code,
      runnerCallCount: 0,
    };
  }

  input.io.writeOut(
    `${formatMigrationDeployPreflightSuccessMessage(decision)}\n`,
  );

  if (!parsedArgs.execute) {
    return { status: "preflight_ok", runnerCallCount: 0 };
  }

  const unattended = detectUnattendedHostSignal(input.env);
  if (unattended) {
    input.io.writeErr(
      `Migration deploy --execute refused: unattended host signal ${unattended} is set. Prisma was not spawned.\n`,
    );
    return {
      status: "refused",
      code: `unattended_host_${unattended.toLowerCase()}`,
      runnerCallCount: 0,
    };
  }

  if (!input.io.stdinIsTTY || !input.io.stdoutIsTTY) {
    input.io.writeErr(
      "Migration deploy --execute refused: an interactive TTY is required. Prisma was not spawned.\n",
    );
    return {
      status: "refused",
      code: "non_interactive_terminal",
      runnerCallCount: 0,
    };
  }

  const prompt = [
    "Type the exact confirmation phrase to authorize prisma migrate deploy.",
    `Required phrase: ${decision.confirmationPhrase}`,
    "Confirmation is not stored. Leave empty to abort.",
    "> ",
  ].join("\n");

  const typed = (await input.io.readConfirmation(prompt)).trim();
  if (typed !== decision.confirmationPhrase) {
    input.io.writeErr(
      "Migration deploy --execute refused: confirmation phrase did not match. Prisma was not spawned.\n",
    );
    return {
      status: "refused",
      code: "confirmation_mismatch",
      runnerCallCount: 0,
    };
  }

  const invocation = buildPrismaMigrateDeployInvocation({
    nodeExecutable: input.nodeExecutable,
    prismaCliEntry: input.prismaCliEntry,
    cwd: input.appRoot,
  });

  input.io.writeOut(
    "Human confirmation accepted. Spawning prisma migrate deploy once (shell disabled).\n",
  );

  const spawned = await input.runPrismaMigrateDeploy(invocation);
  return {
    status: "executed",
    runnerCallCount: 1,
    invocation,
    prismaExitCode: spawned.exitCode,
  };
}
