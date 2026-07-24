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
- Optional operator-only invite fixtures (exact match; never log full values; never commit real values):
  - `DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL` — Smoke Instructor 2 (ACCEPTED invitation required)
  - `DAT_SMOKE_INVITED_STUDENT_EMAIL` — Smoke Student 2 (ACCEPTED invitation required)

Operator secrets live in `.env.operator.production.local` (gitignored via `.env*`). Load it only through `node --env-file=...` as shown above.

## Canonical fixtures (names — not IDs)

| Fixture                 | Notes                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Smoke Admin             | Canonical School Admin (`SUPER_ADMIN`)                                                                                                           |
| John Doe                | Additional admin — preserve; do not delete without dependency audit                                                                              |
| Smoke Instructor 1      | Intended manual (seed); remote observed provenance = invite \| unknown                                                                           |
| Smoke Instructor 2      | Intended invite; resolved only via `DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL` + coherent ACCEPTED invitation — **never** Sarah Williams / INS-002-2024 |
| Smoke Instructor Non-B  | Negative fixture (no category B)                                                                                                                 |
| Smoke Student 1         | Intended manual (seed); remote observed = invite \| unknown                                                                                      |
| Smoke Student 2         | Intended invite; resolved only via `DAT_SMOKE_INVITED_STUDENT_EMAIL` + coherent ACCEPTED invitation — **never** Bob Wilson / STU-002-2024        |
| Smoke Student A1        | Negative fixture (category A1)                                                                                                                   |
| Sarah Williams          | Preserved additional instructor (INS-002-2024) — not renamed to Smoke Instructor 2                                                               |
| Bob Wilson              | Preserved additional student (STU-002-2024) — not renamed to Smoke Student 2                                                                     |
| `01-DS-24` … `05-DS-24` | Plates; `03-DS-24` is A1 negative                                                                                                                |

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

- `invite` — only for Smoke Instructor 2 / Smoke Student 2 when a coherent ACCEPTED `UserInvitation` matches the operator-only exact email (`DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL` / `DAT_SMOKE_INVITED_STUDENT_EMAIL`).
- `manual` — only when provenance is deterministically known (e.g. local seed created by DAT seed code).
- `unknown` — no accepted invite and no explicit manual evidence (typical remote residual for legacy manual fixtures).

Remote reconcile **never** invents `manual` from a missing invite row, and does **not** fabricate invitations or send email. Missing invite fixtures are **blockers** (`canonical_invited_instructor_missing` / `canonical_invited_student_missing`) until the operator sends invites, accepts them, and re-runs dry-run. Sarah Williams and Bob Wilson remain preserved additional fixtures.

## Operator status (2026-07-24 — confirmed facts; no emails / full IDs)

Human-executed real invite+accept on the validated smoke tenant (operator-only `DAT_SMOKE_INVITED_*_EMAIL`). Agent did **not** run remote writes or `--apply` in the memory sync batch.

| Fixture               | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smoke Instructor 2    | Invite ACCEPTED; `acceptedUserId` linked; Instructor profile + license (expiry 2027-12-31) + available for booking; categories **B** + **C+E** (B added after first dry-run). Expect `instructor_missing_category_b:Smoke Instructor 2` cleared on next dry-run. Invite-resolvable.                                                                                                                                                                                                                               |
| Smoke Student 2       | Invite ACCEPTED; `acceptedUserId` linked; Student profile exists (`APP_USER`; technical `studentNumber` set; `studentIdNumber=null`; category **B** — initial diagnosis C+E, operator later changed to B via app). **`UserInvitation.studentId` is null** despite Student existing → **sole remaining invite-fixture blocker**; reconciler correctly returns `canonical_invited_student_missing` (do **not** relax). P0: `student-invite-accept-student-link-repair-v1` (accept-path + safe link repair + tests). |
| Features / plates     | Still legacy / not smoke-overridden until `--apply`.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sarah / Bob           | Preserved additional — not renamed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Commercial migrations | Not applied by this track.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `--apply`             | **Not authorized** until Student 2 invitation link coherence passes dry-run.                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**People UI note:** invited instructor may not appear under Admin → People → Instructors despite correct DB rows — tracked as `people-instructor-invite-accept-list-refresh-v1` (P1); not a reconcile CLI issue.

## Repair accepted student invitation link (operator)

**Slice:** `student-invite-accept-student-link-repair-v1`

Future STUDENT invite accept now persists `UserInvitation.studentId` in the same transaction as `acceptedUserId` / `ACCEPTED` (`lib/invitations/invitation-accept-service.ts`).

For the already-accepted smoke Student 2 row (ACCEPTED + profile exists + category B + `studentId=null`), use the dedicated operator CLI (**human-controlled**; agent must not run remote apply):

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space

# Dry-run (default; zero writes)
pnpm ops:repair-accepted-student-invitation-link

# Explicit apply (writes UserInvitation.studentId only)
pnpm ops:repair-accepted-student-invitation-link -- --apply
```

Requirements: `.env.operator.production.local` with remote target identity env + `DAT_SMOKE_INVITED_STUDENT_EMAIL` (exact; never pass email via argv; never log full email). Updates **only** `UserInvitation.studentId`. Does not change names, category, `studentNumber`, `studentIdNumber`, features, or plates. Idempotent when already linked. After apply, re-run smoke fixture dry-run; `--apply` for fixture reconcile remains separately gated.

**Repo status:** repair code ready; **remote repair apply pending human approval** (not executed by agent).

## Related

- Smoke E2E: [production-smoke-e2e.md](./production-smoke-e2e.md)
- Target guard: `lib/ops/remote-operator-target-guard.ts`
- Inspect: `lib/ops/production-smoke-reconciliation-inspection.ts`
- Reconcile: `lib/ops/production-smoke-fixtures-reconciliation.ts`
- Student invite link repair: `lib/ops/repair-accepted-student-invitation-link.ts`
