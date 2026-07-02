# Supabase RLS / Data API Policy Matrix (DAT)

**Batch:** `supabase-rls-data-api-policy-matrix` (+ follow-up `supabase-rls-class-b-hardening-v1`)  
**Status:** Classification matrix (docs); **class-B v1 SQL applied** in migration `20260603120000_supabase_rls_class_b_hardening_v1` (8 tables; no policies; operator deploy human-controlled).  
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
| **RLS enabled in migrations (31 tables)** | 31 | Defense-in-depth for Data API exposure (v1 + B1 + B2 + B3) |
| **RLS + explicit REVOKE anon/authenticated (31 tables)** | 31 | All hardened tables include REVOKE |
| **No RLS migration yet (0 tables)** | 0 | **v1b revoke-only complete** — all Prisma-mapped tables hardened |
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
| `20260513180000_enable_rls_internal_tables` | `billing_events`, `entitlement_grants`, `organization_domains` | Yes | No (REVOKE added in class-B v1) |
| `20260529120000_harden_sensitive_auth_tables_rls` | `user_invitations`, `password_reset_tokens`, `email_verification_tokens`, `rate_limit_buckets` | Yes | Yes |
| `20260603120000_supabase_rls_class_b_hardening_v1` | `billing_events`, `entitlement_grants`, `organization_domains` (REVOKE only); `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags` (RLS + REVOKE) | Yes (5 new); 3 prior | Yes (8 tables) |
| `20260610150000_supabase_rls_class_b_hardening_v1b_nextauth` | `accounts`, `sessions`, `verification_tokens`, `users` (RLS + REVOKE) | Yes (4 new) | Yes (4 tables) |
| `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke` | `students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests`, `lesson_counters`, `exam_registrations`, `payments`, `notifications`, `organizations`, `organization_features` (RLS + REVOKE) | Yes (12 new) | Yes (12 tables) |
| `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference` | `categories`, `transmission_types`, `user_preferences` (RLS + REVOKE) | Yes (3 new) | Yes (3 tables) |

**Deploy evidence (B1, 2026-06-10):** merged main `edd73de` (feature `d579a1f`); operator `migrate deploy` succeeded on validated target env; post-deploy **24** migrations up to date; `pnpm check` 163/1223/build OK; B1 manual auth smoke **pass** (operator-confirmed).

**Deploy evidence (B2, 2026-06-10):** merged main `dd26d18` (feature `dce55c7`); operator `migrate deploy` succeeded on validated target env; post-deploy **25** migrations up to date; `pnpm check` 163/1223/build OK; B2 manual smoke matrix **pass** (operator-confirmed green).

**Deploy evidence (B3, 2026-06-10):** merged main `cdfacf2` (feature `f63f19d`); operator `migrate deploy` succeeded on validated target env; post-deploy **26** migrations up to date; `pnpm check` 163/1223/build OK; B3 manual smoke matrix **pass** (operator-confirmed all green).

**All 31 Prisma-mapped `public` tables** have RLS + REVOKE in migrations. **RLS Class-B v1b revoke-only complete** — B1+B2+B3 deployed + smoke green on validated env (2026-06-10). Tenant `CREATE POLICY` (`supabase-rls-tenant-policies-v1`) remains **P2 separate**.

Deep ops context: [supabase-data-api-policy.md](../../driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md), [supabase-security-hardening.md](../../driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md).

---

## Table matrix (all Prisma models)

PostgreSQL table names use `@@map` values from the schema.

### AUTH_SECURITY

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `users` | User | Optional `organizationId`; PLATFORM_ADMIN may be global | **Enabled** | **Yes** | Auth APIs + admin; never expose `passwordHash` / tokens in lists | **Yes** | Unlikely for Data API; app session is source of truth | **Yes** |
| `accounts` | Account | Via `userId` | **Enabled** | **Yes** | NextAuth adapter — server only | **Yes** | Review if Data API ever enabled for auth | **Yes** |
| `sessions` | Session | Via `userId` | **Enabled** | **Yes** | NextAuth adapter — server only | **Yes** | Same as accounts | **Yes** |
| `verification_tokens` | VerificationToken | N/A (NextAuth) | **Enabled** | **Yes** | NextAuth adapter — server only | **Yes** | Same as accounts | **Yes** |
| `user_invitations` | UserInvitation | Required `organizationId` | **Enabled** | **Yes** | Admin invite APIs; `tokenHash` never in client lists | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `password_reset_tokens` | PasswordResetToken | Via `userId` | **Enabled** | **Yes** | Password reset service | **Yes** | **No** | **Yes** |
| `email_verification_tokens` | EmailVerificationToken | Via `userId` | **Enabled** | **Yes** | Email verification service | **Yes** | **No** | **Yes** |
| `rate_limit_buckets` | RateLimitBucket | Global (hashed keys) | **Enabled** | **Yes** | Auth/email rate limiter | **Yes** | **No** | **Yes** |

### TENANT_BUSINESS

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `students` | Student | `organizationId` NOT NULL (validated env; DEC-027) | **Enabled** | **Yes** | Admin/student/instructor APIs; session + host guard | **Yes** | **No** tenant policies in v1b; P2 separate | **Yes** |
| `instructors` | Instructor | `organizationId` NOT NULL (validated env) | **Enabled** | **Yes** | Admin/instructor APIs | **Yes** | **No** tenant policies in v1b | **Yes** |
| `lessons` | Lesson | `organizationId` NOT NULL (validated env) | **Enabled** | **Yes** | Calendar, admin, student/instructor views | **Yes** | **No** tenant policies in v1b | **Yes** |
| `lesson_requests` | LessonRequest | `organizationId` NOT NULL (validated env) | **Enabled** | **Yes** | Student request + admin review | **Yes** | **No** tenant policies in v1b | **Yes** |
| `lesson_counters` | LessonCounter | Via `studentId` → Student | **Enabled** | **Yes** | Progress/counter services | **Yes** | **No** tenant policies in v1b | **Yes** |
| `vehicles` | Vehicle | `organizationId` NOT NULL (validated env) | **Enabled** | **Yes** | Admin fleet management | **Yes** | **No** tenant policies in v1b | **Yes** |
| `exams` | Exam | `organizationId` NOT NULL (validated env) | **Enabled** | **Yes** | Admin exam scheduling | **Yes** | **No** tenant policies in v1b | **Yes** |
| `exam_registrations` | ExamRegistration | Via `examId` + `studentId` | **Enabled** | **Yes** | Exam enrollment flows | **Yes** | **No** tenant policies in v1b | **Yes** |
| `payments` | Payment | Via `userId` / optional `studentId` | **Enabled** | **Yes** | Billing UI + admin; sanitized errors | **Yes** | Unlikely Data API; webhook/server writes | **Yes** |
| `notifications` | Notification | Via `userId` | **Enabled** | **Yes** | In-app notification APIs | **Yes** | Possible **future** read-only policy — **only if** product moves to `supabase-js` | **Yes** (today) |

### BILLING_PLATFORM

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `organizations` | Organization | Platform root / tenant registry | **Enabled** | **Yes** | Host resolution, platform admin, subscription metadata | **Yes** | Platform-admin server paths only | **Yes** |
| `organization_domains` | OrganizationDomain | Required `organizationId` | **Enabled** | **Yes** | Host → org mapping; security-sensitive | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `organization_features` | OrganizationFeature | Required `organizationId` | **Enabled** | **Yes** | Entitlement/feature gating | **Yes** | Server-side feature checks | **Yes** |
| `entitlement_grants` | EntitlementGrant | Required `organizationId` | **Enabled** | **Yes** | License/entitlement engine | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `license_keys` | LicenseKey | Required `organizationId` | **Enabled** | **Yes** | Platform operator; key material sensitive | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `billing_events` | BillingEvent | Optional `organizationId` | **Enabled** | **Yes** | Webhook ingestion — server only | **Yes** | **No** permissive anon/auth policies | **Yes** |

### AUDIT_CONFIG_HISTORY

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `audit_logs` | AuditLog | **`organizationId` nullable** (tenant-aware v1); actor fields + `metadata`/`requestId` additive | **Enabled** | **Yes** | Internal audit write/read (admin/platform) | **Yes** | Tenant-scoped queries can filter on `organizationId` once write paths exist | **Yes** |
| `configuration_history` | ConfigurationHistory | Optional `organizationId` | **Enabled** | **Yes** | Config change audit | **Yes** | **No** permissive anon/auth policies | **Yes** |
| `system_settings` | SystemSetting | Optional `organizationId`; global keys exist | **Enabled** | **Yes** | Server reads; `isPublic` flag is app-level, not PostgREST | **Yes** | Never expose raw settings via Data API | **Yes** |
| `feature_flags` | FeatureFlag | Optional `organizationId` | **Enabled** | **Yes** | Server-side flag evaluation | **Yes** | No client flag table access | **Yes** |
| `user_preferences` | UserPreference | Via `userId` | **Enabled** | **Yes** | User settings APIs | **Yes** | Possible future user-scoped policy — **deferred** | **Yes** |

### GLOBAL_REFERENCE

| Table | Prisma model | Tenant scope | Current RLS | Revoke anon/auth | Intended path | Block anon/auth | Future policy | Prisma-primary |
| ----- | ------------ | ------------ | ----------- | ---------------- | ------------- | --------------- | ------------- | -------------- |
| `categories` | Category | Shared catalog | **Enabled** | **Yes** | Reference data in forms/lessons | **Yes** (default) | Read-only anon policy **only if** public catalog via Data API is product-approved | **Yes** |
| `transmission_types` | TransmissionType | Shared catalog | **Enabled** | **Yes** | Reference data | **Yes** (default) | Same as categories | **Yes** |

### SERVICE_INTERNAL (demo / ops — no separate tables)

Demo reset, cron, and ops scripts use the same tables above with **application guards** (`Organization.isDemo`, env secrets, mutation guards). No dedicated demo-only tables exist in the schema. Classify demo behavior as **policy on tenant business + platform tables**, not a separate RLS category.

---

## Summary by category

| Category | Tables | RLS in migrations | Block anon/auth (intended) | Future Data API policies |
| -------- | ------ | ------------------- | -------------------------- | ------------------------- |
| **AUTH_SECURITY** | 8 | 8 / 8 | **All 8** | **None planned** |
| **TENANT_BUSINESS** | 10 | 10 / 10 | **All 10** | **None planned** (revoke-only v1b B2) |
| **BILLING_PLATFORM** | 6 | 6 / 6 | **All 6** | **None planned** |
| **AUDIT_CONFIG_HISTORY** | 5 | 5 / 5 | **All 5** | **None planned** |
| **GLOBAL_REFERENCE** | 2 | 2 / 2 | **Yes (default)** | **Only if** product opts into public catalog via Data API |
| **FUTURE_CLIENT_FACING** | 0 today | — | — | **notifications**, **user_preferences** are the first candidates if product pivots to `supabase-js` |

---

## Application-layer posture (defense in depth)

RLS and Data API blocks **do not replace** application tenant guards.

| Rule | Source |
| ---- | ------ |
| Never trust `organizationId` from request body/query | [system-design.md](./system-design.md) |
| Tenant scope from session + host guard | `assertUserTenantHost`, admin route patterns |
| Six operational tables: `organizationId` NOT NULL on validated env (DEC-027) | [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) |
| Sensitive tables require explicit approval before new grants/policies | [.cursor/rules/database.mdc](../../.cursor/rules/database.mdc) |

**Recommended sequencing:** org-id NOT NULL (done validated env) → sliced v1b revoke-only → optional tenant RLS policies P2 (`supabase-rls-tenant-policies-v1`). Plan: [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md) (DEC-030).

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
| **P1** | `supabase-rls-class-b-hardening-v1` | **Done** — migration `20260603120000_supabase_rls_class_b_hardening_v1` (8 tables; see Known migration baseline) | Closed |
| **P1** | `supabase-rls-class-b-hardening-v1b-plan-v1` | **Done** — sliced plan (B1/B2/B3); DEC-030 | [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md) |
| **P1** | `supabase-rls-class-b-hardening-v1b-nextauth-v1` | **Done** — migration `20260610150000_supabase_rls_class_b_hardening_v1b_nextauth`; deployed validated env 2026-06-10 (main `edd73de`) | Closed |
| **P1** | `supabase-rls-class-b-hardening-v1b-nextauth-deploy-record-v1` | **Done** — deploy + smoke pass on validated env | Closed |
| **P1** | `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` | **Done** — migration `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke` (12 tables); deployed validated env 2026-06-10 (main `dd26d18`) | Closed |
| **P1** | `supabase-rls-class-b-hardening-v1b-tenant-business-deploy-record-v1` | **Done** — deploy + smoke pass on validated env | Closed |
| **P3** | `supabase-rls-class-b-hardening-v1b-global-reference-v1` | **Done** — migration `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference` (3 tables); deployed validated env 2026-06-10 (main `cdfacf2`) | Closed |
| **P3** | `supabase-rls-class-b-hardening-v1b-global-reference-deploy-record-v1` | **Done** — deploy + smoke pass on validated env; v1b revoke-only complete (31/31) | Closed |
| **P2** | `supabase-rls-tenant-policies-v1` | **Tenant `CREATE POLICY`** — separate from v1b; JWT/helper analysis; only if Data API tenant access required | D4; **not** v1b |
| **P2** | `audit-log-write-paths-foundation-v1` | `writeAuditEvent` service + wire 1–2 mutations | Runtime gated |
| **P2** | `supabase-exposed-schema-review` | Remove `public` from Supabase exposed schemas or add dedicated `api` schema for any future Data API feature | Ops + product decision |
| **P3** | `supabase-private-schema-refactor` | Move class C tables out of `public` | Large refactor — defer |

**Improvement discovery (report only):**

| Finding | Category | Priority | Verdict |
| ------- | -------- | -------- | ------- |
| 3 tables lack RLS in migrations (B1/B2 done) | SECURITY | P3 | **ACCEPT** — done in B3 `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference` |
| Class-B v1 (8 tables) RLS + REVOKE | SECURITY | P1 | **ACCEPT** — done in `20260603120000_supabase_rls_class_b_hardening_v1` |
| `audit_logs` has no tenant column | DATA_INTEGRITY | P2 | **RESOLVED (schema v1)** — `organizationId` added in `20260702120000_audit_log_tenant_context_v1`; write paths still pending |
| Operational `organizationId` NOT NULL | DATA_INTEGRITY | — | **Done** on validated env (DEC-027) |
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
| Monolithic v1b (19 tables one migration) | **REJECT** — use sliced plan DEC-030 |
| Tenant `CREATE POLICY` in v1b revoke batch | **REJECT** — `supabase-rls-tenant-policies-v1` only |
| Dedicated `api` schema for future client features | **DEFER** |

---

## References

- `docs/architecture/system-design.md` — tenancy, Prisma-primary stack
- `docs/architecture/tenant-required-operational-organization-id-audit.md` — nullable org columns
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md`
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-grants.md`
- `driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md`
- `.cursor/rules/database.mdc` — sensitive table gate
- [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md) — sliced v1b plan (DEC-030)
- Migrations: `20260513180000_enable_rls_internal_tables`, `20260529120000_harden_sensitive_auth_tables_rls`, `20260603120000_supabase_rls_class_b_hardening_v1`
