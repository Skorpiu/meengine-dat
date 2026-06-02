# Supabase RLS / Data API Policy Matrix (DAT)

**Batch:** `supabase-rls-data-api-policy-matrix`  
**Status:** Classification and planning only — **no SQL policies, grants, migrations, schema, or runtime changes in this batch.**  
**Schema source:** `driving_school_platform/nextjs_space/prisma/schema.prisma` (as of matrix date).  
**Related:** [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md), [supabase-data-api-policy.md](../../driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md), [supabase-data-api-grants.md](../../driving_school_platform/nextjs_space/docs/ops/supabase-data-api-grants.md), [supabase-security-hardening.md](../../driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md).

---

## Purpose

DAT uses **Supabase Postgres** with **Prisma** as the primary application data path (`DATABASE_URL` / `DIRECT_URL`). The **Supabase Data API** (PostgREST, GraphQL, `supabase-js` with **anon** / **authenticated** keys) is **not** the primary surface today.

This matrix:

1. Classifies every Prisma-mapped `public` table by intended access path.
2. Records **known** RLS and Data API posture from existing migrations and ops docs.
3. States whether **anon** / **authenticated** Data API access should remain blocked.
4. Identifies **future** policy/grant work (deferred — not implemented here).
5. Confirms that **server-side Prisma** (and, if ever used correctly, **service_role** on locked-down server paths) remains the expected access path for internal tables.

**Out of scope for this document:** `CREATE POLICY`, `GRANT` / `REVOKE` SQL, Prisma migrations, production `migrate deploy`, or changing application logic.

---

## Executive summary

| Posture | Count | Meaning |
| ------- | ----- | ------- |
| **Primary path: Prisma / server** | All 31 tables | Application reads/writes via Next.js API routes + Prisma |
| **RLS enabled in migrations (7 tables)** | 7 | Defense-in-depth for Data API exposure |
| **RLS + explicit REVOKE anon/authenticated (4 tables)** | 4 | Auth/token/rate-limit tables hardened |
| **RLS enabled, no REVOKE in migration (3 tables)** | 3 | Billing/platform internal tables |
| **No RLS migration yet (21 tables)** | 21 | Rely on platform defaults + app guards; candidates for class B hardening |
| **Intended anon/authenticated Data API access** | **0 tables today** | No reviewed feature requires PostgREST client access |

**Decision (this batch):** Default all Prisma-managed `public` tables to **internal-only (class B)** unless a future product feature explicitly requires **client-facing Data API (class A)** with threat-model review.

---

## Access path legend

| Symbol | Meaning |
| ------ | ------- |
| **Prisma-primary** | Expected path: Next.js server → Prisma → Postgres. No browser PostgREST. |
| **Block anon/auth** | **anon** and **authenticated** Data API roles must **not** read/write this table. |
| **RLS: enabled** | `ENABLE ROW LEVEL SECURITY` applied in a committed migration. |
| **RLS: none (known)** | No DAT migration enables RLS yet; Supabase Security Advisor may flag `rls_disabled_in_public`. |
| **Revoke: yes** | Migration includes `REVOKE ALL … FROM anon, authenticated`. |
| **Revoke: no / unknown** | No explicit REVOKE in repo migrations; operator should confirm grants in Supabase dashboard. |
| **Future policy** | Whether deliberate RLS policies for Data API roles might be needed later. |
| **Service-role** | `service_role` bypasses RLS; server-only secret — never in client bundles. Not a substitute for app authorization. |

---

## Category definitions

| Category | Description | Default Data API posture |
| -------- | ----------- | ------------------------ |
| **SERVICE_INTERNAL** | Backend-only; cron, tokens, rate limits, NextAuth adapter internals | Block anon/auth; RLS enabled without permissive policies |
| **AUTH_SECURITY** | Users, sessions, invitations, verification — high sensitivity | Block anon/auth; RLS + REVOKE where hardened |
| **TENANT_BUSINESS** | School operational data scoped by tenant (`organizationId` or validated parent) | Block anon/auth; Prisma + app tenant guards; optional future tenant RLS |
| **BILLING_PLATFORM** | Subscriptions, entitlements, license keys, billing webhooks | Block anon/auth; platform-admin/server paths only |
| **AUDIT_CONFIG_HISTORY** | Audit logs, config history, system settings, feature flags | Block anon/auth; no client exposure |
| **GLOBAL_REFERENCE** | Shared catalog not tenant-owned (categories, transmission types) | Block anon/auth by default; read-only server APIs today |
| **FUTURE_CLIENT_FACING** | Tables that *might* later justify narrow Data API + RLS policies | Block until reviewed feature ships |

---

## Why `rls_enabled_no_policy` is intentional (service-only tables)

Supabase Security Advisor and linter checks often report **`rls_enabled_no_policy`** (RLS on, zero policies) as an **INFO** finding. For DAT **internal / service-only** tables, that state is **deliberate and safe**:

1. **Deny-by-default for RLS-subject roles.** In PostgreSQL, when RLS is enabled and **no policy** matches a role, that role gets **zero rows** (for SELECT) and cannot write unless bypassing RLS.

2. **PostgREST / Data API uses anon and authenticated.** Those roles are subject to RLS. With no permissive policies, accidental REST exposure does not leak data.

3. **Prisma uses the database connection user**, typically the table **owner** (or equivalent). Table owners **bypass RLS** in standard Postgres unless `FORCE ROW LEVEL SECURITY` is set (DAT does **not** use FORCE RLS today).

4. **No permissive policies is a feature, not a gap.** Adding blanket `USING (true)` policies for `authenticated` would **weaken** posture without replacing application tenant guards.

5. **Explicit REVOKE complements RLS.** For the four auth-sensitive tables, migrations also `REVOKE ALL` from `anon` / `authenticated` so table-level grants cannot bypass RLS expectations.

**Operator note:** Treat `rls_enabled_no_policy` on class B tables as **expected**. Treat `rls_disabled_in_public` on internal tables as a **hardening candidate** (enable RLS + optional REVOKE), not as automatic permission to add permissive policies.

---

## Known migration baseline (evidence)

| Migration | Tables | RLS | REVOKE anon/auth |
| --------- | ------ | --- | ---------------- |
| `20260513180000_enable_rls_internal_tables` | `billing_events`, `entitlement_grants`, `organization_domains` | Yes | No |
| `20260529120000_harden_sensitive_auth_tables_rls` | `user_invitations`, `password_reset_tokens`, `email_verification_tokens`, `rate_limit_buckets` | Yes | Yes |

All other tables: **no RLS statements** in committed Prisma migrations (as of this matrix).

Deep ops context: [supabase-data-api-policy.md](../../driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md), [supabase-security-hardening.md](../../driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md).

---

## Table matrix (all Prisma models)

PostgreSQL table names use `@@map` values from the schema.

### AUTH_SECURITY

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `users` | User | Optional `organizationId`; PLATFORM_ADMIN may be global | None (known) | Unknown | Auth APIs + admin; never expose `passwordHash` / tokens in lists | **Yes** | Unlikely for Data API; app session is source of truth | **Yes** |
| `accounts` | Account | Via `userId` | None (known) | Unknown | NextAuth adapter — server only | **Yes** | Review if Data API ever enabled for auth | **Yes** |
| `sessions` | Session | Via `userId` | None (known) | Unknown | NextAuth adapter — server only | **Yes** | Same as accounts | **Yes** |
| `verification_tokens` | VerificationToken | N/A (NextAuth) | None (known) | Unknown | NextAuth adapter — server only | **Yes** | Same as accounts | **Yes** |
| `user_invitations` | UserInvitation | Required `organizationId` | **Enabled** | **Yes** | Admin invite APIs; `tokenHash` never in client lists | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `password_reset_tokens` | PasswordResetToken | Via `userId` | **Enabled** | **Yes** | Password reset service | **Yes** | **No** | **Yes** |
| `email_verification_tokens` | EmailVerificationToken | Via `userId` | **Enabled** | **Yes** | Email verification service | **Yes** | **No** | **Yes** |
| `rate_limit_buckets` | RateLimitBucket | Global (hashed keys) | **Enabled** | **Yes** | Auth/email rate limiter | **Yes** | **No** | **Yes** |

### TENANT_BUSINESS

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `students` | Student | `organizationId` (nullable today — see org audit) | None (known) | Unknown | Admin/student/instructor APIs; session + host guard | **Yes** | Optional tenant RLS after NOT NULL backfill — **deferred** | **Yes** |
| `instructors` | Instructor | `organizationId` (nullable today) | None (known) | Unknown | Admin/instructor APIs | **Yes** | Optional tenant RLS — **deferred** | **Yes** |
| `lessons` | Lesson | `organizationId` (nullable today) | None (known) | Unknown | Calendar, admin, student/instructor views | **Yes** | Optional tenant RLS — **deferred** | **Yes** |
| `lesson_requests` | LessonRequest | `organizationId` (nullable today) | None (known) | Unknown | Student request + admin review | **Yes** | Optional tenant RLS — **deferred** | **Yes** |
| `lesson_counters` | LessonCounter | Via `studentId` → Student | None (known) | Unknown | Progress/counter services | **Yes** | Optional via parent tenant — **deferred** | **Yes** |
| `vehicles` | Vehicle | `organizationId` (nullable today) | None (known) | Unknown | Admin fleet management | **Yes** | Optional tenant RLS — **deferred** | **Yes** |
| `exams` | Exam | `organizationId` (nullable today) | None (known) | Unknown | Admin exam scheduling | **Yes** | Optional tenant RLS — **deferred** | **Yes** |
| `exam_registrations` | ExamRegistration | Via `examId` + `studentId` | None (known) | Unknown | Exam enrollment flows | **Yes** | Optional via parent — **deferred** | **Yes** |
| `payments` | Payment | Via `userId` / optional `studentId` | None (known) | Unknown | Billing UI + admin; sanitized errors | **Yes** | Unlikely Data API; webhook/server writes | **Yes** |
| `notifications` | Notification | Via `userId` | None (known) | Unknown | In-app notification APIs | **Yes** | Possible **future** read-only policy for authenticated user-owned rows — **only if** product moves to `supabase-js` | **Yes** (today) |

### BILLING_PLATFORM

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `organizations` | Organization | Platform root / tenant registry | None (known) | Unknown | Host resolution, platform admin, subscription metadata | **Yes** | Platform-admin server paths only | **Yes** |
| `organization_domains` | OrganizationDomain | Required `organizationId` | **Enabled** | No | Host → org mapping; security-sensitive | **Yes** | Confirm REVOKE if Advisor flags grants — **deferred** | **Yes** |
| `organization_features` | OrganizationFeature | Required `organizationId` | None (known) | Unknown | Entitlement/feature gating | **Yes** | Server-side feature checks | **Yes** |
| `entitlement_grants` | EntitlementGrant | Required `organizationId` | **Enabled** | No | License/entitlement engine | **Yes** | Confirm REVOKE — **deferred** | **Yes** |
| `license_keys` | LicenseKey | Required `organizationId` | None (known) | Unknown | Platform operator; key material sensitive | **Yes** | Class B hardening candidate | **Yes** |
| `billing_events` | BillingEvent | Optional `organizationId` | **Enabled** | No | Webhook ingestion — server only | **Yes** | Confirm REVOKE — **deferred** | **Yes** |

### AUDIT_CONFIG_HISTORY

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `audit_logs` | AuditLog | **No `organizationId` today** — see `audit-log-tenant-context-foundation` | None (known) | Unknown | Internal audit write/read (admin/platform) | **Yes** | Tenant-scoped queries need app filter until column added | **Yes** |
| `configuration_history` | ConfigurationHistory | Optional `organizationId` | None (known) | Unknown | Config change audit | **Yes** | Class B hardening candidate | **Yes** |
| `system_settings` | SystemSetting | Optional `organizationId`; global keys exist | None (known) | Unknown | Server reads; `isPublic` flag is app-level, not PostgREST | **Yes** | Never expose raw settings via Data API | **Yes** |
| `feature_flags` | FeatureFlag | Optional `organizationId` | None (known) | Unknown | Server-side flag evaluation | **Yes** | No client flag table access | **Yes** |
| `user_preferences` | UserPreference | Via `userId` | None (known) | Unknown | User settings APIs | **Yes** | Possible future user-scoped policy — **deferred** | **Yes** |

### GLOBAL_REFERENCE

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `categories` | Category | Shared catalog | None (known) | Unknown | Reference data in forms/lessons | **Yes** (default) | Read-only anon policy **only if** public catalog via Data API is product-approved | **Yes** |
| `transmission_types` | TransmissionType | Shared catalog | None (known) | Unknown | Reference data | **Yes** (default) | Same as categories | **Yes** |

### SERVICE_INTERNAL (demo / ops — no separate tables)

Demo reset, cron, and ops scripts use the same tables above with **application guards** (`Organization.isDemo`, env secrets, mutation guards). No dedicated demo-only tables exist in the schema. Classify demo behavior as **policy on tenant business + platform tables**, not a separate RLS category.

---

## Summary by category

| Category | Tables | RLS in migrations | Block anon/auth (intended) | Future Data API policies |
| -------- | ------ | ------------------- | -------------------------- | ------------------------- |
| **AUTH_SECURITY** | 8 | 4 / 8 | **All 8** | **None planned** |
| **TENANT_BUSINESS** | 10 | 0 / 10 | **All 10** | **Deferred** — optional tenant RLS after org-id hardening |
| **BILLING_PLATFORM** | 6 | 3 / 6 | **All 6** | **None planned**; confirm REVOKE on 3 RLS-enabled |
| **AUDIT_CONFIG_HISTORY** | 5 | 0 / 5 | **All 5** | **None planned** |
| **GLOBAL_REFERENCE** | 2 | 0 / 2 | **Yes (default)** | **Only if** product opts into public catalog via Data API |
| **FUTURE_CLIENT_FACING** | 0 today | — | — | **notifications**, **user_preferences** are the first candidates if product pivots to `supabase-js` |

---

## Application-layer posture (defense in depth)

RLS and Data API blocks **do not replace** application tenant guards.

| Rule | Source |
| ---- | ------ |
| Never trust `organizationId` from request body/query | [system-design.md](./system-design.md) |
| Tenant scope from session + host guard | `assertUserTenantHost`, admin route patterns |
| Nullable `organizationId` on six operational tables is a **data-integrity risk** | [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md) |
| Sensitive tables require explicit approval before new grants/policies | [.cursor/rules/database.mdc](../../.cursor/rules/database.mdc) |

**Recommended sequencing:** org-id backfill → optional NOT NULL migrations → optional tenant RLS policies (separate gated batches). This matrix **does not** authorize NOT NULL or RLS SQL.

---

## Class A / B / C mapping (from supabase-security-hardening)

| Class | DAT default | This matrix |
| ----- | ----------- | ----------- |
| **A — Client-facing Data API** | Opt-in only | **0 tables** today |
| **B — Internal-only (Prisma/backend)** | Default for all Prisma tables | **31 / 31** intended |
| **C — Non-public schema** | Future refactor | **Deferred** — e.g. move token/audit tables out of `public` |

---

## Follow-up batches (recommended — not implemented)

| Priority | Batch (suggested name) | Work | Gate |
| -------- | ------------------------ | ---- | ---- |
| **P1** | `supabase-rls-class-b-hardening-v1` | Enable RLS + `REVOKE ALL FROM anon, authenticated` on remaining internal tables flagged by Security Advisor (e.g. `audit_logs`, `license_keys`, `configuration_history`, NextAuth adapter tables) — **idempotent SQL migration** | `APPROVED TO IMPLEMENT: supabase-rls-class-b-hardening-v1` (D4 — RLS/grants) |
| **P1** | `tenant-operational-organization-id-backfill-v1` | Backfill NULL `organizationId`; operator counts | Separate approval (data) |
| **P2** | `supabase-rls-tenant-policies-v1` | Optional **tenant-scoped** RLS policies on `students`, `lessons`, etc. **after** NOT NULL + app guard audit | D4; after org-id hardening |
| **P2** | `audit-log-tenant-context-foundation` | Add `organizationId` to `AuditLog`; plan tenant-scoped audit queries | Planning / migration gated |
| **P2** | `supabase-exposed-schema-review` | Remove `public` from Supabase exposed schemas or add dedicated `api` schema for any future Data API feature | Ops + product decision |
| **P3** | `supabase-private-schema-refactor` | Move class C tables out of `public` | Large refactor — defer |

**Improvement discovery (report only):**

| Finding | Category | Priority | Verdict |
| ------- | -------- | -------- | ------- |
| 21 tables lack RLS in migrations | SECURITY | P2 | **DEFER** to `supabase-rls-class-b-hardening-v1` |
| 3 RLS-enabled tables lack explicit REVOKE in repo | SECURITY | P2 | **DEFER** — confirm in Supabase dashboard; add REVOKE in hardening batch |
| `audit_logs` has no tenant column | DATA_INTEGRITY | P2 | **DEFER** — `audit-log-tenant-context-foundation` |
| Nullable operational `organizationId` | DATA_INTEGRITY | P1 | **DEFER** — existing backlog item |
| No `@supabase/supabase-js` dependency | DX | — | **ACCEPT** — intentional; Prisma-primary |

---

## Operator verification (optional — needs confirmation)

Run in Supabase SQL editor or psql against **target environment only**. Do not paste connection strings into tickets.

```sql
-- Tables with RLS enabled
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- Grants to anon / authenticated (sample)
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;
```

Re-run **Supabase Security Advisor** after any future RLS migration.

---

## ACCEPT / ADAPT / DEFER / REJECT (matrix triage)

| Recommendation | Verdict |
| -------------- | ------- |
| Document full table matrix before RLS SQL | **ACCEPT** — this document |
| Add permissive anon/authenticated policies on tenant tables now | **REJECT** |
| Enable RLS on all tables in this docs batch | **REJECT** — SQL deferred |
| `rls_enabled_no_policy` as intentional for service-only | **ACCEPT** |
| Prisma remains primary path | **ACCEPT** |
| Tenant RLS before org-id NOT NULL backfill | **REJECT** — wrong sequencing |
| Dedicated `api` schema for future client features | **DEFER** |

---

## References

- `docs/architecture/system-design.md` — tenancy, Prisma-primary stack
- `docs/architecture/tenant-required-operational-organization-id-audit.md` — nullable org columns
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md`
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-grants.md`
- `driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md`
- `.cursor/rules/database.mdc` — sensitive table gate
- Migrations: `20260513180000_enable_rls_internal_tables`, `20260529120000_harden_sensitive_auth_tables_rls`
