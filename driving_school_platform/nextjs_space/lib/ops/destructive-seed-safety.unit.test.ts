import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
  assertDestructiveLocalSeedAllowed,
  isLocalDestructiveSeedHost,
  parseDatabaseTarget,
} from "@/lib/ops/destructive-seed-safety";

describe("destructive-seed-safety", () => {
  it("refuses missing DATABASE_URL", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl: undefined,
      confirmation: DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_database_url");
    }
  });

  it("refuses malformed DATABASE_URL", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl: "not-a-url",
      confirmation: DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_database_url");
    }
  });

  it("refuses Supabase pooler host regardless of confirmation", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl:
        "postgresql://user:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
      confirmation: DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("remote_host_refused");
      expect(decision.redactedTarget).toContain("pooler.supabase.com");
      expect(decision.redactedTarget).not.toContain("pass");
      expect(decision.redactedTarget).not.toContain("user");
    }
  });

  it("refuses arbitrary remote hosts", () => {
    for (const url of [
      "postgresql://u:p@db.xxxxx.supabase.co:5432/postgres",
      "postgresql://u:p@ep-cool.eu-central-1.aws.neon.tech/neondb",
      "postgresql://u:p@containers-us-west.railway.app:5432/railway",
      "postgresql://u:p@dpg-xxx.render.com/app",
      "postgresql://u:p@remote.example.com:5432/dat",
    ]) {
      const decision = assertDestructiveLocalSeedAllowed({
        databaseUrl: url,
        confirmation: DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("remote_host_refused");
      }
    }
  });

  it("refuses localhost without exact confirmation", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl: "postgresql://postgres:postgres@localhost:5432/dat",
      confirmation: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_local_confirmation");
      expect(decision.message).toContain(DESTRUCTIVE_LOCAL_SEED_CONFIRMATION);
    }
  });

  it("refuses 127.0.0.1 without exact confirmation", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:5432/dat",
      confirmation: "true",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_local_confirmation");
    }
  });

  it("authorizes local target with exact confirmation", () => {
    const decision = assertDestructiveLocalSeedAllowed({
      databaseUrl: "postgresql://postgres:secret@localhost:5432/dat_local",
      confirmation: DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.target.host).toBe("localhost");
      expect(decision.target.database).toBe("dat_local");
      expect(decision.redactedTarget).toBe(
        "postgresql://***:***@localhost/dat_local",
      );
      expect(decision.redactedTarget).not.toContain("secret");
    }
  });

  it("has no remote bypass via NODE_ENV-style confirmation values", () => {
    const remote =
      "postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
    for (const confirmation of [
      "true",
      "1",
      "ALLOW_PROD_SEED",
      "FORCE",
      "--yes",
      "development",
      DESTRUCTIVE_LOCAL_SEED_CONFIRMATION,
    ]) {
      const decision = assertDestructiveLocalSeedAllowed({
        databaseUrl: remote,
        confirmation,
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("remote_host_refused");
      }
    }
  });

  it("classifies only loopback-style hosts as local", () => {
    expect(isLocalDestructiveSeedHost("localhost")).toBe(true);
    expect(isLocalDestructiveSeedHost("127.0.0.1")).toBe(true);
    expect(isLocalDestructiveSeedHost("::1")).toBe(true);
    expect(isLocalDestructiveSeedHost("app.localhost")).toBe(true);
    expect(isLocalDestructiveSeedHost("db.supabase.co")).toBe(false);
    expect(isLocalDestructiveSeedHost("postgres")).toBe(false);
  });

  it("fails closed on empty host after parse", () => {
    const parsed = parseDatabaseTarget("postgresql:///dbname");
    // URL with empty hostname
    if (parsed.ok) {
      expect(isLocalDestructiveSeedHost(parsed.target.host)).toBe(false);
    } else {
      expect(["empty_host", "malformed_database_url"]).toContain(parsed.code);
    }
  });
});

describe("legacy scripts/seed.ts destructive boundary", () => {
  const seedSource = readFileSync(
    join(__dirname, "../../scripts/seed.ts"),
    "utf8",
  );

  it("invokes the destructive seed guard before PrismaClient construction", () => {
    expect(seedSource).toContain("assertDestructiveLocalSeedAllowed");
    expect(seedSource).not.toMatch(
      /^import\s*\{[^}]*PrismaClient[^}]*\}\s*from\s*["']@prisma\/client["']/m,
    );
    expect(seedSource).toMatch(
      /assertDestructiveLocalSeedAllowed[\s\S]*?await import\(["']@prisma\/client["']\)/,
    );
    expect(seedSource).toMatch(/new PrismaClient\s*\(/);
  });

  it("contains no legacy ALLOW_PROD_SEED bypass", () => {
    expect(seedSource).not.toContain("ALLOW_PROD_SEED");
    expect(seedSource).toContain("ALLOW_DESTRUCTIVE_LOCAL_SEED");
    expect(seedSource).toContain("DESTRUCTIVE_LOCAL_SEED_CONFIRMATION");
  });

  it("has no commercial catalogue integration", () => {
    expect(seedSource).not.toContain("seedDatCommercialCatalogue");
    expect(seedSource).not.toContain("commercial-catalog");
  });
});
