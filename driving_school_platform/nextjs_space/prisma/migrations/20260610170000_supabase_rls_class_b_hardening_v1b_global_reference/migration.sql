/*
  Class-B RLS hardening v1b — slice B3 (global reference + user preferences).

  Scope (3 tables only):
  - categories, transmission_types, user_preferences

  Pattern:
  - ENABLE ROW LEVEL SECURITY
  - REVOKE ALL ON TABLE … FROM anon, authenticated

  No CREATE POLICY, no FORCE ROW LEVEL SECURITY, no GRANT to anon/authenticated.
  Prisma/backend uses DATABASE_URL (table owner / migration role bypasses RLS).

  Idempotent: repeating ENABLE ROW LEVEL SECURITY and REVOKE is safe in Postgres.
*/

-- categories (global reference catalog)
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "categories" FROM anon, authenticated;

-- transmission_types (global reference catalog)
ALTER TABLE "transmission_types" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "transmission_types" FROM anon, authenticated;

-- user_preferences (user-scoped via userId)
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "user_preferences" FROM anon, authenticated;
