/**
 * Disposable PostgreSQL integration-test orchestrator (TEST-ARCH-001 / DEC-070).
 *
 * Local: validate constructed identity, compose up, bootstrap, migrate deploy,
 * Vitest, always teardown. CI external: validate INTEGRATION_DATABASE_URL
 * against the service identity, then bootstrap/migrate/test. Application env
 * files are not loaded. Child Prisma/Vitest processes receive an explicit
 * overwritten DATABASE_URL and DIRECT_URL.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  INTEGRATION_COMPOSE_FILE_NAME,
  INTEGRATION_COMPOSE_PROJECT_NAME,
  INTEGRATION_LOCAL_HOST,
  INTEGRATION_LOCAL_PORT,
  INTEGRATION_POSTGRES_IMAGE_PIN,
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
} from "@/lib/ops/integration-database-contract";
import {
  INTEGRATION_COMPAT_ROLE_ASSERT_SQL,
  INTEGRATION_COMPAT_ROLE_BOOTSTRAP_SQL,
  INTEGRATION_FORBIDDEN_ROLE_ASSERT_SQL,
  assertIntegrationCompatibilityRoles,
  type IntegrationCompatibilityRoleRow,
} from "@/lib/ops/integration-database-bootstrap";
import {
  evaluateIntegrationDatabaseTarget,
  formatIntegrationDatabaseTargetRefusalMessage,
  readIntegrationDatabaseTargetGuardInput,
} from "@/lib/ops/integration-database-target-guard";
import { MIGRATION_DEPLOY_PRISMA_ARGS } from "@/lib/ops/migration-deploy-remote";

const POSTGRES_READY_TIMEOUT_MS = 60_000;
const POSTGRES_READY_RETRY_MS = 500;

export type DatabaseIntegrationTestArgs = {
  provisionMode: string | undefined;
  vitestFilter: string | null;
  extraVitestArgs: string[];
  unknownFlags: string[];
};

export type DatabaseIntegrationTestIo = {
  writeOut: (text: string) => void;
  writeErr: (text: string) => void;
};

export type DatabaseIntegrationTestEnv = Record<string, string | undefined>;

export type SpawnInvocation = {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
};

export type SpawnRunner = (
  invocation: SpawnInvocation,
) => Promise<{ exitCode: number }>;

export type DatabaseIntegrationTestResult = {
  status: "passed" | "failed" | "refused";
  code?: string;
  exitCode: number;
  teardownAttempted: boolean;
  provisionMode?: string;
};

export function parseDatabaseIntegrationTestArgs(
  argv: readonly string[],
): DatabaseIntegrationTestArgs {
  let provisionMode: string | undefined;
  let vitestFilter: string | null = null;
  const extraVitestArgs: string[] = [];
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
      extraVitestArgs.push(arg);
      continue;
    }

    if (arg === "--provision") {
      provisionMode = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--provision=")) {
      provisionMode = arg.slice("--provision=".length);
      continue;
    }
    if (arg === "--vitest-filter") {
      vitestFilter = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--vitest-filter=")) {
      vitestFilter = arg.slice("--vitest-filter=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlags.push(arg);
      continue;
    }
    extraVitestArgs.push(arg);
  }

  return { provisionMode, vitestFilter, extraVitestArgs, unknownFlags };
}

/**
 * Build a child-process env that cannot be redirected by inherited application
 * or operator DATABASE_URL / DIRECT_URL values. Prisma 6.19 dotenv loading does
 * not override variables that are already set in the process environment.
 */
export function buildIntegrationChildEnv(
  parent: Record<string, string | undefined>,
  validatedUrl: string,
): NodeJS.ProcessEnv {
  return {
    ...parent,
    DATABASE_URL: validatedUrl,
    DIRECT_URL: validatedUrl,
  } as unknown as NodeJS.ProcessEnv;
}

export function resolveVitestCliEntry(fromModuleUrl: string): string {
  const require = createRequire(fromModuleUrl);
  const packageJsonPath = require.resolve("vitest/package.json");
  return path.join(path.dirname(packageJsonPath), "vitest.mjs");
}

export function buildDockerComposeArgv(
  appRoot: string,
  composeAction: readonly string[],
): string[] {
  return [
    "docker",
    "compose",
    "-p",
    INTEGRATION_COMPOSE_PROJECT_NAME,
    "--project-directory",
    appRoot,
    "-f",
    path.join(appRoot, INTEGRATION_COMPOSE_FILE_NAME),
    ...composeAction,
  ];
}

export function createInheritSpawnRunner(): SpawnRunner {
  return (invocation) =>
    new Promise((resolve, reject) => {
      const [command, ...args] = invocation.argv;
      if (!command) {
        reject(new Error("integration_spawn_command_missing"));
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

export function assertPinnedPostgresImageInContents(input: {
  composeContents: string;
  gitlabCiContents: string;
  expectedPin: string;
}): void {
  if (!input.composeContents.includes(input.expectedPin)) {
    throw new Error(
      "compose.integration.yml does not pin the expected PostgreSQL image identity.",
    );
  }
  if (!input.gitlabCiContents.includes(input.expectedPin)) {
    throw new Error(
      ".gitlab-ci.yml does not pin the expected PostgreSQL image identity.",
    );
  }
}

export async function assertLocalIntegrationPortFree(
  host: string = INTEGRATION_LOCAL_HOST,
  port: number = INTEGRATION_LOCAL_PORT,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Integration port ${port} is already occupied. Refusing to choose a different port.`,
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
    "Timed out waiting for the disposable integration PostgreSQL to become ready.",
  );
}

async function bootstrapCompatibilityRoles(
  validatedUrl: string,
): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: validatedUrl } },
  });
  try {
    await prisma.$executeRawUnsafe(INTEGRATION_COMPAT_ROLE_BOOTSTRAP_SQL);
    const rows = await prisma.$queryRawUnsafe<
      IntegrationCompatibilityRoleRow[]
    >(INTEGRATION_COMPAT_ROLE_ASSERT_SQL);
    const forbidden = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
      INTEGRATION_FORBIDDEN_ROLE_ASSERT_SQL,
    );
    assertIntegrationCompatibilityRoles(
      rows,
      forbidden.map((row) => row.rolname),
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function runDatabaseIntegrationTests(input: {
  argv: readonly string[];
  env: DatabaseIntegrationTestEnv;
  io: DatabaseIntegrationTestIo;
  appRoot: string;
  nodeExecutable: string;
  prismaCliEntry: string;
  vitestCliEntry: string;
  spawnRunner: SpawnRunner;
  skipCompose?: boolean;
  skipReadyWait?: boolean;
  skipBootstrap?: boolean;
  skipMigrate?: boolean;
  skipVitest?: boolean;
}): Promise<DatabaseIntegrationTestResult> {
  const parsedArgs = parseDatabaseIntegrationTestArgs(input.argv);
  if (parsedArgs.unknownFlags.length > 0) {
    input.io.writeErr(
      `Unknown flag(s): ${parsedArgs.unknownFlags.join(", ")}. Supported: --provision, --vitest-filter.\n`,
    );
    return {
      status: "refused",
      code: "unknown_flag",
      exitCode: 1,
      teardownAttempted: false,
    };
  }

  const declaredMode = input.env.DAT_INTEGRATION_PROVISION_MODE?.trim();
  if (
    declaredMode &&
    parsedArgs.provisionMode &&
    declaredMode !== parsedArgs.provisionMode
  ) {
    input.io.writeErr(
      "Integration provision mode argument does not match DAT_INTEGRATION_PROVISION_MODE. Ambient CI flags are not authority.\n",
    );
    return {
      status: "refused",
      code: "provision_mode_mismatch",
      exitCode: 1,
      teardownAttempted: false,
    };
  }

  const decision = evaluateIntegrationDatabaseTarget(
    readIntegrationDatabaseTargetGuardInput(
      {
        INTEGRATION_DATABASE_URL: input.env.INTEGRATION_DATABASE_URL,
        DATABASE_URL: input.env.DATABASE_URL,
        DIRECT_URL: input.env.DIRECT_URL,
        DAT_INTEGRATION_PROVISION_MODE:
          input.env.DAT_INTEGRATION_PROVISION_MODE,
        CI: input.env.CI,
        GITLAB_CI: input.env.GITLAB_CI,
        NODE_ENV: input.env.NODE_ENV,
        VERCEL: input.env.VERCEL,
      },
      parsedArgs.provisionMode,
    ),
  );
  if (!decision.ok) {
    input.io.writeErr(
      `${formatIntegrationDatabaseTargetRefusalMessage(decision)}\n`,
    );
    return {
      status: "refused",
      code: decision.code,
      exitCode: 1,
      teardownAttempted: false,
    };
  }

  const childEnv = buildIntegrationChildEnv(input.env, decision.validatedUrl);
  const localCompose =
    decision.provisionMode === INTEGRATION_PROVISION_LOCAL_COMPOSE;
  let localComposeAttempted = false;
  let runError: unknown;

  input.io.writeOut(
    [
      "DAT disposable database integration harness",
      `provisionMode=${decision.provisionMode}`,
      `target=${decision.redactedTarget}`,
      `image=${INTEGRATION_POSTGRES_IMAGE_PIN}`,
      "Application DATABASE_URL is not authority.",
      "",
    ].join("\n"),
  );

  try {
    if (localCompose && !input.skipCompose) {
      await assertLocalIntegrationPortFree();
      const composeVersion = await input.spawnRunner({
        argv: ["docker", "compose", "version"],
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (composeVersion.exitCode !== 0) {
        throw new Error(
          "Docker Compose is not available for the integration harness.",
        );
      }

      localComposeAttempted = true;
      const composeUp = await input.spawnRunner({
        argv: buildDockerComposeArgv(input.appRoot, ["up", "-d", "--wait"]),
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (composeUp.exitCode !== 0) {
        throw new Error(
          "Failed to start the disposable integration PostgreSQL Compose project.",
        );
      }
    }

    if (!input.skipReadyWait) {
      await waitForDisposablePostgres(decision.validatedUrl);
      input.io.writeOut("Disposable integration PostgreSQL is ready.\n");
    }

    if (!input.skipBootstrap) {
      await bootstrapCompatibilityRoles(decision.validatedUrl);
      input.io.writeOut(
        "Compatibility roles anon and authenticated are present with NOLOGIN and no elevation.\n",
      );
    }

    if (!input.skipMigrate) {
      const migrate = await input.spawnRunner({
        argv: [
          input.nodeExecutable,
          input.prismaCliEntry,
          ...MIGRATION_DEPLOY_PRISMA_ARGS,
        ],
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (migrate.exitCode !== 0) {
        throw new Error(
          "prisma migrate deploy failed against the disposable integration database.",
        );
      }
      input.io.writeOut(
        "Committed Prisma migrations deployed to the disposable database.\n",
      );
    }

    if (!input.skipVitest) {
      const vitestArgv = [
        input.nodeExecutable,
        input.vitestCliEntry,
        "run",
        "--config",
        path.join(input.appRoot, "vitest.integration.config.ts"),
      ];
      if (parsedArgs.vitestFilter) {
        vitestArgv.push("-t", parsedArgs.vitestFilter);
      }
      vitestArgv.push(...parsedArgs.extraVitestArgs);

      const vitest = await input.spawnRunner({
        argv: vitestArgv,
        cwd: input.appRoot,
        env: childEnv,
        shell: false,
      });
      if (vitest.exitCode !== 0) {
        const error = new Error(
          "Database integration Vitest suite failed against the disposable database.",
        );
        (error as Error & { exitCode?: number }).exitCode = vitest.exitCode;
        throw error;
      }
    }
  } catch (error) {
    runError = error;
  } finally {
    if (localCompose && localComposeAttempted) {
      const teardown = await input.spawnRunner({
        argv: buildDockerComposeArgv(input.appRoot, [
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
          "Disposable integration Compose teardown failed after a successful run.",
        );
      }
      input.io.writeOut(
        "Teardown executed: docker compose down --volumes --remove-orphans for project dat-it.\n",
      );
    }
  }

  if (runError) {
    const message =
      runError instanceof Error
        ? runError.message
        : "Database integration harness failed.";
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
      teardownAttempted: localCompose && localComposeAttempted,
      provisionMode: decision.provisionMode,
    };
  }

  return {
    status: "passed",
    exitCode: 0,
    teardownAttempted: localCompose && localComposeAttempted,
    provisionMode: decision.provisionMode,
  };
}
