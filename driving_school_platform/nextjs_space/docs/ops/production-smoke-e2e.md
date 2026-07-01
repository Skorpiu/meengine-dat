# Production smoke E2E (automated)

Automated smoke for controlled B2B production readiness. Complements manual checklists ([smoke-test-checklist.md](./smoke-test-checklist.md), [production-smoke-baseline.md](./production-smoke-baseline.md)).

**Decisions:** [DEC-036](../../../../docs/architecture/decision-log.md) (read-only v1a); [DEC-039](../../../../docs/architecture/decision-log.md) (fixture preflight); [DEC-040](../../../../docs/architecture/decision-log.md) (lesson mutation smoke v1).

---

## Suites

| Suite                     | Tag                  | Writes  | Script                             |
| ------------------------- | -------------------- | ------- | ---------------------------------- |
| API health + signup guard | —                    | **No**  | `pnpm e2e:smoke:api`               |
| Read-only UI smoke        | `@readonly`          | **No**  | `pnpm e2e:smoke:readonly`          |
| Fixture preflight         | `@fixture-preflight` | **No**  | `pnpm e2e:smoke:fixture-preflight` |
| Lesson mutations          | `@mutations`         | **Yes** | `pnpm e2e:smoke:mutations`         |

Combined readonly hosted run: `pnpm e2e:smoke:prod` (API + `@readonly` only).

Optional full hosted run (API + readonly + fixture preflight + mutations): `pnpm e2e:smoke:prod:full` — requires mutation dual opt-in.

**Fixture preflight must pass before mutation smoke** (mutations spec runs preflight internally).

---

## Temporary production smoke tenant (operator policy)

Until a separate official client tenant exists, the current **`A Conquistadora`** organization on `https://www.meengine.io` is treated as a **production smoke / test tenant**, not as the final real client tenant.

| Field           | Value                       |
| --------------- | --------------------------- |
| Organization    | `A Conquistadora`           |
| Organization ID | `cmltn7vdl0000f8c4vxy6gcwx` |
| Host            | `www.meengine.io`           |

When the official client tenant is created later, **do not reuse** these fixture IDs or assumptions.

**Do not** use `demo.meengine.io` for production mutation smoke. **Do not** use broad list searches or normal operational records as mutable fixtures — only explicit IDs below.

### Current smoke fixtures (IDs only — no secrets in git)

| Fixture                          | ID / value                        |
| -------------------------------- | --------------------------------- |
| Admin email                      | `conquistadora@drivingschool.com` |
| Student ID                       | `cmqy5ipo20001kv046njb88zm`       |
| Student email (expected)         | `rukahh@gmail.com`                |
| Student school ID (expected)     | `26001`                           |
| Instructor User ID               | `cmqqtdhwr0007if042bmjnhe5`       |
| Instructor email (expected)      | `afilipa.lab@gmail.com`           |
| Vehicle ID                       | `90`                              |
| Vehicle registration (expected)  | `SM-00-KE`                        |
| Expected DRIVING lesson category | `B`                               |

`Student.schoolStudentId` follows the business format (`YY` + registration number, e.g. `26001`) — preflight does **not** require a `SMOKE-*` school ID prefix.

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
- Vehicle exists, active, `AVAILABLE`, not under maintenance (`GET /api/admin/vehicles`)
- Expected email / school ID / registration when `DAT_SMOKE_EXPECTED_*` vars are set

### UI vs API authority

Fixture preflight performs light **smoke-level** page-load checks on `/admin` and `/admin/lessons` (not redirected to login, no fatal page errors). Exact headings, tab labels, or copy are **not** safety gates — when no stable UI marker is found, the spec logs **WARN** and continues.

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

0. **Mutation readiness** (zero-write, best-effort): when `GET /api/admin/instructors/all?forBooking=true` exposes `qualifiedCategoryNames` / `instructorLicenseExpiry`, validate category and license before POST. When those fields are **not** exposed by the **deployed** API (current production default), readiness logs **WARN** and proceeds — **`POST /api/admin/lessons` remains the authoritative safety boundary** (HTTP 400, no lesson created if the instructor lacks qualified categories).
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

**Future hardening (deferred):** `production-smoke-e2e-testids-v1` — stable `data-testid` selectors for Schedule Map and Lesson Management UI assertions.

### Mutation fixture instructor requirements

Production mutation smoke expects the fixture instructor to be bookable for **category `B`** (current smoke tenant default).

| Check                                                         | When exposed by deployed API         | When not exposed                          |
| ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| Qualified category `B` (`DAT_SMOKE_EXPECTED_LESSON_CATEGORY`) | Hard-fail **before POST** if missing | **WARN**, proceed — backend POST enforces |
| Instructor license expiry                                     | Hard-fail if expired                 | **WARN**, proceed — backend enforces      |

**Authoritative safety boundary:** `POST /api/admin/lessons`. If the instructor fixture still lacks category **B**, mutation smoke fails at POST with HTTP **400** and **no lesson is created** (e.g. `Instructor has no qualified categories for driving lessons…`).

### Instructor qualified categories — operational gap (smoke fixture)

Instructor **qualified categories** (`_InstructorCategories` / `Instructor.qualifiedCategories`) are required for DRIVING lesson creation but are **not manageable through the current admin UI** (Edit Instructor covers profile, license, and app access only).

For the temporary **A Conquistadora** smoke fixture, category **B** may be linked by **controlled operator SQL** on the validated smoke tenant (example pattern — adjust IDs for your env):

```sql
-- Resolve category B id and instructor record id for the smoke tenant first.
INSERT INTO "_InstructorCategories" ("A", "B")
SELECT '<instructor-record-id>', c.id
FROM categories c
WHERE c.name = 'B'
ON CONFLICT DO NOTHING;
```

**Follow-up product batch (required):** `instructor-qualified-categories-management-v1` — admin UI to assign qualified categories without operator SQL.

**Future optional hardening (deferred):** expose instructor `qualifiedCategoryNames` and `instructorLicenseExpiry` on a stable read-only admin fixture API after deployment, so pre-POST readiness can hard-fail without depending on POST probing.

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

- Edit modal UI automation (API-first mutations in v1; testids slice if needed)
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

Install browser once per machine:

```bash
pnpm -C driving_school_platform/nextjs_space exec playwright install chromium
```

---

## Local run

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space
pnpm exec playwright install chromium

export DAT_SMOKE_BASE_URL=http://localhost:3000
export DAT_SMOKE_ADMIN_EMAIL=<local-smoke-admin>
export DAT_SMOKE_ADMIN_PASSWORD=<secret>

pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
```

Start `pnpm dev` locally or let Playwright start it when `E2E_SKIP_WEB_SERVER` is unset and base URL is localhost.

Admin/instructor UI tests **skip** when credentials are missing (API checks still run).

---

## Hosted / production run (explicit opt-in)

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

pnpm e2e:smoke:api
pnpm e2e:smoke:readonly
# or combined:
pnpm e2e:smoke:prod
```

### Fixture preflight (hosted)

Add fixture IDs and expected identity checks (recommended for `www.meengine.io`):

```bash
export DAT_SMOKE_ORG_ID=cmltn7vdl0000f8c4vxy6gcwx
export DAT_SMOKE_STUDENT_ID=cmqy5ipo20001kv046njb88zm
export DAT_SMOKE_INSTRUCTOR_USER_ID=cmqqtdhwr0007if042bmjnhe5
export DAT_SMOKE_VEHICLE_ID=90
export DAT_SMOKE_EXPECTED_STUDENT_EMAIL=rukahh@gmail.com
export DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID=26001
export DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION=SM-00-KE
export DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL=afilipa.lab@gmail.com
export DAT_SMOKE_EXPECTED_LESSON_CATEGORY=B

pnpm e2e:smoke:fixture-preflight
```

Use **explicit smoke fixture IDs** only. Read-only and fixture suites perform **zero persisted writes**.

### Lesson mutations (hosted)

Requires fixture preflight vars **plus** mutation dual opt-in:

```bash
export DAT_E2E_ALLOW_PRODUCTION_MUTATIONS=true
export DAT_SMOKE_RUN_ID=manual-$(date +%Y%m%d%H%M%S)
export DAT_SMOKE_EXPECTED_LESSON_CATEGORY=B

pnpm e2e:smoke:fixture-preflight
pnpm e2e:smoke:mutations
```

Created lessons are retained as an immutable smoke trail (no cleanup in v1).

---

## Related

- [e2e-smoke.md](./e2e-smoke.md) — optional demo read-only smoke (`E2E_DEMO_*`)
- [deployment-readiness.md](./deployment-readiness.md) — `pnpm smoke:health` (health only)
- [production-readiness-cutline.md](../../../../docs/architecture/production-readiness-cutline.md) — DEC-032 cutline
