/**
 * Fail-closed remote target identity guard for narrow operator inspect commands.
 *
 * Reuses URL parsing concepts from destructive-seed-safety but does **not**
 * authorize or weaken the local-only destructive seed path (DEC-062).
 *
 * This guard authorizes only application-level inspect-only tooling that
 * separately validates expected host / database / Supabase project ref.
 */

export const REMOTE_OPS_EXPECTED_DB_HOST_ENV = "DAT_OPS_EXPECTED_DB_HOST";
export const REMOTE_OPS_EXPECTED_DB_NAME_ENV = "DAT_OPS_EXPECTED_DB_NAME";
export const REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV =
  "DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF";

export type RemoteOperatorParsedTarget = {
  host: string;
  port: string | null;
  database: string | null;
  projectRef: string | null;
};

export type RemoteOperatorTargetRefusalCode =
  | "missing_database_url"
  | "malformed_database_url"
  | "unsupported_database_protocol"
  | "empty_host"
  | "missing_expected_host"
  | "missing_expected_database"
  | "missing_expected_project_ref"
  | "host_mismatch"
  | "database_mismatch"
  | "project_ref_unextractable"
  | "project_ref_mismatch"
  | "direct_url_malformed"
  | "direct_url_project_mismatch"
  | "direct_url_database_mismatch";

export type RemoteOperatorTargetRefusal = {
  ok: false;
  code: RemoteOperatorTargetRefusalCode;
  message: string;
  safeSummary: RemoteOperatorTargetSafeSummary;
};

export type RemoteOperatorTargetSafeSummary = {
  host: string | null;
  port: string | null;
  database: string | null;
  projectRefPrefix: string | null;
  validationStatus: "refused" | "authorized";
};

export type RemoteOperatorTargetAuthorization = {
  ok: true;
  target: RemoteOperatorParsedTarget;
  safeSummary: RemoteOperatorTargetSafeSummary;
};

export type RemoteOperatorTargetDecision =
  | RemoteOperatorTargetAuthorization
  | RemoteOperatorTargetRefusal;

const PROJECT_REF_PREFIX_LEN = 4;

function safeDecodeUsername(raw: string): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Extracts Supabase project ref from pooler username or direct host patterns.
 * Returns null when identity cannot be determined safely.
 */
export function extractSupabaseProjectRef(input: {
  host: string;
  username: string;
}): string | null {
  const username = safeDecodeUsername(input.username).trim();
  const poolerMatch = /^postgres\.([a-z0-9]+)$/i.exec(username);
  if (poolerMatch?.[1]) {
    return poolerMatch[1].toLowerCase();
  }

  const host = input.host.trim().toLowerCase();
  const directMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(host);
  if (directMatch?.[1]) {
    return directMatch[1].toLowerCase();
  }

  return null;
}

export function formatProjectRefPrefix(
  projectRef: string | null | undefined,
): string | null {
  if (!projectRef) return null;
  const normalized = projectRef.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.length <= PROJECT_REF_PREFIX_LEN) {
    return `${normalized}…`;
  }
  return `${normalized.slice(0, PROJECT_REF_PREFIX_LEN)}…`;
}

function buildUnavailableSummary(): RemoteOperatorTargetSafeSummary {
  return {
    host: null,
    port: null,
    database: null,
    projectRefPrefix: null,
    validationStatus: "refused",
  };
}

function buildSafeSummary(
  target: RemoteOperatorParsedTarget,
  status: "refused" | "authorized",
): RemoteOperatorTargetSafeSummary {
  return {
    host: target.host,
    port: target.port,
    database: target.database,
    projectRefPrefix: formatProjectRefPrefix(target.projectRef),
    validationStatus: status,
  };
}

const AUTHORIZED_DATABASE_PROTOCOLS = new Set(["postgresql:", "postgres:"]);

/**
 * Parses a Postgres URL into safe identity fields without logging secrets.
 * Only `postgresql:` and `postgres:` protocols are accepted.
 */
export function parseRemoteOperatorDatabaseUrl(
  databaseUrl: string | undefined,
):
  | { ok: true; target: RemoteOperatorParsedTarget }
  | {
      ok: false;
      code:
        | "missing_database_url"
        | "malformed_database_url"
        | "unsupported_database_protocol"
        | "empty_host";
    } {
  if (databaseUrl == null || databaseUrl.trim() === "") {
    return { ok: false, code: "missing_database_url" };
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    return { ok: false, code: "malformed_database_url" };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!AUTHORIZED_DATABASE_PROTOCOLS.has(protocol)) {
    return { ok: false, code: "unsupported_database_protocol" };
  }

  const host = parsed.hostname.trim().toLowerCase();
  if (!host) {
    return { ok: false, code: "empty_host" };
  }

  const pathname = parsed.pathname.replace(/^\//, "").trim();
  const database =
    pathname.length > 0 ? (pathname.split("/")[0] ?? null) : null;

  const port =
    parsed.port && parsed.port.trim() !== "" ? parsed.port.trim() : null;

  const username = safeDecodeUsername(parsed.username);
  const projectRef = extractSupabaseProjectRef({ host, username });

  return {
    ok: true,
    target: {
      host,
      port,
      database: database || null,
      projectRef,
    },
  };
}

function refuse(
  code: RemoteOperatorTargetRefusalCode,
  message: string,
  safeSummary: RemoteOperatorTargetSafeSummary = buildUnavailableSummary(),
): RemoteOperatorTargetRefusal {
  return { ok: false, code, message, safeSummary };
}

/**
 * Authorizes a remote inspect-only operator command against an expected identity.
 * Fail-closed. Never authorizes destructive seed. Never logs credentials.
 */
export function assertRemoteOperatorTargetAllowed(input: {
  databaseUrl: string | undefined;
  expectedHost: string | undefined;
  expectedDatabase: string | undefined;
  expectedSupabaseProjectRef: string | undefined;
  directUrl?: string | undefined;
}): RemoteOperatorTargetDecision {
  const expectedHost = input.expectedHost?.trim().toLowerCase() ?? "";
  const expectedDatabase = input.expectedDatabase?.trim() ?? "";
  const expectedProjectRef =
    input.expectedSupabaseProjectRef?.trim().toLowerCase() ?? "";

  if (!expectedHost) {
    return refuse(
      "missing_expected_host",
      `${REMOTE_OPS_EXPECTED_DB_HOST_ENV} is required. No database connection was performed.`,
    );
  }
  if (!expectedDatabase) {
    return refuse(
      "missing_expected_database",
      `${REMOTE_OPS_EXPECTED_DB_NAME_ENV} is required. No database connection was performed.`,
    );
  }
  if (!expectedProjectRef) {
    return refuse(
      "missing_expected_project_ref",
      `${REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV} is required. No database connection was performed.`,
    );
  }

  const parsed = parseRemoteOperatorDatabaseUrl(input.databaseUrl);
  if (!parsed.ok) {
    const messages: Record<typeof parsed.code, string> = {
      missing_database_url:
        "DATABASE_URL is missing. No database connection was performed.",
      malformed_database_url:
        "DATABASE_URL could not be parsed. No database connection was performed.",
      unsupported_database_protocol:
        "DATABASE_URL must use postgresql: or postgres: protocol. No database connection was performed.",
      empty_host:
        "DATABASE_URL has an empty host. No database connection was performed.",
    };
    return refuse(parsed.code, messages[parsed.code]);
  }

  const summary = buildSafeSummary(parsed.target, "refused");

  if (parsed.target.host !== expectedHost) {
    return refuse(
      "host_mismatch",
      `DATABASE_URL host does not match ${REMOTE_OPS_EXPECTED_DB_HOST_ENV}. No database connection was performed.`,
      summary,
    );
  }

  if (!parsed.target.database) {
    return refuse(
      "database_mismatch",
      "DATABASE_URL database name could not be determined. No database connection was performed.",
      summary,
    );
  }

  if (parsed.target.database !== expectedDatabase) {
    return refuse(
      "database_mismatch",
      `DATABASE_URL database does not match ${REMOTE_OPS_EXPECTED_DB_NAME_ENV}. No database connection was performed.`,
      summary,
    );
  }

  if (!parsed.target.projectRef) {
    return refuse(
      "project_ref_unextractable",
      "Supabase project reference could not be extracted from DATABASE_URL. No database connection was performed.",
      summary,
    );
  }

  if (parsed.target.projectRef !== expectedProjectRef) {
    return refuse(
      "project_ref_mismatch",
      `DATABASE_URL project reference does not match ${REMOTE_OPS_EXPECTED_SUPABASE_PROJECT_REF_ENV}. No database connection was performed.`,
      summary,
    );
  }

  const directRaw = input.directUrl?.trim();
  if (directRaw) {
    const directParsed = parseRemoteOperatorDatabaseUrl(directRaw);
    if (!directParsed.ok) {
      if (directParsed.code === "unsupported_database_protocol") {
        return refuse(
          "unsupported_database_protocol",
          "DIRECT_URL must use postgresql: or postgres: protocol. No database connection was performed.",
          summary,
        );
      }
      return refuse(
        "direct_url_malformed",
        "DIRECT_URL could not be parsed safely. No database connection was performed.",
        summary,
      );
    }

    if (
      !directParsed.target.projectRef ||
      directParsed.target.projectRef !== expectedProjectRef
    ) {
      return refuse(
        "direct_url_project_mismatch",
        "DIRECT_URL project reference does not match the expected Supabase project. No database connection was performed.",
        buildSafeSummary(directParsed.target, "refused"),
      );
    }

    if (
      !directParsed.target.database ||
      directParsed.target.database !== expectedDatabase
    ) {
      return refuse(
        "direct_url_database_mismatch",
        "DIRECT_URL database does not match the expected database name. No database connection was performed.",
        buildSafeSummary(directParsed.target, "refused"),
      );
    }
  }

  return {
    ok: true,
    target: parsed.target,
    safeSummary: buildSafeSummary(parsed.target, "authorized"),
  };
}

export function formatRemoteOperatorTargetRefusalMessage(
  decision: RemoteOperatorTargetRefusal,
): string {
  const parts = [
    "Remote operator target refused",
    decision.message,
    `code=${decision.code}`,
    `host=${decision.safeSummary.host ?? "(unavailable)"}`,
    `port=${decision.safeSummary.port ?? "(default)"}`,
    `database=${decision.safeSummary.database ?? "(unavailable)"}`,
    `projectRefPrefix=${decision.safeSummary.projectRefPrefix ?? "(unavailable)"}`,
  ];
  return parts.join("\n");
}
