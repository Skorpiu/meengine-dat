/**
 * Fail-closed local-development database target guard (CONFIG-ENV-001 / DEC-068).
 *
 * Ordinary repository-local workflows must use a loopback Postgres target.
 * CI is not authorization for a remote database. The only hosted exemption in
 * this slice is Vercel (`VERCEL=1`). Remote operator access remains a separate
 * explicit operator-profile + identity-guard path.
 *
 * Pure / testable: does not read files, does not connect to a database, and
 * does not print credentials, hostnames, or complete URLs.
 */

import {
  isLocalDestructiveSeedHost,
  parseDatabaseTarget,
} from "@/lib/ops/destructive-seed-safety";

const ACCEPTED_POSTGRES_PROTOCOLS = new Set(["postgresql:", "postgres:"]);

export type LocalDevelopmentDatabaseGuardInput = {
  databaseUrl: string | undefined;
  directUrl?: string | undefined;
  vercel?: string | undefined;
};

/**
 * Environment snapshot accepted by {@link readLocalDevelopmentDatabaseGuardInput}.
 * `CI`, `GITLAB_CI`, and `NODE_ENV` are listed so callers can pass a realistic
 * env object; they are never authorization for a remote database.
 */
export type LocalDevelopmentDatabaseGuardEnv = {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  VERCEL?: string;
  CI?: string;
  GITLAB_CI?: string;
  NODE_ENV?: string;
};

export type LocalDevelopmentDatabaseGuardAllowReason =
  | "vercel_hosted_environment"
  | "local_database_target_allowed";

export type LocalDevelopmentDatabaseGuardBlockReason =
  | "missing_database_url"
  | "malformed_database_url"
  | "unsupported_database_protocol"
  | "empty_database_url_host"
  | "non_local_database_host"
  | "malformed_direct_url"
  | "unsupported_direct_url_protocol"
  | "empty_direct_url_host"
  | "non_local_direct_url_host";

export type LocalDevelopmentDatabaseGuardDecision =
  | {
      ok: true;
      reason: LocalDevelopmentDatabaseGuardAllowReason;
    }
  | {
      ok: false;
      reason: LocalDevelopmentDatabaseGuardBlockReason;
      message: string;
    };

const BLOCK_MESSAGES: Record<LocalDevelopmentDatabaseGuardBlockReason, string> =
  {
    missing_database_url: "Local database isolation requires DATABASE_URL.",
    malformed_database_url:
      "Local database isolation blocked a malformed DATABASE_URL.",
    unsupported_database_protocol:
      "Local database isolation blocked an unsupported DATABASE_URL protocol.",
    empty_database_url_host:
      "Local database isolation blocked a DATABASE_URL with an empty host.",
    non_local_database_host:
      "Local database isolation blocked a non-local DATABASE_URL.",
    malformed_direct_url:
      "Local database isolation blocked a malformed DIRECT_URL.",
    unsupported_direct_url_protocol:
      "Local database isolation blocked an unsupported DIRECT_URL protocol.",
    empty_direct_url_host:
      "Local database isolation blocked a DIRECT_URL with an empty host.",
    non_local_direct_url_host:
      "Local database isolation blocked a non-local DIRECT_URL.",
  };

export function readLocalDevelopmentDatabaseGuardInput(
  env: LocalDevelopmentDatabaseGuardEnv,
): LocalDevelopmentDatabaseGuardInput {
  return {
    databaseUrl: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
    vercel: env.VERCEL,
  };
}

export function formatLocalDevelopmentDatabaseGuardMessage(
  reason: LocalDevelopmentDatabaseGuardBlockReason,
): string {
  return BLOCK_MESSAGES[reason];
}

function refuse(
  reason: LocalDevelopmentDatabaseGuardBlockReason,
): LocalDevelopmentDatabaseGuardDecision {
  return {
    ok: false,
    reason,
    message: BLOCK_MESSAGES[reason],
  };
}

function readPostgresProtocol(
  rawUrl: string,
): { ok: true; protocol: string } | { ok: false } {
  try {
    return {
      ok: true,
      protocol: new URL(rawUrl.trim()).protocol.toLowerCase(),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * WHATWG URL.hostname for IPv6 literals includes brackets (`[::1]`).
 * The shared local-host allowlist stores `::1` without brackets.
 */
function normalizeDatabaseHostname(host: string): string {
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

type UrlKind = "database" | "direct";

function evaluatePostgresTarget(
  rawUrl: string | undefined,
  kind: UrlKind,
): LocalDevelopmentDatabaseGuardDecision | { ok: true } {
  const missingReason: LocalDevelopmentDatabaseGuardBlockReason =
    kind === "database" ? "missing_database_url" : "malformed_direct_url";
  const malformedReason: LocalDevelopmentDatabaseGuardBlockReason =
    kind === "database" ? "malformed_database_url" : "malformed_direct_url";
  const protocolReason: LocalDevelopmentDatabaseGuardBlockReason =
    kind === "database"
      ? "unsupported_database_protocol"
      : "unsupported_direct_url_protocol";
  const emptyHostReason: LocalDevelopmentDatabaseGuardBlockReason =
    kind === "database" ? "empty_database_url_host" : "empty_direct_url_host";
  const nonLocalReason: LocalDevelopmentDatabaseGuardBlockReason =
    kind === "database"
      ? "non_local_database_host"
      : "non_local_direct_url_host";

  const parsed = parseDatabaseTarget(rawUrl);
  if (!parsed.ok) {
    if (parsed.code === "missing_database_url") {
      return refuse(missingReason);
    }
    if (parsed.code === "empty_host") {
      return refuse(emptyHostReason);
    }
    return refuse(malformedReason);
  }

  const protocol = readPostgresProtocol(rawUrl ?? "");
  if (!protocol.ok) {
    return refuse(malformedReason);
  }
  if (!ACCEPTED_POSTGRES_PROTOCOLS.has(protocol.protocol)) {
    return refuse(protocolReason);
  }

  if (
    !isLocalDestructiveSeedHost(normalizeDatabaseHostname(parsed.target.host))
  ) {
    return refuse(nonLocalReason);
  }

  return { ok: true };
}

/**
 * Asserts that ordinary local-development database URLs target loopback hosts.
 * Never connects to a database. Never authorizes remote hosts via CI or NODE_ENV.
 */
export function assertLocalDevelopmentDatabaseAllowed(
  input: LocalDevelopmentDatabaseGuardInput,
): LocalDevelopmentDatabaseGuardDecision {
  if (input.vercel === "1") {
    return { ok: true, reason: "vercel_hosted_environment" };
  }

  const databaseDecision = evaluatePostgresTarget(
    input.databaseUrl,
    "database",
  );
  if (!databaseDecision.ok) {
    return databaseDecision;
  }

  if (input.directUrl !== undefined) {
    const directDecision = evaluatePostgresTarget(input.directUrl, "direct");
    if (!directDecision.ok) {
      return directDecision;
    }
  }

  return { ok: true, reason: "local_database_target_allowed" };
}
