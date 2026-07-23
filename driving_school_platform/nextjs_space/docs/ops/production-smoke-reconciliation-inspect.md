# DAT production smoke reconciliation — inspect-only

**Slice:** `dat-production-smoke-reconcile-v1` / `dat-production-smoke-canonical-fixtures-v1`
**Incident:** [2026-07-17-remote-legacy-seed-reset.md](../../../../docs/ops/incidents/2026-07-17-remote-legacy-seed-reset.md)
**Decision:** DEC-063 (embedded Platform non-authoritative); DEC-064 (canonical smoke fixtures)

**Canonical path (repository-relative):**
`driving_school_platform/nextjs_space/docs/ops/production-smoke-reconciliation-inspect.md`

---

## Purpose

Application-level inspection and optional fixture reconcile for the technical DAT smoke tenant (`DAT Production Smoke`).

## Commands (human-approved only)

Assumed shell: Git Bash

Inspect (zero-write):

```bash
cd driving_school_platform/nextjs_space
pnpm ops:inspect-production-smoke-reconciliation
```

Fixtures reconcile dry-run (zero-write). Operator-safe env load via Node 20 `--env-file` (do **not** `source` the file; do not print its contents):

```bash
cd driving_school_platform/nextjs_space
node \
  --env-file=.env.operator.production.local \
  --import tsx \
  scripts/reconcile-production-smoke-fixtures.ts
```

Equivalent package script (passes the same `--env-file` explicitly — it does **not** rely on Next.js / bare `tsx` / pnpm auto-loading):

```bash
cd driving_school_platform/nextjs_space
pnpm ops:reconcile-production-smoke-fixtures
```

Fixtures reconcile apply (**writes**; single transaction; not executed by agents in this slice):

```bash
cd driving_school_platform/nextjs_space
node \
  --env-file=.env.operator.production.local \
  --import tsx \
  scripts/reconcile-production-smoke-fixtures.ts \
  --apply
```

Or:

```bash
cd driving_school_platform/nextjs_space
pnpm ops:reconcile-production-smoke-fixtures -- --apply
```

(`--` is the pnpm/POSIX end-of-options separator; the CLI ignores a standalone `--` and still treats `--apply` as apply.)

**Execute only after explicit human approval.** One database-related command per approved block.

## Required environment

- `DAT_OPS_EXPECTED_DB_HOST`
- `DAT_OPS_EXPECTED_DB_NAME`
- `DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF`
- `DATABASE_URL` (`postgresql:` / `postgres:` only)
- Optional: `DIRECT_URL` (same project/database)
- Optional operator-only: `DAT_SMOKE_EXPECTED_ADMIN_EMAIL` (exact match; never log full value; never commit real values)

Operator secrets live in `.env.operator.production.local` (gitignored via `.env*`). Load it only through `node --env-file=...` as shown above.

## Canonical fixtures (names — not IDs)

| Fixture                 | Notes                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Smoke Admin             | Canonical School Admin (`SUPER_ADMIN`)                                             |
| John Doe                | Additional admin — preserve; do not delete without dependency audit                |
| Smoke Instructor 1      | Intended manual (seed); remote observed provenance = invite \| unknown             |
| Smoke Instructor 2      | Intended invite; observed `invite` only when ACCEPTED `UserInvitation` is coherent |
| Smoke Instructor Non-B  | Negative fixture (no category B)                                                   |
| Smoke Student 1         | Intended manual (seed); remote observed = invite \| unknown                        |
| Smoke Student 2         | Intended invite; observed when ACCEPTED invitation is coherent                     |
| Smoke Student A1        | Negative fixture (category A1)                                                     |
| `01-DS-24` … `05-DS-24` | Plates; `03-DS-24` is A1 negative                                                  |

Smoke-required feature overrides (tenant-only): `LESSON_MANAGEMENT`, `VEHICLE_MANAGEMENT`, `STUDENT_ACCESS`.

## Boundaries

| Boundary             | Rule                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| Read-only claim      | Application-level — does **not** claim PostgreSQL read-only                    |
| Platform Admin       | Not restored                                                                   |
| Commercial catalogue | Not queried / not migrated by these commands                                   |
| Writes               | Reconcile only with `--apply`; no seed/migrate in these CLIs                   |
| Secrets              | No passwords, full URLs, full project refs, full emails, or full IDs in output |
| Git tags / ZIP       | Not a database backup                                                          |

## Provenance note

Observed states: `invite` | `manual` | `unknown`.

- `invite` — only with observable coherent ACCEPTED `UserInvitation` (email / `acceptedUserId` / `studentId`).
- `manual` — only when provenance is deterministically known (e.g. local seed created by DAT seed code).
- `unknown` — no accepted invite and no explicit manual evidence (typical remote residual).

Remote reconcile **never** invents `manual` from a missing invite row, and does **not** fabricate invitations. Readiness may warn on `unknown`; it must not fail solely for that reason.

## Related

- Smoke E2E: [production-smoke-e2e.md](./production-smoke-e2e.md)
- Target guard: `lib/ops/remote-operator-target-guard.ts`
- Inspect: `lib/ops/production-smoke-reconciliation-inspection.ts`
- Reconcile: `lib/ops/production-smoke-fixtures-reconciliation.ts`
