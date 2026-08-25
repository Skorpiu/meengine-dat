import { describe, expect, it, vi } from "vitest";

import { runMigrateDeployRemoteCli } from "./migrate-deploy-remote";

const EXPECTED = {
  host: "aws-0-eu-central-1.pooler.supabase.com",
  directHost: "db.abcdefghijklmnop.supabase.co",
  database: "postgres",
  projectRef: "abcdefghijklmnop",
};

const SECRET = "cli-secret-password";
const POOLER_URL = `postgresql://postgres.${EXPECTED.projectRef}:${SECRET}@${EXPECTED.host}:6543/${EXPECTED.database}`;
const DIRECT_URL = `postgresql://postgres:${SECRET}@${EXPECTED.directHost}:5432/${EXPECTED.database}`;

describe("migrate-deploy-remote CLI wiring", () => {
  it("keeps preflight-only CLI from constructing a Prisma spawn", async () => {
    const runner = vi.fn(async () => ({ exitCode: 0 }));
    const previousExit = process.exitCode;
    process.exitCode = 0;

    await runMigrateDeployRemoteCli(
      [],
      {
        DATABASE_URL: POOLER_URL,
        DIRECT_URL,
        DAT_OPS_EXPECTED_DB_HOST: EXPECTED.host,
        DAT_OPS_EXPECTED_DIRECT_DB_HOST: EXPECTED.directHost,
        DAT_OPS_EXPECTED_DB_NAME: EXPECTED.database,
        DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF: EXPECTED.projectRef,
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        writeOut: vi.fn(),
        writeErr: vi.fn(),
        readConfirmation: vi.fn(async () => "MIGRATE postgres abcd"),
      },
      {
        appRoot: "/app",
        nodeExecutable: "/usr/bin/node",
        prismaCliEntry: "/app/node_modules/prisma/build/index.js",
        runPrismaMigrateDeploy: runner,
      },
    );

    expect(runner).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    process.exitCode = previousExit;
  });

  it("sets a non-zero exit code when identity is refused", async () => {
    const runner = vi.fn(async () => ({ exitCode: 0 }));
    const previousExit = process.exitCode;
    process.exitCode = 0;

    await runMigrateDeployRemoteCli(
      ["--execute"],
      {},
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        writeOut: vi.fn(),
        writeErr: vi.fn(),
        readConfirmation: vi.fn(async () => "MIGRATE postgres abcd"),
      },
      { runPrismaMigrateDeploy: runner },
    );

    expect(runner).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExit;
  });
});
