/**
 * Smoke-check GET /api/health against a local or hosted base URL.
 * No DB, no auth. Exits non-zero on mismatch.
 *
 * Usage:
 *   HEALTH_BASE_URL=http://localhost:3000 pnpm smoke:health
 *   pnpm smoke:health -- --url http://localhost:3000
 */

type HealthJson = {
  ok: boolean;
  service: string;
  status: string;
};

const EXPECTED: HealthJson = {
  ok: true,
  service: "driving-academy-tool",
  status: "healthy",
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseBaseUrl(): string {
  const fromEnv = process.env.HEALTH_BASE_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url" && argv[i + 1]) {
      return stripTrailingSlash(argv[i + 1].trim());
    }
    if (arg.startsWith("--url=")) {
      return stripTrailingSlash(arg.slice("--url=".length).trim());
    }
  }

  console.error(
    "Missing base URL. Set HEALTH_BASE_URL or pass --url <baseUrl> (use pnpm smoke:health -- --url …).",
  );
  process.exit(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bodyMatchesExpected(body: unknown): body is HealthJson {
  if (!isPlainObject(body)) return false;
  const keys = Object.keys(body);
  if (keys.length !== 3) return false;
  for (const k of keys) {
    if (k !== "ok" && k !== "service" && k !== "status") return false;
  }
  return (
    body.ok === EXPECTED.ok &&
    body.service === EXPECTED.service &&
    body.status === EXPECTED.status
  );
}

function cacheControlHasNoStore(header: string | null): boolean {
  if (!header) return false;
  return header.toLowerCase().includes("no-store");
}

async function main(): Promise<void> {
  const baseUrl = parseBaseUrl();
  const url = `${baseUrl}/api/health`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (err) {
    console.error(`Request failed: ${url}`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (res.status !== 200) {
    console.error(`Expected HTTP 200, got ${res.status} for ${url}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    console.error("Response body is not valid JSON");
    process.exit(1);
  }

  if (!bodyMatchesExpected(parsed)) {
    console.error("JSON body does not match expected health payload:", parsed);
    process.exit(1);
  }

  const cacheControl = res.headers.get("cache-control");
  if (!cacheControlHasNoStore(cacheControl)) {
    console.error(
      'Expected Cache-Control to include "no-store", got:',
      cacheControl ?? "(missing)",
    );
    process.exit(1);
  }

  console.log(`OK: ${url} — health JSON and Cache-Control look correct.`);
}

main().catch((err) => {
  console.error("smoke:health failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
