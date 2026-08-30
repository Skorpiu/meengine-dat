/**
 * Purpose-scoped integration-database target guard (TEST-ARCH-001 / DEC-070).
 *
 * Validates the disposable integration Postgres identity before any harness
 * mutation. Success is identity match only for this dedicated purpose.
 * It is not ordinary local-development authorization (DEC-068) and not remote
 * migration-deploy authorization (DEC-069).
 *
 * `CI`, `GITLAB_CI`, `NODE_ENV`, and `VERCEL` never expand the allowlist.
 * Application `DATABASE_URL` / `DIRECT_URL` are never target authority.
 * Never prints credentials or complete URLs.
 */

import {
  INTEGRATION_CI_HOST,
  INTEGRATION_CI_PORT,
  INTEGRATION_DATABASE_NAME,
  INTEGRATION_DATABASE_PASSWORD,
  INTEGRATION_DATABASE_USER,
  INTEGRATION_LOCAL_HOST,
  INTEGRATION_LOCAL_PORT,
  INTEGRATION_PROVISION_LOCAL_COMPOSE,
  buildCanonicalIntegrationDatabaseUrl,
  formatRedactedIntegrationDatabaseTarget,
  isIntegrationProvisionMode,
  type IntegrationProvisionMode,
} from "@/lib/ops/integration-database-contract";

const ACCEPTED_POSTGRES_PROTOCOLS = new Set(["postgresql:", "postgres:"]);

export type IntegrationDatabaseTargetRefusalCode =
  | "missing_provision_mode"
  | "unexpected_provision_mode"
  | "missing_integration_database_url"
  | "application_database_url_not_authority"
  | "malformed_url"
  | "unsupported_protocol"
  | "empty_host"
  | "unexpected_url_query"
  | "supabase_hostname"
  | "rfc1918_address"
  | "localhost_outside_contract"
  | "host_docker_internal"
  | "generic_postgres_hostname"
  | "hosted_or_public_hostname"
  | "wrong_host"
  | "wrong_port"
  | "wrong_user"
  | "wrong_database"
  | "wrong_password";

export type IntegrationDatabaseTargetSafeSummary = {
  provisionMode: string | null;
  host: string | null;
  port: string | null;
  database: string | null;
  user: string | null;
  validationStatus: "refused" | "identity_matched";
};

export type IntegrationDatabaseTargetRefusal = {
  ok: false;
  writeAuthority: false;
  code: IntegrationDatabaseTargetRefusalCode;
  message: string;
  safeSummary: IntegrationDatabaseTargetSafeSummary;
};

export type IntegrationDatabaseTargetMatch = {
  ok: true;
  writeAuthority: false;
  provisionMode: IntegrationProvisionMode;
  validatedUrl: string;
  redactedTarget: string;
  safeSummary: IntegrationDatabaseTargetSafeSummary;
};

export type IntegrationDatabaseTargetDecision =
  | IntegrationDatabaseTargetMatch
  | IntegrationDatabaseTargetRefusal;

/**
 * Environment snapshot accepted by the guard. Ambient CI/host flags are listed
 * so callers can pass a realistic env object; they are never authorization.
 */
export type IntegrationDatabaseTargetGuardEnv = {
  INTEGRATION_DATABASE_URL?: string;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  DAT_INTEGRATION_PROVISION_MODE?: string;
  CI?: string;
  GITLAB_CI?: string;
  NODE_ENV?: string;
  VERCEL?: string;
};

export type IntegrationDatabaseTargetGuardInput = {
  provisionMode: string | undefined;
  integrationDatabaseUrl: string | undefined;
  applicationDatabaseUrl?: string | undefined;
  applicationDirectUrl?: string | undefined;
  ci?: string | undefined;
  gitlabCi?: string | undefined;
  nodeEnv?: string | undefined;
  vercel?: string | undefined;
};

const BLOCK_MESSAGES: Record<IntegrationDatabaseTargetRefusalCode, string> = {
  missing_provision_mode:
    "Integration database target requires an explicit provision mode.",
  unexpected_provision_mode:
    "Integration database target refused an unexpected provision mode.",
  missing_integration_database_url:
    "CI external integration mode requires INTEGRATION_DATABASE_URL.",
  application_database_url_not_authority:
    "Application DATABASE_URL is not integration target authority.",
  malformed_url:
    "Integration database target blocked a malformed database URL.",
  unsupported_protocol:
    "Integration database target blocked a non-PostgreSQL protocol.",
  empty_host: "Integration database target blocked a URL with an empty host.",
  unexpected_url_query:
    "Integration database target blocked unexpected URL query parameters.",
  supabase_hostname: "Integration database target blocked a Supabase hostname.",
  rfc1918_address:
    "Integration database target blocked a private RFC1918 address.",
  localhost_outside_contract:
    "Integration database target blocked a localhost form outside the exact local contract.",
  host_docker_internal:
    "Integration database target blocked host.docker.internal.",
  generic_postgres_hostname:
    "Integration database target blocked the generic postgres hostname.",
  hosted_or_public_hostname:
    "Integration database target blocked a public or hosted hostname.",
  wrong_host: "Integration database target blocked a host identity mismatch.",
  wrong_port: "Integration database target blocked a port identity mismatch.",
  wrong_user: "Integration database target blocked a user identity mismatch.",
  wrong_database:
    "Integration database target blocked a database identity mismatch.",
  wrong_password:
    "Integration database target blocked a password identity mismatch.",
};

function unavailableSummary(
  provisionMode: string | null = null,
): IntegrationDatabaseTargetSafeSummary {
  return {
    provisionMode,
    host: null,
    port: null,
    database: null,
    user: null,
    validationStatus: "refused",
  };
}

function refuse(
  code: IntegrationDatabaseTargetRefusalCode,
  safeSummary: IntegrationDatabaseTargetSafeSummary = unavailableSummary(),
): IntegrationDatabaseTargetRefusal {
  return {
    ok: false,
    writeAuthority: false,
    code,
    message: BLOCK_MESSAGES[code],
    safeSummary,
  };
}

export function readIntegrationDatabaseTargetGuardInput(
  env: IntegrationDatabaseTargetGuardEnv,
  provisionMode: string | undefined,
): IntegrationDatabaseTargetGuardInput {
  return {
    provisionMode,
    integrationDatabaseUrl: env.INTEGRATION_DATABASE_URL,
    applicationDatabaseUrl: env.DATABASE_URL,
    applicationDirectUrl: env.DIRECT_URL,
    ci: env.CI,
    gitlabCi: env.GITLAB_CI,
    nodeEnv: env.NODE_ENV,
    vercel: env.VERCEL,
  };
}

export function formatIntegrationDatabaseTargetRefusalMessage(
  decision: IntegrationDatabaseTargetRefusal,
): string {
  return [
    "Integration database target refused",
    decision.message,
    `code=${decision.code}`,
    `provisionMode=${decision.safeSummary.provisionMode ?? "(unavailable)"}`,
    `host=${decision.safeSummary.host ?? "(unavailable)"}`,
    `port=${decision.safeSummary.port ?? "(unavailable)"}`,
    `database=${decision.safeSummary.database ?? "(unavailable)"}`,
    `user=${decision.safeSummary.user ?? "(unavailable)"}`,
    "No database connection was performed by this guard.",
  ].join("\n");
}

type ParsedIntegrationUrl = {
  protocol: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

type ParseUrlResult =
  | { ok: true; parsed: ParsedIntegrationUrl }
  | { ok: false; code: IntegrationDatabaseTargetRefusalCode };

function normalizeHostname(host: string): string {
  const normalized = host.trim().toLowerCase();
  if (
    normalized.startsWith("[") &&
    normalized.endsWith("]") &&
    normalized.length > 2
  ) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function isRfc1918Ipv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet > 255)) {
    return false;
  }
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isSupabaseHostname(host: string): boolean {
  return (
    host === "supabase.co" ||
    host === "supabase.com" ||
    host.endsWith(".supabase.co") ||
    host.endsWith(".supabase.com") ||
    host.includes("pooler.supabase.")
  );
}

function isLocalhostForm(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

function classifyUnexpectedHost(
  host: string,
): IntegrationDatabaseTargetRefusalCode {
  if (host === "host.docker.internal") {
    return "host_docker_internal";
  }
  if (host === "postgres") {
    return "generic_postgres_hostname";
  }
  if (isLocalhostForm(host)) {
    return "localhost_outside_contract";
  }
  if (isSupabaseHostname(host)) {
    return "supabase_hostname";
  }
  if (isRfc1918Ipv4(host)) {
    return "rfc1918_address";
  }
  return "hosted_or_public_hostname";
}

function parseIntegrationDatabaseUrl(rawUrl: string): ParseUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, code: "malformed_url" };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!ACCEPTED_POSTGRES_PROTOCOLS.has(protocol)) {
    return { ok: false, code: "unsupported_protocol" };
  }

  const host = normalizeHostname(parsed.hostname);
  if (!host) {
    return { ok: false, code: "empty_host" };
  }

  const params = [...parsed.searchParams.entries()];
  const queryAllowed =
    params.length === 0 ||
    (params.length === 1 &&
      params[0]?.[0] === "schema" &&
      params[0]?.[1] === "public");
  if (!queryAllowed || parsed.hash) {
    return { ok: false, code: "unexpected_url_query" };
  }

  const pathname = parsed.pathname.replace(/^\//, "").trim();
  const database = pathname.split("/")[0] ?? "";

  return {
    ok: true,
    parsed: {
      protocol,
      host,
      port: parsed.port,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
    },
  };
}

function summaryFromParsed(
  provisionMode: string | null,
  parsed: ParsedIntegrationUrl | null,
  status: "refused" | "identity_matched",
): IntegrationDatabaseTargetSafeSummary {
  return {
    provisionMode,
    host: parsed?.host ?? null,
    port: parsed?.port || null,
    database: parsed?.database || null,
    user: parsed?.user || null,
    validationStatus: status,
  };
}

function expectedIdentity(mode: IntegrationProvisionMode): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  return {
    host:
      mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
        ? INTEGRATION_LOCAL_HOST
        : INTEGRATION_CI_HOST,
    port: String(
      mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
        ? INTEGRATION_LOCAL_PORT
        : INTEGRATION_CI_PORT,
    ),
    user: INTEGRATION_DATABASE_USER,
    password: INTEGRATION_DATABASE_PASSWORD,
    database: INTEGRATION_DATABASE_NAME,
  };
}

function matchParsedUrl(
  mode: IntegrationProvisionMode,
  parsed: ParsedIntegrationUrl,
): IntegrationDatabaseTargetDecision {
  const expected = expectedIdentity(mode);
  const refusedSummary = unavailableSummary(mode);

  if (parsed.host !== expected.host) {
    return refuse(classifyUnexpectedHost(parsed.host), refusedSummary);
  }
  if (parsed.port !== expected.port) {
    return refuse("wrong_port", refusedSummary);
  }
  if (parsed.user !== expected.user) {
    return refuse("wrong_user", refusedSummary);
  }
  if (parsed.database !== expected.database) {
    return refuse("wrong_database", refusedSummary);
  }
  if (parsed.password !== expected.password) {
    return refuse("wrong_password", refusedSummary);
  }

  return {
    ok: true,
    writeAuthority: false,
    provisionMode: mode,
    validatedUrl: buildCanonicalIntegrationDatabaseUrl(mode),
    redactedTarget: formatRedactedIntegrationDatabaseTarget(mode),
    safeSummary: summaryFromParsed(mode, parsed, "identity_matched"),
  };
}

/**
 * Asserts the disposable integration-database identity. Never connects.
 * Ambient CI/host flags are ignored and never expand the allowlist.
 */
export function evaluateIntegrationDatabaseTarget(
  input: IntegrationDatabaseTargetGuardInput,
): IntegrationDatabaseTargetDecision {
  // Listed on the input type so callers can pass realistic env snapshots.
  // They must not be read as authorization.
  void input.ci;
  void input.gitlabCi;
  void input.nodeEnv;
  void input.vercel;
  void input.applicationDirectUrl;

  const provisionMode = input.provisionMode?.trim() ?? "";
  if (!provisionMode) {
    return refuse("missing_provision_mode");
  }
  if (!isIntegrationProvisionMode(provisionMode)) {
    return refuse(
      "unexpected_provision_mode",
      unavailableSummary(provisionMode),
    );
  }

  if (provisionMode === INTEGRATION_PROVISION_LOCAL_COMPOSE) {
    const constructed = buildCanonicalIntegrationDatabaseUrl(provisionMode);
    const parsed = parseIntegrationDatabaseUrl(constructed);
    if (!parsed.ok) {
      return refuse(parsed.code, unavailableSummary(provisionMode));
    }
    return matchParsedUrl(provisionMode, parsed.parsed);
  }

  const integrationUrl = input.integrationDatabaseUrl?.trim() ?? "";
  if (!integrationUrl) {
    const code = input.applicationDatabaseUrl?.trim()
      ? "application_database_url_not_authority"
      : "missing_integration_database_url";
    return refuse(code, unavailableSummary(provisionMode));
  }

  const parsed = parseIntegrationDatabaseUrl(integrationUrl);
  if (!parsed.ok) {
    return refuse(parsed.code, unavailableSummary(provisionMode));
  }
  return matchParsedUrl(provisionMode, parsed.parsed);
}
