/**
 * Integration-only compatibility role bootstrap (TEST-ARCH-001 / DEC-070).
 *
 * Creates the minimum NOLOGIN roles required by committed REVOKE statements
 * against `anon` and `authenticated`. Does not create `service_role`.
 * Does not grant extra memberships. Idempotent. Not an application seed.
 */

import { INTEGRATION_COMPAT_ROLES } from "@/lib/ops/integration-database-contract";

export const INTEGRATION_COMPAT_ROLE_BOOTSTRAP_SQL = `
DO $dat_it_compat$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$dat_it_compat$;
`.trim();

export const INTEGRATION_COMPAT_ROLE_ASSERT_SQL = `
SELECT
  r.rolname,
  r.rolsuper,
  r.rolcreatedb,
  r.rolcreaterole,
  r.rolcanlogin,
  r.rolinherit,
  COALESCE(
    array_agg(m.rolname) FILTER (WHERE m.rolname IS NOT NULL),
    ARRAY[]::name[]
  ) AS member_of
FROM pg_roles r
LEFT JOIN pg_auth_members am ON am.member = r.oid
LEFT JOIN pg_roles m ON m.oid = am.roleid
WHERE r.rolname IN ('anon', 'authenticated')
GROUP BY
  r.rolname,
  r.rolsuper,
  r.rolcreatedb,
  r.rolcreaterole,
  r.rolcanlogin,
  r.rolinherit
ORDER BY r.rolname
`.trim();

export const INTEGRATION_FORBIDDEN_ROLE_ASSERT_SQL = `
SELECT rolname
FROM pg_roles
WHERE rolname = 'service_role'
`.trim();

export type IntegrationCompatibilityRoleRow = {
  rolname: string;
  rolsuper: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolcanlogin: boolean;
  rolinherit: boolean;
  member_of: string[] | null;
};

export function assertIntegrationCompatibilityRoles(
  rows: IntegrationCompatibilityRoleRow[],
  forbiddenRoleNames: string[],
): void {
  if (forbiddenRoleNames.includes("service_role")) {
    throw new Error(
      "Integration compatibility bootstrap refused: service_role is present.",
    );
  }

  const byName = new Map(rows.map((row) => [row.rolname, row]));
  for (const roleName of INTEGRATION_COMPAT_ROLES) {
    const row = byName.get(roleName);
    if (!row) {
      throw new Error(
        `Integration compatibility bootstrap refused: missing role ${roleName}.`,
      );
    }
    if (
      row.rolsuper ||
      row.rolcreatedb ||
      row.rolcreaterole ||
      row.rolcanlogin
    ) {
      throw new Error(
        `Integration compatibility bootstrap refused: role ${roleName} has elevated attributes.`,
      );
    }
    const memberOf = row.member_of ?? [];
    if (memberOf.length > 0) {
      throw new Error(
        `Integration compatibility bootstrap refused: role ${roleName} has extra membership.`,
      );
    }
  }

  if (rows.length !== INTEGRATION_COMPAT_ROLES.length) {
    throw new Error(
      "Integration compatibility bootstrap refused: unexpected extra compatibility roles.",
    );
  }
}
