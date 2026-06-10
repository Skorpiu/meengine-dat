# Supabase RLS Class-B Hardening v1b — Plan (sliced)

**Batch:** `supabase-rls-class-b-hardening-v1b-plan-v1` (+ B1/B2 implementation slices)  
**Status:** Plan **done**; B1 **merged + deployed + smoke-passed**; B2 **merged + deployed + smoke-passed**; B3 **merged + deployed + smoke-passed** (validated env 2026-06-10). **RLS Class-B v1b revoke-only complete (31/31 tables).** Tenant `CREATE POLICY` (`supabase-rls-tenant-policies-v1`) remains **P2 separate**.  
**Prior analysis:** `supabase-rls-class-b-hardening-v1b-review` (analysis-only)  
**Baseline main:** `f22b418`  
**Related:** [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md), [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) (D4 NOT NULL deployed on validated env)

---

## Purpose

Formalize **sliced** Class-B RLS hardening for the **19 remaining** `public` tables without RLS in migrations today. Reject a monolithic v1b migration covering all 19 tables in one deploy.

**Class-B pattern (every SQL slice):**

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
- `REVOKE ALL ON TABLE … FROM anon, authenticated`
- **No** `CREATE POLICY`
- **No** `FORCE ROW LEVEL SECURITY`
- **No** Prisma schema or application runtime changes

**Explicitly out of scope for v1b (all slices):** tenant-scoped `CREATE POLICY`, JWT/session helper functions, `@supabase/supabase-js`, Data API exposure, auth/billing/People runtime changes.

---

## Executive summary

| Topic | Decision |
| ----- | -------- |
| **Risk today** | Defense-in-depth / Supabase Data API / Security Advisor — **not** a confirmed Prisma runtime tenant bug |
| **Primary access path** | Next.js server → Prisma → Postgres (`DATABASE_URL`); **no** `supabase-js` in repo |
| **Prisma vs RLS** | App connection user is typically table **owner** → bypasses RLS (no FORCE RLS) |
| **D4 NOT NULL (6 operational tables)** | Done on validated env — improves **future** tenant policies only; **does not** change v1b revoke-only SQL |
| **v1b** | Sliced revoke-only hardening (B1 → B2 → B3) |
| **Tenant policies** | **`supabase-rls-tenant-policies-v1`** — separate **P2** batch; requires helper/JWT analysis; only if Data API tenant access is product-required |

---

## Current inventory (as of plan date)

### RLS migrations already in repo (3)

| Migration | Tables |
| --------- | ------ |
| `20260513180000_enable_rls_internal_tables` | `billing_events`, `entitlement_grants`, `organization_domains` (RLS only) |
| `20260529120000_harden_sensitive_auth_tables_rls` | `user_invitations`, `password_reset_tokens`, `email_verification_tokens`, `rate_limit_buckets` (RLS + REVOKE) |
| `20260603120000_supabase_rls_class_b_hardening_v1` | Above 3 (REVOKE); plus `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags` (RLS + REVOKE) |

### Already hardened — 12 tables (RLS enabled)

`audit_logs`, `billing_events`, `configuration_history`, `email_verification_tokens`, `entitlement_grants`, `feature_flags`, `license_keys`, `organization_domains`, `password_reset_tokens`, `rate_limit_buckets`, `system_settings`, `user_invitations`

- **`CREATE POLICY` in repo:** **0** (intentional)
- **`rls_enabled_no_policy` on these 12:** **INFO / expected** — deny-by-default for `anon`/`authenticated` Data API roles

### Candidates for v1b — 19 tables (no RLS in migrations)

Grouped by planned slice below.

---

## Sliced implementation plan

### Phase B1 — `supabase-rls-class-b-hardening-v1b-nextauth-v1` (recommended first SQL slice)

**Tables (4):** NextAuth adapter + core auth identity

| Table | Prisma model | Rationale |
| ----- | ------------ | --------- |
| `accounts` | Account | OAuth adapter secrets; high advisor signal |
| `sessions` | Session | Session tokens; auth-critical |
| `verification_tokens` | VerificationToken | NextAuth verification |
| `users` | User | PII + `passwordHash`; `PLATFORM_ADMIN` may have `organizationId` null — **no tenant policy in this slice** |

**Approval gate:** `APPROVED TO IMPLEMENT: supabase-rls-class-b-hardening-v1b-nextauth-v1` (D4 — RLS/grants)

**Suggested migration name:** `supabase_rls_class_b_hardening_v1b_nextauth_v1`

---

### Phase B2 — `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1`

**Tables (12):** Tenant business + platform registry (revoke-only; **not** tenant policies)

| Table | Prisma model | Notes |
| ----- | ------------ | ----- |
| `students` | Student | `organizationId` NOT NULL on validated env (DEC-027) |
| `instructors` | Instructor | same |
| `vehicles` | Vehicle | same |
| `lessons` | Lesson | same |
| `exams` | Exam | same |
| `lesson_requests` | LessonRequest | same |
| `lesson_counters` | LessonCounter | Scope via `studentId` parent |
| `exam_registrations` | ExamRegistration | Scope via `examId` + `studentId` |
| `payments` | Payment | Billing UI; server-only today |
| `notifications` | Notification | Via `userId` |
| `organizations` | Organization | Platform/tenant registry |
| `organization_features` | OrganizationFeature | Entitlement gating metadata |

**Approval gate:** `APPROVED TO IMPLEMENT: supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` (D4)

**Suggested migration name:** `supabase_rls_class_b_hardening_v1b_tenant_business_revoke`

**Prerequisite:** B1 deployed and smoke-passed on target environment (done validated env 2026-06-10).

---

### Phase B3 — `supabase-rls-class-b-hardening-v1b-global-reference-v1` (P3 — optional / separate decision)

**Tables (3):**

| Table | Prisma model | Why separate |
| ----- | ------------ | ------------ |
| `categories` | Category | **Global reference** catalog — not tenant-owned; low sensitivity |
| `transmission_types` | TransmissionType | **Global reference** — shared across schools |
| `user_preferences` | UserPreference | User-scoped via `userId`; possible future Data API read — **defer** unless advisor pressure |

**Rationale for treating `categories` / `transmission_types` apart from B1/B2:**

- They are **not** PII/auth tables and carry **no** `organizationId`.
- Product may someday expose **read-only** reference data via server APIs (already today) or, with explicit review, via Data API — hardening is still Class-B default, but **priority is lower** than auth and tenant business tables.
- Mixing them into B2 would blur **tenant operational** hardening with **global catalog** decisions.
- **Do not** add permissive anon policies on categories in v1b — if public catalog via Data API is ever approved, that is a **separate product + security** batch (Class A), not v1b revoke-only.

**Approval gate:** `APPROVED TO IMPLEMENT: supabase-rls-class-b-hardening-v1b-global-reference-v1` (D4) — only when B1/B2 are stable or advisor requires.

---

## Explicitly deferred — not v1b

| Batch | Priority | Why separate |
| ----- | -------- | ------------ |
| **`supabase-rls-tenant-policies-v1`** | P2 | Requires `CREATE POLICY` + tenant claim helper (JWT/session/`current_setting`); only if **real** Data API tenant access is needed; **not** mixed with revoke-only v1b |
| **`audit-log-tenant-context-foundation`** | P2 | `audit_logs` already Class-B hardened; column/query work is separate |
| **`supabase-exposed-schema-review`** | P2 | Platform config — reduce `public` Data API exposure |
| **`supabase-private-schema-refactor`** | P3 | Move internal tables out of `public` |

---

## Prisma runtime impact (expected)

| Layer | v1b revoke-only impact |
| ----- | ---------------------- |
| **Prisma (owner role)** | **No change expected** — owner bypasses RLS without FORCE RLS |
| **PostgREST / anon / authenticated** | **Deny** — RLS on + no policies + REVOKE |
| **Application tenant guards** | **Unchanged** — RLS does not replace session + host guard |
| **NextAuth adapter reads/writes** | **Must smoke-test** after B1 — same pattern as prior auth-table migration |

**Operator confirmation (before first deploy):** verify `DATABASE_URL` role is table owner (or equivalent bypass). Document result in deploy notes; do not paste credentials.

---

## GO / NO-GO gate (future SQL slices)

| # | Check | GO | NO-GO |
| - | ----- | -- | ----- |
| 1 | **Named slice only** (B1, B2, or B3) | Matches approved batch name | Monolithic 19-table migration |
| 2 | **SQL pattern** | RLS + REVOKE only | Any `CREATE POLICY` or `FORCE RLS` |
| 3 | **Scope** | Tables listed for that slice only | Extra tables “while we’re here” |
| 4 | **Runtime** | No app/API/auth/billing changes in same batch | Mixed feature batch |
| 5 | **`pnpm check`** | Pass on branch with migration file | Fail |
| 6 | **Operator `migrate deploy`** | Success on named target env | Failed deploy |
| 7 | **`prisma migrate status`** | Up to date post-deploy | Pending migrations |
| 8 | **Slice smoke tests** | All pass (see below) | Auth or core CRUD regression |
| 9 | **Security Advisor** | Re-run; no unexplained new criticals | Unreviewed critical findings |
| 10 | **Explicit approval** | `APPROVED TO IMPLEMENT: <slice-batch-name>` | Plan doc alone |

---

## Smoke test matrix

### B1 — `supabase-rls-class-b-hardening-v1b-nextauth-v1` (mandatory after deploy)

**Deploy evidence (2026-06-10, validated target env):**

| Check | Result |
| ----- | ------ |
| Main merge | `edd73de` (feature `d579a1f`) |
| Migration | `20260610150000_supabase_rls_class_b_hardening_v1b_nextauth` applied |
| `pnpm exec prisma migrate deploy` | Success (operator) |
| `pnpm exec prisma migrate status` | 24 migrations; database schema up to date |
| `pnpm -C driving_school_platform/nextjs_space check` | 163 test files / 1223 tests / build OK |
| Tables hardened | `accounts`, `sessions`, `verification_tokens`, `users` |
| Manual auth smoke (#2–#9 below) | **Pass** (operator-confirmed) |

Manual B1 smoke tests confirmed green by operator after deploy.

| # | Test | Expected | Status (2026-06-10) |
| - | ---- | -------- | --------------------- |
| 1 | `pnpm exec prisma migrate status` | Database schema is up to date | **Pass** |
| 2 | Login **Platform Admin** | Success | **Pass** |
| 3 | Login **School Admin** (tenant host) | Success | **Pass** |
| 4 | Login **Student** | Success | **Pass** |
| 5 | Login **Instructor** | Success | **Pass** |
| 6 | **Password reset** flow (request + confirm) | Success / expected errors only | **Pass** |
| 7 | **Email verification** flow | Success / expected errors only | **Pass** |
| 8 | **Invitation accept** (pending invite) | Success; no duplicate Student | **Pass** |
| 9 | Open **`/admin/users`** (School Admin) | People page loads | **Pass** |
| 10 | `pnpm -C driving_school_platform/nextjs_space check` | Pass | **Pass** |

Optional: re-run Supabase Security Advisor; confirm `accounts`, `sessions`, `verification_tokens`, `users` no longer flagged `rls_disabled_in_public` (or grants cleaned).

### B2 — `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` (mandatory after deploy)

**Deploy evidence (2026-06-10, validated target env):**

| Check | Result |
| ----- | ------ |
| Main merge | `dd26d18` (feature `dce55c7`) |
| Migration | `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke` applied |
| `pnpm exec prisma migrate deploy` | Success (operator) |
| `pnpm exec prisma migrate status` | 25 migrations; database schema up to date |
| `pnpm -C driving_school_platform/nextjs_space check` | 163 test files / 1223 tests / build OK |
| Tables hardened | `students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests`, `lesson_counters`, `exam_registrations`, `payments`, `notifications`, `organizations`, `organization_features` |
| Manual B2 smoke (#2–#15 below) | **Pass** (operator-confirmed green) |

Manual B2 smoke tests confirmed green by operator after deploy.

| # | Test | Expected | Status (2026-06-10) |
| - | ---- | -------- | --------------------- |
| 1 | `pnpm exec prisma migrate status` | Database schema is up to date | **Pass** |
| 2 | Login **Platform Admin** | Success | **Pass** |
| 3 | Login **School Admin** (tenant host) | Success | **Pass** |
| 4 | Login **Student** | Success | **Pass** |
| 5 | Login **Instructor** | Success | **Pass** |
| 6 | Open **`/admin/users`** | People page loads | **Pass** |
| 7 | Open **`/admin/vehicles`** | Fleet page loads | **Pass** |
| 8 | Open **`/admin/lessons`** | Lessons page loads | **Pass** |
| 9 | Create/edit **manual Student** | Success | **Pass** |
| 10 | Create/edit **Vehicle** | Success | **Pass** |
| 11 | Create/edit **Lesson** | Success | **Pass** |
| 12 | Student import **dry-run** | Preview succeeds (zero-write) | **Pass** |
| 13 | **Invitation accept** (pending invite) | Success; no duplicate Student | **Pass** |
| 14 | **Password reset** flow | Success / expected errors only | **Pass** |
| 15 | **Email verification** flow | Success / expected errors only | **Pass** |
| 16 | `pnpm -C driving_school_platform/nextjs_space check` | Pass | **Pass** |

Optional: re-run Supabase Security Advisor; confirm B2 tables no longer flagged `rls_disabled_in_public`.

### B3 — `supabase-rls-class-b-hardening-v1b-global-reference-v1` (mandatory after deploy)

**Deploy evidence (2026-06-10, validated target env):**

| Check | Result |
| ----- | ------ |
| Main merge | `cdfacf2` (feature `f63f19d`) |
| Migration | `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference` applied |
| `pnpm exec prisma migrate deploy` | Success (operator) |
| `pnpm exec prisma migrate status` | 26 migrations; database schema up to date |
| `pnpm -C driving_school_platform/nextjs_space check` | 163 test files / 1223 tests / build OK |
| Tables hardened | `categories`, `transmission_types`, `user_preferences` |
| Manual B3 smoke (#3–#11 below) | **Pass** (operator-confirmed all green) |
| **v1b revoke-only final state** | **Complete** — B1+B2+B3 deployed + smoke green; 31/31 Prisma tables |

Manual B3 smoke tests confirmed all green by operator after deploy.

| # | Test | Expected | Status (2026-06-10) |
| - | ---- | -------- | --------------------- |
| 1 | `pnpm exec prisma migrate status` | Database schema is up to date | **Pass** |
| 2 | `pnpm exec prisma migrate deploy` | Success (operator) | **Pass** |
| 3 | Login **Platform Admin** | Success | **Pass** |
| 4 | Login **School Admin** (tenant host) | Success | **Pass** |
| 5 | Login **Student** | Success | **Pass** |
| 6 | Login **Instructor** | Success | **Pass** |
| 7 | Open **`/admin/users`** | People page loads | **Pass** |
| 8 | Open **`/admin/lessons`** | Lessons page loads | **Pass** |
| 9 | Open **`/admin/vehicles`** | Fleet page loads | **Pass** |
| 10 | Load **categories** and **transmission types** in Student/Vehicle/Lesson forms | Reference options visible | **Pass** |
| 11 | Open **`/preferences`** | User preferences page loads | **Pass** |
| 12 | `pnpm -C driving_school_platform/nextjs_space check` | Pass | **Pass** |

Optional: re-run Supabase Security Advisor; confirm B3 tables no longer flagged `rls_disabled_in_public`.

---

## Phased status

| Phase | Batch | Status |
| ----- | ----- | ------ |
| v1 | `supabase-rls-class-b-hardening-v1` | **Done** — 8 tables |
| Plan | `supabase-rls-class-b-hardening-v1b-plan-v1` | **Done** (this document) |
| B1 | `supabase-rls-class-b-hardening-v1b-nextauth-v1` | **Done** — merged `edd73de`; deployed + smoke-passed validated env 2026-06-10 |
| B2 | `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` | **Done** — merged `dd26d18` (feature `dce55c7`); deployed + smoke-passed validated env 2026-06-10 |
| B3 | `supabase-rls-class-b-hardening-v1b-global-reference-v1` | **Done** — merged `cdfacf2` (feature `f63f19d`); deployed + smoke-passed validated env 2026-06-10 |
| **v1b** | **Revoke-only track** | **Complete** — 31/31 Prisma tables; B1+B2+B3 deployed + smoke green |
| P2 | `supabase-rls-tenant-policies-v1` | **Deferred** — not part of v1b |

---

## What this batch did not do

- No Prisma migration or SQL files
- No `CREATE POLICY`, `FORCE ROW LEVEL SECURITY`, or grant changes in repo
- No runtime, auth, billing, People, tenant guard, or demo guard changes
- Did not approve `supabase-rls-tenant-policies-v1`

---

## References

- [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md)
- [decision-log.md](./decision-log.md) — DEC-030
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md`
- `driving_school_platform/nextjs_space/docs/ops/supabase-data-api-grants.md`
- `driving_school_platform/nextjs_space/docs/engineering/supabase-security-hardening.md`
