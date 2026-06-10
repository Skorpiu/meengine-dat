/*
  Class-B RLS hardening v1b — slice B1 (NextAuth).

  Scope (4 tables only):
  - accounts, sessions, verification_tokens, users

  Pattern:
  - ENABLE ROW LEVEL SECURITY
  - REVOKE ALL ON TABLE … FROM anon, authenticated

  No CREATE POLICY, no FORCE ROW LEVEL SECURITY, no GRANT to anon/authenticated.
  Prisma/backend uses DATABASE_URL (table owner / migration role bypasses RLS).

  Idempotent: repeating ENABLE ROW LEVEL SECURITY and REVOKE is safe in Postgres.
*/

-- accounts (NextAuth OAuth adapter)
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "accounts" FROM anon, authenticated;

-- sessions (NextAuth session store)
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "sessions" FROM anon, authenticated;

-- verification_tokens (NextAuth email verification)
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "verification_tokens" FROM anon, authenticated;

-- users (core auth identity — PII + passwordHash)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "users" FROM anon, authenticated;
