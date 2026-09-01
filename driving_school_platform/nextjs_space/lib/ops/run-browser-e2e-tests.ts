/**
 * Disposable local browser-E2E orchestrator (TEST-HYGIENE-001).
 *
 * Local only: validate constructed identity, compose up, bootstrap, migrate
 * deploy, provision deterministic fixtures, start DAT against the disposable
 * DB, run local Playwright, always teardown. Application env files are not
 * loaded. Child processes receive explicit DATABASE_URL and DIRECT_URL after
 * guard validation.
 *
 * Distinct from DEC-070. Does not invoke the integration-test orchestrator.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  E2E_APP_BASE_URL,
  E2E_APP_HOST,
  E2E_APP_PORT,
  E2E_COMPAT_ROLES,
  E2E_COMPOSE_FILE_NAME,
  E2E_COMPOSE_PROJECT_NAME,
  E2E_LOCAL_HOST,
  E2E_LOCAL_PORT,
  E2E_ORCHESTRATOR_ACTIVE_ENV,
  E2E_ORCHESTRATOR_ACTIVE_VALUE,
  E2E_POSTGRES_IMAGE_PIN,
  buildCanonicalE2eDatabaseUrl,
} from "@/lib/ops/e2e-database-contract";
import {
  evaluateE2eDatabaseTarget,
  formatE2eDatabaseTargetRefusalMessage,
} from "@/lib/ops/e2e-database-target-guard";
import {
  E2E_FIXTURE_ADMIN_EMAIL,
  E2E_FIXTURE_ADMIN_PASSWORD,
  E2E_FIXTURE_INSTRUCTOR_EMAIL,
  E2E_FIXTURE_INSTRUCTOR_PASSWORD,
  formatE2eFixtureSafeSummary,
  provisionE2eFixtures,
} from "@/lib/ops/provision-e2e-fixtures";

const POSTGRES_READY_TIMEOUT_MS = 60_000;
const POSTGRES_READY_RETRY_MS = 500;
const APP_READY_TIMEOUT_MS = 120_000;
const APP_READY_RETRY_MS = 500;
const E2E_MIGRATE_PRISMA_ARGS = ["migrate", "deploy"] as const;
const E2E_NEXTAUTH_SECRET = "dat-e2e-local-auth-secret-not-for-production";
const E2E_NEXT_ENV_DTS_FILE_NAME = "next-env.d.ts";
const E2E_NEXT_AGENT_DOC_MARKER = "BEGIN:nextjs-agent-rules";
const E2E_NEXT_AGENT_DOC_NAMES = ["AGENTS.md", "CLAUDE.md"] as const;

const E2E_COMPAT_ROLE_BOOTSTRAP_SQL = `
DO $dat_e2e_compat$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$dat_e2e_compat$;
`.trim();

export type BrowserE2eTestArgs = {
  extraPlaywrightArgs: string[];
  unknownFlags: string[];
};

export type BrowserE2eTestIo = {
  writeOut: (text: string) => void;
  writeErr: (text: string) => void;
};

export type BrowserE2eTestEnv = Record<string, string | undefined>;

export type SpawnInvocation = {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
};

export type SpawnRunner = (
  invocation: SpawnInvocation,
) => Promise<{ exitCode: number }>;

export type ManagedProcess = {
  stop: () => Promise<void>;
};

export type ProcessStarter = (
  invocation: SpawnInvocation,
) => Promise<ManagedProcess>;

export type BrowserE2eTestResult = {
  status: "passed" | "failed" | "refused";
  code?: string;
  exitCode: number;
  teardownAttempted: boolean;
};

export function parseBrowserE2eTestArgs(
  argv: readonly string[],
): BrowserE2eTestArgs {
  const extraPlaywrightArgs: string[] = [];
  const unknownFlags: string[] = [];
  let passthrough = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }
    if (arg === "--") {
      passthrough = true;
      continue;
    }
    if (passthrough) {
      extraPlaywrightArgs.push(arg);
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlags.push(arg);
      continue;
    }
    extraPlaywrightArgs.push(arg);
  }

  return { extraPlaywrightArgs, unknownFlags };
}

export function buildE2eChildEnv(
  parent: Record<string, string | undefined>,
  validatedUrl: string,
): NodeJS.ProcessEnv {
  const child = {
    ...parent,
    DATABASE_URL: validatedUrl,
    DIRECT_URL: validatedUrl,
    [E2E_ORCHESTRATOR_ACTIVE_ENV]: E2E_ORCHESTRATOR_ACTIVE_VALUE,
    DAT_E2E_BASE_URL: E2E_APP_BASE_URL,
    NEXTAUTH_URL: E2E_APP_BASE_URL,
    NEXTAUTH_SECRET: E2E_NEXTAUTH_SECRET,
    AUTH_SECRET: E2E_NEXTAUTH_SECRET,
    NEXT_PUBLIC_APP_URL: E2E_APP_BASE_URL,
    PUBLIC_SIGNUP_ENABLED: "false",
    EMAIL_PROVIDER: "noop",
    DAT_E2E_ADMIN_EMAIL: E2E_FIXTURE_ADMIN_EMAIL,
    DAT_E2E_ADMIN_PASSWORD: E2E_FIXTURE_ADMIN_PASSWORD,
    DAT_E2E_INSTRUCTOR_EMAIL: E2E_FIXTURE_INSTRUCTOR_EMAIL,
    DAT_E2E_INSTRUCTOR_PASSWORD: E2E_FIXTURE_INSTRUCTOR_PASSWORD,
    PORT: String(E2E_APP_PORT),
    HOSTNAME: E2E_APP_HOST,
  } as unknown as NodeJS.ProcessEnv;

  delete child.DAT_SMOKE_BASE_URL;
  delete child.DAT_E2E_ALLOW_PRODUCTION;
  delete child.DAT_E2E_ALLOW_PRODUCTION_MUTATIONS;
  delete child.E2E_BASE_URL;
  delete child.PLAYWRIGHT_BASE_URL;

  return child;
}

export function resolveNextCliEntry(fromModuleUrl: string): string {
  const require = createRequire(fromModuleUrl);
  return require.resolve("next/dist/bin/next");
}

export function resolvePlaywrightCliEntry(fromModuleUrl: string): string {
  const require = createRequire(fromModuleUrl);
  const packageJsonPath = require.resolve("@playwright/test/package.json");
  return path.join(path.dirname(packageJsonPath), "cli.js");
}

export function resolvePrismaCliEntry(fromModuleUrl: string): string {
  const require = createRequire(fromModuleUrl);
  return require.resolve("prisma/build/index.js");
}

export function buildE2eDockerComposeArgv(
  appRoot: string,
  composeAction: readonly string[],
): string[] {
  return [
    "docker",
    "compose",
    "-p",
    E2E_COMPOSE_PROJECT_NAME,
    "--project-directory",
    appRoot,
    "-f",
    path.join(appRoot, E2E_COMPOSE_FILE_NAME),
    ...composeAction,
  ];
}

export function createInheritSpawnRunner(): SpawnRunner {
  return (invocation) =>
    new Promise((resolve, reject) => {
      const [command, ...args] = invocation.argv;
      if (!command) {
        reject(new Error("e2e_spawn_command_missing"));
        return;
      }

      const child: ChildProcess = spawn(command, args, {
        cwd: invocation.cwd,
        env: invocation.env,
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

export function createInheritProcessStarter(): ProcessStarter {
  return (invocation) =>
    new Promise((resolve, reject) => {
      const [command, ...args] = invocation.argv;
      if (!command) {
        reject(new Error("e2e_spawn_command_missing"));
        return;
      }

      const child: ChildProcess = spawn(command, args, {
        cwd: invocation.cwd,
        env: invocation.env,
        shell: invocation.shell,
        stdio: "inherit",
        windowsHide: true,
      });

      child.once("error", reject);
      resolve({
        stop: async () => {
          if (child.exitCode !== null || child.signalCode) {
            return;
          }
          child.kill("SIGTERM");
        },
      });
    });
}

export function readNextEnvDtsSnapshot(appRoot: string): string | null {
  const filePath = path.join(appRoot, E2E_NEXT_ENV_DTS_FILE_NAME);
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

export function restoreNextEnvDtsSnapshot(
  appRoot: string,
  snapshot: string | null,
): void {
  if (snapshot === null) {
    return;
  }
  writeFileSync(
    path.join(appRoot, E2E_NEXT_ENV_DTS_FILE_NAME),
    snapshot,
    "utf8",
  );
}

function isNextDevAgentDoc(contents: string, fileName: string): boolean {
  if (fileName === "AGENTS.md") {
    return contents.includes(E2E_NEXT_AGENT_DOC_MARKER);
  }
  return contents.trim() === "@AGENTS.md";
}

export function removeNextDevAgentDocs(appRoot: string): string[] {
  const removed: string[] = [];
  for (const fileName of E2E_NEXT_AGENT_DOC_NAMES) {
    const filePath = path.join(appRoot, fileName);
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      const contents = readFileSync(filePath, "utf8");
      if (!isNextDevAgentDoc(contents, fileName)) {
        continue;
      }
      unlinkSync(filePath);
      removed.push(fileName);
    } catch {
      // Ignore unreadable or locked files during hygiene restore.
    }
  }
  return removed;
}

export function restoreE2eWorktreeHygiene(input: {
  appRoot: string;
  nextEnvDtsSnapshot: string | null;
}): { restoredNextEnvDts: boolean; removedAgentDocs: string[] } {
  restoreNextEnvDtsSnapshot(input.appRoot, input.nextEnvDtsSnapshot);
  const removedAgentDocs = removeNextDevAgentDocs(input.appRoot);
  const restoredNextEnvDts =
    input.nextEnvDtsSnapshot !== null &&
    readNextEnvDtsSnapshot(input.appRoot) === input.nextEnvDtsSnapshot;
  return { restoredNextEnvDts, removedAgentDocs };
}

export function assertPinnedE2ePostgresImageInContents(input: {
  composeContents: string;
  expectedPin: string;
}): void {
  if (!input.composeContents.includes(input.expectedPin)) {
    throw new Error(
      "compose.e2e.yml does not pin the expected PostgreSQL image identity.",
    );
  }
}

async function assertPortFree(host: string, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Browser E2E port ${port} on ${host} is already occupied. Refusing to choose a different port.`,
          ),
        );
        return;
      }
      reject(error);
    });
    server.listen(port, host, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve();
      });
    });
  });
}

export async function assertLocalE2ePortsFree(): Promise<void> {
  await assertPortFree(E2E_LOCAL_HOST, E2E_LOCAL_PORT);
  await assertPortFree(E2E_APP_HOST, E2E_APP_PORT);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForDisposablePostgres(validatedUrl: string): Promise<void> {
  const deadline = Date.now() + POSTGRES_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const prisma = new PrismaClient({
      datasources: { db: { url: validatedUrl } },
    });
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return;
    } catch {
      try {
        await prisma.$disconnect();
      } catch {
        // Ignore disconnect failures while waiting for readiness.
      }
      await delay(POSTGRES_READY_RETRY_MS);
    }
  }

  throw new Error(
    "Timed out waiting for the disposable browser-E2E PostgreSQL to become ready.",
  );
}

async function bootstrapCompatibilityRoles(
  validatedUrl: string,
): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: validatedUrl } },
  });
  try {
    await prisma.$executeRawUnsafe(E2E_COMPAT_ROLE_BOOTSTRAP_SQL);
    const rows = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
      `SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname`,
    );
    const names = rows.map((row) => row.rolname);
    for (const roleName of E2E_COMPAT_ROLES) {
      if (!names.includes(roleName)) {
        throw new Error(
          `Browser E2E compatibility bootstrap refused: missing role ${roleName}.`,
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function waitForAppReady(baseUrl: string): Promise<void> {
  const deadline = Date.now() + APP_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status > 0) {
        return;
      }
    } catch {
      await delay(APP_READY_RETRY_MS);
    }
  }

  throw new Error(
    "Timed out waiting for the disposable browser-E2E app to become ready.",
  );
}

export const E2E_APP_WARMUP_PATHS = [
  "/auth/login",
  "/api/auth/session",
] as const;

export async function warmupDisposableBrowserE2eApp(
  baseUrl: string,
): Promise<void> {
  for (const path of E2E_APP_WARMUP_PATHS) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (response.status <= 0) {
      throw new Error(
        `Disposable browser-E2E warmup failed for ${path} (no HTTP status).`,
      );
    }
  }
}

export async function runBrowserE2eTests(input: {
  argv: readonly string[];
  env: BrowserE2eTestEnv;
  io: BrowserE2eTestIo;
  appRoot: string;
  nodeExecutable: string;
  prismaCliEntry: string;
  nextCliEntry: string;
  playwrightCliEntry: string;
  spawnRunner: SpawnRunner;
  processStarter: ProcessStarter;
  skipCompose?: boolean;
  skipReadyWait?: boolean;
  skipBootstrap?: boolean;
  skipMigrate?: boolean;
  skipFixtures?: boolean;
  skipApp?: boolean;
  skipPlaywright?: boolean;
}): Promise<BrowserE2eTestResult> {
  const parsedArgs = parseBrowserE2eTestArgs(input.argv);
  if (parsedArgs.unknownFlags.length > 0) {
    input.io.writeErr(
      `Unknown flag(s): ${parsedArgs.unknownFlags.join(", ")}. Pass Playwright args after --.\n`,
    );
    return {
      status: "refused",
      code: "unknown_flag",
      exitCode: 1,
      teardownAttempted: false,
    };
  }

  const constructedUrl = buildCanonicalE2eDatabaseUrl();
  const decision = evaluateE2eDatabaseTarget({
    databaseUrl: constructedUrl,
    directUrl: constructedUrl,
    applicationDatabaseUrl: input.env.DATABASE_URL,
    ci: input.env.CI,
    gitlabCi: input.env.GITLAB_CI,
    nodeEnv: input.env.NODE_ENV,
    vercel: input.env.VERCEL,
  });
  if (!decision.ok) {
    input.io.writeErr(`${formatE2eDatabaseTargetRefusalMessage(decision)}\n`);
    return {
      status: "refused",
      code: decision.code,
      exitCode: 1,
      teardownAttempted: false,
    };
  }

  const childEnv = buildE2eChildEnv(input.env, decision.validatedUrl);
  let composeAttempted = false;
  let appStartAttempted = false;
  let nextEnvDtsSnapshot: string | null = null;
  let appProcess: ManagedProcess | undefined;
  let runError: unknown;

  input.io.writeOut(
    [
      "DAT disposable local browser-E2E orchestrator",
      `target=${decision.redactedTarget}`,
      `app=${E2E_APP_BASE_URL}`,
      `image=${E2E_POSTGRES_IMAGE_PIN}`,
      "Application DATABASE_URL is not authority.",
      "",
    ].join("\n"),
  );

  try {
    if (!input.skipCompose) {
      await assertLocalE2ePortsFree();
      const composeVersion = await input.spawnRunner({
        argv: ["docker", "compose", "version"],
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (composeVersion.exitCode !== 0) {
        throw new Error(
          "Docker Compose is not available for the browser-E2E orchestrator.",
        );
      }

      composeAttempted = true;
      const composeUp = await input.spawnRunner({
        argv: buildE2eDockerComposeArgv(input.appRoot, ["up", "-d", "--wait"]),
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (composeUp.exitCode !== 0) {
        throw new Error(
          "Failed to start the disposable browser-E2E PostgreSQL Compose project.",
        );
      }
    }

    if (!input.skipReadyWait) {
      await waitForDisposablePostgres(decision.validatedUrl);
      input.io.writeOut("Disposable browser-E2E PostgreSQL is ready.\n");
    }

    if (!input.skipBootstrap) {
      await bootstrapCompatibilityRoles(decision.validatedUrl);
      input.io.writeOut(
        "Compatibility roles anon and authenticated are present.\n",
      );
    }

    if (!input.skipMigrate) {
      const migrate = await input.spawnRunner({
        argv: [
          input.nodeExecutable,
          input.prismaCliEntry,
          ...E2E_MIGRATE_PRISMA_ARGS,
        ],
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (migrate.exitCode !== 0) {
        throw new Error(
          "prisma migrate deploy failed against the disposable browser-E2E database.",
        );
      }
      input.io.writeOut(
        "Committed Prisma migrations deployed to the disposable browser-E2E database.\n",
      );
    }

    if (!input.skipFixtures) {
      const prisma = new PrismaClient({
        datasources: { db: { url: decision.validatedUrl } },
      });
      try {
        const summary = await provisionE2eFixtures(prisma);
        input.io.writeOut(`${formatE2eFixtureSafeSummary(summary)}\n`);
      } finally {
        await prisma.$disconnect();
      }
    }

    if (!input.skipApp) {
      nextEnvDtsSnapshot = readNextEnvDtsSnapshot(input.appRoot);
      appStartAttempted = true;
      appProcess = await input.processStarter({
        argv: [
          input.nodeExecutable,
          input.nextCliEntry,
          "dev",
          "--hostname",
          E2E_APP_HOST,
          "--port",
          String(E2E_APP_PORT),
        ],
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      await waitForAppReady(E2E_APP_BASE_URL);
      await warmupDisposableBrowserE2eApp(E2E_APP_BASE_URL);
      input.io.writeOut("Disposable browser-E2E app is ready.\n");
    }

    if (!input.skipPlaywright) {
      const playwrightArgv = [
        input.nodeExecutable,
        input.playwrightCliEntry,
        "test",
        "--config",
        path.join(input.appRoot, "playwright.config.ts"),
        ...parsedArgs.extraPlaywrightArgs,
      ];
      const playwright = await input.spawnRunner({
        argv: playwrightArgv,
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (playwright.exitCode !== 0) {
        const error = new Error(
          "Local browser-E2E Playwright suite failed against the disposable database.",
        );
        (error as Error & { exitCode?: number }).exitCode = playwright.exitCode;
        throw error;
      }
    }
  } catch (error) {
    runError = error;
  } finally {
    if (appProcess) {
      try {
        await appProcess.stop();
      } catch (stopError) {
        if (!runError) {
          runError = stopError;
        }
      }
    }
    if (appStartAttempted) {
      restoreE2eWorktreeHygiene({
        appRoot: input.appRoot,
        nextEnvDtsSnapshot,
      });
    }
    if (composeAttempted) {
      const teardown = await input.spawnRunner({
        argv: buildE2eDockerComposeArgv(input.appRoot, [
          "down",
          "--volumes",
          "--remove-orphans",
        ]),
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (teardown.exitCode !== 0 && !runError) {
        runError = new Error(
          "Disposable browser-E2E Compose teardown failed after a successful run.",
        );
      }
      input.io.writeOut(
        `Teardown executed: docker compose down --volumes --remove-orphans for project ${E2E_COMPOSE_PROJECT_NAME}.\n`,
      );
    }
  }

  if (runError) {
    const message =
      runError instanceof Error
        ? runError.message
        : "Browser E2E orchestrator failed.";
    input.io.writeErr(`${message}\n`);
    const exitCode =
      runError instanceof Error &&
      typeof (runError as Error & { exitCode?: number }).exitCode === "number"
        ? (runError as Error & { exitCode: number }).exitCode
        : 1;
    return {
      status: "failed",
      code: "harness_failed",
      exitCode,
      teardownAttempted: composeAttempted || Boolean(appProcess),
    };
  }

  return {
    status: "passed",
    exitCode: 0,
    teardownAttempted: composeAttempted || Boolean(appProcess),
  };
}
