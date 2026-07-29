# Production smoke E2E (automated)

Automated smoke for controlled B2B production readiness. Complements manual checklists ([smoke-test-checklist.md](./smoke-test-checklist.md), [production-smoke-baseline.md](./production-smoke-baseline.md)).

**Decisions:** [DEC-036](../../../../docs/architecture/decision-log.md) (read-only v1a); [DEC-039](../../../../docs/architecture/decision-log.md) (fixture preflight); [DEC-040](../../../../docs/architecture/decision-log.md) (lesson mutation smoke v1); [DEC-041](../../../../docs/architecture/decision-log.md) (smoke testids + booking readiness metadata); [DEC-043](../../../../docs/architecture/decision-log.md) (first client onboarding record); [DEC-045](../../../../docs/architecture/decision-log.md) (smoke tenant identity + School Admin terminology); [DEC-063](../../../../docs/architecture/decision-log.md) (smoke reconcile / no embedded Platform Admin recreate); [DEC-064](../../../../docs/architecture/decision-log.md) (canonical smoke fixtures).

**First real client:** use [first-client-onboarding-record.md](../../../../docs/architecture/first-client-onboarding-record.md) — do **not** treat this smoke tenant as the client onboarding record.

**P0 close slice:** `dat-production-smoke-hosted-verification-v1` — see [P0 closure criteria](#p0-closure-criteria-dat-production-smoke-hosted-verification-v1).

---

## Suites

| Suite                     | Tag                  | Writes  | Script                             |
| ------------------------- | -------------------- | ------- | ---------------------------------- |
| Fixture preflight         | `@fixture-preflight` | **No**  | `pnpm e2e:smoke:fixture-preflight` |
| API health + signup guard | —                    | **No**  | `pnpm e2e:smoke:api`               |
| Read-only UI smoke        | `@readonly`          | **No**  | `pnpm e2e:smoke:readonly`          |
| Lesson mutations          | `@mutations`         | **Yes** | `pnpm e2e:smoke:mutations`         |
| Mobile/tablet viewports   | `@mobile-viewport`   | **No**  | `pnpm e2e:mobile-viewports`        |

**Canonical hosted order for P0 close:** fixture preflight → hosted read-only (`e2e:smoke:api` + `e2e:smoke:readonly`, or `e2e:smoke:prod`) → hosted mutations.

Combined readonly hosted helper: `pnpm e2e:smoke:prod` (API + `@readonly` only) — useful **after** preflight passes; **not** a substitute for preflight.

Optional full hosted helper: `pnpm e2e:smoke:prod:full` — requires mutation dual opt-in. **Not** the canonical P0 close command; prefer **separate suite runs** so passed / skipped / failed counts are unambiguous.

Optional mobile/tablet viewport smoke (read-only admin surfaces): `pnpm e2e:mobile-viewports` — not in `pnpm check`/CI default. See [Mobile/tablet viewport smoke](#mobiletablet-viewport-smoke-opt-in).

**Skipped does not equal passed.** Credential-skip or guard-skip outcomes validate discovery/config only — they do **not** close P0.

**Fixture preflight must pass before mutation smoke** (mutations spec also runs preflight internally).

---

## P0 closure criteria (`dat-production-smoke-hosted-verification-v1`)

Before marking this P0 closed, re-confirm the **Production deployment** and the **commit actually served** (merge of memory/docs slices may create a new deployment). Use **post-incident** fixture IDs from the operator vault only — never historical pre–2026-07-17 IDs.

Run suites **separately** and require:

| Suite                                                  | Required result                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Fixture preflight (`pnpm e2e:smoke:fixture-preflight`) | **1 passed**, **0 skipped**, **0 failed**                                                                |
| API health + signup guard (`pnpm e2e:smoke:api`)       | TypeScript script (**not** Playwright): **exit code 0**; health must pass; public signup must be blocked |
| Hosted read-only UI (`pnpm e2e:smoke:readonly`)        | Playwright: **4 passed**, **0 skipped**, **0 failed**                                                    |
| Mutations (`pnpm e2e:smoke:mutations`)                 | **1 passed**, **0 skipped**, **0 failed**                                                                |

The helper `pnpm e2e:smoke:prod` must satisfy **both** the API exit-code gate and the Playwright 4/0/0 gate, but evidence for each gate must be recorded **separately** (do not merge into a single ambiguous “suite passed” claim).

Do **not** treat `e2e:smoke:prod:full` as the canonical close command. Do **not** put IDs, full emails, secrets, or sensitive URLs in this document.

---

## Temporary production smoke tenant (operator policy)

Until the real **`A Conquistadora`** client tenant is provisioned separately, the technical production smoke organization on `https://www.meengine.io` is named **`DAT Production Smoke`** (DEC-045). It is a **production smoke / test tenant**, not the real client tenant.

| Field           | Value                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Organization    | `DAT Production Smoke`                                                                                                                   |
| Organization ID | Set via operator vault `DAT_SMOKE_ORG_ID` after reconcile/inspect — **never reuse historical pre-incident IDs (stale after 2026-07-17)** |
| Host            | `www.meengine.io`                                                                                                                        |

When the official **`A Conquistadora`** client tenant is created later, **do not reuse** these fixture IDs or assumptions.

### Rename operator (display name only)

**Status: completed** (human operator, 2026-07-13). Verified production `Organization.name` is **`DAT Production Smoke`**. No further apply action required for the approved DEC-045 rename.

| Field           | Verified value                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Previous name   | `A Conquistadora`                                                                                                |
| Verified name   | `DAT Production Smoke`                                                                                           |
| Organization ID | **historical pre-incident identifier** — stale after 2026-07-17; must not be used in `DAT_SMOKE_*` configuration |
| Matched host    | `www.meengine.io`                                                                                                |
| Domain count    | 2                                                                                                                |
| User count      | 11                                                                                                               |
| Performed by    | Human operator (not agent)                                                                                       |

The guarded script remains available for **dry-run / idempotency verification** only:

| Mode                         | Command                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dry-run (default)            | `DAT_SMOKE_ORG_ID=<current-smoke-org-id> DAT_SMOKE_EXPECTED_HOST=www.meengine.io pnpm -C driving_school_platform/nextjs_space ops:rename-production-smoke-org` |
| Apply (normally unnecessary) | `DAT_SMOKE_RENAME_APPLY=true` plus the same env vars                                                                                                           |

Mutates **`Organization.name` only**. Does not change domains, users, fixtures, licenses, or subscriptions.

**Do not** use `demo.meengine.io` for production mutation smoke. **Do not** use broad list searches or normal operational records as mutable fixtures — only explicit IDs below.

### Current smoke fixtures (canonical names — IDs only in operator vault)

Pre-incident fixture IDs and emails in older runbook revisions are **historical** — **stale after 2026-07-17** — **must not be used in `DAT_SMOKE_*` configuration**.

After inspect + reconcile, capture current IDs only in the operator vault:

| Fixture                          | Canonical identity                                |
| -------------------------------- | ------------------------------------------------- |
| School Admin                     | `Smoke Admin`                                     |
| Instructor (positive)            | `Smoke Instructor 1` or `Smoke Instructor 2`      |
| Student (positive)               | `Smoke Student 1` or `Smoke Student 2`            |
| Vehicle (positive)               | `01-DS-24`, `02-DS-24`, `04-DS-24`, or `05-DS-24` |
| Negative instructor              | `Smoke Instructor Non-B`                          |
| Negative student                 | `Smoke Student A1`                                |
| Negative vehicle                 | `03-DS-24` (A1)                                   |
| Expected DRIVING lesson category | `B`                                               |

Reconcile tooling (operator-safe Node 20 `--env-file`; dry-run default; `--apply` human-only):

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space
node \
  --env-file=.env.operator.production.local \
  --import tsx \
  scripts/reconcile-production-smoke-fixtures.ts
```

Package script equivalent (passes `--env-file=.env.operator.production.local` explicitly): `pnpm ops:reconcile-production-smoke-fixtures`. See [production-smoke-reconciliation-inspect.md](./production-smoke-reconciliation-inspect.md).

Reconcile requires operator-only invite fixture emails when remote rows are not already canonical with coherent ACCEPTED invitations:

- `DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL` — Smoke Instructor 2 (never Sarah Williams / INS-002-2024)
- `DAT_SMOKE_INVITED_STUDENT_EMAIL` — Smoke Student 2 (never Bob Wilson / STU-002-2024)

Missing invite fixtures block reconcile until invites are sent, accepted, and dry-run passes. Sarah/Bob are preserved additional fixtures.

**Operator note (2026-07-28):** `dat-production-smoke-canonical-fixtures-v1` closed on the technical smoke DB by **human** operator — student invite link repair applied; fixture reconcile `--apply` completed (`changesApplied=18`); read-only inspector all-ready / no blockers; second dry-run idempotent; invite fixtures `provenance=invite`; Sarah Williams, Bob Wilson, John Doe preserved; commercial catalogue untouched; no `PLATFORM_ADMIN` recreate. Agent did not execute remote writes. **Next P0:** `dat-production-smoke-hosted-verification-v1` — capture full fixture IDs in operator vault, fill `DAT_SMOKE_*`, run fixture preflight, then hosted read-only and mutation smoke. Do not put emails, passwords, or full IDs in docs.

`Student.schoolStudentId` follows the business format (`YY` + registration number) — preflight does **not** require a `SMOKE-*` school ID prefix.

---

## v1a scope (read-only)

| Check                                                                           | Method                      |
| ------------------------------------------------------------------------------- | --------------------------- |
| `GET /api/health`                                                               | API script / Playwright     |
| `POST /api/signup` blocked (`public_signup_disabled` or `demo_signup_disabled`) | API                         |
| Invalid login rejected                                                          | Playwright                  |
| Admin login → `/admin`, `/admin/users`, `/admin/license` → logout               | Playwright                  |
| Instructor login → `/instructor` → logout                                       | Playwright (optional creds) |
| Hosted target safety guards                                                     | Env                         |

## Fixture preflight scope (zero-write)

After admin login, authenticated **read-only** API checks:

- Session `organizationId` matches `DAT_SMOKE_ORG_ID`
- Session role is `SUPER_ADMIN`
- Admin pages `/admin` and `/admin/lessons` load (smoke-level UI only — see below)
- Student exists at `DAT_SMOKE_STUDENT_ID` (tenant-scoped GET)
- Instructor user exists and is available for booking (`/api/admin/instructors/all?forBooking=true`)
- Instructor fixture is qualified for expected DRIVING category (default **B**) when booking endpoint exposes `qualifiedCategoryNames`
- Instructor license expiry is valid when booking endpoint exposes `instructorLicenseExpiry`
- Vehicle exists, active, `AVAILABLE`, not under maintenance (`GET /api/admin/vehicles`)
- Expected email / school ID / registration when `DAT_SMOKE_EXPECTED_*` vars are set

### UI vs API authority

Fixture preflight performs light **smoke-level** page-load checks on `/admin` and `/admin/lessons` (not redirected to login, no fatal page errors). Stable `data-testid` markers (see [Smoke testids](#smoke-testids-dec-041)) are preferred when present; legacy heading/copy markers remain as fallback. When no stable UI marker is found, the spec logs **WARN** and continues.

**Authoritative fixture validation** is the authenticated API preflight (`runSmokeFixturePreflight`): org session, student/instructor/vehicle IDs, vehicle status, and expected identity metadata.

### Feature flags vs operational access

`/api/config/features` may **not** report every operational feature key (for example `VEHICLE_MANAGEMENT`). Preflight treats **missing** feature keys as **non-blocking** when the corresponding read-only admin endpoint proves access.

| Check                | Source                                     | Hard-fail when                                                                   |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| `LESSON_MANAGEMENT`  | `/api/config/features`                     | Explicitly `false`                                                               |
| `VEHICLE_MANAGEMENT` | `/api/config/features` **or** vehicle list | Explicitly `false`, **or** vehicle HTTP/list/fixture validation fails            |
| Vehicle fixture      | `GET /api/admin/vehicles`                  | Missing ID, wrong registration, inactive, maintenance, or status not `AVAILABLE` |

When `VEHICLE_MANAGEMENT` is not reported by config but the smoke vehicle passes all fixture checks, preflight prints a **WARN** (overall pass): operational vehicle access is sufficient evidence for zero-write preflight.

### Instructor email metadata

`DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL` is **recommended identity metadata**. The booking instructor list may not expose `email`. Preflight **hard-fails** only when the API exposes an email that **differs** from the expected value. When email is not exposed, preflight prints a **WARN** and relies on `DAT_SMOKE_INSTRUCTOR_USER_ID` plus booking availability.

**Primary safety guard:** explicit fixture IDs (`DAT_SMOKE_ORG_ID`, `DAT_SMOKE_STUDENT_ID`, `DAT_SMOKE_INSTRUCTOR_USER_ID`, `DAT_SMOKE_VEHICLE_ID`) — not config feature reporting alone.

## Lesson mutation smoke scope (v1 — persisted writes)

**D4 / dual opt-in required.** Not in `pnpm check` or default CI.

**API-authoritative v1:** create/update success is determined by `POST` / `PUT` and readback via `GET /api/admin/lessons/[id]` and calendar `GET /api/admin/lessons?from=&to=`. Optional UI navigation is best-effort only.

After admin login and internal fixture preflight:

0. **Mutation readiness** (zero-write): `GET /api/admin/instructors/all?forBooking=true` exposes `qualifiedCategoryNames` and `instructorLicenseExpiry` for booking-ready instructors. Preflight and mutation readiness **hard-fail before POST** when category **B** (or `DAT_SMOKE_EXPECTED_LESSON_CATEGORY`) is missing or license is expired. When those fields are **not** exposed by an older deployed API, readiness logs **WARN** and proceeds — **`POST /api/admin/lessons` remains the authoritative safety boundary**.
1. Create one future **DRIVING** lesson via `POST /api/admin/lessons` using explicit fixture IDs.
2. Unique slot derived from `DAT_SMOKE_RUN_ID` (or auto timestamp label) on **tomorrow** in a business-hour window.
3. Verify via `GET /api/admin/lessons/[id]` and calendar `GET /api/admin/lessons?from=&to=`.
4. **Best-effort** Schedule Map UI on `/admin?focusDate=…` (15s navigation timeout; WARN and continue on timeout/slow load).
5. Update the **same** lesson via `PUT /api/admin/lessons/[id]` — time shift only (+15 minutes); same student/instructor/vehicle.
6. Re-verify API readback and calendar.
7. **Best-effort** light UI check on `/admin/lessons` (WARN on timeout; does not fail mutation smoke).
8. **No delete. No cleanup.** Created lessons are an **immutable smoke trail**.

### UI vs API authority (mutation smoke)

| Layer                             | Role                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| API create/update/readback        | **Hard gate** — test fails if POST/PUT or fixture assertions fail                  |
| Schedule Map `/admin?focusDate=…` | **Best-effort** — navigation timeout or missing marker → **WARN**, continue to PUT |
| `/admin/lessons` page load        | **Best-effort** — same WARN policy                                                 |

Hosted mutation smoke uses a **120s** test timeout; optional UI `page.goto` uses **15s** per navigation. UI timeouts do **not** fail the mutation smoke when API create/update/readback passed.

**Smoke testids (DEC-041):** stable `data-testid` selectors on admin surfaces for optional UI assertions. Constants: `lib/smoke/smoke-testids.ts`.

| `data-testid`                         | Surface                 |
| ------------------------------------- | ----------------------- |
| `smoke-admin-dashboard`               | `/admin` main content   |
| `smoke-schedule-map`                  | Schedule Map card       |
| `smoke-lesson-management`             | `/admin/lessons` header |
| `smoke-lesson-management-driving-tab` | Driving Lessons tab     |
| `smoke-people-page`                   | `/admin/users` header   |

Mutation smoke UI checks prefer these testids; API create/update/readback remains the hard gate.

### Mutation fixture instructor requirements

Production mutation smoke expects the fixture instructor to be bookable for **category `B`** (current smoke tenant default).

| Check                                                         | When exposed by deployed API         | When not exposed (legacy API)             |
| ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| Qualified category `B` (`DAT_SMOKE_EXPECTED_LESSON_CATEGORY`) | Hard-fail **before POST** if missing | **WARN**, proceed — backend POST enforces |
| Instructor license expiry                                     | Hard-fail if expired                 | **WARN**, proceed — backend enforces      |

**Assign categories in admin UI:** People → Instructors → Profiles → **Edit Instructor** → **Qualified license categories** (`instructor-qualified-categories-management-v1b`, DEC-042). No operator SQL required for routine smoke fixture maintenance.

**Authoritative safety boundary:** `POST /api/admin/lessons`. If the instructor fixture still lacks category **B**, mutation smoke fails at POST with HTTP **400** and **no lesson is created** (e.g. `Instructor has no qualified categories for driving lessons…`).

### Booking endpoint metadata (`forBooking=true`)

When `GET /api/admin/instructors/all?forBooking=true`, each instructor row may include:

| Field                     | Type             | Purpose                                    |
| ------------------------- | ---------------- | ------------------------------------------ |
| `qualifiedCategoryNames`  | `string[]`       | Active qualified categories (may be empty) |
| `instructorLicenseExpiry` | `string \| null` | ISO date `YYYY-MM-DD`                      |

These fields are **not** returned when `forBooking=false` (historical filter lists).

### Cleanup policy (v1)

- **No cleanup** in v1.
- **No DELETE** in v1.
- Future cleanup (if ever needed) is a separate batch with exact created lesson ID and explicit `DAT_SMOKE_MUTATION_CLEANUP=true`.

### Deferred from mutation v1

- Edit modal UI flow (`EditLessonDialog`) — API-first in v1; `production-smoke-e2e-testids-v1` if selectors need hardening.
- Student/instructor reassignment during edit.
- Practical number reassignment scenarios.
- Instructor/student dashboard visibility.

## Out of scope (deferred)

- Edit modal UI automation (API-first mutations in v1)
- Invite accept, Postmark/email sends
- Delete / cleanup (immutable smoke trail in v1)
- Billing, import/export apply
- Cross-tenant security probes
- Platform `/platform` flows
- Production smoke in default GitLab CI or `pnpm check`
- Demo tenant mutation smoke

---

## Environment variables

### Read-only smoke

| Variable                        | Required           | Purpose                                                                                                                                            |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DAT_SMOKE_BASE_URL`            | Recommended        | Tenant origin (e.g. `http://localhost:3000`, `https://www.meengine.io`). Falls back to `E2E_BASE_URL`, then `PLAYWRIGHT_BASE_URL`, then localhost. |
| `DAT_SMOKE_ADMIN_EMAIL`         | For admin UI tests | School admin smoke account — **secret**                                                                                                            |
| `DAT_SMOKE_ADMIN_PASSWORD`      | For admin UI tests | **secret**                                                                                                                                         |
| `DAT_SMOKE_INSTRUCTOR_EMAIL`    | Optional           | Instructor smoke — tests skip if unset                                                                                                             |
| `DAT_SMOKE_INSTRUCTOR_PASSWORD` | Optional           | **secret**                                                                                                                                         |
| `DAT_E2E_ALLOW_PRODUCTION`      | Hosted only        | Must be exactly `true` for non-local targets                                                                                                       |
| `DAT_SMOKE_ALLOWED_HOSTS`       | Hosted only        | Comma-separated hostnames (e.g. `www.meengine.io`)                                                                                                 |
| `E2E_SKIP_WEB_SERVER`           | Remote             | Set `1` when the app is already running / deployed                                                                                                 |

### Fixture preflight (additional — zero-write)

| Variable                                  | Required    | Purpose                                                                                     |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `DAT_SMOKE_ORG_ID`                        | Yes         | Expected tenant organization ID                                                             |
| `DAT_SMOKE_STUDENT_ID`                    | Yes         | Operational `Student.id` smoke fixture                                                      |
| `DAT_SMOKE_INSTRUCTOR_USER_ID`            | Yes         | Instructor `User.id` smoke fixture                                                          |
| `DAT_SMOKE_VEHICLE_ID`                    | Yes         | Smoke vehicle integer ID                                                                    |
| `DAT_SMOKE_EXPECTED_STUDENT_EMAIL`        | Recommended | Exact student email check                                                                   |
| `DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID`    | Recommended | Exact `schoolStudentId` check                                                               |
| `DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION` | Recommended | Exact vehicle registration check                                                            |
| `DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL`     | Recommended | Instructor email check when exposed by booking endpoint; non-blocking WARN when not exposed |
| `DAT_SMOKE_EXPECTED_LESSON_CATEGORY`      | Recommended | Expected DRIVING category for mutation readiness (defaults to `B`)                          |

### Lesson mutations (additional — persisted writes)

| Variable                             | Required    | Purpose                                                                |
| ------------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS` | Yes         | Must be exactly `true` for `@mutations` (in addition to hosted opt-in) |
| `DAT_SMOKE_RUN_ID`                   | Recommended | Unique run label for slot derivation (defaults to auto timestamp)      |

All fixture preflight vars above are also required for mutations.

### Mutation-only notes

| Variable                              | Purpose                                                   |
| ------------------------------------- | --------------------------------------------------------- |
| _(none beyond fixture + dual opt-in)_ | Mutations reuse fixture ID vars; no broad search env vars |

Legacy demo smoke (`e2e/demo-smoke.spec.ts`) still uses `E2E_DEMO_SCHOOL_ADMIN_*` — separate from this suite.

**Never** commit credentials, `.env.playwright`, or real passwords to git.

---

## Production safety model

1. **Local** (`localhost`, `127.0.0.1`): no production opt-in required.
2. **Hosted / production**: requires **both**:
   - `DAT_E2E_ALLOW_PRODUCTION=true`
   - `DAT_SMOKE_ALLOWED_HOSTS` includes the target hostname
3. **Fixture preflight** additionally requires explicit fixture IDs (`DAT_SMOKE_ORG_ID`, student/instructor/vehicle IDs).
4. **Lesson mutations** additionally require `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS=true` and run only via `pnpm e2e:smoke:mutations` (not readonly scripts).
5. Guards run before API script and Playwright `beforeAll`.
6. Only **protocol + hostname** are printed — never secrets.
7. CI does **not** run this suite by default.

Example for `https://www.meengine.io`:

```bash
export DAT_E2E_ALLOW_PRODUCTION=true
export DAT_SMOKE_ALLOWED_HOSTS=www.meengine.io
```

---

## Commands

| Script                             | Description                                                   |
| ---------------------------------- | ------------------------------------------------------------- |
| `pnpm e2e:smoke:api`               | API-only (health + signup blocked)                            |
| `pnpm e2e:smoke:readonly`          | Playwright `@readonly` specs                                  |
| `pnpm e2e:smoke:fixture-preflight` | Playwright `@fixture-preflight` (zero-write fixture checks)   |
| `pnpm e2e:smoke:mutations`         | Playwright `@mutations` (lesson create + update; dual opt-in) |
| `pnpm e2e:smoke:prod`              | API then Playwright `@readonly` (unchanged)                   |
| `pnpm e2e:smoke:prod:full`         | API + `@readonly` + `@fixture-preflight` + `@mutations`       |
| `pnpm e2e:mobile-viewports`        | Playwright `@mobile-viewport` (read-only admin layout smoke)  |

### Quick reference (canonical flows)

All commands assume working directory `driving_school_platform/nextjs_space` and **Git Bash** on Windows.

**P0 hosted close order:** (0) re-confirm Production deployment + served commit → (1) fixture preflight → (2) hosted read-only → (3) hosted mutations. See [P0 closure criteria](#p0-closure-criteria-dat-production-smoke-hosted-verification-v1).

1. **Local (read-only):**

```bash
pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
```

2. **Hosted (zero-write fixture preflight) — run first for P0:**

```bash
pnpm e2e:smoke:fixture-preflight
```

3. **Hosted (read-only) — after preflight passes:**

```bash
pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
# or combined helper (not a substitute for preflight):
pnpm e2e:smoke:prod
```

4. **Hosted (persisted mutations; dual opt-in) — after preflight + read-only:**

```bash
pnpm e2e:smoke:mutations
```

5. **Mobile/tablet viewport smoke (read-only; opt-in):**

```bash
pnpm e2e:mobile-viewports
# or list only:
pnpm exec playwright test --config=playwright.mobile-viewports.config.ts --list
```

Do **not** use `pnpm e2e:smoke:prod:full` as the canonical P0 close command.

### Playwright install (once per machine)

```bash
pnpm -C driving_school_platform/nextjs_space exec playwright install chromium
```

Chromium is sufficient for all viewport projects (desktop, Pixel 5, and custom tablet profile).

---

## Local run

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space

export DAT_SMOKE_BASE_URL=http://localhost:3000
export DAT_SMOKE_ADMIN_EMAIL=<local-smoke-admin>
export DAT_SMOKE_ADMIN_PASSWORD=<secret>

pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
```

Start `pnpm dev` locally or let Playwright start it when `E2E_SKIP_WEB_SERVER` is unset and base URL is localhost.

Admin/instructor UI tests **skip** when credentials are missing (API checks still run).

---

## Mobile/tablet viewport smoke (opt-in)

Read-only layout regression checks for admin surfaces at narrow and tablet viewports. **Not** in `pnpm check` or default CI. Uses a **dedicated Playwright config** so existing smoke commands remain `chromium`-only.

| Field      | Value                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Tag        | `@mobile-viewport`                                                                                       |
| Script     | `pnpm e2e:mobile-viewports`                                                                              |
| Config     | `playwright.mobile-viewports.config.ts`                                                                  |
| Writes     | **No**                                                                                                   |
| Projects   | `desktop-chromium` (1280×720), `mobile-chromium` (Pixel 5), `tablet-chromium` (810×1080 Chromium, touch) |
| Test count | **15** (5 routes × 3 projects)                                                                           |

### Scope

After admin login (`DAT_SMOKE_ADMIN_EMAIL` / `DAT_SMOKE_ADMIN_PASSWORD`):

- `/admin` — Schedule Map / admin dashboard marker; narrow Day-view helper visible on mobile/tablet portrait, hidden on desktop
- `/admin/lessons`
- `/admin/vehicles`
- `/admin/audit-logs`
- `/admin/users`

Each page: no login redirect, no fatal page errors, no critical horizontal overflow (8px tolerance), **required** stable UI markers (hard-fail when missing).

### Credential skip behavior

When admin credentials are absent, all **15** tests are **skipped**. That outcome validates test discovery and configuration only — it is **not** a successful viewport smoke run. An authenticated pass requires page assertions to execute.

### Local run

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space

export DAT_SMOKE_BASE_URL=http://localhost:3000
export DAT_SMOKE_ADMIN_EMAIL=<local-smoke-admin>
export DAT_SMOKE_ADMIN_PASSWORD=<secret>

pnpm e2e:mobile-viewports
```

Hosted targets require the same opt-in guards as other smoke suites (`DAT_E2E_ALLOW_PRODUCTION`, `DAT_SMOKE_ALLOWED_HOSTS`).

---

## Hosted / production run (explicit opt-in)

**Before any hosted suite:** re-confirm the Vercel Production deployment is Ready and note the **source commit actually served**. Fill `DAT_SMOKE_*` from the operator vault with **post-incident** IDs only.

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space

export DAT_SMOKE_BASE_URL=https://www.meengine.io
export DAT_E2E_ALLOW_PRODUCTION=true
export DAT_SMOKE_ALLOWED_HOSTS=www.meengine.io
export DAT_SMOKE_ADMIN_EMAIL=<smoke-admin>
export DAT_SMOKE_ADMIN_PASSWORD=<secret>
export DAT_SMOKE_INSTRUCTOR_EMAIL=<smoke-instructor>
export DAT_SMOKE_INSTRUCTOR_PASSWORD=<secret>
export E2E_SKIP_WEB_SERVER=1
```

### 1. Fixture preflight (hosted) — first

Add fixture IDs and expected identity checks from the vault:

```bash
export DAT_SMOKE_ORG_ID=<current-smoke-org-id-from-vault>
export DAT_SMOKE_STUDENT_ID=<current-smoke-student-id-from-vault>
export DAT_SMOKE_INSTRUCTOR_USER_ID=<current-smoke-instructor-user-id-from-vault>
export DAT_SMOKE_VEHICLE_ID=<current-smoke-vehicle-id-from-vault>
export DAT_SMOKE_EXPECTED_STUDENT_EMAIL=<redacted-in-vault>
export DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID=<school-student-id>
export DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION=01-DS-24
export DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL=<redacted-in-vault>
export DAT_SMOKE_EXPECTED_LESSON_CATEGORY=B

pnpm e2e:smoke:fixture-preflight
```

**Closure gate:** 1 passed, 0 skipped, 0 failed. Use **explicit smoke fixture IDs** only. Zero persisted writes.

### 2. Hosted read-only — after preflight

```bash
pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
# or combined helper (must still satisfy both gates below with separate evidence):
pnpm e2e:smoke:prod
```

**Closure gates (record separately):**

| Gate                      | Required result                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm e2e:smoke:api`      | TypeScript script (**not** Playwright): **exit code 0**; health pass; public signup blocked |
| `pnpm e2e:smoke:readonly` | Playwright: **4 passed**, **0 skipped**, **0 failed**                                       |

Skipped ≠ passed. Do not collapse these two gates into one ambiguous “read-only suite” count.

### 3. Lesson mutations (hosted) — after preflight + read-only

Requires fixture preflight vars **plus** mutation dual opt-in:

```bash
export DAT_E2E_ALLOW_PRODUCTION_MUTATIONS=true
export DAT_SMOKE_RUN_ID=manual-$(date +%Y%m%d%H%M%S)
export DAT_SMOKE_EXPECTED_LESSON_CATEGORY=B

pnpm e2e:smoke:mutations
```

**Closure gate:** 1 passed, 0 skipped, 0 failed. Created lessons are retained as an immutable smoke trail (no cleanup in v1).

Do **not** treat `pnpm e2e:smoke:prod:full` as the canonical P0 close command.

---

## Related

- [first-client-onboarding-record.md](../../../../docs/architecture/first-client-onboarding-record.md) — controlled first B2B client checklist (DEC-043); smoke tenant section separate from real client
- [e2e-smoke.md](./e2e-smoke.md) — optional demo read-only smoke (`E2E_DEMO_*`)
- [deployment-readiness.md](./deployment-readiness.md) — `pnpm smoke:health` (health only)
- [production-readiness-cutline.md](../../../../docs/architecture/production-readiness-cutline.md) — DEC-032 cutline
