import { describe, expect, it } from "vitest";

import {
  assertLocalDevelopmentDatabaseAllowed,
  formatLocalDevelopmentDatabaseGuardMessage,
  readLocalDevelopmentDatabaseGuardInput,
} from "@/lib/ops/local-development-database-guard";

const CANARY_USER = "dat_iso_user_canary";
const CANARY_PASS = "dat_iso_pass_canary";
const CANARY_HOST = "prod-isolation-canary.example.com";
const CANARY_PROJECT_REF = "projrefcanary12345678";
const CANARY_SUPABASE_DB_HOST = `db.${CANARY_PROJECT_REF}.supabase.co`;
const CANARY_SUPABASE_POOLER_HOST = "aws-0-eu-central-1.pooler.supabase.com";

const LOCAL_DATABASE_URL = "postgresql://dat:dat@127.0.0.1:5432/dat";
const LOCAL_DIRECT_URL = "postgresql://dat:dat@127.0.0.1:5432/dat";

function remoteUrl(host: string): string {
  return `postgresql://${CANARY_USER}:${CANARY_PASS}@${host}:5432/postgres`;
}

const GENERIC_REMOTE_URL = remoteUrl(CANARY_HOST);
const SUPABASE_DB_URL = remoteUrl(CANARY_SUPABASE_DB_HOST);
const SUPABASE_POOLER_URL = remoteUrl(CANARY_SUPABASE_POOLER_HOST);

function expectSafeFailureMessage(message: string): void {
  expect(message).not.toContain(CANARY_USER);
  expect(message).not.toContain(CANARY_PASS);
  expect(message).not.toContain(GENERIC_REMOTE_URL);
  expect(message).not.toContain(SUPABASE_DB_URL);
  expect(message).not.toContain(SUPABASE_POOLER_URL);
  expect(message).not.toContain(CANARY_HOST);
  expect(message).not.toContain(CANARY_SUPABASE_DB_HOST);
  expect(message).not.toContain(CANARY_SUPABASE_POOLER_HOST);
  expect(message).not.toContain(CANARY_PROJECT_REF);
  expect(message).not.toContain("postgresql://");
  expect(message).not.toContain("postgres://");
}

describe("local-development-database-guard allow", () => {
  it("allows localhost", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql://dat:dat@localhost:5432/dat",
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.reason).toBe("local_database_target_allowed");
    }
  });

  it("allows 127.0.0.1", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
    });
    expect(decision.ok).toBe(true);
  });

  it("allows ::1", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql://dat:dat@[::1]:5432/dat",
    });
    expect(decision.ok).toBe(true);
  });

  it("allows *.localhost", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql://dat:dat@db.localhost:5432/dat",
    });
    expect(decision.ok).toBe(true);
  });

  it("allows DATABASE_URL local with DIRECT_URL absent", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
    });
    expect(decision.ok).toBe(true);
  });

  it("allows DATABASE_URL local with DIRECT_URL local", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
      directUrl: LOCAL_DIRECT_URL,
    });
    expect(decision.ok).toBe(true);
  });

  it("allows postgres:// loopback protocol", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgres://dat:dat@127.0.0.1:5432/dat",
    });
    expect(decision.ok).toBe(true);
  });

  it("allows VERCEL=1 with a fake remote URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        DIRECT_URL: SUPABASE_POOLER_URL,
        VERCEL: "1",
      }),
    );
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.reason).toBe("vercel_hosted_environment");
    }
  });
});

describe("local-development-database-guard block", () => {
  it("blocks missing DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("missing_database_url");
      expect(decision.message).toBe(
        formatLocalDevelopmentDatabaseGuardMessage("missing_database_url"),
      );
    }
  });

  it("blocks empty DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("missing_database_url");
    }
  });

  it("blocks malformed DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "not-a-url",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("malformed_database_url");
    }
  });

  it("blocks unsupported DATABASE_URL protocol even on loopback", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "mysql://127.0.0.1:3306/dat",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("unsupported_database_protocol");
    }
  });

  it("blocks empty DATABASE_URL hostname", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql:///dat",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("empty_database_url_host");
    }
  });

  it("blocks a generic remote hostname", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: GENERIC_REMOTE_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks a fake Supabase pooler hostname", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: SUPABASE_POOLER_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks a fake Supabase db hostname", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: SUPABASE_DB_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks host.docker.internal", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql://dat:dat@host.docker.internal:5432/dat",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
    }
  });

  it("blocks postgres Docker hostname", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: "postgresql://dat:dat@postgres:5432/dat",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
    }
  });

  it("blocks DATABASE_URL local with DIRECT_URL remote", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
      directUrl: GENERIC_REMOTE_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_direct_url_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks malformed DIRECT_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
      directUrl: "not-a-url",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("malformed_direct_url");
    }
  });

  it("blocks empty DIRECT_URL when defined", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: LOCAL_DATABASE_URL,
      directUrl: "",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("malformed_direct_url");
    }
  });

  it("blocks CI=true with a remote DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        CI: "true",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks GITLAB_CI=true with a remote DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        GITLAB_CI: "true",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks NODE_ENV=production with a remote DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        NODE_ENV: "production",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });

  it("blocks NODE_ENV=test with a remote DATABASE_URL", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        NODE_ENV: "test",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
      expectSafeFailureMessage(decision.message);
    }
  });
});

describe("local-development-database-guard security redaction", () => {
  it("does not leak username, password, URL, hostname, or project ref", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed({
      databaseUrl: SUPABASE_DB_URL,
      directUrl: SUPABASE_POOLER_URL,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expectSafeFailureMessage(decision.message);
      expect(decision.message).toBe(
        "Local database isolation blocked a non-local DATABASE_URL.",
      );
    }
  });

  it("does not treat VERCEL=true as a hosted exemption", () => {
    const decision = assertLocalDevelopmentDatabaseAllowed(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: GENERIC_REMOTE_URL,
        VERCEL: "true",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("non_local_database_host");
    }
  });
});

describe("readLocalDevelopmentDatabaseGuardInput", () => {
  it("reads only DATABASE_URL, DIRECT_URL, and VERCEL", () => {
    expect(
      readLocalDevelopmentDatabaseGuardInput({
        DATABASE_URL: LOCAL_DATABASE_URL,
        DIRECT_URL: LOCAL_DIRECT_URL,
        VERCEL: "1",
        CI: "true",
        GITLAB_CI: "true",
        NODE_ENV: "production",
      }),
    ).toEqual({
      databaseUrl: LOCAL_DATABASE_URL,
      directUrl: LOCAL_DIRECT_URL,
      vercel: "1",
    });
  });
});
