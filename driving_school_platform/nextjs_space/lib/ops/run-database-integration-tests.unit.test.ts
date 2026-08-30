import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  INTEGRATION_DATABASE_PASSWORD,
  INTEGRATION_POSTGRES_IMAGE_PIN,
  INTEGRATION_PROVISION_CI_EXTERNAL,
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
  buildCanonicalIntegrationDatabaseUrl,
} from "@/lib/ops/integration-database-contract";
import {
  assertPinnedPostgresImageInContents,
  buildDockerComposeArgv,
  buildIntegrationChildEnv,
  parseDatabaseIntegrationTestArgs,
  runDatabaseIntegrationTests,
  type DatabaseIntegrationTestIo,
} from "@/lib/ops/run-database-integration-tests";

const HOSTILE_URL =
  "postgresql://dat_it_canary_user:dat_it_canary_pass_secret@prod-integration-canary.example.com:5432/postgres";
const LOCAL_URL = buildCanonicalIntegrationDatabaseUrl(
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
);
const CI_URL = buildCanonicalIntegrationDatabaseUrl(
  INTEGRATION_PROVISION_CI_EXTERNAL,
);

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const repoRoot = path.resolve(appRoot, "..", "..");

function createIo(): DatabaseIntegrationTestIo {
  return {
    writeOut: vi.fn(),
    writeErr: vi.fn(),
  };
}

describe("database integration harness argv and child env", () => {
  it("requires an explicit provision argument and forwards a Vitest filter", () => {
    expect(parseDatabaseIntegrationTestArgs([])).toEqual({
      provisionMode: undefined,
      vitestFilter: null,
      extraVitestArgs: [],
      unknownFlags: [],
    });
    expect(
      parseDatabaseIntegrationTestArgs([
        "--provision=local-compose",
        "--vitest-filter=does-not-exist",
      ]),
    ).toEqual({
      provisionMode: "local-compose",
      vitestFilter: "does-not-exist",
      extraVitestArgs: [],
      unknownFlags: [],
    });
    expect(
      parseDatabaseIntegrationTestArgs([
        "--provision=local-compose",
        "--",
        "tests/integration/__missing__.integration.test.ts",
      ]),
    ).toEqual({
      provisionMode: "local-compose",
      vitestFilter: null,
      extraVitestArgs: ["tests/integration/__missing__.integration.test.ts"],
      unknownFlags: [],
    });
  });

  it("overwrites inherited DATABASE_URL and DIRECT_URL with the validated disposable target", () => {
    const child = buildIntegrationChildEnv(
      {
        DATABASE_URL: HOSTILE_URL,
        DIRECT_URL: HOSTILE_URL,
        INTEGRATION_DATABASE_URL: HOSTILE_URL,
        PATH: "/usr/bin",
      },
      LOCAL_URL,
    );

    expect(child.DATABASE_URL).toBe(LOCAL_URL);
    expect(child.DIRECT_URL).toBe(LOCAL_URL);
    expect(child.DATABASE_URL).not.toBe(HOSTILE_URL);
    expect(child.DIRECT_URL).not.toBe(HOSTILE_URL);
  });

  it("scopes Compose commands to the dedicated dat-it project", () => {
    const argv = buildDockerComposeArgv(appRoot, [
      "down",
      "--volumes",
      "--remove-orphans",
    ]);
    expect(argv).toEqual([
      "docker",
      "compose",
      "-p",
      "dat-it",
      "--project-directory",
      appRoot,
      "-f",
      path.join(appRoot, "compose.integration.yml"),
      "down",
      "--volumes",
      "--remove-orphans",
    ]);
    expect(argv.join(" ")).not.toContain(INTEGRATION_DATABASE_PASSWORD);
  });
});

describe("database integration harness refusals", () => {
  it("refuses missing provision mode before any spawn", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 }));
    const result = await runDatabaseIntegrationTests({
      argv: [],
      env: {},
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      vitestCliEntry: "/app/vitest.mjs",
      spawnRunner,
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("missing_provision_mode");
    expect(spawnRunner).not.toHaveBeenCalled();
  });

  it("refuses using application DATABASE_URL as CI authority", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 }));
    const result = await runDatabaseIntegrationTests({
      argv: ["--provision=ci-external"],
      env: {
        DATABASE_URL: CI_URL,
        DIRECT_URL: CI_URL,
      },
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      vitestCliEntry: "/app/vitest.mjs",
      spawnRunner,
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("application_database_url_not_authority");
    expect(spawnRunner).not.toHaveBeenCalled();
  });

  it("does not treat CI=true as provision authority", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 }));
    const result = await runDatabaseIntegrationTests({
      argv: ["--provision=ci-external"],
      env: {
        CI: "true",
        GITLAB_CI: "true",
        DATABASE_URL: HOSTILE_URL,
        INTEGRATION_DATABASE_URL: HOSTILE_URL,
      },
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      vitestCliEntry: "/app/vitest.mjs",
      spawnRunner,
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("hosted_or_public_hostname");
    expect(spawnRunner).not.toHaveBeenCalled();
  });
});

describe("database integration image pin", () => {
  it("uses the same immutable PostgreSQL image in Compose and GitLab services", () => {
    const composeContents = readFileSync(
      path.join(appRoot, "compose.integration.yml"),
      "utf8",
    );
    const gitlabCiContents = readFileSync(
      path.join(repoRoot, ".gitlab-ci.yml"),
      "utf8",
    );

    expect(INTEGRATION_POSTGRES_IMAGE_PIN).toContain("@sha256:");
    expect(INTEGRATION_POSTGRES_IMAGE_PIN.startsWith("postgres:16.15@")).toBe(
      true,
    );
    assertPinnedPostgresImageInContents({
      composeContents,
      gitlabCiContents,
      expectedPin: INTEGRATION_POSTGRES_IMAGE_PIN,
    });
    expect(gitlabCiContents).toContain("alias: dat-integration-postgres");
    expect(gitlabCiContents).toContain("test:integration:ci");
    const checkJob = gitlabCiContents.split("database-integration:")[0] ?? "";
    expect(checkJob).toContain("stage: check");
    expect(checkJob).not.toContain("dat-integration-postgres");
    expect(checkJob).not.toContain("INTEGRATION_DATABASE_URL");
  });
});

describe("database integration skipped execution path", () => {
  it("can complete a local-compose dry path without spawning when compose is skipped", async () => {
    const spawnRunner = vi.fn(async () => ({ exitCode: 0 }));
    const result = await runDatabaseIntegrationTests({
      argv: ["--provision=local-compose"],
      env: {
        DATABASE_URL: HOSTILE_URL,
        DIRECT_URL: HOSTILE_URL,
        INTEGRATION_DATABASE_URL: HOSTILE_URL,
      },
      io: createIo(),
      appRoot,
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/prisma.js",
      vitestCliEntry: "/app/vitest.mjs",
      spawnRunner,
      skipCompose: true,
      skipReadyWait: true,
      skipBootstrap: true,
      skipMigrate: true,
      skipVitest: true,
    });
    expect(result.status).toBe("passed");
    expect(result.teardownAttempted).toBe(false);
    expect(spawnRunner).not.toHaveBeenCalled();
  });
});
