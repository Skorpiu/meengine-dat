/**
 * Shared read-only API checks for production smoke (no auth, no writes).
 */

const EXPECTED_HEALTH = {
  ok: true,
  service: "driving-academy-tool",
  status: "healthy",
} as const;

const SIGNUP_BLOCKED_CODES = new Set([
  "public_signup_disabled",
  "demo_signup_disabled",
]);

const MINIMAL_SIGNUP_BODY = {
  firstName: "Smoke",
  lastName: "Probe",
  password: "smoke-probe-password-not-used",
  role: "STUDENT",
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function healthBodyMatches(body: unknown): boolean {
  if (!isPlainObject(body)) return false;
  const keys = Object.keys(body);
  if (keys.length !== 3) return false;
  for (const k of keys) {
    if (k !== "ok" && k !== "service" && k !== "status") return false;
  }
  return (
    body.ok === EXPECTED_HEALTH.ok &&
    body.service === EXPECTED_HEALTH.service &&
    body.status === EXPECTED_HEALTH.status
  );
}

export type SmokeApiCheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export async function checkHealthEndpoint(
  baseUrl: string,
): Promise<SmokeApiCheckResult> {
  const url = `${baseUrl}/api/health`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.status !== 200) {
      return {
        name: "health",
        ok: false,
        detail: `Expected HTTP 200, got ${res.status}`,
      };
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return {
        name: "health",
        ok: false,
        detail: "Response is not valid JSON",
      };
    }

    if (!healthBodyMatches(parsed)) {
      return {
        name: "health",
        ok: false,
        detail: `Unexpected JSON body: ${JSON.stringify(parsed)}`,
      };
    }

    const cacheControl = res.headers.get("cache-control");
    if (!cacheControl?.toLowerCase().includes("no-store")) {
      return {
        name: "health",
        ok: false,
        detail: `Expected Cache-Control no-store, got: ${cacheControl ?? "(missing)"}`,
      };
    }

    return { name: "health", ok: true, detail: `${url} OK` };
  } catch (err) {
    return {
      name: "health",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkSignupBlocked(
  baseUrl: string,
): Promise<SmokeApiCheckResult> {
  const url = `${baseUrl}/api/signup`;
  const email = `smoke-signup-probe-${Date.now()}@example.invalid`;
  const body = { ...MINIMAL_SIGNUP_BODY, email };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }

    if (res.status === 403 && isPlainObject(parsed)) {
      const code = typeof parsed.code === "string" ? parsed.code : "";
      if (SIGNUP_BLOCKED_CODES.has(code)) {
        return {
          name: "signup_blocked",
          ok: true,
          detail: `POST /api/signup returned 403 (${code})`,
        };
      }
    }

    if (res.status === 201) {
      return {
        name: "signup_blocked",
        ok: false,
        detail:
          "POST /api/signup returned 201 — public signup appears enabled (unexpected for smoke)",
      };
    }

    return {
      name: "signup_blocked",
      ok: false,
      detail: `Expected 403 with public_signup_disabled or demo_signup_disabled, got HTTP ${res.status} body=${JSON.stringify(parsed)}`,
    };
  } catch (err) {
    return {
      name: "signup_blocked",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runSmokeApiChecks(
  baseUrl: string,
): Promise<SmokeApiCheckResult[]> {
  return Promise.all([
    checkHealthEndpoint(baseUrl),
    checkSignupBlocked(baseUrl),
  ]);
}
