/**
 * Operator CLI: gated remote `prisma migrate deploy` (DEC-069).
 *
 * Default: preflight only (zero DB connection, no Prisma spawn).
 * Execution: explicit `--execute` plus interactive typed confirmation.
 *
 *   node --env-file=.env.operator.production.local --import tsx \
 *     scripts/migrate-deploy-remote.ts
 *
 * Or: pnpm ops:migrate-deploy-remote
 * Execute: pnpm ops:migrate-deploy-remote -- --execute
 *
 * Never prints passwords or complete database URLs.
 * Unattended CI / GitLab CI / Vercel execution is refused.
 */

import path from "node:path";
import readline from "node:readline/promises";
import { stdin as stdinStream, stdout as stdoutStream } from "node:process";
import { pathToFileURL, fileURLToPath } from "node:url";

import {
  createSpawnPrismaMigrateDeployRunner,
  resolvePrismaCliEntry,
  runMigrationDeployRemote,
  type MigrationDeployRemoteEnv,
  type MigrationDeployRemoteIo,
  type PrismaMigrateDeployRunner,
} from "@/lib/ops/migration-deploy-remote";

export function isMigrateDeployRemoteDirectExecution(
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

export function createDefaultMigrationDeployRemoteIo(): MigrationDeployRemoteIo {
  return {
    stdinIsTTY: Boolean(stdinStream.isTTY),
    stdoutIsTTY: Boolean(stdoutStream.isTTY),
    writeOut: (text) => {
      stdoutStream.write(text);
    },
    writeErr: (text) => {
      process.stderr.write(text);
    },
    readConfirmation: async (prompt) => {
      const rl = readline.createInterface({
        input: stdinStream,
        output: stdoutStream,
      });
      try {
        return await rl.question(prompt);
      } finally {
        rl.close();
      }
    },
  };
}

export async function runMigrateDeployRemoteCli(
  argv: readonly string[],
  env: MigrationDeployRemoteEnv,
  io: MigrationDeployRemoteIo = createDefaultMigrationDeployRemoteIo(),
  deps?: {
    appRoot?: string;
    nodeExecutable?: string;
    prismaCliEntry?: string;
    runPrismaMigrateDeploy?: PrismaMigrateDeployRunner;
  },
): Promise<void> {
  const result = await runMigrationDeployRemote({
    argv,
    env,
    io,
    appRoot:
      deps?.appRoot ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    nodeExecutable: deps?.nodeExecutable ?? process.execPath,
    prismaCliEntry:
      deps?.prismaCliEntry ?? resolvePrismaCliEntry(import.meta.url),
    runPrismaMigrateDeploy:
      deps?.runPrismaMigrateDeploy ?? createSpawnPrismaMigrateDeployRunner(),
  });

  if (result.status === "refused") {
    process.exitCode = 1;
    return;
  }

  if (result.status === "executed" && result.prismaExitCode !== 0) {
    process.exitCode = result.prismaExitCode ?? 1;
  }
}

async function main(): Promise<void> {
  try {
    await runMigrateDeployRemoteCli(process.argv.slice(2), process.env);
  } catch {
    console.error(
      "Migration deploy wrapper failed before Prisma could be spawned.",
    );
    process.exitCode = 1;
  }
}

if (isMigrateDeployRemoteDirectExecution(process.argv[1], import.meta.url)) {
  void main();
}
