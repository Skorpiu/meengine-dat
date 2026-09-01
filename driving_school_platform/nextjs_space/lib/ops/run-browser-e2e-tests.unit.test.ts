import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  E2E_APP_BASE_URL,
  E2E_DATABASE_PASSWORD,
  E2E_ORCHESTRATOR_ACTIVE_ENV,
  E2E_ORCHESTRATOR_ACTIVE_VALUE,
  E2E_POSTGRES_IMAGE_PIN,
  buildCanonicalE2eDatabaseUrl,
} from "@/lib/ops/e2e-database-contract";
import { E2E_FIXTURE_ADMIN_PASSWORD } from "@/lib/ops/provision-e2e-fixtures";
import {
  assertPinnedE2ePostgresImageInContents,
  buildE2eChildEnv,
  buildE2eDockerComposeArgv,
  E2E_APP_WARMUP_PATHS,
  parseBrowserE2eTestArgs,
  readNextEnvDtsSnapshot,
  removeNextDevAgentDocs,
  restoreE2eWorktreeHygiene,
  restoreNextEnvDtsSnapshot,
  runBrowserE2eTests,
  warmupDisposableBrowserE2eApp,
  type BrowserE2eTestIo,
  type ProcessStarter,
  type SpawnRunner,
} from "@/lib/ops/run-browser-e2e-tests";

const HOSTILE_URL =
  "postgresql://dat_e2e_canary_user:dat_e2e_canary_pass_secret@prod-e2e-canary.example.com:5432/postgres";
const LOCAL_URL = buildCanonicalE2eDatabaseUrl();

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function createIo(): BrowserE2eTestIo {
  return {
    writeOut: vi.fn(),
    writeErr: vi.fn(),
  };
}

function unusedStarter(): ProcessStarter {
  return vi.fn(async () => ({
    stop: vi.fn(async () => undefined),
  }));
}

describe("browser E2E harness argv and child env", () => {
  it("forwards Playwright args after -- and refuses unknown flags", () => {
    expect(parseBrowserE2eTestArgs([])).toEqual({
      extraPlaywrightArgs: [],
      unknownFlags: [],
    });
    expect(
      parseBrowserE2eTestArgs(["--", "e2e/local/vehicles-gating.spec.ts"]),
    ).toEqual({
      extraPlaywrightArgs: ["e2e/local/vehicles-gating.spec.ts"],
      unknownFlags: [],
    });
    expect(parseBrowserE2eTestArgs(["--provision=local-compose"])).toEqual({
      extraPlaywrightArgs: [],
      unknownFlags: ["--provision=local-compose"],
    });
  });

  it("overwrites inherited database URLs and strips smoke mutation context", () => {
    const child = buildE2eChildEnv(
      {
        DATABASE_URL: HOSTILE_URL,
        DIRECT_URL: HOSTILE_URL,
        PATH: "/usr/bin",
        DAT_SMOKE_BASE_URL: "https://www.meengine.io",
        DAT_E2E_ALLOW_PRODUCTION: "true",
        DAT_E2E_ALLOW_PRODUCTION_MUTATIONS: "true",
        E2E_BASE_URL: "https://www.meengine.io",
        PLAYWRIGHT_BASE_URL: "https://www.meengine.io",
      },
      LOCAL_URL,
    );

    expect(child.DATABASE_URL).toBe(LOCAL_URL);
    expect(child.DIRECT_URL).toBe(LOCAL_URL);
    expect(child.DATABASE_URL).not.toBe(HOSTILE_URL);
    expect(child[E2E_ORCHESTRATOR_ACTIVE_ENV]).toBe(
      E2E_ORCHESTRATOR_ACTIVE_VALUE,
    );
    expect(child.DAT_E2E_BASE_URL).toBe(E2E_APP_BASE_URL);
    expect(child.DAT_SMOKE_BASE_URL).toBeUndefined();
    expect(child.DAT_E2E_ALLOW_PRODUCTION).toBeUndefined();
    expect(child.DAT_E2E_ALLOW_PRODUCTION_MUTATIONS).toBeUndefined();
    expect(child.E2E_BASE_URL).toBeUndefined();
    expect(child.PLAYWRIGHT_BASE_URL).toBeUndefined();
    expect(child.NEXTAUTH_URL).toBe(E2E_APP_BASE_URL);
  });

  it("scopes Compose commands to the dedicated dat-e2e project", () => {
    const argv = buildE2eDockerComposeArgv(appRoot, [
      "down",
      "--volumes",
      "--remove-orphans",
    ]);
    expect(argv).toEqual([
      "docker",
      "compose",
      "-p",
      "dat-e2e",
      "--project-directory",
      appRoot,
      "-f",
      join(appRoot, "compose.e2e.yml"),
      "down",
      "--volumes",
      "--remove-orphans",
    ]);
    expect(argv.join(" ")).not.toContain(E2E_DATABASE_PASSWORD);
    expect(argv.join(" ")).not.toContain("dat-it");
    expect(argv.join(" ")).not.toContain("compose.integration.yml");
  });
});

describe("browser E2E app warmup", () => {
  it("requests auth routes before Playwright starts", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string | URL) => ({
      status: 200,
      url: String(url),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await warmupDisposableBrowserE2eApp(E2E_APP_BASE_URL);

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(
      E2E_APP_WARMUP_PATHS.map((path) => `${E2E_APP_BASE_URL}${path}`),
    );

    vi.unstubAllGlobals();
  });
});

describe("browser E2E harness refusals", () => {
  it("refuses unknown flags before any spawn", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 })) as SpawnRunner;
    const processStarter = unusedStarter();
    const result = await runBrowserE2eTests({
      argv: ["--provision=local-compose"],
      env: { DATABASE_URL: HOSTILE_URL },
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      nextCliEntry: "/app/next",
      playwrightCliEntry: "/app/playwright",
      spawnRunner,
      processStarter,
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("unknown_flag");
    expect(spawnRunner).not.toHaveBeenCalled();
    expect(processStarter).not.toHaveBeenCalled();
  });
});

describe("browser E2E image pin", () => {
  it("pins the expected PostgreSQL image in compose.e2e.yml", () => {
    const composeContents = readFileSync(
      join(appRoot, "compose.e2e.yml"),
      "utf8",
    );

    expect(E2E_POSTGRES_IMAGE_PIN).toContain("@sha256:");
    expect(E2E_POSTGRES_IMAGE_PIN.startsWith("postgres:16.15@")).toBe(true);
    assertPinnedE2ePostgresImageInContents({
      composeContents,
      expectedPin: E2E_POSTGRES_IMAGE_PIN,
    });
    expect(composeContents).toContain("127.0.0.1:55433:5432");
    expect(composeContents).toContain("dat_e2e");
    expect(composeContents).not.toContain("55432");
    expect(composeContents).not.toContain("dat_it");
  });
});

describe("browser E2E skipped execution path", () => {
  it("can complete a dry path without spawning when lifecycle steps are skipped", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 })) as SpawnRunner;
    const processStarter = unusedStarter();
    const result = await runBrowserE2eTests({
      argv: [],
      env: {
        DATABASE_URL: HOSTILE_URL,
        DIRECT_URL: HOSTILE_URL,
        DAT_E2E_ALLOW_PRODUCTION_MUTATIONS: "true",
      },
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      nextCliEntry: "/app/next",
      playwrightCliEntry: "/app/playwright",
      spawnRunner,
      processStarter,
      skipCompose: true,
      skipReadyWait: true,
      skipBootstrap: true,
      skipMigrate: true,
      skipFixtures: true,
      skipApp: true,
      skipPlaywright: true,
    });
    expect(result.status).toBe("passed");
    expect(result.teardownAttempted).toBe(false);
    expect(spawnRunner).not.toHaveBeenCalled();
    expect(processStarter).not.toHaveBeenCalled();
  });
});

describe("browser E2E child env secrets", () => {
  it("does not put the disposable auth secret into compose argv", () => {
    const argv = buildE2eDockerComposeArgv(appRoot, ["up", "-d", "--wait"]);
    expect(argv.join(" ")).not.toContain(E2E_FIXTURE_ADMIN_PASSWORD);
    expect(argv.join(" ")).not.toContain("dat-e2e-local-auth-secret");
  });
});

describe("browser E2E worktree hygiene", () => {
  it("restores next-env.d.ts and removes only Next dev agent docs", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "dat-e2e-hygiene-"));
    const originalNextEnv = [
      '/// <reference types="next" />',
      'import "./.next/types/routes.d.ts";',
      "",
    ].join("\n");
    writeFileSync(join(tempRoot, "next-env.d.ts"), originalNextEnv, "utf8");
    writeFileSync(
      join(tempRoot, "AGENTS.md"),
      "<!-- BEGIN:nextjs-agent-rules -->\n",
      "utf8",
    );
    writeFileSync(join(tempRoot, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
    writeFileSync(
      join(tempRoot, "operator-notes.md"),
      "keep this file",
      "utf8",
    );

    writeFileSync(
      join(tempRoot, "next-env.d.ts"),
      'import "./.next/dev/types/routes.d.ts";\n',
      "utf8",
    );

    const result = restoreE2eWorktreeHygiene({
      appRoot: tempRoot,
      nextEnvDtsSnapshot: originalNextEnv,
    });

    expect(result.restoredNextEnvDts).toBe(true);
    expect(result.removedAgentDocs).toEqual(["AGENTS.md", "CLAUDE.md"]);
    expect(readFileSync(join(tempRoot, "next-env.d.ts"), "utf8")).toBe(
      originalNextEnv,
    );
    expect(readFileSync(join(tempRoot, "operator-notes.md"), "utf8")).toBe(
      "keep this file",
    );

    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("does not remove unrelated markdown files", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "dat-e2e-hygiene-"));
    writeFileSync(join(tempRoot, "README.md"), "# project\n", "utf8");
    expect(removeNextDevAgentDocs(tempRoot)).toEqual([]);
    expect(readNextEnvDtsSnapshot(tempRoot)).toBeNull();
    restoreNextEnvDtsSnapshot(tempRoot, null);
    rmSync(tempRoot, { recursive: true, force: true });
  });
});
