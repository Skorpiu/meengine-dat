/**
 * Production smoke target guards (read-only suite).
 * Never log secrets — only protocol + hostname.
 */

export type SmokeTargetSummary = {
  baseUrl: string;
  host: string;
  protocol: string;
};

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
