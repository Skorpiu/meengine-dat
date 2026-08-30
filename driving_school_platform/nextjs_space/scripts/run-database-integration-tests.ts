/**
 * CLI entry for the disposable PostgreSQL integration harness (DEC-070).
 *
 *   pnpm test:integration
 *   pnpm test:integration:ci
 *
 * Does not load application or operator env files.
 * Never prints credentials or complete database URLs.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createInheritSpawnRunner,
  parseDatabaseIntegrationTestArgs,
  resolveVitestCliEntry,
  runDatabaseIntegrationTests,
  type DatabaseIntegrationTestIo,
} from "@/lib/ops/run-database-integration-tests";
import { resolvePrismaCliEntry } from "@/lib/ops/migration-deploy-remote";

export function isDatabaseIntegrationCliDirectExecution(
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

export function createDefaultDatabaseIntegrationTestIo(): DatabaseIntegrationTestIo {
  return {
    writeOut: (text) => {
      process.stdout.write(text);
    },
    writeErr: (text) => {
      process.stderr.write(text);
    },
  };
}

export async function runDatabaseIntegrationTestsCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  io: DatabaseIntegrationTestIo = createDefaultDatabaseIntegrationTestIo(),
): Promise<void> {
  parseDatabaseIntegrationTestArgs(argv);

  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );

  const result = await runDatabaseIntegrationTests({
    argv,
    env,
    io,
    appRoot,
    nodeExecutable: process.execPath,
    prismaCliEntry: resolvePrismaCliEntry(import.meta.url),
    vitestCliEntry: resolveVitestCliEntry(import.meta.url),
    spawnRunner: createInheritSpawnRunner(),
  });

  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
}

async function main(): Promise<void> {
  try {
    await runDatabaseIntegrationTestsCli(process.argv.slice(2), process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const looksSensitive =
      /postgresql:\/\/|postgres:\/\/|@[A-Za-z0-9._-]+:\d+/.test(message);
    if (!message || looksSensitive) {
      process.stderr.write(
        "Database integration harness failed before disposable-database mutation.\n",
      );
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exitCode = 1;
  }
}

if (isDatabaseIntegrationCliDirectExecution(process.argv[1], import.meta.url)) {
  void main();
}
