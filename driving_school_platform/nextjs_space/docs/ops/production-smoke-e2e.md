# Production smoke E2E (automated)

Automated smoke for controlled B2B production readiness. Complements manual checklists ([smoke-test-checklist.md](./smoke-test-checklist.md), [production-smoke-baseline.md](./production-smoke-baseline.md)).

**Decisions:** [DEC-036](../../../../docs/architecture/decision-log.md) (read-only v1a); [DEC-039](../../../../docs/architecture/decision-log.md) (fixture preflight + mutation gate).

---

## Suites

| Suite                     | Tag                  | Writes           | Script                             |
| ------------------------- | -------------------- | ---------------- | ---------------------------------- |
| API health + signup guard | —                    | **No**           | `pnpm e2e:smoke:api`               |
| Read-only UI smoke        | `@readonly`          | **No**           | `pnpm e2e:smoke:readonly`          |
| Fixture preflight         | `@fixture-preflight` | **No**           | `pnpm e2e:smoke:fixture-preflight` |
| Lesson mutations          | `@mutations`         | **Yes** (future) | _not implemented_                  |

Combined readonly hosted run: `pnpm e2e:smoke:prod` (API + `@readonly` only).

**Fixture preflight must pass before any future mutation smoke.**

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

| Fixture                         | ID / value                        |
| ------------------------------- | --------------------------------- |
| Admin email                     | `conquistadora@drivingschool.com` |
| Student ID                      | `cmqy5ipo20001kv046njb88zm`       |
| Student email (expected)        | `rukahh@gmail.com`                |
| Student school ID (expected)    | `26001`                           |
| Instructor User ID              | `cmqqtdhwr0007if042bmjnhe5`       |
| Instructor email (expected)     | `afilipa.lab@gmail.com`           |
| Vehicle ID                      | `90`                              |
| Vehicle registration (expected) | `SM-00-KE`                        |

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
- Admin pages `/admin` and `/admin/lessons` load
- Student exists at `DAT_SMOKE_STUDENT_ID` (tenant-scoped GET)
- Instructor user exists and is available for booking (`/api/admin/instructors/all?forBooking=true`)
- Vehicle exists, active, `AVAILABLE`, not under maintenance (`GET /api/admin/vehicles`)
- Expected email / school ID / registration when `DAT_SMOKE_EXPECTED_*` vars are set

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

## Out of scope (deferred)

- Lesson create / edit / modal / practical number reassignment → `production-smoke-e2e-lesson-mutations-v1` (requires fixture preflight green + `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS` in future batch)
- Invite accept, Postmark/email sends
- Delete / cleanup
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

### Future mutation smoke (not in this batch)

| Variable                             | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS` | Separate dual opt-in for persisted writes (future) |

Legacy demo smoke (`e2e/demo-smoke.spec.ts`) still uses `E2E_DEMO_SCHOOL_ADMIN_*` — separate from this suite.

**Never** commit credentials, `.env.playwright`, or real passwords to git.

---

## Production safety model

1. **Local** (`localhost`, `127.0.0.1`): no production opt-in required.
2. **Hosted / production**: requires **both**:
   - `DAT_E2E_ALLOW_PRODUCTION=true`
   - `DAT_SMOKE_ALLOWED_HOSTS` includes the target hostname
3. **Fixture preflight** additionally requires explicit fixture IDs (`DAT_SMOKE_ORG_ID`, student/instructor/vehicle IDs).
4. Guards run before API script and Playwright `beforeAll`.
5. Only **protocol + hostname** are printed — never secrets.
6. CI does **not** run this suite by default.

Example for `https://www.meengine.io`:

```bash
export DAT_E2E_ALLOW_PRODUCTION=true
export DAT_SMOKE_ALLOWED_HOSTS=www.meengine.io
```

---

## Commands

| Script                             | Description                                                 |
| ---------------------------------- | ----------------------------------------------------------- |
| `pnpm e2e:smoke:api`               | API-only (health + signup blocked)                          |
| `pnpm e2e:smoke:readonly`          | Playwright `@readonly` specs                                |
| `pnpm e2e:smoke:fixture-preflight` | Playwright `@fixture-preflight` (zero-write fixture checks) |
| `pnpm e2e:smoke:prod`              | API then Playwright `@readonly` (unchanged)                 |

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

pnpm e2e:smoke:fixture-preflight
```

Use **explicit smoke fixture IDs** only. Read-only and fixture suites perform **zero persisted writes**.

---

## Related

- [e2e-smoke.md](./e2e-smoke.md) — optional demo read-only smoke (`E2E_DEMO_*`)
- [deployment-readiness.md](./deployment-readiness.md) — `pnpm smoke:health` (health only)
- [production-readiness-cutline.md](../../../../docs/architecture/production-readiness-cutline.md) — DEC-032 cutline
