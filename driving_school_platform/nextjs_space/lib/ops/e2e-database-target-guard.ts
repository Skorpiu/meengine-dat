/**
 * Purpose-scoped browser-E2E database target guard (TEST-HYGIENE-001).
 *
 * Validates the disposable local E2E Postgres identity before any orchestrator
 * mutation. Success is identity match only for this dedicated purpose.
 * It is not ordinary local-development authorization (DEC-068), not remote
 * migration-deploy authorization (DEC-069), and not the DEC-070 integration
 * identity.
 *
 * `CI`, `GITLAB_CI`, `NODE_ENV`, and `VERCEL` never expand the allowlist.
 * Application `.env` files are never target authority.
 * Never prints credentials or complete URLs.
 */

import {
  E2E_DATABASE_NAME,
  E2E_DATABASE_PASSWORD,
  E2E_DATABASE_USER,
  E2E_LOCAL_HOST,
  E2E_LOCAL_PORT,
  buildCanonicalE2eDatabaseUrl,
  formatRedactedE2eDatabaseTarget,
} from "@/lib/ops/e2e-database-contract";

const ACCEPTED_POSTGRES_PROTOCOLS = new Set(["postgresql:", "postgres:"]);

export type E2eDatabaseTargetRefusalCode =
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
  | "wrong_password"
  | "incompatible_url_pair"
  | "application_database_url_not_authority";

export type E2eDatabaseTargetSafeSummary = {
  host: string | null;
  port: string | null;
  database: string | null;
  user: string | null;
  validationStatus: "refused" | "identity_matched";
};

export type E2eDatabaseTargetRefusal = {
  ok: false;
  writeAuthority: false;
  code: E2eDatabaseTargetRefusalCode;
  message: string;
  safeSummary: E2eDatabaseTargetSafeSummary;
};

export type E2eDatabaseTargetMatch = {
  ok: true;
  writeAuthority: false;
  validatedUrl: string;
  redactedTarget: string;
  safeSummary: E2eDatabaseTargetSafeSummary;
};

export type E2eDatabaseTargetDecision =
  | E2eDatabaseTargetMatch
  | E2eDatabaseTargetRefusal;

export type E2eDatabaseTargetGuardEnv = {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  CI?: string;
  GITLAB_CI?: string;
  NODE_ENV?: string;
  VERCEL?: string;
};

export type E2eDatabaseTargetGuardInput = {
  databaseUrl: string | undefined;
  directUrl: string | undefined;
  applicationDatabaseUrl?: string | undefined;
  ci?: string | undefined;
  gitlabCi?: string | undefined;
  nodeEnv?: string | undefined;
  vercel?: string | undefined;
};

const BLOCK_MESSAGES: Record<E2eDatabaseTargetRefusalCode, string> = {
  malformed_url:
    "Browser E2E database target blocked a malformed database URL.",
  unsupported_protocol:
    "Browser E2E database target blocked a non-PostgreSQL protocol.",
  empty_host: "Browser E2E database target blocked a URL with an empty host.",
  unexpected_url_query:
    "Browser E2E database target blocked unexpected URL query parameters.",
  supabase_hostname: "Browser E2E database target blocked a Supabase hostname.",
  rfc1918_address:
    "Browser E2E database target blocked a private RFC1918 address.",
  localhost_outside_contract:
    "Browser E2E database target blocked a localhost form outside the exact local contract.",
  host_docker_internal:
    "Browser E2E database target blocked host.docker.internal.",
  generic_postgres_hostname:
    "Browser E2E database target blocked the generic postgres hostname.",
  hosted_or_public_hostname:
    "Browser E2E database target blocked a public or hosted hostname.",
  wrong_host: "Browser E2E database target blocked a host identity mismatch.",
  wrong_port: "Browser E2E database target blocked a port identity mismatch.",
  wrong_user: "Browser E2E database target blocked a user identity mismatch.",
  wrong_database:
    "Browser E2E database target blocked a database identity mismatch.",
  wrong_password:
    "Browser E2E database target blocked a password identity mismatch.",
  incompatible_url_pair:
    "Browser E2E database target blocked incompatible DATABASE_URL and DIRECT_URL identities.",
  application_database_url_not_authority:
    "Application DATABASE_URL is not browser-E2E target authority.",
};

function unavailableSummary(): E2eDatabaseTargetSafeSummary {
  return {
    host: null,
    port: null,
    database: null,
    user: null,
    validationStatus: "refused",
  };
}

function refuse(
  code: E2eDatabaseTargetRefusalCode,
  safeSummary: E2eDatabaseTargetSafeSummary = unavailableSummary(),
): E2eDatabaseTargetRefusal {
  return {
    ok: false,
    writeAuthority: false,
    code,
    message: BLOCK_MESSAGES[code],
    safeSummary,
  };
}

export function readE2eDatabaseTargetGuardInput(
  env: E2eDatabaseTargetGuardEnv,
): E2eDatabaseTargetGuardInput {
  return {
    databaseUrl: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
    applicationDatabaseUrl: env.DATABASE_URL,
    ci: env.CI,
    gitlabCi: env.GITLAB_CI,
    nodeEnv: env.NODE_ENV,
    vercel: env.VERCEL,
  };
}

export function formatE2eDatabaseTargetRefusalMessage(
  decision: E2eDatabaseTargetRefusal,
): string {
  return [
    "Browser E2E database target refused",
    decision.message,
    `code=${decision.code}`,
    `host=${decision.safeSummary.host ?? "(unavailable)"}`,
    `port=${decision.safeSummary.port ?? "(unavailable)"}`,
    `database=${decision.safeSummary.database ?? "(unavailable)"}`,
    `user=${decision.safeSummary.user ?? "(unavailable)"}`,
    "No database connection was performed by this guard.",
  ].join("\n");
}

type ParsedE2eUrl = {
  protocol: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

type ParseUrlResult =
  | { ok: true; parsed: ParsedE2eUrl }
  | { ok: false; code: E2eDatabaseTargetRefusalCode };

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

function classifyUnexpectedHost(host: string): E2eDatabaseTargetRefusalCode {
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

function parseE2eDatabaseUrl(rawUrl: string): ParseUrlResult {
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
  parsed: ParsedE2eUrl | null,
  status: "refused" | "identity_matched",
): E2eDatabaseTargetSafeSummary {
  return {
    host: parsed?.host ?? null,
    port: parsed?.port || null,
    database: parsed?.database || null,
    user: parsed?.user || null,
    validationStatus: status,
  };
}

function expectedIdentity(): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  return {
    host: E2E_LOCAL_HOST,
    port: String(E2E_LOCAL_PORT),
    user: E2E_DATABASE_USER,
    password: E2E_DATABASE_PASSWORD,
    database: E2E_DATABASE_NAME,
  };
}

function parsedIdentityKey(parsed: ParsedE2eUrl): string {
  return `${parsed.host}|${parsed.port}|${parsed.user}|${parsed.database}`;
}

function matchParsedUrl(parsed: ParsedE2eUrl): E2eDatabaseTargetDecision {
  const expected = expectedIdentity();
  const refusedSummary = unavailableSummary();

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
    validatedUrl: buildCanonicalE2eDatabaseUrl(),
    redactedTarget: formatRedactedE2eDatabaseTarget(),
    safeSummary: summaryFromParsed(parsed, "identity_matched"),
  };
}

/**
 * Asserts the disposable browser-E2E database identity. Never connects.
 * Ambient CI/host flags are ignored and never expand the allowlist.
 *
 * When both DATABASE_URL and DIRECT_URL candidates are provided, they must
 * describe the same exact local E2E identity. Application env is not authority:
 * the orchestrator constructs the canonical URL and injects it after a match.
 */
export function evaluateE2eDatabaseTarget(
  input: E2eDatabaseTargetGuardInput,
): E2eDatabaseTargetDecision {
  void input.ci;
  void input.gitlabCi;
  void input.nodeEnv;
  void input.vercel;
  void input.applicationDatabaseUrl;

  const databaseUrl = input.databaseUrl?.trim() ?? "";
  const directUrl = input.directUrl?.trim() ?? "";

  if (!databaseUrl && !directUrl) {
    const constructed = buildCanonicalE2eDatabaseUrl();
    const parsed = parseE2eDatabaseUrl(constructed);
    if (!parsed.ok) {
      return refuse(parsed.code);
    }
    return matchParsedUrl(parsed.parsed);
  }

  if (databaseUrl && directUrl) {
    const parsedDatabase = parseE2eDatabaseUrl(databaseUrl);
    if (!parsedDatabase.ok) {
      return refuse(parsedDatabase.code);
    }
    const parsedDirect = parseE2eDatabaseUrl(directUrl);
    if (!parsedDirect.ok) {
      return refuse(parsedDirect.code);
    }
    if (
      parsedIdentityKey(parsedDatabase.parsed) !==
      parsedIdentityKey(parsedDirect.parsed)
    ) {
      return refuse("incompatible_url_pair");
    }
    return matchParsedUrl(parsedDatabase.parsed);
  }

  const single = databaseUrl || directUrl;
  const parsed = parseE2eDatabaseUrl(single);
  if (!parsed.ok) {
    return refuse(parsed.code);
  }
  return matchParsedUrl(parsed.parsed);
}
