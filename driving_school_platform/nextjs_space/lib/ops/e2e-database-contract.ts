/**
 * Purpose-scoped disposable browser-E2E database identity (TEST-HYGIENE-001).
 *
 * These values are not Production secrets. They identify a throwaway Postgres
 * instance used only by local disposable browser-E2E orchestration. They must
 * never be used as ordinary development (DEC-068), integration-test (DEC-070),
 * operator, or Production target authority.
 *
 * Distinct from DEC-070: host 127.0.0.1 port 55433, database dat_e2e,
 * Compose project dat-e2e.
 */

export const E2E_POSTGRES_IMAGE_PIN =
  "postgres:16.15@sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94";

export const E2E_COMPOSE_PROJECT_NAME = "dat-e2e";
export const E2E_COMPOSE_FILE_NAME = "compose.e2e.yml";
export const E2E_COMPOSE_SERVICE_NAME = "postgres";

export const E2E_DATABASE_NAME = "dat_e2e";
export const E2E_DATABASE_USER = "dat_e2e";
export const E2E_DATABASE_PASSWORD = "dat_e2e";

export const E2E_LOCAL_HOST = "127.0.0.1";
export const E2E_LOCAL_PORT = 55433;

export const E2E_APP_HOST = "127.0.0.1";
export const E2E_APP_PORT = 13000;
export const E2E_APP_BASE_URL = `http://${E2E_APP_HOST}:${E2E_APP_PORT}`;

export const E2E_ORCHESTRATOR_ACTIVE_ENV = "DAT_E2E_ORCHESTRATOR_ACTIVE";
export const E2E_ORCHESTRATOR_ACTIVE_VALUE = "1";

export const E2E_COMPAT_ROLES = ["anon", "authenticated"] as const;

export function buildCanonicalE2eDatabaseUrl(): string {
  return `postgresql://${E2E_DATABASE_USER}:${E2E_DATABASE_PASSWORD}@${E2E_LOCAL_HOST}:${E2E_LOCAL_PORT}/${E2E_DATABASE_NAME}?schema=public`;
}

export function formatRedactedE2eDatabaseTarget(): string {
  return `postgresql://***:***@${E2E_LOCAL_HOST}:${E2E_LOCAL_PORT}/${E2E_DATABASE_NAME}`;
}
