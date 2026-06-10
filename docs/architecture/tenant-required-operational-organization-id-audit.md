# Tenant Required Operational `organizationId` — Audit Report (v1)

**Batch:** `tenant-required-operational-organization-id-audit`  
**Status:** Classification and planning only — **no schema, migration, RLS, or runtime changes in this batch.**  
**Schema source:** `driving_school_platform/nextjs_space/prisma/schema.prisma` (as of audit date).  
**Related backlog:** `supabase-rls-data-api-policy-matrix`, `audit-log-tenant-context-foundation`.

---

## Purpose

External database critique flagged nullable `organizationId` on core operational models as a tenant-isolation risk. This report:

1. Inventories models with direct or indirect tenant reachability.
2. Classifies nullable vs required `organizationId` and legitimate exceptions.
3. Notes unique/index constraints affected by NULL tenant scope.
4. Records application-layer scoping posture (grep/code review).
5. Proposes a **phased backfill + hardening plan** (implementation gated separately).

**Out of scope for this document:** RLS policy SQL, Prisma migrations, production `migrate deploy`, or changing write paths.

---

## Executive summary

| Finding | Severity | Notes |
| ------- | -------- | ----- |
| Six operational tables allow `organizationId` NULL | **P1 data-integrity / tenant risk** | `Student`, `Instructor`, `Vehicle`, `Lesson`, `Exam`, `LessonRequest` |
| Application admin paths scope by session `organizationId` | **Mitigation (defense in app layer)** | Does not replace DB NOT NULL for tenant-critical rows |
| Existing backfill script does **not** cover `Student` / `Instructor` / `User` | **Gap** | `scripts/backfill-organization-scope.ts` |
| Postgres NULL in `@@unique([organizationId, schoolStudentId])` | **P1 if NULL rows exist** | Multiple NULL org rows can share the same `schoolStudentId` |
| Global uniques on `Vehicle.registrationNumber`, `SystemSetting.settingKey` | **Product / multi-tenant design debt** | Separate from nullable org; document for future clients |
| Row counts in Preview/Production | **Needs confirmation** | Operator SQL below; not run in audit batch |

**Recommended next implementation slice (gated):** extend backfill + validation queries, then optional NOT NULL migrations per table — **`tenant-operational-organization-id-backfill-v1`** (separate approval + migration gate).

---

## Classification legend

| Class | Meaning |
| ----- | ------- |
| **TENANT_REQUIRED** | Operational school data; `organizationId` should be NOT NULL at DB level after backfill |
| **TENANT_OPTIONAL_DUAL** | Row may be global/platform (`organizationId` NULL) or tenant-scoped |
| **TENANT_VIA_PARENT** | No `organizationId` column; tenant scope only through parent FK + app guards |
| **GLOBAL_REFERENCE** | Shared catalog; not tenant-owned |
| **PLATFORM_ROOT** | Organization / domain registry |

---

## Direct `organizationId` column inventory

### TENANT_REQUIRED (nullable today — target NOT NULL after backfill)

| Model | Prisma field | Nullable | Indexes / uniques | App write posture |
| ----- | ------------ | -------- | ----------------- | ----------------- |
| **Student** | `organizationId String?` | yes | `@@unique([organizationId, schoolStudentId])`, indexes on `organizationId` | Create/update/delete admin paths require session org; `createManualStudentRecord` sets `organizationId` (`lib/students/student-record-queries.ts`) |
| **Instructor** | `organizationId String?` | yes | index on `organizationId` | Lesson create resolves instructor under session org (`lib/lessons/lesson-create-service.ts`) |
| **Vehicle** | `organizationId String?` | yes | index; **`registrationNumber @unique` global** | Admin vehicle routes tenant-scoped |
| **Lesson** | `organizationId String?` | yes | multiple indexes incl. `(organizationId, studentId, lessonType, practicalLessonNumber)` | Create service always sets `organizationId` |
| **Exam** | `organizationId String?` | yes | index on `organizationId` | Admin exam flows tenant-scoped |
| **LessonRequest** | `organizationId String?` | yes | index on `organizationId` | Created in tenant context |

**Risk if NULL rows exist:** cross-tenant visibility if any query omits `organizationId` filter; orphan rows invisible to tenant dashboards but still reachable via ID guessing or buggy queries.

### TENANT_OPTIONAL_DUAL (nullable by design — do not blindly NOT NULL)

| Model | Nullable | Rationale |
| ----- | -------- | --------- |
| **User** | yes | `PLATFORM_ADMIN` and legacy rows may lack org; school roles normally have org from session/invitation |
| **BillingEvent** | yes | Provider events may arrive before org resolution |
| **SystemSetting** | yes | Global defaults (`organizationId` NULL) vs tenant overrides |
| **FeatureFlag** | yes | Global flags (`organizationId` NULL) vs per-org flags (`@@unique([organizationId, flagKey])`) |
| **ConfigurationHistory** | yes | Platform/global config changes may omit org |

### Required `organizationId` (already NOT NULL — good)

`OrganizationDomain`, `UserInvitation`, `EntitlementGrant`, `LicenseKey`, `OrganizationFeature` — all use `organizationId String` (required).

### No `organizationId` column

| Model | Class | Tenant reachability |
| ----- | ----- | ------------------- |
| **AuditLog** | internal | User FK only — see `audit-log-tenant-context-foundation` |
| **Payment** | TENANT_VIA_PARENT | `userId` required; optional `studentId` → Student |
| **Notification** | TENANT_VIA_PARENT | `userId` → User |
| **ExamRegistration** | TENANT_VIA_PARENT | `examId` + `studentId` |
| **LessonCounter** | TENANT_VIA_PARENT | `studentId` → Student |
| **Category**, **TransmissionType** | GLOBAL_REFERENCE | Shared catalog |
| Auth token tables, **RateLimitBucket** | internal / global | Not tenant operational data |

---

## Unique constraints and NULL `organizationId`

### `Student`: `@@unique([organizationId, schoolStudentId])`

In PostgreSQL, **UNIQUE treats NULL as distinct**. Multiple students with `(organizationId = NULL, schoolStudentId = '26001')` can coexist. This breaks the intended per-org school ID invariant if NULL org rows are created (legacy seed, manual SQL, or bug).

**Mitigation today:** manual/import create paths set `organizationId` from session; imports use tenant org from auth.

### `FeatureFlag`: `@@unique([organizationId, flagKey])`

NULL `organizationId` allows one global row per `flagKey`; tenant rows use composite key — **by design**.

### `SystemSetting`: `settingKey @unique` (global)

Not a composite with `organizationId`. Tenant-specific settings share the same `settingKey` namespace as global rows only if product logic enforces one row per key per scope — **review separately** (configuration model debt).

### `Vehicle`: `registrationNumber @unique` (global)

Single plate cannot exist twice in DB **across all tenants**. Acceptable for single-tenant production v1; **multi-tenant product risk** for future clients.

---

## Application-layer tenant guards (code review)

**Rule (system-design):** Never trust `organizationId` from request body/query; use session + host guard.

| Area | Evidence |
| ---- | -------- |
| Student admin CRUD / export / import | Routes require `SUPER_ADMIN` + `session.user.organizationId`; queries use `buildStudentRecordListWhere({ organizationId })` |
| Lesson create/list | `lesson-create-service.ts`, `lesson-queries.ts` require `organizationId` parameter from auth |
| Students export API | Ignores client-supplied org; uses session org (`app/api/admin/students/export/route.ts`) |
| Host guard | `assertUserTenantHost` on sensitive admin routes |

**Gap:** DB nullable columns mean **defense-in-depth relies on app discipline**. RLS (where enabled) is additional layer — policy matrix deferred to `supabase-rls-data-api-policy-matrix`.

---

## Existing backfill tooling

**Script:** `driving_school_platform/nextjs_space/scripts/backfill-organization-scope.ts` (**deprecated — disabled by default**; use `pnpm tenant:org-backfill:dry-run`)

**Legacy behavior when `ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1` — updates when `organizationId` IS NULL:**

- `Vehicle`, `Lesson`, `Exam`, `LessonRequest`
- `SystemSetting`, `ConfigurationHistory`, `FeatureFlag`

**Does not update:**

- `Student`, `Instructor`, `User`

**Behavior:** Picks org from `TARGET_ORG_ID` / `DEFAULT_ORG_ID` / `ORG_ID` or first org by `createdAt`. Idempotent `updateMany`.

**Audit note:** For multi-org databases, blind single-org backfill is **unsafe** without per-row org resolution — acceptable only for single-tenant Preview/legacy; Production multi-tenant needs classified backfill rules (future batch).

---

## Backfill dry-run operator (v1)

**Batch:** `tenant-operational-organization-id-backfill-dry-run-v1`  
**Script:** `driving_school_platform/nextjs_space/scripts/dry-run-tenant-organization-backfill.ts`  
**Command:** `pnpm -C driving_school_platform/nextjs_space tenant:org-backfill:dry-run`

- **Dry-run only:** plans per-row `organizationId` proposals; **no writes**; rejects `--apply` / `--write`.
- **Allowlist:** `students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests` only.
- **Derivation:** deterministic sources only (User, Student, Instructor, Vehicle, Lesson/Exam relations); **no** single-org fallback.
- **Legacy script:** `scripts/backfill-organization-scope.ts` is **disabled by default** (`ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1` to run legacy unsafe path).
- **Preview note (2026-06):** null-scope report showed **0** operational NULL rows, **SAFE_TO_DRY_RUN** — dry-run should report **0 proposed changes** in that environment.
- **Apply:** deferred to `tenant-operational-organization-id-backfill-apply-v1` only when a future dry-run shows proposed rows.

Helpers: `lib/tenant-organization-backfill-dry-run.ts`.

---

## Read-only null-scope report operator (v1)

**Batch:** `tenant-operational-organization-id-null-counts-report-v1`  
**Script:** `driving_school_platform/nextjs_space/scripts/report-tenant-organization-null-scope.ts`  
**Command:** `pnpm -C driving_school_platform/nextjs_space tenant:org-null-report`

- **Read-only:** Prisma `count` / `groupBy` and guarded `SELECT` raw SQL only; no apply/dry-run write modes.
- **Output:** operational and dual-scope NULL counts, conflict detection, active org sanity, `SAFE_TO_DRY_RUN` / `BLOCKED` summary.
- **Exit code:** non-zero when high-risk conflicts exist or readiness is `BLOCKED` (data unchanged).
- **Preview first:** run on Preview and record results before Production or any backfill slice.

Helpers (unit-tested): `lib/tenant-organization-null-scope-report.ts`.

---

## Operator verification — NULL row counts (needs confirmation)

Run the report script above **or** the SQL below against **target** database only (Preview vs Production explicitly chosen). Do not paste `DATABASE_URL` into tickets.

```sql
-- Core operational (TENANT_REQUIRED)
SELECT 'students' AS t, COUNT(*) FROM students WHERE "organizationId" IS NULL
UNION ALL SELECT 'instructors', COUNT(*) FROM instructors WHERE "organizationId" IS NULL
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles WHERE "organizationId" IS NULL
UNION ALL SELECT 'lessons', COUNT(*) FROM lessons WHERE "organizationId" IS NULL
UNION ALL SELECT 'exams', COUNT(*) FROM exams WHERE "organizationId" IS NULL
UNION ALL SELECT 'lesson_requests', COUNT(*) FROM lesson_requests WHERE "organizationId" IS NULL;

-- Dual-scope (expect some NULL by design)
SELECT 'users' AS t, COUNT(*) FROM users WHERE "organizationId" IS NULL
UNION ALL SELECT 'billing_events', COUNT(*) FROM billing_events WHERE "organizationId" IS NULL
UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings WHERE "organizationId" IS NULL
UNION ALL SELECT 'feature_flags', COUNT(*) FROM feature_flags WHERE "organizationId" IS NULL
UNION ALL SELECT 'configuration_history', COUNT(*) FROM configuration_history WHERE "organizationId" IS NULL;

-- Student school ID collision risk under NULL org
SELECT "schoolStudentId", COUNT(*)
FROM students
WHERE "organizationId" IS NULL AND "schoolStudentId" IS NOT NULL
GROUP BY "schoolStudentId"
HAVING COUNT(*) > 1;
```

**Prisma status (per environment):**

```bash
cd driving_school_platform/nextjs_space
pnpm exec prisma migrate status
```

Record results in Preview QA notes when run; not required to close this audit doc batch.

---

## Phased implementation plan (NOT approved — reference only)

| Phase | Name (suggested) | Work | Gate |
| ----- | ---------------- | ---- | ---- |
| **0** | — | Run read-only report on Preview; repeat before Production | Operator (`tenant:org-null-report`) |
| **1** | `tenant-operational-organization-id-null-counts-report-v1` | **Done (v1)** — read-only report script + helpers | `APPROVED TO IMPLEMENT: tenant-operational-organization-id-null-counts-report-v1` |
| **2** | `tenant-operational-organization-id-backfill-dry-run-v1` | **Done (v1)** — per-row derivation dry-run; legacy script fail-safe | `pnpm tenant:org-backfill:dry-run` |
| **3** | `tenant-operational-organization-id-backfill-apply-v1` | Apply backfill on allowlisted operational tables | **Deferred** until dry-run shows proposed rows in target DB |
| **3b** | `tenant-operational-organization-id-not-null-readiness-review-v1` | **Done** — analysis-only review | Completed 2026-06-09 |
| **3c** | `tenant-operational-organization-id-not-null-readiness-doc-v1` | **Done** — readiness doc + DEC-027 | [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) |
| **4a** | `tenant-operational-organization-id-not-null-migrations-plan-v1` | **Done** — D4 GO/NO-GO gate, operator battery, single-migration proposal, smoke checklist | [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) |
| **4b** | `tenant-operational-organization-id-not-null-migrations-v1` | `SET NOT NULL` on six operational tables after operator GO on target DB | `APPROVED TO IMPLEMENT: tenant-operational-organization-id-not-null-migrations-v1` + human `migrate deploy` |
| **5** | `supabase-rls-data-api-policy-matrix` | **Done (v1)** — classification matrix only; see [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md). Explicit RLS **SQL** on tenant tables → `supabase-rls-tenant-policies-v1` (D4) |
| **6** | Product | Revisit global uniques (`Vehicle.registrationNumber`, `SystemSetting.settingKey`) for multi-client | Product decision |

**Do not combine phase 2 with feature batches.**

---

## ACCEPT / ADAPT / DEFER / REJECT (critique triage)

| Recommendation | Verdict |
| -------------- | ------- |
| Make operational `organizationId` NOT NULL | **DEFER** to phase 2 after backfill + counts |
| Immediate migration in audit batch | **REJECT** |
| Backfill Student/Instructor | **ACCEPT** as next gated slice |
| RLS as sole fix | **REJECT** — app guards + RLS defense-in-depth |
| Change `User.organizationId` to NOT NULL | **REJECT** — breaks PLATFORM_ADMIN pattern |
| Audit-only v1 | **ACCEPT** — this document |

---

## Readiness (post-audit)

Operator-validated readiness and D4 gate: [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) (DEC-027). Historical evidence 2026-06-09: 0 operational NULLs, `SAFE_TO_DRY_RUN`, 0 dry-run proposals — backfill apply not required in that environment. **Plan-v1 (2026-06-10):** gate checklist and migration proposal documented; implementation batch `tenant-operational-organization-id-not-null-migrations-v1` remains deferred until operator GO on deploy target.

---

## References

- [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md) — DEC-027 readiness
- `docs/architecture/system-design.md` — tenancy model
- `.cursor/rules/database.mdc` — tenant-critical entities
- `driving_school_platform/nextjs_space/scripts/backfill-organization-scope.ts`
- Roadmap: `tenant-required-operational-organization-id-audit`, `supabase-rls-data-api-policy-matrix`, `audit-log-tenant-context-foundation`
