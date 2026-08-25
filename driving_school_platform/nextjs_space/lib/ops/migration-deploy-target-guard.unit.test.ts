import { describe, expect, it } from "vitest";

import {
  REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV,
  buildMigrationDeployConfirmationPhrase,
  evaluateMigrationDeployTarget,
  formatMigrationDeployTargetRefusalMessage,
  formatMigrationDeployTargetSummary,
} from "@/lib/ops/migration-deploy-target-guard";
import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  assertRemoteOperatorTargetAllowed,
} from "@/lib/ops/remote-operator-target-guard";

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

function matchingInput(
  overrides: Partial<{
    databaseUrl: string | undefined;
    directUrl: string | undefined;
    expectedHost: string | undefined;
    expectedDirectHost: string | undefined;
    expectedDatabase: string | undefined;
    expectedSupabaseProjectRef: string | undefined;
  }> = {},
) {
  return {
    databaseUrl: POOLER_URL,
    directUrl: DIRECT_URL,
    expectedHost: EXPECTED.host,
    expectedDirectHost: EXPECTED.directHost,
    expectedDatabase: EXPECTED.database,
    expectedSupabaseProjectRef: EXPECTED.projectRef,
    ...overrides,
  };
}

function assertNoSecrets(text: string): void {
  expect(text).not.toContain(SECRET);
  expect(text).not.toContain(POOLER_URL);
  expect(text).not.toContain(DIRECT_URL);
  expect(text).not.toContain(HOSTILE_DIRECT_URL);
  expect(text).not.toContain("postgresql://");
  expect(text).not.toContain(EXPECTED.projectRef);
}

describe("migration-deploy-target-guard", () => {
  it("refuses missing expected host", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedHost: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_host");
      expect(decision.writeAuthority).toBe(false);
      expect(decision.message).toContain(REMOTE_OPS_EXPECTED_DB_HOST_ENV);
      assertNoSecrets(formatMigrationDeployTargetRefusalMessage(decision));
    }
  });

  it("refuses missing expected DIRECT_URL host", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedDirectHost: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_direct_host");
      expect(decision.writeAuthority).toBe(false);
      expect(decision.message).toContain(
        REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV,
      );
      assertNoSecrets(formatMigrationDeployTargetRefusalMessage(decision));
    }
  });

  it("refuses missing expected database", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedDatabase: "  " }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_database");
      expect(decision.message).toContain(REMOTE_OPS_EXPECTED_DB_NAME_ENV);
    }
  });

  it("refuses missing expected project ref", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedSupabaseProjectRef: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_expected_project_ref");
      expect(decision.message).toContain(
        REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
      );
    }
  });

  it("refuses missing DATABASE_URL", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ databaseUrl: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_database_url");
      assertNoSecrets(decision.message);
    }
  });

  it("refuses malformed DATABASE_URL", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ databaseUrl: "not-a-url" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_database_url");
    }
  });

  it("refuses unsupported DATABASE_URL protocol", () => {
    const url = `https://postgres.${EXPECTED.projectRef}:${SECRET}@${EXPECTED.host}:6543/${EXPECTED.database}`;
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ databaseUrl: url }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_database_protocol");
      const message = formatMigrationDeployTargetRefusalMessage(decision);
      expect(message).not.toContain("https://");
      expect(message).not.toContain(url);
      assertNoSecrets(message);
    }
  });

  it("refuses DATABASE_URL host mismatch", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedHost: "other.example.com" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("host_mismatch");
      assertNoSecrets(formatMigrationDeployTargetRefusalMessage(decision));
    }
  });

  it("refuses DATABASE_URL database mismatch", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedDatabase: "otherdb" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("database_mismatch");
    }
  });

  it("refuses unextractable DATABASE_URL project ref", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({
        databaseUrl: `postgresql://postgres:${SECRET}@${EXPECTED.host}:6543/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("project_ref_unextractable");
    }
  });

  it("refuses DATABASE_URL project ref mismatch", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ expectedSupabaseProjectRef: "zzzzzzzzzzzzzzzz" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("project_ref_mismatch");
      expect(decision.safeSummary.projectRefPrefix).toBe("abcd…");
      assertNoSecrets(formatMigrationDeployTargetRefusalMessage(decision));
    }
  });

  it("refuses missing DIRECT_URL", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ directUrl: undefined }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("missing_direct_url");
    }
  });

  it("refuses malformed DIRECT_URL", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ directUrl: "not-a-url" }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("malformed_direct_url");
    }
  });

  it("refuses unsupported DIRECT_URL protocol", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({
        directUrl: `https://postgres:${SECRET}@db.${EXPECTED.projectRef}.supabase.co:5432/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("unsupported_direct_url_protocol");
      expect(formatMigrationDeployTargetRefusalMessage(decision)).not.toContain(
        "https://",
      );
    }
  });

  it("refuses DIRECT_URL database mismatch", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({
        directUrl: `postgresql://postgres:${SECRET}@db.${EXPECTED.projectRef}.supabase.co:5432/otherdb`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("direct_url_database_mismatch");
    }
  });

  it("refuses DIRECT_URL project-ref mismatch", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({
        directUrl: `postgresql://postgres.otherprojectrefxx:${SECRET}@${EXPECTED.directHost}:5432/${EXPECTED.database}`,
      }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("direct_url_project_ref_mismatch");
      const message = formatMigrationDeployTargetRefusalMessage(decision);
      assertNoSecrets(message);
      expect(message).not.toContain("otherprojectrefxx");
    }
  });

  it("refuses DIRECT_URL whose project-ref username matches but host does not", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({ directUrl: HOSTILE_DIRECT_URL }),
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("direct_url_host_mismatch");
      expect(decision.writeAuthority).toBe(false);
      expect(decision.message).toContain(
        REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV,
      );
      const message = formatMigrationDeployTargetRefusalMessage(decision);
      assertNoSecrets(message);
      expect(message).not.toContain("wrong.example.com:5432");
    }
  });

  it("compares DIRECT_URL host with the same lowercase hostname normalization as URL parsing", () => {
    const decision = evaluateMigrationDeployTarget(
      matchingInput({
        expectedDirectHost: "DB.ABCDEFGHIJKLMNOP.SUPABASE.CO",
      }),
    );
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.directUrlTarget.host).toBe(EXPECTED.directHost);
      expect(decision.writeAuthority).toBe(false);
    }
  });

  it("accepts a compatible DIRECT_URL whose host differs from DAT_OPS_EXPECTED_DB_HOST", () => {
    const decision = evaluateMigrationDeployTarget(matchingInput());
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.databaseUrlTarget.host).toBe(EXPECTED.host);
      expect(decision.directUrlTarget.host).toBe(EXPECTED.directHost);
      expect(decision.directUrlTarget.host).not.toBe(EXPECTED.host);
      expect(decision.writeAuthority).toBe(false);
    }
  });

  it("matches a valid pooled + direct target and redacts the summary", () => {
    const decision = evaluateMigrationDeployTarget(matchingInput());
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.safeSummary.validationStatus).toBe("identity_matched");
      expect(decision.safeSummary.databaseUrlHost).toBe(EXPECTED.host);
      expect(decision.safeSummary.database).toBe(EXPECTED.database);
      expect(decision.safeSummary.projectRefPrefix).toBe("abcd…");
      expect(decision.safeSummary.directUrlHost).toBe("db.abcd….supabase.co");
      expect(decision.confirmationPhrase).toBe("MIGRATE postgres abcd");
      expect(decision.writeAuthority).toBe(false);

      const summary = formatMigrationDeployTargetSummary(decision);
      assertNoSecrets(summary);
      expect(summary).toContain("identity_matched (zero write authority)");
      expect(JSON.stringify(decision.safeSummary)).not.toContain(SECRET);
      expect(JSON.stringify(decision.safeSummary)).not.toContain(
        EXPECTED.projectRef,
      );
    }
  });

  it("does not treat inspect-only authorization as migration write authority", () => {
    const inspect = assertRemoteOperatorTargetAllowed({
      databaseUrl: POOLER_URL,
      expectedHost: EXPECTED.host,
      expectedDatabase: EXPECTED.database,
      expectedSupabaseProjectRef: EXPECTED.projectRef,
      directUrl: DIRECT_URL,
    });
    expect(inspect.ok).toBe(true);

    const migration = evaluateMigrationDeployTarget(matchingInput());
    expect(migration.ok).toBe(true);
    if (migration.ok) {
      expect(migration.writeAuthority).toBe(false);
    }
  });

  it("builds a confirmation phrase from database + project-ref prefix only", () => {
    expect(
      buildMigrationDeployConfirmationPhrase({
        database: "postgres",
        projectRef: EXPECTED.projectRef,
      }),
    ).toBe("MIGRATE postgres abcd");
  });
});
