import { describe, expect, it } from "vitest";

import {
  INTEGRATION_CI_HOST,
  INTEGRATION_CI_PORT,
  INTEGRATION_DATABASE_NAME,
  INTEGRATION_DATABASE_PASSWORD,
  INTEGRATION_DATABASE_USER,
  INTEGRATION_LOCAL_HOST,
  INTEGRATION_LOCAL_PORT,
  INTEGRATION_PROVISION_CI_EXTERNAL,
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
  buildCanonicalIntegrationDatabaseUrl,
} from "@/lib/ops/integration-database-contract";
import {
  evaluateIntegrationDatabaseTarget,
  formatIntegrationDatabaseTargetRefusalMessage,
  readIntegrationDatabaseTargetGuardInput,
} from "@/lib/ops/integration-database-target-guard";

const CANARY_USER = "dat_it_canary_user";
const CANARY_PASS = "dat_it_canary_pass_secret";
const CANARY_HOST = "prod-integration-canary.example.com";
const CANARY_PROJECT_REF = "projrefcanary12345678";
const CANARY_SUPABASE_DB_HOST = `db.${CANARY_PROJECT_REF}.supabase.co`;
const CANARY_SUPABASE_POOLER_HOST = "aws-0-eu-central-1.pooler.supabase.com";
const HOSTED_OPERATOR_URL = `postgresql://${CANARY_USER}:${CANARY_PASS}@${CANARY_HOST}:5432/postgres`;

const LOCAL_CANONICAL = buildCanonicalIntegrationDatabaseUrl(
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
);
const CI_CANONICAL = buildCanonicalIntegrationDatabaseUrl(
  INTEGRATION_PROVISION_CI_EXTERNAL,
);

function ciUrl(
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
  const user = overrides.user ?? INTEGRATION_DATABASE_USER;
  const password = overrides.password ?? INTEGRATION_DATABASE_PASSWORD;
  const host = overrides.host ?? INTEGRATION_CI_HOST;
  const port = overrides.port ?? String(INTEGRATION_CI_PORT);
  const database = overrides.database ?? INTEGRATION_DATABASE_NAME;
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
  expect(message).not.toContain(INTEGRATION_DATABASE_PASSWORD);
  expect(message).not.toContain(LOCAL_CANONICAL);
  expect(message).not.toContain(CI_CANONICAL);
}

describe("integration-database-target-guard local-compose", () => {
  it("allows the canonical constructed local identity and ignores inherited URLs", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_LOCAL_COMPOSE,
      integrationDatabaseUrl: HOSTED_OPERATOR_URL,
      applicationDatabaseUrl: HOSTED_OPERATOR_URL,
      applicationDirectUrl: HOSTED_OPERATOR_URL,
      ci: "true",
      gitlabCi: "true",
      nodeEnv: "production",
      vercel: "1",
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.writeAuthority).toBe(false);
      expect(decision.provisionMode).toBe(INTEGRATION_PROVISION_LOCAL_COMPOSE);
      expect(decision.validatedUrl).toBe(LOCAL_CANONICAL);
      expect(decision.safeSummary.host).toBe(INTEGRATION_LOCAL_HOST);
      expect(decision.safeSummary.port).toBe(String(INTEGRATION_LOCAL_PORT));
      expect(decision.safeSummary.database).toBe(INTEGRATION_DATABASE_NAME);
      expect(decision.safeSummary.user).toBe(INTEGRATION_DATABASE_USER);
      expect(decision.redactedTarget).toBe(
        `postgresql://***:***@${INTEGRATION_LOCAL_HOST}:${INTEGRATION_LOCAL_PORT}/${INTEGRATION_DATABASE_NAME}`,
      );
      expect(decision.redactedTarget).not.toContain(
        `://${INTEGRATION_DATABASE_USER}:${INTEGRATION_DATABASE_PASSWORD}@`,
      );
    }
  });
});

describe("integration-database-target-guard ci-external allow", () => {
  it("allows the exact CI service identity", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: CI_CANONICAL,
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.writeAuthority).toBe(false);
      expect(decision.validatedUrl).toBe(CI_CANONICAL);
      expect(decision.safeSummary.host).toBe(INTEGRATION_CI_HOST);
      expect(decision.safeSummary.port).toBe(String(INTEGRATION_CI_PORT));
    }
  });

  it("allows postgres: protocol for the exact CI identity", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ protocol: "postgres" }),
    });
    expect(decision.ok).toBe(true);
  });

  it("does not expand the allowlist because CI/GITLAB_CI/NODE_ENV/VERCEL are set", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: HOSTED_OPERATOR_URL,
      ci: "true",
      gitlabCi: "true",
      nodeEnv: "test",
      vercel: "1",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("hosted_or_public_hostname");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });
});

describe("integration-database-target-guard refusals", () => {
  it("refuses a missing provision mode", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: undefined,
      integrationDatabaseUrl: CI_CANONICAL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_provision_mode");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });

  it("refuses an unexpected provision mode including ambient CI inference", () => {
    for (const mode of ["ci", "true", "local", "compose", "DATABASE_URL"]) {
      const decision = evaluateIntegrationDatabaseTarget({
        provisionMode: mode,
        integrationDatabaseUrl: CI_CANONICAL,
        ci: "true",
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("unexpected_provision_mode");
      }
    }
  });

  it("refuses missing INTEGRATION_DATABASE_URL in CI external mode", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_integration_database_url");
    }
  });

  it("refuses using application DATABASE_URL as CI authority", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: undefined,
      applicationDatabaseUrl: CI_CANONICAL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("application_database_url_not_authority");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });

  it("refuses a malformed URL", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: "not-a-url",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_url");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });

  it("refuses a non-PostgreSQL protocol", () => {
    const url = `https://${INTEGRATION_DATABASE_USER}:${INTEGRATION_DATABASE_PASSWORD}@${INTEGRATION_CI_HOST}:${INTEGRATION_CI_PORT}/${INTEGRATION_DATABASE_NAME}`;
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: url,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_protocol");
      const message = formatIntegrationDatabaseTargetRefusalMessage(decision);
      expect(message).not.toContain("https://");
      expect(message).not.toContain(url);
      expectSafeFailureMessage(message);
    }
  });

  it("refuses unexpected query parameters", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({
        query: "?schema=public&sslmode=require",
      }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unexpected_url_query");
    }
  });

  it("refuses a public hosted hostname", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ host: CANARY_HOST }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("hosted_or_public_hostname");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });

  it("refuses a Supabase db hostname", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ host: CANARY_SUPABASE_DB_HOST }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("supabase_hostname");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });

  it("refuses a Supabase pooler hostname", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ host: CANARY_SUPABASE_POOLER_HOST }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("supabase_hostname");
    }
  });

  it("refuses RFC1918 addresses", () => {
    for (const host of ["10.0.0.8", "172.16.0.4", "192.168.1.20"]) {
      const decision = evaluateIntegrationDatabaseTarget({
        provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
        integrationDatabaseUrl: ciUrl({ host }),
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("rfc1918_address");
      }
    }
  });

  it("refuses localhost forms outside the exact local contract", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "db.localhost"]) {
      const decision = evaluateIntegrationDatabaseTarget({
        provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
        integrationDatabaseUrl: ciUrl({ host }),
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("localhost_outside_contract");
      }
    }
  });

  it("refuses host.docker.internal", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ host: "host.docker.internal" }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("host_docker_internal");
    }
  });

  it("refuses the generic postgres hostname", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ host: "postgres" }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("generic_postgres_hostname");
    }
  });

  it("refuses the wrong CI port", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ port: "55432" }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_port");
    }
  });

  it("refuses the wrong user", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ user: "postgres" }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_user");
    }
  });

  it("refuses the wrong database", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ database: "postgres" }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_database");
    }
  });

  it("refuses the wrong password without printing it", () => {
    const decision = evaluateIntegrationDatabaseTarget({
      provisionMode: INTEGRATION_PROVISION_CI_EXTERNAL,
      integrationDatabaseUrl: ciUrl({ password: CANARY_PASS }),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("wrong_password");
      expectSafeFailureMessage(
        formatIntegrationDatabaseTargetRefusalMessage(decision),
      );
    }
  });
});

describe("readIntegrationDatabaseTargetGuardInput", () => {
  it("reads INTEGRATION_DATABASE_URL and never treats DATABASE_URL as the integration field", () => {
    const input = readIntegrationDatabaseTargetGuardInput(
      {
        INTEGRATION_DATABASE_URL: CI_CANONICAL,
        DATABASE_URL: HOSTED_OPERATOR_URL,
        DIRECT_URL: HOSTED_OPERATOR_URL,
        CI: "true",
      },
      INTEGRATION_PROVISION_CI_EXTERNAL,
    );
    expect(input.integrationDatabaseUrl).toBe(CI_CANONICAL);
    expect(input.applicationDatabaseUrl).toBe(HOSTED_OPERATOR_URL);
    expect(input.provisionMode).toBe(INTEGRATION_PROVISION_CI_EXTERNAL);
  });
});
