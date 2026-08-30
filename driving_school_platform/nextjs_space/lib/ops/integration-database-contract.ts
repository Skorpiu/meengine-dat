/**
 * Purpose-scoped disposable integration-database identity (TEST-ARCH-001 / DEC-070).
 *
 * These values are not secrets. They identify a throwaway Postgres instance
 * used only by the real-database integration harness. They must never be used
 * as ordinary development, operator, or Production target authority.
 */

export const INTEGRATION_POSTGRES_IMAGE_PIN =
  "postgres:16.15@sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94";

export const INTEGRATION_COMPOSE_PROJECT_NAME = "dat-it";
export const INTEGRATION_COMPOSE_FILE_NAME = "compose.integration.yml";
export const INTEGRATION_COMPOSE_SERVICE_NAME = "postgres";

export const INTEGRATION_DATABASE_NAME = "dat_it";
export const INTEGRATION_DATABASE_USER = "dat_it";
export const INTEGRATION_DATABASE_PASSWORD = "dat_it";

export const INTEGRATION_LOCAL_HOST = "127.0.0.1";
export const INTEGRATION_LOCAL_PORT = 55432;

export const INTEGRATION_CI_HOST = "dat-integration-postgres";
export const INTEGRATION_CI_PORT = 5432;

export const INTEGRATION_PROVISION_LOCAL_COMPOSE = "local-compose";
export const INTEGRATION_PROVISION_CI_EXTERNAL = "ci-external";

export type IntegrationProvisionMode =
  | typeof INTEGRATION_PROVISION_LOCAL_COMPOSE
  | typeof INTEGRATION_PROVISION_CI_EXTERNAL;

export const INTEGRATION_PROVISION_MODES: readonly IntegrationProvisionMode[] =
  [INTEGRATION_PROVISION_LOCAL_COMPOSE, INTEGRATION_PROVISION_CI_EXTERNAL];

export const INTEGRATION_COMPAT_ROLES = ["anon", "authenticated"] as const;

export function isIntegrationProvisionMode(
  value: string | undefined,
): value is IntegrationProvisionMode {
  return (
    value === INTEGRATION_PROVISION_LOCAL_COMPOSE ||
    value === INTEGRATION_PROVISION_CI_EXTERNAL
  );
}

export function buildCanonicalIntegrationDatabaseUrl(
  mode: IntegrationProvisionMode,
): string {
  const host =
    mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
      ? INTEGRATION_LOCAL_HOST
      : INTEGRATION_CI_HOST;
  const port =
    mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
      ? INTEGRATION_LOCAL_PORT
      : INTEGRATION_CI_PORT;

  return `postgresql://${INTEGRATION_DATABASE_USER}:${INTEGRATION_DATABASE_PASSWORD}@${host}:${port}/${INTEGRATION_DATABASE_NAME}?schema=public`;
}

export function formatRedactedIntegrationDatabaseTarget(
  mode: IntegrationProvisionMode,
): string {
  const host =
    mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
      ? INTEGRATION_LOCAL_HOST
      : INTEGRATION_CI_HOST;
  const port =
    mode === INTEGRATION_PROVISION_LOCAL_COMPOSE
      ? INTEGRATION_LOCAL_PORT
      : INTEGRATION_CI_PORT;

  return `postgresql://***:***@${host}:${port}/${INTEGRATION_DATABASE_NAME}`;
}
