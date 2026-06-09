# Tenant Operational `organizationId` NOT NULL — Readiness (v1)

**Batch:** `tenant-operational-organization-id-not-null-readiness-doc-v1`  
**Status:** Docs-only — **no schema, migration, RLS, runtime, or data changes.**  
**Decision:** [DEC-027](./decision-log.md)  
**Prior work:** [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)  
**Schema baseline:** `driving_school_platform/nextjs_space/prisma/schema.prisma` (as of main `91fc7ae`).

---

## Purpose

Record **operator-validated readiness** to apply future `NOT NULL` constraints on the six operational tables that today allow nullable `organizationId`, without requiring a backfill apply batch in the validated environment.

This document does **not** authorize migrations. Phase 4 (`tenant-operational-organization-id-not-null-migrations`) remains a separate **D4** batch with explicit approval and human-controlled `migrate deploy`.

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

## Pre-migration checklist (future D4 batch)

Before `APPROVED TO IMPLEMENT: tenant-operational-organization-id-not-null-migrations`:

1. **Target environment explicit** — Preview vs Production chosen by operator; never assume Preview results apply to Production.
2. **`pnpm exec prisma migrate status`** — schema up to date; `DIRECT_URL` loaded.
3. **`pnpm tenant:org-null-report`** — operational NULL total = 0; no high-risk conflicts; status `SAFE_TO_DRY_RUN`.
4. **`pnpm tenant:org-backfill:dry-run`** — if NULLs exist, proposed changes reviewed; apply batch only if needed and separately approved.
5. **Per-table migration plan** — prefer one migration folder per table or documented explicit batch; include rollback notes.
6. **Human `migrate deploy`** — operator-controlled; smoke QA after deploy (login, student list, lesson create, import dry-run).
7. **Do not** combine NOT NULL migrations with feature, auth, billing, demo, or RLS batches.

---

## Operator commands (read-only verification)

**Assumed shell: Git Bash**

```bash
cd driving_school_platform/nextjs_space

pnpm exec prisma migrate status
pnpm tenant:org-null-report
pnpm tenant:org-backfill:dry-run
```

Exit code: `tenant:org-null-report` is non-zero when high-risk conflicts exist or readiness is `BLOCKED`.

---

## Phased plan (updated)

| Phase | Batch | Status |
| ----- | ----- | ------ |
| 0 | Operator null-scope report | **Done** (2026-06-09 evidence above) |
| 1 | `tenant-operational-organization-id-null-counts-report-v1` | **Done** |
| 2 | `tenant-operational-organization-id-backfill-dry-run-v1` | **Done** |
| 3 | `tenant-operational-organization-id-backfill-apply-v1` | **Not needed** in validated env; deferred if future env shows proposed rows |
| 3b | `tenant-operational-organization-id-not-null-readiness-review-v1` | **Done** (analysis) |
| 3c | `tenant-operational-organization-id-not-null-readiness-doc-v1` | **Done** (this document + DEC-027) |
| 4 | `tenant-operational-organization-id-not-null-migrations` | **Deferred (D4)** — explicit approval required |
| 5 | `supabase-rls-tenant-policies-v1` | **Deferred** — optional after NOT NULL / backfill |

---

## What this batch did not do

- No Prisma schema or migration changes
- No `ALTER TABLE … SET NOT NULL`
- No backfill apply or data writes
- No API, auth, RLS, billing, demo, or tenancy guard changes
- No changes to `User.organizationId` nullability policy

---

## References

- [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)
- [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md)
- [decision-log.md](./decision-log.md) — DEC-027
- `lib/tenant-organization-null-scope-report.ts`
- `lib/tenant-organization-backfill-dry-run.ts`
- `scripts/report-tenant-organization-null-scope.ts`
- `scripts/dry-run-tenant-organization-backfill.ts`
