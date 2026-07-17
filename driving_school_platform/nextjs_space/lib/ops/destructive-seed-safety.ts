/**
 * Fail-closed safety for the legacy destructive development/demo seed
 * (`scripts/seed.ts` / `prisma db seed`).
 *
 * Local loopback databases only. No remote bypass. Explicit confirmation required.
 */

export const DESTRUCTIVE_LOCAL_SEED_CONFIRMATION = "DELETE_LOCAL_DAT_APP_DATA";

export const LOCAL_DESTRUCTIVE_SEED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

export type DestructiveSeedTarget = {
  host: string;
  database: string | null;
};

export type DestructiveSeedSafetyRefusal = {
  ok: false;
  code:
    | "missing_database_url"
    | "malformed_database_url"
    | "empty_host"
    | "remote_host_refused"
    | "missing_local_confirmation";
  message: string;
  redactedTarget: string;
};

export type DestructiveSeedSafetyAuthorization = {
  ok: true;
  target: DestructiveSeedTarget;
  redactedTarget: string;
};

export type DestructiveSeedSafetyDecision =
  | DestructiveSeedSafetyAuthorization
  | DestructiveSeedSafetyRefusal;

export function formatRedactedDatabaseTarget(
  target: DestructiveSeedTarget,
): string {
  const db = target.database ? `/${target.database}` : "";
  return `postgresql://***:***@${target.host}${db}`;
}

/**
 * Parses DATABASE_URL without logging credentials.
 * Fail-closed on parse errors or empty host.
 */
export function parseDatabaseTarget(
  databaseUrl: string | undefined,
):
  | { ok: true; target: DestructiveSeedTarget }
  | {
      ok: false;
      code: "missing_database_url" | "malformed_database_url" | "empty_host";
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

  const host = parsed.hostname.trim().toLowerCase();
  if (!host) {
    return { ok: false, code: "empty_host" };
  }

  const pathname = parsed.pathname.replace(/^\//, "").trim();
  const database =
    pathname.length > 0 ? (pathname.split("/")[0] ?? null) : null;

  return {
    ok: true,
    target: { host, database: database || null },
  };
}

export function isLocalDestructiveSeedHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (LOCAL_DESTRUCTIVE_SEED_HOSTS.has(normalized)) {
    return true;
  }
  // Browser-style local aliases only (e.g. app.localhost) — not arbitrary remote TLDs.
  if (normalized.endsWith(".localhost")) {
    return true;
  }
  return false;
}

/**
 * Authorizes legacy destructive seed. Never authorizes remote hosts.
 * Confirmation env must match {@link DESTRUCTIVE_LOCAL_SEED_CONFIRMATION} exactly.
 */
export function assertDestructiveLocalSeedAllowed(input: {
  databaseUrl: string | undefined;
  confirmation: string | undefined;
}): DestructiveSeedSafetyDecision {
  const parsed = parseDatabaseTarget(input.databaseUrl);
  if (!parsed.ok) {
    const messages: Record<typeof parsed.code, string> = {
      missing_database_url:
        "DATABASE_URL is missing. No database connection or write was performed.",
      malformed_database_url:
        "DATABASE_URL could not be parsed. No database connection or write was performed.",
      empty_host:
        "DATABASE_URL has an empty host. No database connection or write was performed.",
    };
    return {
      ok: false,
      code: parsed.code,
      message: messages[parsed.code],
      redactedTarget: "(unavailable)",
    };
  }

  const redactedTarget = formatRedactedDatabaseTarget(parsed.target);

  if (!isLocalDestructiveSeedHost(parsed.target.host)) {
    return {
      ok: false,
      code: "remote_host_refused",
      message:
        `Refusing destructive legacy seed against non-local host "${parsed.target.host}". ` +
        "scripts/seed.ts / prisma db seed is local development only. " +
        "There is no remote bypass. Use dedicated non-destructive operator commands for remote environments. " +
        "No database connection or write was performed.",
      redactedTarget,
    };
  }

  if (input.confirmation !== DESTRUCTIVE_LOCAL_SEED_CONFIRMATION) {
    return {
      ok: false,
      code: "missing_local_confirmation",
      message:
        "Refusing destructive legacy seed: explicit local confirmation is required. " +
        "This command deletes all DAT application data on the target database. " +
        "It is local-development-only. " +
        `Set ALLOW_DESTRUCTIVE_LOCAL_SEED=${DESTRUCTIVE_LOCAL_SEED_CONFIRMATION} to proceed. ` +
        "No database connection or write was performed.",
      redactedTarget,
    };
  }

  return {
    ok: true,
    target: parsed.target,
    redactedTarget,
  };
}

export function formatDestructiveSeedRefusalMessage(
  decision: DestructiveSeedSafetyRefusal,
): string {
  return [
    "❌ Destructive local seed refused",
    decision.message,
    `Target (redacted): ${decision.redactedTarget}`,
  ].join("\n");
}
