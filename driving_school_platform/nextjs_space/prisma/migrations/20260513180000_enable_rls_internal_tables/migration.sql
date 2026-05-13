/*
  Enable RLS on internal tables flagged by Supabase Security Advisor.
  No policies in this migration: tightens Data API exposure without adding
  permissive anon/authenticated policies. Prisma app access uses the database
  connection (table owner / migration role typically bypasses RLS in Postgres).

  Idempotent: repeating ENABLE ROW LEVEL SECURITY is safe.
*/

-- AlterTable (RLS)
ALTER TABLE "billing_events" ENABLE ROW LEVEL SECURITY;

-- AlterTable (RLS)
ALTER TABLE "entitlement_grants" ENABLE ROW LEVEL SECURITY;

-- AlterTable (RLS)
ALTER TABLE "organization_domains" ENABLE ROW LEVEL SECURITY;
