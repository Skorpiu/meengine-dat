/**
 * Production smoke target guards (read-only + fixture preflight suites).
 * Never log secrets — only protocol + hostname.
 */

import {
  parseSmokeFixtureExpectedFromEnv,
  type SmokeFixtureConfig,
  type SmokeFixtureExpected,
} from "./smoke-fixture-preflight";

export type SmokeTargetSummary = {
  baseUrl: string;
  host: string;
  protocol: string;
};

export type { SmokeFixtureConfig, SmokeFixtureExpected };

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve smoke base URL (DAT_SMOKE_* preferred; E2E_* legacy fallbacks).
 */
export function resolveSmokeBaseUrl(): string {
  const raw =
    process.env.DAT_SMOKE_BASE_URL?.trim() ||
    process.env.E2E_BASE_URL?.trim() ||
    process.env.PLAYWRIGHT_BASE_URL?.trim() ||
    "http://localhost:3000";
  return stripTrailingSlash(raw);
}

export function isLocalSmokeHost(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

function parseAllowedHosts(): string[] {
  const raw = process.env.DAT_SMOKE_ALLOWED_HOSTS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Assert the smoke target is allowed. Local hosts pass without opt-in.
 * Hosted targets require DAT_E2E_ALLOW_PRODUCTION=true and hostname in DAT_SMOKE_ALLOWED_HOSTS.
 */
export function assertSmokeTargetAllowed(): SmokeTargetSummary {
  const baseUrl = resolveSmokeBaseUrl();
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(
      `Invalid DAT_SMOKE_BASE_URL (or fallback): "${baseUrl}". Set a full URL such as http://localhost:3000 or https://www.meengine.io.`,
    );
  }

  const summary: SmokeTargetSummary = {
    baseUrl,
    host: parsed.hostname,
    protocol: parsed.protocol,
  };

  console.log(`Smoke target: ${summary.protocol}//${summary.host}`);

  if (isLocalSmokeHost(baseUrl)) {
    return summary;
  }

  if (process.env.DAT_E2E_ALLOW_PRODUCTION?.trim().toLowerCase() !== "true") {
    throw new Error(
      [
        `Hosted smoke against ${summary.protocol}//${summary.host} requires explicit opt-in.`,
        "Set DAT_E2E_ALLOW_PRODUCTION=true",
        "and DAT_SMOKE_ALLOWED_HOSTS to a comma-separated allowlist (e.g. www.meengine.io).",
      ].join(" "),
    );
  }

  const allowed = parseAllowedHosts();
  if (allowed.length === 0) {
    throw new Error(
      `Hosted smoke requires DAT_SMOKE_ALLOWED_HOSTS (comma-separated hostnames). Example: DAT_SMOKE_ALLOWED_HOSTS=${summary.host}`,
    );
  }

  if (!allowed.includes(summary.host.toLowerCase())) {
    throw new Error(
      `Hostname "${summary.host}" is not listed in DAT_SMOKE_ALLOWED_HOSTS (${allowed.join(", ")}).`,
    );
  }

  return summary;
}

function requireNonEmptyEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var ${name} for smoke fixture preflight.`,
    );
  }
  return value;
}

function parsePositiveIntEnv(name: string): number {
  const raw = requireNonEmptyEnv(name);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}").`);
  }
  return parsed;
}

/**
 * Parse smoke fixture IDs from env. Returns null when any required ID is missing.
 */
export function parseSmokeFixtureConfigFromEnv(): SmokeFixtureConfig | null {
  const organizationId = process.env.DAT_SMOKE_ORG_ID?.trim();
  const studentId = process.env.DAT_SMOKE_STUDENT_ID?.trim();
  const instructorUserId = process.env.DAT_SMOKE_INSTRUCTOR_USER_ID?.trim();
  const vehicleIdRaw = process.env.DAT_SMOKE_VEHICLE_ID?.trim();

  if (!organizationId || !studentId || !instructorUserId || !vehicleIdRaw) {
    return null;
  }

  const vehicleId = Number.parseInt(vehicleIdRaw, 10);
  if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
    return null;
  }

  return {
    organizationId,
    studentId,
    instructorUserId,
    vehicleId,
    expected: parseSmokeFixtureExpectedFromEnv(),
  };
}

/**
 * Assert fixture preflight env vars are present. Throws with actionable message.
 */
export function assertSmokeFixtureEnvVars(): SmokeFixtureConfig {
  const organizationId = requireNonEmptyEnv("DAT_SMOKE_ORG_ID");
  const studentId = requireNonEmptyEnv("DAT_SMOKE_STUDENT_ID");
  const instructorUserId = requireNonEmptyEnv("DAT_SMOKE_INSTRUCTOR_USER_ID");
  const vehicleId = parsePositiveIntEnv("DAT_SMOKE_VEHICLE_ID");

  return {
    organizationId,
    studentId,
    instructorUserId,
    vehicleId,
    expected: parseSmokeFixtureExpectedFromEnv(),
  };
}

/**
 * Hosted fixture preflight requires production opt-in and explicit fixture IDs.
 */
export function assertSmokeFixturePreflightAllowed(): SmokeTargetSummary {
  const summary = assertSmokeTargetAllowed();
  assertSmokeFixtureEnvVars();
  return summary;
}
