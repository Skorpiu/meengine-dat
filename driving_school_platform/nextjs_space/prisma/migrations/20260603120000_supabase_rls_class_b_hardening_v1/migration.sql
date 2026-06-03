/*
  Class-B internal table RLS hardening (v1).

  Scope (8 tables only):
  - billing_events, entitlement_grants, organization_domains: explicit REVOKE only (RLS already enabled).
  - audit_logs, license_keys, configuration_history, system_settings, feature_flags: ENABLE RLS + REVOKE.

  No CREATE POLICY, no FORCE ROW LEVEL SECURITY, no GRANT to anon/authenticated.
  Prisma/backend uses DATABASE_URL (table owner / migration role bypasses RLS).

  Idempotent: repeating ENABLE ROW LEVEL SECURITY and REVOKE is safe in Postgres.
*/

-- billing_events (RLS enabled in 20260513180000_enable_rls_internal_tables)
REVOKE ALL ON TABLE "billing_events" FROM anon, authenticated;

-- entitlement_grants (RLS enabled in 20260513180000_enable_rls_internal_tables)
REVOKE ALL ON TABLE "entitlement_grants" FROM anon, authenticated;

-- organization_domains (RLS enabled in 20260513180000_enable_rls_internal_tables)
REVOKE ALL ON TABLE "organization_domains" FROM anon, authenticated;

-- audit_logs (backend-only audit trail)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "audit_logs" FROM anon, authenticated;

-- license_keys (platform license material — backend-only)
ALTER TABLE "license_keys" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "license_keys" FROM anon, authenticated;

-- configuration_history (config change audit — backend-only)
ALTER TABLE "configuration_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "configuration_history" FROM anon, authenticated;

-- system_settings (server-side settings — backend-only)
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "system_settings" FROM anon, authenticated;

-- feature_flags (server-side flag evaluation — backend-only)
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "feature_flags" FROM anon, authenticated;
