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

With RLS enabled and **no** policies, roles that are subject to RLS and are **not** the table owner/superuser will not get rows through PostgREST unless policies are added later.

**Prisma:** the database user used by the app connection is typically the **owner** of application tables (or a role that bypasses RLS in the same way as owners in standard Postgres). Normal Prisma access therefore continues; confirm in your environment if you use a non-owner role.

This batch does **not** use `FORCE ROW LEVEL SECURITY`.

---

## Future hardening (recommended)

1. **Exposed schemas** — If your Supabase project exposes `public` to the Data API, consider removing `public` from exposed schemas when compatible with your workflow, so internal tables are not in scope for accidental REST exposure.
2. **Dedicated API schema** — If you later adopt the Data API for specific features, prefer a dedicated schema (e.g. `api`) with narrow views + explicit grants + reviewed RLS policies, rather than widening access to all of `public`.
3. **Keep internal tables without broad public policies** — Continue to default to “no anon/authenticated policy” unless documented otherwise.

---

## Related

- [supabase-data-api-grants.md](./supabase-data-api-grants.md) — grants audit and when the Data API may be used.
- [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) — applying migrations safely.
