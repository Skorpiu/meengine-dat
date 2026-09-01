import { describe, expect, it } from "vitest";

import {
  E2E_DATABASE_NAME,
  E2E_DATABASE_PASSWORD,
  E2E_DATABASE_USER,
  E2E_LOCAL_HOST,
  E2E_LOCAL_PORT,
  buildCanonicalE2eDatabaseUrl,
} from "@/lib/ops/e2e-database-contract";
import {
  evaluateE2eDatabaseTarget,
  formatE2eDatabaseTargetRefusalMessage,
  readE2eDatabaseTargetGuardInput,
} from "@/lib/ops/e2e-database-target-guard";

const CANARY_USER = "dat_e2e_canary_user";
const CANARY_PASS = "dat_e2e_canary_pass_secret";
const CANARY_HOST = "prod-e2e-canary.example.com";
const CANARY_PROJECT_REF = "projrefe2ecanary123456";
const CANARY_SUPABASE_DB_HOST = `db.${CANARY_PROJECT_REF}.supabase.co`;
const CANARY_SUPABASE_POOLER_HOST = "aws-0-eu-central-1.pooler.supabase.com";
const HOSTED_OPERATOR_URL = `postgresql://${CANARY_USER}:${CANARY_PASS}@${CANARY_HOST}:5432/postgres`;
const INTEGRATION_LOOKALIKE_URL =
  "postgresql://dat_it:dat_it@127.0.0.1:55432/dat_it?schema=public";

const LOCAL_CANONICAL = buildCanonicalE2eDatabaseUrl();

function e2eUrl(
  overrides: {
    protocol?: string;
    user?: string;
    password?: string;
    host?: string;
    port?: string;
    database?: string;
    query?: string;
  } = {},
): string {
  const protocol = overrides.protocol ?? "postgresql";
  const user = overrides.user ?? E2E_DATABASE_USER;
  const password = overrides.password ?? E2E_DATABASE_PASSWORD;
  const host = overrides.host ?? E2E_LOCAL_HOST;
  const port = overrides.port ?? String(E2E_LOCAL_PORT);
  const database = overrides.database ?? E2E_DATABASE_NAME;
  const query =
    overrides.query === undefined ? "?schema=public" : overrides.query;
  return `${protocol}://${user}:${password}@${host}:${port}/${database}${query}`;
}

function expectSafeFailureMessage(message: string): void {
  expect(message).not.toContain(CANARY_USER);
  expect(message).not.toContain(CANARY_PASS);
  expect(message).not.toContain(HOSTED_OPERATOR_URL);
  expect(message).not.toContain(CANARY_HOST);
  expect(message).not.toContain(CANARY_SUPABASE_DB_HOST);
  expect(message).not.toContain(CANARY_SUPABASE_POOLER_HOST);
  expect(message).not.toContain(CANARY_PROJECT_REF);
  expect(message).not.toContain("postgresql://");
  expect(message).not.toContain("postgres://");
  expect(message).not.toContain(E2E_DATABASE_PASSWORD);
  expect(message).not.toContain(LOCAL_CANONICAL);
}

describe("e2e-database-target-guard allow", () => {
  it("allows the constructed canonical identity when no URLs are supplied", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: undefined,
      directUrl: undefined,
      applicationDatabaseUrl: HOSTED_OPERATOR_URL,
      ci: "true",
      gitlabCi: "true",
      nodeEnv: "production",
      vercel: "1",
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.writeAuthority).toBe(false);
      expect(decision.validatedUrl).toBe(LOCAL_CANONICAL);
      expect(decision.safeSummary.host).toBe(E2E_LOCAL_HOST);
      expect(decision.safeSummary.port).toBe(String(E2E_LOCAL_PORT));
      expect(decision.safeSummary.database).toBe(E2E_DATABASE_NAME);
      expect(decision.safeSummary.user).toBe(E2E_DATABASE_USER);
      expect(decision.redactedTarget).toBe(
        `postgresql://***:***@${E2E_LOCAL_HOST}:${E2E_LOCAL_PORT}/${E2E_DATABASE_NAME}`,
      );
      expect(decision.redactedTarget).not.toContain(
        `://${E2E_DATABASE_USER}:${E2E_DATABASE_PASSWORD}@`,
      );
    }
  });

  it("allows matching DATABASE_URL and DIRECT_URL for the exact local identity", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: LOCAL_CANONICAL,
      directUrl: LOCAL_CANONICAL,
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.validatedUrl).toBe(LOCAL_CANONICAL);
    }
  });

  it("allows postgres: protocol for the exact local identity", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ protocol: "postgres" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(true);
  });
});

describe("e2e-database-target-guard refusals", () => {
  it("does not expand the allowlist because CI/GITLAB_CI/NODE_ENV/VERCEL are set", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: HOSTED_OPERATOR_URL,
      directUrl: HOSTED_OPERATOR_URL,
      ci: "true",
      gitlabCi: "true",
      nodeEnv: "test",
      vercel: "1",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("hosted_or_public_hostname");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });

  it("refuses incompatible DATABASE_URL and DIRECT_URL pairs", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: LOCAL_CANONICAL,
      directUrl: HOSTED_OPERATOR_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("incompatible_url_pair");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });

  it("refuses the DEC-070 integration identity", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: INTEGRATION_LOOKALIKE_URL,
      directUrl: INTEGRATION_LOOKALIKE_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_port");
    }
  });

  it("refuses a malformed URL", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: "not-a-url",
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_url");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });

  it("refuses a non-PostgreSQL protocol", () => {
    const url = `https://${E2E_DATABASE_USER}:${E2E_DATABASE_PASSWORD}@${E2E_LOCAL_HOST}:${E2E_LOCAL_PORT}/${E2E_DATABASE_NAME}`;
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: url,
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_protocol");
      const message = formatE2eDatabaseTargetRefusalMessage(decision);
      expect(message).not.toContain("https://");
      expect(message).not.toContain(url);
      expectSafeFailureMessage(message);
    }
  });

  it("refuses unexpected query parameters", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ query: "?schema=public&sslmode=require" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unexpected_url_query");
    }
  });

  it("refuses a public hosted hostname", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ host: CANARY_HOST }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("hosted_or_public_hostname");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });

  it("refuses a Supabase db hostname", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ host: CANARY_SUPABASE_DB_HOST }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("supabase_hostname");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });

  it("refuses a Supabase pooler hostname", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ host: CANARY_SUPABASE_POOLER_HOST }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("supabase_hostname");
    }
  });

  it("refuses RFC1918 addresses", () => {
    for (const host of ["10.0.0.8", "172.16.0.4", "192.168.1.20"]) {
      const decision = evaluateE2eDatabaseTarget({
        databaseUrl: e2eUrl({ host }),
        directUrl: undefined,
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("rfc1918_address");
      }
    }
  });

  it("refuses localhost forms outside the exact local contract", () => {
    for (const host of ["localhost", "[::1]", "db.localhost"]) {
      const decision = evaluateE2eDatabaseTarget({
        databaseUrl: e2eUrl({ host }),
        directUrl: undefined,
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("localhost_outside_contract");
      }
    }
  });

  it("refuses host.docker.internal", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ host: "host.docker.internal" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("host_docker_internal");
    }
  });

  it("refuses the generic postgres hostname", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ host: "postgres" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("generic_postgres_hostname");
    }
  });

  it("refuses the wrong port", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ port: "5432" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_port");
    }
  });

  it("refuses the wrong user", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ user: "postgres" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_user");
    }
  });

  it("refuses the wrong database", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ database: "postgres" }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_database");
    }
  });

  it("refuses the wrong password without printing it", () => {
    const decision = evaluateE2eDatabaseTarget({
      databaseUrl: e2eUrl({ password: CANARY_PASS }),
      directUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_password");
      expectSafeFailureMessage(formatE2eDatabaseTargetRefusalMessage(decision));
    }
  });
});

describe("readE2eDatabaseTargetGuardInput", () => {
  it("reads DATABASE_URL and DIRECT_URL without treating them as write authority", () => {
    const input = readE2eDatabaseTargetGuardInput({
      DATABASE_URL: HOSTED_OPERATOR_URL,
      DIRECT_URL: HOSTED_OPERATOR_URL,
      CI: "true",
    });
    expect(input.databaseUrl).toBe(HOSTED_OPERATOR_URL);
    expect(input.directUrl).toBe(HOSTED_OPERATOR_URL);
    expect(input.applicationDatabaseUrl).toBe(HOSTED_OPERATOR_URL);
  });
});
