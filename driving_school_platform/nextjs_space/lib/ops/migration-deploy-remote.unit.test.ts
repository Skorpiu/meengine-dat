import { existsSync, statSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildPrismaMigrateDeployInvocation,
  detectUnattendedHostSignal,
  parseMigrationDeployRemoteArgs,
  resolvePrismaCliEntry,
  runMigrationDeployRemote,
  type MigrationDeployRemoteEnv,
  type MigrationDeployRemoteIo,
  type PrismaMigrateDeployRunner,
} from "@/lib/ops/migration-deploy-remote";

const EXPECTED = {
  host: "aws-0-eu-central-1.pooler.supabase.com",
  directHost: "db.abcdefghijklmnop.supabase.co",
  database: "postgres",
  projectRef: "abcdefghijklmnop",
};

const SECRET = "super-secret-password";
const POOLER_URL = `postgresql://postgres.${EXPECTED.projectRef}:${SECRET}@${EXPECTED.host}:6543/${EXPECTED.database}`;
const DIRECT_URL = `postgresql://postgres:${SECRET}@${EXPECTED.directHost}:5432/${EXPECTED.database}`;
const HOSTILE_DIRECT_URL = `postgresql://postgres.${EXPECTED.projectRef}:${SECRET}@wrong.example.com:5432/${EXPECTED.database}`;

const MATCHING_ENV: MigrationDeployRemoteEnv = {
  DATABASE_URL: POOLER_URL,
  DIRECT_URL,
  DAT_OPS_EXPECTED_DB_HOST: EXPECTED.host,
  DAT_OPS_EXPECTED_DIRECT_DB_HOST: EXPECTED.directHost,
  DAT_OPS_EXPECTED_DB_NAME: EXPECTED.database,
  DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF: EXPECTED.projectRef,
};

function createIo(
  overrides: Partial<MigrationDeployRemoteIo> & {
    confirmation?: string;
  } = {},
): MigrationDeployRemoteIo {
  const confirmation = overrides.confirmation ?? "MIGRATE postgres abcd";
  return {
    stdinIsTTY: overrides.stdinIsTTY ?? true,
    stdoutIsTTY: overrides.stdoutIsTTY ?? true,
    writeOut: overrides.writeOut ?? vi.fn(),
    writeErr: overrides.writeErr ?? vi.fn(),
    readConfirmation:
      overrides.readConfirmation ?? vi.fn(async () => confirmation),
  };
}

async function runWith(input: {
  argv?: readonly string[];
  env?: MigrationDeployRemoteEnv;
  io?: MigrationDeployRemoteIo;
  runner?: PrismaMigrateDeployRunner;
}) {
  const runner = input.runner ?? vi.fn(async () => ({ exitCode: 0 }));
  const result = await runMigrationDeployRemote({
    argv: input.argv ?? [],
    env: input.env ?? MATCHING_ENV,
    io: input.io ?? createIo(),
    appRoot: "/app",
    nodeExecutable: "/usr/bin/node",
    prismaCliEntry: "/app/node_modules/prisma/build/index.js",
    runPrismaMigrateDeploy: runner,
  });
  return { result, runner };
}

describe("migration-deploy-remote execution boundary", () => {
  it("parses default argv as preflight-only", () => {
    expect(parseMigrationDeployRemoteArgs([])).toEqual({
      execute: false,
      unknownFlags: [],
    });
    expect(parseMigrationDeployRemoteArgs(["--execute"])).toEqual({
      execute: true,
      unknownFlags: [],
    });
    expect(parseMigrationDeployRemoteArgs(["--", "--execute"])).toEqual({
      execute: true,
      unknownFlags: [],
    });
  });

  it("does not call the runner on target refusal", async () => {
    const { result, runner } = await runWith({
      argv: ["--execute"],
      env: { ...MATCHING_ENV, DATABASE_URL: undefined },
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("missing_database_url");
    expect(result.runnerCallCount).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not call the runner for hostile DIRECT_URL host mismatch", async () => {
    const io = createIo();
    const { result, runner } = await runWith({
      argv: ["--execute"],
      env: { ...MATCHING_ENV, DIRECT_URL: HOSTILE_DIRECT_URL },
      io,
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("direct_url_host_mismatch");
    expect(result.runnerCallCount).toBe(0);
    expect(runner).not.toHaveBeenCalled();
    expect(io.readConfirmation).not.toHaveBeenCalled();
    const err = String(vi.mocked(io.writeErr).mock.calls[0]?.[0] ?? "");
    expect(err).not.toContain(SECRET);
    expect(err).not.toContain(HOSTILE_DIRECT_URL);
    expect(err).not.toContain(EXPECTED.projectRef);
    expect(err).not.toContain("postgresql://");
  });

  it("does not call the runner when expected DIRECT_URL host is missing", async () => {
    const { result, runner } = await runWith({
      argv: ["--execute"],
      env: { ...MATCHING_ENV, DAT_OPS_EXPECTED_DIRECT_DB_HOST: undefined },
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("missing_expected_direct_host");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not call the runner for preflight-only success", async () => {
    const io = createIo();
    const { result, runner } = await runWith({ argv: [], io });
    expect(result.status).toBe("preflight_ok");
    expect(result.runnerCallCount).toBe(0);
    expect(runner).not.toHaveBeenCalled();
    expect(io.readConfirmation).not.toHaveBeenCalled();
    const out = String(vi.mocked(io.writeOut).mock.calls[0]?.[0] ?? "");
    expect(out).not.toContain(SECRET);
    expect(out).not.toContain(POOLER_URL);
    expect(out).not.toContain(DIRECT_URL);
    expect(out).not.toContain(EXPECTED.projectRef);
    expect(out).toContain("writeAuthority=false");
  });

  it.each([
    ["CI", { CI: "true" }, "unattended_host_ci"],
    ["GITLAB_CI", { GITLAB_CI: "true" }, "unattended_host_gitlab_ci"],
    ["VERCEL", { VERCEL: "1" }, "unattended_host_vercel"],
  ] as const)(
    "does not call the runner under %s",
    async (_name, extraEnv, code) => {
      const { result, runner } = await runWith({
        argv: ["--execute"],
        env: { ...MATCHING_ENV, ...extraEnv },
      });
      expect(result.status).toBe("refused");
      expect(result.code).toBe(code);
      expect(result.runnerCallCount).toBe(0);
      expect(runner).not.toHaveBeenCalled();
    },
  );

  it("does not prompt for confirmation under an unattended host signal", async () => {
    const io = createIo();
    const { runner } = await runWith({
      argv: ["--execute"],
      env: { ...MATCHING_ENV, CI: "true" },
      io,
    });
    expect(io.readConfirmation).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not call the runner without a TTY", async () => {
    const { result, runner } = await runWith({
      argv: ["--execute"],
      io: createIo({ stdinIsTTY: false, stdoutIsTTY: true }),
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("non_interactive_terminal");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not call the runner with a failed confirmation", async () => {
    const { result, runner } = await runWith({
      argv: ["--execute"],
      io: createIo({ confirmation: "yes" }),
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("confirmation_mismatch");
    expect(result.runnerCallCount).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it("calls the runner exactly once only when every gate passes", async () => {
    const runner = vi.fn(async () => ({ exitCode: 0 }));
    const { result } = await runWith({
      argv: ["--execute"],
      runner,
    });
    expect(result.status).toBe("executed");
    expect(result.runnerCallCount).toBe(1);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith({
      argv: [
        "/usr/bin/node",
        "/app/node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
      ],
      shell: false,
      cwd: "/app",
    });
    expect(result.invocation?.shell).toBe(false);
    expect(result.prismaExitCode).toBe(0);
  });

  it("builds the Prisma invocation with shell disabled", () => {
    const invocation = buildPrismaMigrateDeployInvocation({
      nodeExecutable: "/usr/bin/node",
      prismaCliEntry: "/app/node_modules/prisma/build/index.js",
      cwd: "/app",
    });
    expect(invocation.shell).toBe(false);
    expect(invocation.argv).toEqual([
      "/usr/bin/node",
      "/app/node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
    ]);
  });

  it("detects unattended host signals fail-closed on any non-empty value", () => {
    expect(detectUnattendedHostSignal({})).toBeNull();
    expect(detectUnattendedHostSignal({ CI: " " })).toBeNull();
    expect(detectUnattendedHostSignal({ CI: "true" })).toBe("CI");
    expect(detectUnattendedHostSignal({ GITLAB_CI: "1" })).toBe("GITLAB_CI");
    expect(detectUnattendedHostSignal({ VERCEL: "1" })).toBe("VERCEL");
  });

  it("refuses unknown flags before spawning Prisma", async () => {
    const { result, runner } = await runWith({
      argv: ["--apply"],
    });
    expect(result.status).toBe("refused");
    expect(result.code).toBe("unknown_flag");
    expect(runner).not.toHaveBeenCalled();
  });

  it("resolves the pinned Prisma CLI entry without executing Prisma", () => {
    const resolved = resolvePrismaCliEntry(import.meta.url);
    expect(resolved.length).toBeGreaterThan(0);
    expect(existsSync(resolved)).toBe(true);
    expect(statSync(resolved).isFile()).toBe(true);
    expect(resolved.replace(/\\/g, "/")).toMatch(/\/prisma\/build\/index\.js$/);
  });
});
