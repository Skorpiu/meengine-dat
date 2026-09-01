/**
 * CLI entry for the disposable local browser-E2E orchestrator (TEST-HYGIENE-001).
 *
 *   pnpm test:e2e
 *
 * Does not load application or operator env files.
 * Never prints credentials or complete database URLs.
 * Does not invoke the DEC-070 integration harness.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createInheritProcessStarter,
  createInheritSpawnRunner,
  parseBrowserE2eTestArgs,
  resolveNextCliEntry,
  resolvePlaywrightCliEntry,
  resolvePrismaCliEntry,
  runBrowserE2eTests,
  type BrowserE2eTestIo,
} from "@/lib/ops/run-browser-e2e-tests";

export function isBrowserE2eCliDirectExecution(
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

export function createDefaultBrowserE2eTestIo(): BrowserE2eTestIo {
  return {
    writeOut: (text) => {
      process.stdout.write(text);
    },
    writeErr: (text) => {
      process.stderr.write(text);
    },
  };
}

export async function runBrowserE2eTestsCli(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  io: BrowserE2eTestIo = createDefaultBrowserE2eTestIo(),
): Promise<void> {
  parseBrowserE2eTestArgs(argv);

  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );

  const result = await runBrowserE2eTests({
    argv,
    env,
    io,
    appRoot,
    nodeExecutable: process.execPath,
    prismaCliEntry: resolvePrismaCliEntry(import.meta.url),
    nextCliEntry: resolveNextCliEntry(import.meta.url),
    playwrightCliEntry: resolvePlaywrightCliEntry(import.meta.url),
    spawnRunner: createInheritSpawnRunner(),
    processStarter: createInheritProcessStarter(),
  });

  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
}

async function main(): Promise<void> {
  try {
    await runBrowserE2eTestsCli(process.argv.slice(2), process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const looksSensitive =
      /postgresql:\/\/|postgres:\/\/|@[A-Za-z0-9._-]+:\d+/.test(message);
    if (!message || looksSensitive) {
      process.stderr.write(
        "Browser E2E orchestrator failed before disposable-database mutation.\n",
      );
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exitCode = 1;
  }
}

if (isBrowserE2eCliDirectExecution(process.argv[1], import.meta.url)) {
  void main();
}
