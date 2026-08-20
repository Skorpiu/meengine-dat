/**
 * Purpose-scoped migration-deploy target identity guard (DB-MIGRATION-001 / DEC-069).
 *
 * This module validates expected remote identity for `prisma migrate deploy`.
 * A successful decision grants ZERO write authority. Prisma may be spawned
 * only by the separate execution layer after `--execute`, TTY, unattended-host
 * refusal, and interactive confirmation.
 *
 * Do not treat {@link assertRemoteOperatorTargetAllowed} `ok: true` as
 * migration write authorization. That helper remains inspect-only.
 *
 * DIRECT_URL is required here because prisma/schema.prisma declares
 * `directUrl = env("DIRECT_URL")`. DIRECT_URL host is bound to
 * DAT_OPS_EXPECTED_DIRECT_DB_HOST and is never compared to
 * DAT_OPS_EXPECTED_DB_HOST: pooled DATABASE_URL and the direct
 * migration host may legitimately differ. The expected direct host is
 * never inferred from DATABASE_URL.
 */

import {
  REMOTE_OPS_EXPECTED_DB_HOST_ENV,
  REMOTE_OPS_EXPECTED_DB_NAME_ENV,
  REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV,
  formatProjectRefPrefix,
  parseRemoteOperatorDatabaseUrl,
  type RemoteOperatorParsedTarget,
} from "@/lib/ops/remote-operator-target-guard";

export const MIGRATION_DEPLOY_CONFIRMATION_PREFIX_LEN = 4;

export const REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV =
  "DAT_OPS_EXPECTED_DIRECT_DB_HOST";

export type MigrationDeployTargetRefusalCode =
  | "missing_expected_host"
  | "missing_expected_direct_host"
  | "missing_expected_database"
  | "missing_expected_project_ref"
  | "missing_database_url"
  | "malformed_database_url"
  | "unsupported_database_protocol"
  | "empty_host"
  | "host_mismatch"
  | "database_mismatch"
  | "project_ref_unextractable"
  | "project_ref_mismatch"
  | "missing_direct_url"
  | "malformed_direct_url"
  | "unsupported_direct_url_protocol"
  | "empty_direct_url_host"
  | "direct_url_host_mismatch"
  | "direct_url_database_mismatch"
  | "direct_url_project_ref_unextractable"
  | "direct_url_project_ref_mismatch";

export type MigrationDeployTargetSafeSummary = {
  databaseUrlHost: string | null;
  databaseUrlPort: string | null;
  directUrlHost: string | null;
  directUrlPort: string | null;
  database: string | null;
  projectRefPrefix: string | null;
  validationStatus: "refused" | "identity_matched";
};

export type MigrationDeployTargetRefusal = {
  ok: false;
  writeAuthority: false;
  code: MigrationDeployTargetRefusalCode;
  message: string;
  safeSummary: MigrationDeployTargetSafeSummary;
};

export type MigrationDeployTargetMatch = {
  ok: true;
  writeAuthority: false;
  databaseUrlTarget: RemoteOperatorParsedTarget;
  directUrlTarget: RemoteOperatorParsedTarget;
  confirmationPhrase: string;
  safeSummary: MigrationDeployTargetSafeSummary;
};

export type MigrationDeployTargetDecision =
  | MigrationDeployTargetMatch
  | MigrationDeployTargetRefusal;

export type MigrationDeployTargetGuardInput = {
  databaseUrl: string | undefined;
  directUrl: string | undefined;
  expectedHost: string | undefined;
  expectedDirectHost: string | undefined;
  expectedDatabase: string | undefined;
  expectedSupabaseProjectRef: string | undefined;
};

function unavailableSummary(): MigrationDeployTargetSafeSummary {
  return {
    databaseUrlHost: null,
    databaseUrlPort: null,
    directUrlHost: null,
    directUrlPort: null,
    database: null,
    projectRefPrefix: null,
    validationStatus: "refused",
  };
}

function redactHostProjectRef(
  host: string | null,
  projectRef: string | null,
): string | null {
  if (!host) return null;
  if (!projectRef) return host;
  const prefix = formatProjectRefPrefix(projectRef);
  if (!prefix) return host;
  return host.split(projectRef).join(prefix);
}

function redactHostProjectRefs(
  host: string | null,
  projectRefs: Array<string | null | undefined>,
): string | null {
  if (!host) return null;
  let redacted = host;
  for (const projectRef of projectRefs) {
    redacted = redactHostProjectRef(redacted, projectRef ?? null) ?? redacted;
  }
  return redacted;
}

function buildSafeSummary(input: {
  databaseUrlTarget?: RemoteOperatorParsedTarget;
  directUrlTarget?: RemoteOperatorParsedTarget;
  status: "refused" | "identity_matched";
}): MigrationDeployTargetSafeSummary {
  const projectRefs = [
    input.databaseUrlTarget?.projectRef,
    input.directUrlTarget?.projectRef,
  ];
  const projectRef =
    input.databaseUrlTarget?.projectRef ??
    input.directUrlTarget?.projectRef ??
    null;

  return {
    databaseUrlHost: redactHostProjectRefs(
      input.databaseUrlTarget?.host ?? null,
      projectRefs,
    ),
    databaseUrlPort: input.databaseUrlTarget?.port ?? null,
    directUrlHost: redactHostProjectRefs(
      input.directUrlTarget?.host ?? null,
      projectRefs,
    ),
    directUrlPort: input.directUrlTarget?.port ?? null,
    database:
      input.databaseUrlTarget?.database ??
      input.directUrlTarget?.database ??
      null,
    projectRefPrefix: formatProjectRefPrefix(projectRef),
    validationStatus: input.status,
  };
}

function refuse(
  code: MigrationDeployTargetRefusalCode,
  message: string,
  safeSummary: MigrationDeployTargetSafeSummary = unavailableSummary(),
): MigrationDeployTargetRefusal {
  return { ok: false, writeAuthority: false, code, message, safeSummary };
}

export function buildMigrationDeployConfirmationPhrase(input: {
  database: string;
  projectRef: string;
}): string {
  const database = input.database.trim();
  const projectRef = input.projectRef.trim().toLowerCase();
  const prefix = projectRef.slice(0, MIGRATION_DEPLOY_CONFIRMATION_PREFIX_LEN);
  return `MIGRATE ${database} ${prefix}`;
}

/**
 * Validates migration-deploy target identity. Never connects to a database.
 * Never spawns Prisma. Success is identity match only — not write authority.
 */
export function evaluateMigrationDeployTarget(
  input: MigrationDeployTargetGuardInput,
): MigrationDeployTargetDecision {
  const expectedHost = input.expectedHost?.trim().toLowerCase() ?? "";
  const expectedDirectHost =
    input.expectedDirectHost?.trim().toLowerCase() ?? "";
  const expectedDatabase = input.expectedDatabase?.trim() ?? "";
  const expectedProjectRef =
    input.expectedSupabaseProjectRef?.trim().toLowerCase() ?? "";

  if (!expectedHost) {
    return refuse(
      "missing_expected_host",
      `${REMOTE_OPS_EXPECTED_DB_HOST_ENV} is required. No database connection was performed. No Prisma process was spawned.`,
    );
  }
  if (!expectedDirectHost) {
    return refuse(
      "missing_expected_direct_host",
      `${REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV} is required. No database connection was performed. No Prisma process was spawned.`,
    );
  }
  if (!expectedDatabase) {
    return refuse(
      "missing_expected_database",
      `${REMOTE_OPS_EXPECTED_DB_NAME_ENV} is required. No database connection was performed. No Prisma process was spawned.`,
    );
  }
  if (!expectedProjectRef) {
    return refuse(
      "missing_expected_project_ref",
      `${REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV} is required. No database connection was performed. No Prisma process was spawned.`,
    );
  }

  const parsedDatabaseUrl = parseRemoteOperatorDatabaseUrl(input.databaseUrl);
  if (!parsedDatabaseUrl.ok) {
    const messages: Record<typeof parsedDatabaseUrl.code, string> = {
      missing_database_url:
        "DATABASE_URL is missing. No database connection was performed. No Prisma process was spawned.",
      malformed_database_url:
        "DATABASE_URL could not be parsed. No database connection was performed. No Prisma process was spawned.",
      unsupported_database_protocol:
        "DATABASE_URL must use postgresql: or postgres: protocol. No database connection was performed. No Prisma process was spawned.",
      empty_host:
        "DATABASE_URL has an empty host. No database connection was performed. No Prisma process was spawned.",
    };
    return refuse(parsedDatabaseUrl.code, messages[parsedDatabaseUrl.code]);
  }

  const databaseUrlTarget = parsedDatabaseUrl.target;
  const databaseUrlSummary = buildSafeSummary({
    databaseUrlTarget,
    status: "refused",
  });

  if (databaseUrlTarget.host !== expectedHost) {
    return refuse(
      "host_mismatch",
      `DATABASE_URL host does not match ${REMOTE_OPS_EXPECTED_DB_HOST_ENV}. No database connection was performed. No Prisma process was spawned.`,
      databaseUrlSummary,
    );
  }

  if (!databaseUrlTarget.database) {
    return refuse(
      "database_mismatch",
      "DATABASE_URL database name could not be determined. No database connection was performed. No Prisma process was spawned.",
      databaseUrlSummary,
    );
  }

  if (databaseUrlTarget.database !== expectedDatabase) {
    return refuse(
      "database_mismatch",
      `DATABASE_URL database does not match ${REMOTE_OPS_EXPECTED_DB_NAME_ENV}. No database connection was performed. No Prisma process was spawned.`,
      databaseUrlSummary,
    );
  }

  if (!databaseUrlTarget.projectRef) {
    return refuse(
      "project_ref_unextractable",
      "Supabase project reference could not be extracted from DATABASE_URL. No database connection was performed. No Prisma process was spawned.",
      databaseUrlSummary,
    );
  }

  if (databaseUrlTarget.projectRef !== expectedProjectRef) {
    return refuse(
      "project_ref_mismatch",
      `DATABASE_URL project reference does not match ${REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV}. No database connection was performed. No Prisma process was spawned.`,
      databaseUrlSummary,
    );
  }

  const directRaw = input.directUrl?.trim() ?? "";
  if (!directRaw) {
    return refuse(
      "missing_direct_url",
      "DIRECT_URL is required for migration deploy. No database connection was performed. No Prisma process was spawned.",
      databaseUrlSummary,
    );
  }

  const parsedDirectUrl = parseRemoteOperatorDatabaseUrl(directRaw);
  if (!parsedDirectUrl.ok) {
    if (parsedDirectUrl.code === "unsupported_database_protocol") {
      return refuse(
        "unsupported_direct_url_protocol",
        "DIRECT_URL must use postgresql: or postgres: protocol. No database connection was performed. No Prisma process was spawned.",
        databaseUrlSummary,
      );
    }
    if (parsedDirectUrl.code === "empty_host") {
      return refuse(
        "empty_direct_url_host",
        "DIRECT_URL has an empty host. No database connection was performed. No Prisma process was spawned.",
        databaseUrlSummary,
      );
    }
    return refuse(
      "malformed_direct_url",
      "DIRECT_URL could not be parsed safely. No database connection was performed. No Prisma process was spawned.",
      databaseUrlSummary,
    );
  }

  const directUrlTarget = parsedDirectUrl.target;
  const bothSummary = buildSafeSummary({
    databaseUrlTarget,
    directUrlTarget,
    status: "refused",
  });

  if (directUrlTarget.host !== expectedDirectHost) {
    return refuse(
      "direct_url_host_mismatch",
      `DIRECT_URL host does not match ${REMOTE_OPS_EXPECTED_DIRECT_DB_HOST_ENV}. No database connection was performed. No Prisma process was spawned.`,
      bothSummary,
    );
  }

  if (
    !directUrlTarget.database ||
    directUrlTarget.database !== expectedDatabase
  ) {
    return refuse(
      "direct_url_database_mismatch",
      "DIRECT_URL database does not match the expected database name. No database connection was performed. No Prisma process was spawned.",
      bothSummary,
    );
  }

  if (!directUrlTarget.projectRef) {
    return refuse(
      "direct_url_project_ref_unextractable",
      "Supabase project reference could not be extracted from DIRECT_URL. No database connection was performed. No Prisma process was spawned.",
      bothSummary,
    );
  }

  if (directUrlTarget.projectRef !== expectedProjectRef) {
    return refuse(
      "direct_url_project_ref_mismatch",
      "DIRECT_URL project reference does not match the expected Supabase project. No database connection was performed. No Prisma process was spawned.",
      bothSummary,
    );
  }

  return {
    ok: true,
    writeAuthority: false,
    databaseUrlTarget,
    directUrlTarget,
    confirmationPhrase: buildMigrationDeployConfirmationPhrase({
      database: databaseUrlTarget.database,
      projectRef: databaseUrlTarget.projectRef,
    }),
    safeSummary: buildSafeSummary({
      databaseUrlTarget,
      directUrlTarget,
      status: "identity_matched",
    }),
  };
}

export function formatMigrationDeployTargetSummary(
  decision: MigrationDeployTargetDecision,
): string {
  const statusLabel =
    decision.safeSummary.validationStatus === "identity_matched"
      ? "identity_matched (zero write authority)"
      : "refused";

  return [
    "Migration deploy target preflight",
    `status=${statusLabel}`,
    `databaseUrlHost=${decision.safeSummary.databaseUrlHost ?? "(unavailable)"}`,
    `databaseUrlPort=${decision.safeSummary.databaseUrlPort ?? "(default)"}`,
    `directUrlHost=${decision.safeSummary.directUrlHost ?? "(unavailable)"}`,
    `directUrlPort=${decision.safeSummary.directUrlPort ?? "(default)"}`,
    `database=${decision.safeSummary.database ?? "(unavailable)"}`,
    `projectRefPrefix=${decision.safeSummary.projectRefPrefix ?? "(unavailable)"}`,
    "No database connection was performed.",
    "No Prisma process was spawned by this preflight.",
  ].join("\n");
}

export function formatMigrationDeployTargetRefusalMessage(
  decision: MigrationDeployTargetRefusal,
): string {
  return [
    "Migration deploy target refused",
    decision.message,
    `code=${decision.code}`,
    formatMigrationDeployTargetSummary(decision),
  ].join("\n");
}
