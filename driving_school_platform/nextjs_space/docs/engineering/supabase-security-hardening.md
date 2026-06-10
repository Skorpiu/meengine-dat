# Supabase security hardening — sensitive auth tables (DAT_3.5)

**Batch:** `supabase-sensitive-table-rls-hardening`  
**Migration:** [`20260529120000_harden_sensitive_auth_tables_rls`](../../prisma/migrations/20260529120000_harden_sensitive_auth_tables_rls/migration.sql)

Operational companion docs: [supabase-data-api-policy.md](../ops/supabase-data-api-policy.md), [supabase-data-api-grants.md](../ops/supabase-data-api-grants.md), [supabase-prisma-migrations.md](../ops/supabase-prisma-migrations.md).

Do **not** paste database URLs, Supabase keys, or connection strings into git or tickets.

---

## Alert received

Supabase **Security Advisor** reported **`rls_disabled_in_public`** for tables in `public` that hold auth/email secrets or internal limiter state. These tables must not be reachable via the Supabase Data API (PostgREST, GraphQL, `supabase-js` with **anon** or **authenticated** keys).

---

## Tables affected (this batch)

| Table                              | Purpose                                  | Client-side access                   |
| ---------------------------------- | ---------------------------------------- | ------------------------------------ |
| `public.user_invitations`          | Invite-only onboarding; `tokenHash` only | **No** — Prisma/backend + admin APIs |
| `public.password_reset_tokens`     | Password reset flow; hash-only tokens    | **No** — Prisma/backend              |
| `public.email_verification_tokens` | Email verification flow                  | **No** — Prisma/backend              |
| `public.rate_limit_buckets`        | DB-backed auth/email rate limits         | **No** — Prisma/backend              |

---

## Decision

- These are **internal** tables: not designed for browser, **anon** key, PostgREST, GraphQL, or client `supabase-js`.
- **RLS enabled** on all four tables.
- **No RLS policies** added for `anon` or `authenticated` (no permissive public policies).
- **`REVOKE ALL`** on each table from **`anon`** and **`authenticated`** so table-level grants are explicitly removed where the platform had granted them.
- **`service_role`** is **not** revoked by this migration (server-only secret; bypasses RLS — never expose in the client).
- **Prisma/backend** remains the sole application access path via `DATABASE_URL` / `DIRECT_URL`.

This batch does **not** use `FORCE ROW LEVEL SECURITY`. The app connection user is typically the table **owner**, which bypasses RLS in standard Postgres; confirm in your environment if using a non-owner role.

---

## What the migration does

1. `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for each table listed above.
2. `REVOKE ALL ON TABLE … FROM anon, authenticated` for each table.
3. Does **not** create policies, change columns, or alter product logic.

---

## Supabase platform context

Supabase is moving toward **explicit grants** for new `public` tables and the Data API (new tables not exposed by default without deliberate `GRANT`s). DAT already treats the Data API as **non-primary**; this batch makes posture **explicit** for sensitive auth tables that were created after the earlier internal-table RLS migration.

See [supabase-data-api-grants.md](../ops/supabase-data-api-grants.md) for audit baseline and future Data API rules.

---

## Policy for future `public` tables

Every new table in `public` needs an **explicit** classification before merge:

| Class                                  | RLS                                                                             | `anon` / `authenticated` grants                      | Policies                              |
| -------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| **A — Client-facing (Data API)**       | Enabled                                                                         | Minimal explicit `GRANT`s only if required           | Reviewed least-privilege RLS per role |
| **B — Internal-only (Prisma/backend)** | Enabled                                                                         | **None** — `REVOKE ALL` from `anon`, `authenticated` | **No** default permissive policies    |
| **C — Long-term internal**             | Consider a **non-`public` schema** (e.g. private/internal) in a future refactor | N/A for PostgREST on `public`                        | Document in migration + ops docs      |

Default for Prisma-managed app data: **class B** unless a reviewed feature requires class A.

---

## Migration checklist (operators & authors)

When adding or changing `public` tables:

- [ ] Classify **A (client Data API)** vs **B (internal)** vs **C (private schema)**.
- [ ] If **B**: include `ENABLE ROW LEVEL SECURITY` and `REVOKE ALL … FROM anon, authenticated` in the same or follow-up migration (idempotent SQL is fine).
- [ ] Do **not** add blanket `CREATE POLICY … TO anon` / `authenticated` on token, audit, or billing tables without a threat-model review.
- [ ] Confirm **Prisma** paths still work (owner role / bypass expectations).
- [ ] Re-run **Supabase Security Advisor** after `prisma migrate deploy` on the target project.
- [ ] Run `pnpm -C driving_school_platform/nextjs_space check` in CI/local before merge.

---

## Related internal tables (follow-up)

**Class-B v1 (done):** `billing_events`, `entitlement_grants`, `organization_domains`, `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags` — see [`20260603120000_supabase_rls_class_b_hardening_v1`](../../prisma/migrations/20260603120000_supabase_rls_class_b_hardening_v1/migration.sql).

**Class-B v1b (planned slices — DEC-030):** [supabase-rls-class-b-hardening-v1b-plan.md](../../../../docs/architecture/supabase-rls-class-b-hardening-v1b-plan.md)

| Slice                   | Tables                                                                                                                                                                                       | Status                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1 nextauth**         | `accounts`, `sessions`, `verification_tokens`, `users`                                                                                                                                       | **Done + deployed + smoke-passed** (2026-06-10, main `edd73de`) — [`20260610150000_supabase_rls_class_b_hardening_v1b_nextauth`](../../prisma/migrations/20260610150000_supabase_rls_class_b_hardening_v1b_nextauth/migration.sql) |
| **B2 tenant business**  | `students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests`, `lesson_counters`, `exam_registrations`, `payments`, `notifications`, `organizations`, `organization_features` | Planned after B1                                                                                                                                                                                                                   |
| **B3 global reference** | `categories`, `transmission_types`, `user_preferences`                                                                                                                                       | Optional P3 — lower priority; global catalog not PII                                                                                                                                                                               |

**Not v1b:** tenant-scoped `CREATE POLICY` → `supabase-rls-tenant-policies-v1` (P2, separate).

---

## Deploy

Apply with the normal Prisma workflow on each environment ([supabase-prisma-migrations.md](../ops/supabase-prisma-migrations.md)):

```bash
pnpm exec prisma migrate deploy
```

Then confirm Security Advisor is clear for the four tables and smoke auth/email flows (invite, reset, verification, login rate limit) via the app — not via PostgREST.

---

## Related DAT_3.5 docs

- [auth-email-security-review.md](./auth-email-security-review.md) — auth/email security backlog and batch status
- [auth-rate-limit-foundation.md](./auth-rate-limit-foundation.md) — `rate_limit_buckets` behavior
