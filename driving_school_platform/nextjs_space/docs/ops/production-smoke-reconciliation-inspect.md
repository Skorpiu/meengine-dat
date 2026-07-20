# DAT production smoke reconciliation — inspect-only

**Slice:** `dat-production-smoke-reconcile-v1` (inspect-only sub-slice)
**Incident:** [2026-07-17-remote-legacy-seed-reset.md](../../../../docs/ops/incidents/2026-07-17-remote-legacy-seed-reset.md)
**Decision:** DEC-063 (embedded Platform non-authoritative; smoke-only reconcile)

**Canonical path (repository-relative):**
`driving_school_platform/nextjs_space/docs/ops/production-smoke-reconciliation-inspect.md`

---

## Purpose

Read-only **application-level** inspection of the technical DAT smoke tenant (`DAT Production Smoke`) after the 2026-07-17 legacy seed reset.

This command:

- validates remote target identity before Prisma construction;
- reports sanitized organization, domain, School Admin candidates, category B, instructor/student/vehicle candidates, feature readiness, counts, and anomalies;
- does **not** select fixtures automatically when multiple candidates exist;
- does **not** export full fixture IDs (vault capture is a later approved operation).

## Important boundaries

| Boundary             | Rule                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Data scope           | Test/smoke data only — no real customer tenant                                                    |
| Platform Admin       | **Intentionally not restored** inside DAT                                                         |
| Embedded `/platform` | Transitional / non-authoritative (DEC-063)                                                        |
| Read-only claim      | **Application-level inspect-only** — does **not** claim PostgreSQL enforces read-only             |
| Writes               | None — no `--apply`, no feature enablement, no password rotation, no cleanup, no commercial apply |
| Commercial catalogue | Not queried (migration undeployed)                                                                |
| Git ZIP / tags       | **Not** a database backup — tags and archives cannot restore rows                                 |

Autonomous MeEngine Platform architecture is deferred to `platform-separation-architecture-plan-v1`.

## Required environment (expected target identity)

Set all of:

- `DAT_OPS_EXPECTED_DB_HOST` — exact hostname match
- `DAT_OPS_EXPECTED_DB_NAME` — exact database name match
- `DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF` — exact Supabase project reference

`DATABASE_URL` comes from the normal runtime environment (`postgresql:` / `postgres:` only). When `DIRECT_URL` is present, it must use the same authorized protocols and resolve to the same project reference and database name.

Do **not** authorize via `FORCE`, `NODE_ENV`, or mere presence of a `.env` file.

Do **not** paste real project refs, database URLs, passwords, or full fixture IDs into tickets or git.

## Command (human-approved only)

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space
pnpm ops:inspect-production-smoke-reconciliation
```

Optional JSON output:

```bash
pnpm ops:inspect-production-smoke-reconciliation -- --json
```

**Execute only after explicit human approval.** One database-related command per approved block. Agents must not run this CLI unless Rui explicitly requests execution. Do not chain this command with seed, migrate, or other write operations in the same paste block.

## What it does not do

- seed / migrate / restore / commercial catalogue apply
- enable features
- rotate passwords or update vault values
- run smoke suites
- recreate `PLATFORM_ADMIN`
- query commercial catalogue tables
- print full emails, full org/user/category IDs, passwords, hashes, or full project references
- claim PostgreSQL session/transaction read-only enforcement

## Related

- Smoke runbook: [production-smoke-e2e.md](./production-smoke-e2e.md)
- Destructive seed safety (DEC-062): `lib/ops/destructive-seed-safety.ts`
- Target guard: `lib/ops/remote-operator-target-guard.ts`
- Inspection service: `lib/ops/production-smoke-reconciliation-inspection.ts`
- CLI: `scripts/inspect-production-smoke-reconciliation.ts`
