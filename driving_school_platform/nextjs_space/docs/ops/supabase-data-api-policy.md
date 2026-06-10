# Supabase Data API and RLS policy (DAT)

How DAT treats **Supabase Postgres**, the **Data API** (PostgREST / GraphQL), and **row-level security (RLS)** on internal `public` tables.

This doc complements **[supabase-data-api-grants.md](./supabase-data-api-grants.md)** (grants audit, when to use the Data API) and **[supabase-prisma-migrations.md](./supabase-prisma-migrations.md)** (migrations, URLs). Do **not** paste keys or connection strings into git or tickets.

---

## Primary access path

- **DAT uses Prisma** against Postgres (`DATABASE_URL` / `DIRECT_URL`). That is the **primary** application data path.
- **Supabase Data API** (PostgREST, `supabase-js`, `/rest/v1/`, GraphQL) is **not** the primary surface for DAT app reads/writes today.

Internal tables in **`public`** must **not** be treated as a public HTTP API by default. Treat exposure through Supabase’s API layer as **opt-in** and security-reviewed.

---

## RLS on internal tables

- **RLS should be enabled** on `public` tables that Supabase’s dashboard or Security Advisor flags when those tables are not meant to be anonymously readable.
- **Do not** add default **permissive** policies for **`anon`** or **`authenticated`** unless a reviewed feature explicitly requires Data API access.
- Migration **`20260513180000_enable_rls_internal_tables`** enables RLS (without policies) on:
  - `public.billing_events`
  - `public.entitlement_grants`
  - `public.organization_domains`
- Migration **`20260529120000_harden_sensitive_auth_tables_rls`** enables RLS and revokes **`anon` / `authenticated`** table grants on:

  - `public.user_invitations`
  - `public.password_reset_tokens`
  - `public.email_verification_tokens`
  - `public.rate_limit_buckets`

  Engineering notes: [supabase-security-hardening.md](../engineering/supabase-security-hardening.md).

- Migration **`20260610150000_supabase_rls_class_b_hardening_v1b_nextauth`** (Class-B v1b slice B1) enables RLS and revokes **`anon` / `authenticated`** table grants on:

  - `public.accounts`
  - `public.sessions`
  - `public.verification_tokens`
  - `public.users`

  **Deployed + smoke-passed** on validated target env (2026-06-10): operator `migrate deploy` succeeded; post-deploy 24 migrations up to date (main `edd73de`, feature `d579a1f`); B1 manual auth smoke pass (operator-confirmed). See [supabase-rls-class-b-hardening-v1b-plan.md](../../../../docs/architecture/supabase-rls-class-b-hardening-v1b-plan.md) (DEC-030).

- Migration **`20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke`** (Class-B v1b slice B2) enables RLS and revokes **`anon` / `authenticated`** table grants on:

  - `public.students`, `public.instructors`, `public.vehicles`, `public.lessons`, `public.exams`, `public.lesson_requests`
  - `public.lesson_counters`, `public.exam_registrations`, `public.payments`, `public.notifications`
  - `public.organizations`, `public.organization_features`

  Operator **`migrate deploy`** is human-controlled. B2 smoke matrix in plan doc.

With RLS enabled and **no** policies, roles that are subject to RLS and are **not** the table owner/superuser will not get rows through PostgREST unless policies are added later.

**Prisma:** the database user used by the app connection is typically the **owner** of application tables (or a role that bypasses RLS in the same way as owners in standard Postgres). Normal Prisma access therefore continues; confirm in your environment if you use a non-owner role.

This batch does **not** use `FORCE ROW LEVEL SECURITY`.

---

## Future hardening (recommended)

1. **Sliced Class-B v1b** — B1 NextAuth **done**; B2 tenant business **done** (migration `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke`). Remaining **3** tables in B3 global reference (`categories`, `transmission_types`, `user_preferences`). Pattern: `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL FROM anon, authenticated`; **no** `CREATE POLICY`; **no** `FORCE ROW LEVEL SECURITY`. See [supabase-rls-class-b-hardening-v1b-plan.md](../../../../docs/architecture/supabase-rls-class-b-hardening-v1b-plan.md) (DEC-030).
2. **Exposed schemas** — If your Supabase project exposes `public` to the Data API, consider removing `public` from exposed schemas when compatible with your workflow, so internal tables are not in scope for accidental REST exposure.
3. **Dedicated API schema** — If you later adopt the Data API for specific features, prefer a dedicated schema (e.g. `api`) with narrow views + explicit grants + reviewed RLS policies, rather than widening access to all of `public`.
4. **Keep internal tables without broad public policies** — Continue to default to “no anon/authenticated policy” unless documented otherwise. **Tenant-scoped `CREATE POLICY`** (`supabase-rls-tenant-policies-v1`) is a **separate P2** batch — not part of v1b revoke-only.

---

## Related

- [supabase-rls-class-b-hardening-v1b-plan.md](../../../../docs/architecture/supabase-rls-class-b-hardening-v1b-plan.md) — sliced v1b plan
- [supabase-data-api-grants.md](./supabase-data-api-grants.md) — grants audit and when the Data API may be used.
- [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) — applying migrations safely.
