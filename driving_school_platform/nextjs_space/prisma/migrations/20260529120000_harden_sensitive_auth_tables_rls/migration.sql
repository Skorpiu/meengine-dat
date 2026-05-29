/*
  Harden sensitive auth/internal tables flagged by Supabase Security Advisor
  (rls_disabled_in_public).

  - ENABLE ROW LEVEL SECURITY (no policies): blocks anon/authenticated Data API
    access when RLS applies; does not add permissive policies.
  - REVOKE ALL from anon, authenticated: explicit denial of table-level grants
    for PostgREST / supabase-js client roles (service_role unchanged).

  Prisma/backend uses DATABASE_URL (table owner / migration role bypasses RLS).
  Idempotent: repeating ENABLE ROW LEVEL SECURITY and REVOKE is safe in Postgres.
*/

-- user_invitations (invite tokens — backend-only)
ALTER TABLE "user_invitations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "user_invitations" FROM anon, authenticated;

-- password_reset_tokens (reset tokens — backend-only)
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "password_reset_tokens" FROM anon, authenticated;

-- email_verification_tokens (verification tokens — backend-only)
ALTER TABLE "email_verification_tokens" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "email_verification_tokens" FROM anon, authenticated;

-- rate_limit_buckets (auth/email limiter state — backend-only)
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "rate_limit_buckets" FROM anon, authenticated;
