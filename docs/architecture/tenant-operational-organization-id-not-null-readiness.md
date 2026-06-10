# Tenant Operational `organizationId` NOT NULL — Readiness and D4 Gate

**Latest implementation batch:** `tenant-operational-organization-id-not-null-migrations-v1`  
**Prior planning batch:** `tenant-operational-organization-id-not-null-migrations-plan-v1`  
**Status:** Migration **created** — `migrate deploy` **not run** by Cursor; human operator step required per environment.  
**Decision:** [DEC-027](./decision-log.md)  
**Prior work:** [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)  
**Schema baseline:** `driving_school_platform/nextjs_space/prisma/schema.prisma` (as of main `29d5cd8`).

---

## Purpose

Record **operator-validated readiness** to apply future `NOT NULL` constraints on the six operational tables that today allow nullable `organizationId`, without requiring a backfill apply batch in the validated environment.

Phase 4b migration SQL and Prisma schema are **implemented** in batch `tenant-operational-organization-id-not-null-migrations-v1`. **Deploy is not automatic** — operator must run human-controlled `pnpm exec prisma migrate deploy` on each target environment after re-validating the gate checklist.

---

## Decision summary (DEC-027)

| Topic | Decision |
| ----- | -------- |
| **Future NOT NULL candidates** | `students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests` only |
| **`users.organizationId`** | **Remain nullable** — `PLATFORM_ADMIN` requires `organizationId: null` (`lib/platform/platform-admins.ts`) |
| **Dual-scope tables** | **Remain nullable** — `billing_events`, `system_settings`, `feature_flags`, `configuration_history` |
| **Backfill apply** | **Not required** in validated environment — 0 operational NULL rows, 0 proposed dry-run changes |
| **Migrations** | **Deferred (D4)** — per-table or explicit multi-table plan; re-run null report on target DB immediately before each deploy |

---

## Operator evidence (2026-06-09)

Environment: operator database with `DATABASE_URL` and `DIRECT_URL` loaded (required for `prisma migrate status` against Supabase/direct connection).

### `pnpm exec prisma migrate status`

```
22 migrations found
Database schema is up to date
```

### `pnpm tenant:org-null-report`

| Table | null | total |
| ----- | ---- | ----- |
| Student (`students`) | 0 | 8 |
| Instructor (`instructors`) | 0 | 5 |
| Vehicle (`vehicles`) | 0 | 5 |
| Lesson (`lessons`) | 0 | 3 |
| Exam (`exams`) | 0 | 0 |
| LessonRequest (`lesson_requests`) | 0 | 0 |

**Summary:**

- Active organizations: **3**
- Operational NULL total: **0**
- Ambiguous rows: **0**
- High-risk conflict rows: **0**
- Backfill readiness status: **SAFE_TO_DRY_RUN**

### `pnpm tenant:org-backfill:dry-run`

- Proposed changes: **0**
- Skipped rows: **0**
- Conflicts: **0**
- Ambiguous: **0**
- Apply readiness: **READY_FOR_FUTURE_APPLY_BATCH**

**Operator note:** No database connection strings, hostnames, or org IDs are recorded here. Re-run reports before Production deploy or any future migration batch.

---

## Classification reference

### TENANT_REQUIRED — future NOT NULL (after D4 gate)

| Prisma model | Physical table |
| ------------ | -------------- |
| Student | `students` |
| Instructor | `instructors` |
| Vehicle | `vehicles` |
| Lesson | `lessons` |
| Exam | `exams` |
| LessonRequest | `lesson_requests` |

Application write paths already require session `organizationId` for admin/tenant operations. DB nullable columns are a **defense-in-depth gap** only.

### Must remain nullable

| Model / table | Reason |
| ------------- | ------ |
| `users` | `PLATFORM_ADMIN` and platform-global operator accounts |
| `billing_events` | Provider events may arrive before org resolution |
| `system_settings` | Global defaults (`organizationId` NULL) vs tenant overrides |
| `feature_flags` | Global flags (`organizationId` NULL) vs per-org flags |
| `configuration_history` | Platform/global config audit rows may omit org |

### Already NOT NULL (unchanged)

`organization_domains`, `user_invitations`, `entitlement_grants`, `license_keys`, `organization_features`.

### No `organizationId` column

Scope via parent FK + app guards: `payments`, `notifications`, `exam_registrations`, `lesson_counters`, `audit_logs`, auth token tables, `rate_limit_buckets`, `categories`, `transmission_types`.

---

## Known constraints and product debt (unchanged)

- **`students`:** `@@unique([organizationId, schoolStudentId])` — PostgreSQL treats NULL as distinct in UNIQUE; NOT NULL hardens the per-org school ID invariant.
- **`vehicles`:** `registrationNumber @unique` is **global** across tenants — separate multi-client product decision.
- **`system_settings`:** `settingKey @unique` is **global** — not composite with `organizationId`.

---

## D4 GO / NO-GO gate (operator — required before migration batch)

**Rule:** **GO** only when **all** mandatory checks pass on the **same target database** immediately before deploy. **NO-GO** on any failure — do not proceed to `migrate deploy` or approve the implementation batch.

| # | Check | GO criterion | NO-GO trigger |
| - | ----- | ------------ | ------------- |
| 1 | **Target environment** | Operator explicitly names Preview **or** Production (or other named DB) | Ambiguous or assumed cross-env |
| 2 | **`DATABASE_URL`** | Loaded and non-empty; points at intended target | Missing, empty, or wrong host |
| 3 | **`DIRECT_URL`** | Loaded and non-empty (required for `prisma migrate status` / deploy against Supabase) | Missing or empty |
| 4 | **`pnpm exec prisma migrate status`** | Output includes **Database schema is up to date** | Pending migrations or connection error |
| 5 | **`pnpm tenant:org-null-report`** | Operational NULL total = **0** on all six tables; status **`SAFE_TO_DRY_RUN`**; high-risk conflicts = **0**; exit code **0** | Any operational NULL; `BLOCKED`; non-zero exit |
| 6 | **`pnpm tenant:org-backfill:dry-run`** | Proposed changes = **0**; conflicts = **0**; ambiguous = **0**; high-risk = **0** | Any proposed row or conflict (run backfill apply batch first — separate approval) |
| 7 | **Operator attestation** | Written confirmation: environment name + date + GO for `tenant-operational-organization-id-not-null-migrations-v1` | No explicit operator GO |
| 8 | **Implementation approval** | `APPROVED TO IMPLEMENT: tenant-operational-organization-id-not-null-migrations-v1` | Plan-v1 or DEC-027 alone is **not** sufficient |

**Historical note (2026-06-09):** One validated environment showed 0 NULLs and 0 dry-run proposals. That evidence **does not** substitute for re-running checks 4–6 on the deploy target the same day as migration.

**If NO-GO due to NULL rows:** stop migration planning; evaluate `tenant-operational-organization-id-backfill-apply-v1` (separate D4 approval) before returning to this gate.

---

## Operator pre-migration battery (read-only — run on target DB)

Scripts `tenant:org-null-report` and `tenant:org-backfill:dry-run` call `loadEnvConfig(process.cwd())` and load `.env` / `.env.local` from `driving_school_platform/nextjs_space` when invoked via `pnpm`. For operator clarity and `prisma migrate status`, **explicitly source env files** first.

**Assumed shell: Git Bash**

```bash
cd ~/Downloads/Projects/driving-academy-tool/driving_school_platform/nextjs_space

unset DATABASE_URL
unset DIRECT_URL

set -a
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +a

test -n "$DATABASE_URL" && echo "DATABASE_URL ok" || echo "DATABASE_URL missing"
test -n "$DIRECT_URL" && echo "DIRECT_URL ok" || echo "DIRECT_URL missing"
```

If either variable is missing, **stop** — fix env before continuing.

Then (same shell, env still loaded):

```bash
pnpm exec prisma migrate status
pnpm tenant:org-null-report
pnpm tenant:org-backfill:dry-run
```

**Exit codes:**

- `tenant:org-null-report` — non-zero when high-risk conflicts exist or readiness is `BLOCKED`.
- `tenant:org-backfill:dry-run` — non-zero on unhandled errors (review script output).

**Record for gate:** paste summary lines only (table NULL counts, readiness status, proposed/conflict counts, migrate status). Do **not** paste connection strings, hostnames, or org IDs into tickets.

---

## Future migration structure (proposal only — not implemented)

**Recommended (plan-v1):** **one Prisma migration** applying `SET NOT NULL` on all six operational columns in a single deploy step.

| Rationale for single migration | Notes |
| ------------------------------ | ----- |
| Same DEC-027 scope and same gate | All six tables hardened together |
| No data backfill in validated path | `ALTER … SET NOT NULL` is metadata-only when zero NULL rows |
| One operator deploy / one rollback unit | Matches “tenant operational hardening” as one change |
| Prisma schema can update all six fields in one commit | `organizationId String` (required) on six models |

**Migration (implemented):**  
`prisma/migrations/20260610140000_make_operational_organization_id_required/migration.sql`

**Suggested SQL shape (illustrative — do not run from this doc):**

```sql
ALTER TABLE "students" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "instructors" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "vehicles" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "lessons" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "exams" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "lesson_requests" ALTER COLUMN "organizationId" SET NOT NULL;
```

**Prisma schema change (future batch):** set `organizationId String` (non-optional) on `Student`, `Instructor`, `Vehicle`, `Lesson`, `Exam`, `LessonRequest` only. **Do not** change `User`, `BillingEvent`, `SystemSetting`, `FeatureFlag`, or `ConfigurationHistory`.

**Alternative (acceptable if operator prefers):** six separate migrations (one table each) for granular rollback — higher deploy overhead; only justified if incremental production rollout is required. No technical dependency forces split for current DAT scope.

**Explicitly out of scope for migration SQL:** RLS policies, `REVOKE`/`GRANT`, triggers, data `UPDATE`, index changes (existing indexes on `organizationId` remain).

**Rollback note (operator):** reversing NOT NULL requires a new migration `DROP NOT NULL` on each column — only if no row would violate re-nullability; plan maintenance window accordingly.

---

## Post-migration smoke tests (operator — after `migrate deploy`)

Run on the **same environment** where deploy succeeded. Order is flexible; all should pass before declaring deploy complete.

| # | Test | Expected |
| - | ---- | -------- |
| 1 | **Platform Admin login** | Login succeeds; platform-scoped surfaces load |
| 2 | **School Admin login** (tenant host) | Login succeeds; tenant dashboard loads |
| 3 | **People — Students** | `/admin/users` → Students → Profiles list loads |
| 4 | **People — Instructors** | Instructors → Profiles list loads |
| 5 | **Vehicles** | `/admin/vehicles` (or equivalent) list loads |
| 6 | **Lessons** | `/admin/lessons` Driving tab loads |
| 7 | **Create manual Student** | Manual student create succeeds; row appears in Profiles |
| 8 | **Create Vehicle** | Vehicle create succeeds |
| 9 | **Create Lesson** | Lesson create succeeds |
| 10 | **Student import dry-run** | Import dry-run on Fichas registadas returns preview without error (zero-write) |
| 11 | **Health check** | `GET /api/health` returns healthy status |
| 12 | **`pnpm check`** | Lint, typecheck, tests, build pass on branch with migration + schema |

Re-run `pnpm tenant:org-null-report` after deploy is optional (NULL counts should remain 0); not a substitute for functional smoke tests.

---

## Pre-migration checklist (summary — links to gate above)

Before `APPROVED TO IMPLEMENT: tenant-operational-organization-id-not-null-migrations-v1`:

1. Complete **D4 GO / NO-GO gate** (all eight rows).
2. Confirm **no concurrent** feature, auth, billing, demo, or RLS batches in the same deploy.
3. Create migration only in `tenant-operational-organization-id-not-null-migrations-v1` batch (not in plan-v1).
4. Human **`migrate deploy`** on named target only.
5. Complete **post-migration smoke tests** before merge/push to production track.

---

## Phased plan (updated)

| Phase | Batch | Status |
| ----- | ----- | ------ |
| 0 | Operator null-scope report | **Done** (2026-06-09 evidence above) |
| 1 | `tenant-operational-organization-id-null-counts-report-v1` | **Done** |
| 2 | `tenant-operational-organization-id-backfill-dry-run-v1` | **Done** |
| 3 | `tenant-operational-organization-id-backfill-apply-v1` | **Not needed** in validated env; deferred if future env shows proposed rows |
| 3b | `tenant-operational-organization-id-not-null-readiness-review-v1` | **Done** (analysis) |
| 3c | `tenant-operational-organization-id-not-null-readiness-doc-v1` | **Done** (DEC-027 + operator evidence) |
| 4a | `tenant-operational-organization-id-not-null-migrations-plan-v1` | **Done** (D4 gate, operator battery, migration proposal, smoke checklist — **no migration**) |
| 4b | `tenant-operational-organization-id-not-null-migrations-v1` | **Migration created** — human `migrate deploy` + smoke QA per environment pending |
| 5 | `supabase-rls-tenant-policies-v1` | **Deferred** — optional after NOT NULL / backfill |

**Operator scripts (confirmed present in `package.json` on main `29d5cd8`):**

- `pnpm tenant:org-null-report` → `scripts/report-tenant-organization-null-scope.ts`
- `pnpm tenant:org-backfill:dry-run` → `scripts/dry-run-tenant-organization-backfill.ts`

---

## What plan-v1 did not do

- No Prisma schema or migration changes
- No `ALTER TABLE … SET NOT NULL`
- No `migrate deploy` or operator commands run by Cursor in this batch
- No backfill apply or data writes
- No API, auth, RLS, billing, demo, or tenancy guard changes
- No changes to `User.organizationId` nullability policy
- Did **not** mark D4 migrations as done
- Did **not** assume Production ready without fresh operator outputs

---

## References

- [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)
- [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md)
- [decision-log.md](./decision-log.md) — DEC-027
- `lib/tenant-organization-null-scope-report.ts`
- `lib/tenant-organization-backfill-dry-run.ts`
- `scripts/report-tenant-organization-null-scope.ts`
- `scripts/dry-run-tenant-organization-backfill.ts`
