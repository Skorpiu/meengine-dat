import { describe, expect, it } from "vitest";

import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  assertRemoteOperatorTargetAllowed,
  extractSupabaseProjectRef,
  formatProjectRefPrefix,
  formatRemoteOperatorTargetRefusalMessage,
  parseRemoteOperatorDatabaseUrl,
} from "@/lib/ops/remote-operator-target-guard";

const EXPECTED = {
  host: "aws-0-eu-central-1.pooler.supabase.com",
  database: "postgres",
  projectRef: "abcdefghijklmnop",
};

function allowedInput(
  overrides: Partial<{
    databaseUrl: string | undefined;
    expectedHost: string | undefined;
    expectedDatabase: string | undefined;
    expectedSupabaseProjectRef: string | undefined;
    directUrl: string | undefined;
  }> = {},
) {
  return {
    databaseUrl: `postgresql://postgres.${EXPECTED.projectRef}:secret-password@${EXPECTED.host}:6543/${EXPECTED.database}`,
    expectedHost: EXPECTED.host,
    expectedDatabase: EXPECTED.database,
    expectedSupabaseProjectRef: EXPECTED.projectRef,
    ...overrides,
  };
}

describe("remote-operator-target-guard", () => {
  it("refuses missing DATABASE_URL", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ databaseUrl: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_database_url");
      expect(decision.message).not.toContain("secret-password");
    }
  });

  it("refuses malformed DATABASE_URL", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ databaseUrl: "not-a-url" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_database_url");
    }
  });

  it("refuses empty hostname", () => {
    const parsed = parseRemoteOperatorDatabaseUrl("postgresql:///dbname");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.code).toBe("empty_host");
    }
  });

  it("refuses missing expected host", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedHost: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_host");
      expect(decision.message).toContain(REMOTE_OPS_EXPECTED_DB_HOST_ENV);
    }
  });

  it("refuses host mismatch", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedHost: "other.example.com" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("host_mismatch");
      expect(formatRemoteOperatorTargetRefusalMessage(decision)).not.toContain(
        "secret-password",
      );
      expect(formatRemoteOperatorTargetRefusalMessage(decision)).not.toContain(
        "postgresql://",
      );
    }
  });

  it("refuses missing expected database", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedDatabase: "  " }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_database");
      expect(decision.message).toContain(REMOTE_OPS_EXPECTED_DB_NAME_ENV);
    }
  });

  it("refuses database mismatch", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedDatabase: "otherdb" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("database_mismatch");
    }
  });

  it("refuses missing expected project ref", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedSupabaseProjectRef: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_project_ref");
      expect(decision.message).toContain(
        REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
      );
    }
  });

  it("extracts pooler project-ref from username", () => {
    expect(
      extractSupabaseProjectRef({
        host: EXPECTED.host,
        username: `postgres.${EXPECTED.projectRef}`,
      }),
    ).toBe(EXPECTED.projectRef);
  });

  it("extracts project-ref from encoded pooler username", () => {
    expect(
      extractSupabaseProjectRef({
        host: EXPECTED.host,
        username: encodeURIComponent(`postgres.${EXPECTED.projectRef}`),
      }),
    ).toBe(EXPECTED.projectRef);
  });

  it("extracts direct Supabase host project-ref", () => {
    expect(
      extractSupabaseProjectRef({
        host: `db.${EXPECTED.projectRef}.supabase.co`,
        username: "postgres",
      }),
    ).toBe(EXPECTED.projectRef);
  });

  it("refuses unextractable project ref", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({
        databaseUrl: `postgresql://postgres:secret-password@${EXPECTED.host}:6543/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("project_ref_unextractable");
    }
  });

  it("refuses project-ref mismatch", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({ expectedSupabaseProjectRef: "zzzzzzzzzzzzzzzz" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("project_ref_mismatch");
      expect(decision.safeSummary.projectRefPrefix).toBe(
        formatProjectRefPrefix(EXPECTED.projectRef),
      );
      expect(decision.safeSummary.projectRefPrefix).not.toBe(
        EXPECTED.projectRef,
      );
    }
  });

  it("refuses DIRECT_URL project disagreement", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({
        directUrl: `postgresql://postgres.otherproject:x@db.otherproject.supabase.co:5432/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("direct_url_project_mismatch");
    }
  });

  it("refuses DIRECT_URL database disagreement", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({
        directUrl: `postgresql://postgres.${EXPECTED.projectRef}:x@db.${EXPECTED.projectRef}.supabase.co:5432/otherdb`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("direct_url_database_mismatch");
    }
  });

  it("refuses unsupported database protocols before target authorization", () => {
    for (const protocol of ["https", "http"] as const) {
      const url = `${protocol}://postgres.${EXPECTED.projectRef}:secret-password@${EXPECTED.host}:6543/${EXPECTED.database}`;
      const parsed = parseRemoteOperatorDatabaseUrl(url);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.code).toBe("unsupported_database_protocol");
      }

      const decision = assertRemoteOperatorTargetAllowed(
        allowedInput({ databaseUrl: url }),
      );
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("unsupported_database_protocol");
        const message = formatRemoteOperatorTargetRefusalMessage(decision);
        expect(message).not.toContain("secret-password");
        expect(message).not.toContain(url);
        expect(message).not.toContain(`${protocol}://`);
      }
    }

    // file: with matching host/database (credentials omitted — URL() rejects userinfo on file:)
    const fileUrl = `file://${EXPECTED.host}/${EXPECTED.database}`;
    const fileParsed = parseRemoteOperatorDatabaseUrl(fileUrl);
    expect(fileParsed.ok).toBe(false);
    if (!fileParsed.ok) {
      expect(fileParsed.code).toBe("unsupported_database_protocol");
    }
    const fileDecision = assertRemoteOperatorTargetAllowed(
      allowedInput({ databaseUrl: fileUrl }),
    );
    expect(fileDecision.ok).toBe(false);
    if (!fileDecision.ok) {
      expect(fileDecision.code).toBe("unsupported_database_protocol");
      expect(
        formatRemoteOperatorTargetRefusalMessage(fileDecision),
      ).not.toContain("file://");
    }
  });

  it("accepts postgresql: and postgres: protocols", () => {
    for (const scheme of ["postgresql", "postgres"] as const) {
      const parsed = parseRemoteOperatorDatabaseUrl(
        `${scheme}://postgres.${EXPECTED.projectRef}:secret@${EXPECTED.host}:6543/${EXPECTED.database}`,
      );
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.target.host).toBe(EXPECTED.host);
        expect(parsed.target.projectRef).toBe(EXPECTED.projectRef);
      }
    }
  });

  it("refuses DIRECT_URL with unsupported protocol", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({
        directUrl: `https://postgres.${EXPECTED.projectRef}:x@db.${EXPECTED.projectRef}.supabase.co:5432/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_database_protocol");
      expect(formatRemoteOperatorTargetRefusalMessage(decision)).not.toContain(
        "https://",
      );
    }
  });

  it("authorizes matching pooler target and never exposes secrets in safeSummary", () => {
    const decision = assertRemoteOperatorTargetAllowed(allowedInput());
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.safeSummary.validationStatus).toBe("authorized");
      expect(decision.safeSummary.host).toBe(EXPECTED.host);
      expect(decision.safeSummary.database).toBe(EXPECTED.database);
      expect(decision.safeSummary.projectRefPrefix).toBe("abcd…");
      expect(decision.safeSummary.projectRefPrefix).not.toBe(
        EXPECTED.projectRef,
      );
      const safeDump = JSON.stringify(decision.safeSummary);
      expect(safeDump).not.toContain("secret-password");
      expect(safeDump).not.toContain("postgresql://");
      expect(safeDump).not.toContain(EXPECTED.projectRef);
    }
  });

  it("does not authorize via FORCE or NODE_ENV", () => {
    const envBag = process.env as Record<string, string | undefined>;
    const previousForce = envBag.FORCE;
    const previousNodeEnv = envBag.NODE_ENV;
    try {
      envBag.FORCE = "1";
      envBag.NODE_ENV = "production";

      const decision = assertRemoteOperatorTargetAllowed(
        allowedInput({
          expectedHost: "wrong.example.com",
          databaseUrl: `postgresql://postgres.${EXPECTED.projectRef}:secret@${EXPECTED.host}:6543/${EXPECTED.database}`,
        }),
      );
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("host_mismatch");
      }

      // Guard input shape has no FORCE/NODE_ENV — env noise cannot authorize a mismatch.
      const authorized = assertRemoteOperatorTargetAllowed(allowedInput());
      expect(authorized.ok).toBe(true);
      expect(envBag.FORCE).toBe("1");
      expect(envBag.NODE_ENV).toBe("production");
    } finally {
      if (previousForce === undefined) {
        delete envBag.FORCE;
      } else {
        envBag.FORCE = previousForce;
      }
      if (previousNodeEnv === undefined) {
        delete envBag.NODE_ENV;
      } else {
        envBag.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("refusal messages contain no credentials or full URL", () => {
    const decision = assertRemoteOperatorTargetAllowed(
      allowedInput({
        databaseUrl: `postgresql://postgres.${EXPECTED.projectRef}:super-secret@${EXPECTED.host}:6543/${EXPECTED.database}`,
        expectedHost: "nope.example.com",
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      const message = formatRemoteOperatorTargetRefusalMessage(decision);
      expect(message).not.toContain("super-secret");
      expect(message).not.toContain("postgresql://");
      expect(message).not.toContain(`postgres.${EXPECTED.projectRef}`);
      expect(message).not.toContain(EXPECTED.projectRef);
    }
  });
});
