/**
 * Fail-closed guards for disposable local browser-E2E Playwright specs.
 *
 * Local Playwright must run only under the dedicated orchestrator against the
 * approved loopback app URL. Production smoke, Supabase, and hosted mutation
 * context are refused.
 */

import {
  E2E_APP_BASE_URL,
  E2E_APP_HOST,
  E2E_APP_PORT,
  E2E_ORCHESTRATOR_ACTIVE_ENV,
  E2E_ORCHESTRATOR_ACTIVE_VALUE,
} from "../../lib/ops/e2e-database-contract";

export type LocalBrowserE2eGuardRefusalCode =
  | "missing_orchestrator_marker"
  | "unexpected_orchestrator_marker"
  | "missing_base_url"
  | "malformed_base_url"
  | "unsupported_base_url_protocol"
  | "localhost_alias"
  | "wrong_app_port"
  | "hosted_or_public_hostname"
  | "supabase_hostname"
  | "production_opt_in_context"
  | "smoke_mutation_context"
  | "smoke_base_url_context";

export type LocalBrowserE2eGuardDecision =
  | {
      ok: true;
      baseUrl: string;
    }
  | {
      ok: false;
      code: LocalBrowserE2eGuardRefusalCode;
      message: string;
    };

export type LocalBrowserE2eGuardInput = {
  orchestratorActive: string | undefined;
  baseUrl: string | undefined;
  allowProduction: string | undefined;
  allowProductionMutations: string | undefined;
  smokeBaseUrl: string | undefined;
};

const BLOCK_MESSAGES: Record<LocalBrowserE2eGuardRefusalCode, string> = {
  missing_orchestrator_marker:
    "Local browser-E2E requires DAT_E2E_ORCHESTRATOR_ACTIVE=1. Run pnpm test:e2e.",
  unexpected_orchestrator_marker:
    "Local browser-E2E refused an unexpected orchestrator marker.",
  missing_base_url: "Local browser-E2E requires DAT_E2E_BASE_URL.",
  malformed_base_url: "Local browser-E2E blocked a malformed base URL.",
  unsupported_base_url_protocol:
    "Local browser-E2E blocked a non-http loopback base URL.",
  localhost_alias:
    "Local browser-E2E blocked a localhost alias. Use the exact 127.0.0.1 contract.",
  wrong_app_port: "Local browser-E2E blocked a port identity mismatch.",
  hosted_or_public_hostname:
    "Local browser-E2E blocked a public or hosted hostname.",
  supabase_hostname: "Local browser-E2E blocked a Supabase hostname.",
  production_opt_in_context:
    "Local browser-E2E refused Production smoke opt-in context.",
  smoke_mutation_context:
    "Local browser-E2E refused Production smoke mutation context.",
  smoke_base_url_context:
    "Local browser-E2E refused a smoke base URL in the local disposable path.",
};

function isTruthyEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
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

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function readLocalBrowserE2eGuardInput(
  env: Record<string, string | undefined>,
): LocalBrowserE2eGuardInput {
  return {
    orchestratorActive: env[E2E_ORCHESTRATOR_ACTIVE_ENV],
    baseUrl: env.DAT_E2E_BASE_URL,
    allowProduction: env.DAT_E2E_ALLOW_PRODUCTION,
    allowProductionMutations: env.DAT_E2E_ALLOW_PRODUCTION_MUTATIONS,
    smokeBaseUrl: env.DAT_SMOKE_BASE_URL,
  };
}

export function evaluateLocalBrowserE2eGuard(
  input: LocalBrowserE2eGuardInput,
): LocalBrowserE2eGuardDecision {
  if (isTruthyEnv(input.allowProduction)) {
    return {
      ok: false,
      code: "production_opt_in_context",
      message: BLOCK_MESSAGES.production_opt_in_context,
    };
  }
  if (isTruthyEnv(input.allowProductionMutations)) {
    return {
      ok: false,
      code: "smoke_mutation_context",
      message: BLOCK_MESSAGES.smoke_mutation_context,
    };
  }
  if (input.smokeBaseUrl?.trim()) {
    return {
      ok: false,
      code: "smoke_base_url_context",
      message: BLOCK_MESSAGES.smoke_base_url_context,
    };
  }

  const marker = input.orchestratorActive?.trim() ?? "";
  if (!marker) {
    return {
      ok: false,
      code: "missing_orchestrator_marker",
      message: BLOCK_MESSAGES.missing_orchestrator_marker,
    };
  }
  if (marker !== E2E_ORCHESTRATOR_ACTIVE_VALUE) {
    return {
      ok: false,
      code: "unexpected_orchestrator_marker",
      message: BLOCK_MESSAGES.unexpected_orchestrator_marker,
    };
  }

  const raw = input.baseUrl?.trim() ?? "";
  if (!raw) {
    return {
      ok: false,
      code: "missing_base_url",
      message: BLOCK_MESSAGES.missing_base_url,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      code: "malformed_base_url",
      message: BLOCK_MESSAGES.malformed_base_url,
    };
  }

  if (parsed.protocol !== "http:") {
    return {
      ok: false,
      code: "unsupported_base_url_protocol",
      message: BLOCK_MESSAGES.unsupported_base_url_protocol,
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) {
    return {
      ok: false,
      code: "localhost_alias",
      message: BLOCK_MESSAGES.localhost_alias,
    };
  }
  if (isSupabaseHostname(host)) {
    return {
      ok: false,
      code: "supabase_hostname",
      message: BLOCK_MESSAGES.supabase_hostname,
    };
  }
  if (host !== E2E_APP_HOST) {
    return {
      ok: false,
      code: "hosted_or_public_hostname",
      message: BLOCK_MESSAGES.hosted_or_public_hostname,
    };
  }

  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 80;
  if (port !== E2E_APP_PORT) {
    return {
      ok: false,
      code: "wrong_app_port",
      message: BLOCK_MESSAGES.wrong_app_port,
    };
  }

  const normalized = stripTrailingSlash(parsed.origin);
  if (normalized !== E2E_APP_BASE_URL) {
    return {
      ok: false,
      code: "malformed_base_url",
      message: BLOCK_MESSAGES.malformed_base_url,
    };
  }

  return { ok: true, baseUrl: E2E_APP_BASE_URL };
}

export function assertLocalBrowserE2eConfig(
  env: NodeJS.ProcessEnv = process.env,
): { baseUrl: string } {
  const decision = evaluateLocalBrowserE2eGuard(
    readLocalBrowserE2eGuardInput(env),
  );
  if (!decision.ok) {
    throw new Error(decision.message);
  }
  return { baseUrl: decision.baseUrl };
}
