# Production smoke E2E (automated, read-only v1a)

Automated **read-only** smoke for controlled B2B production readiness. Complements manual checklists ([smoke-test-checklist.md](./smoke-test-checklist.md), [production-smoke-baseline.md](./production-smoke-baseline.md)).

**Decision:** [DEC-036](../../../../docs/architecture/decision-log.md) — hybrid API + Playwright; production opt-in; no mutations in v1a.

---

## Purpose

Repeatable post-deploy checks without mutating tenant data:

- API: health liveness + public signup blocked
- UI: invalid login, admin page loads, optional instructor dashboard, logout

**Not** a substitute for full manual smoke (invites, lesson create/edit, import/export).

---

## v1a scope (this batch)

| Check                                                                           | Method                      |
| ------------------------------------------------------------------------------- | --------------------------- |
| `GET /api/health`                                                               | API script / Playwright     |
| `POST /api/signup` blocked (`public_signup_disabled` or `demo_signup_disabled`) | API                         |
| Invalid login rejected                                                          | Playwright                  |
| Admin login → `/admin`, `/admin/users`, `/admin/license` → logout               | Playwright                  |
| Instructor login → `/instructor` → logout                                       | Playwright (optional creds) |
| Hosted target safety guards                                                     | Env                         |

## Out of scope (deferred)

- Lesson create / edit / modal / practical number reassignment → `production-smoke-e2e-lesson-mutations-v1` (dedicated smoke tenant)
- Invite accept, Postmark/email sends
- Delete / cleanup
- Billing, import/export apply
- Cross-tenant security probes
- Platform `/platform` flows
- Production smoke in default GitLab CI or `pnpm check`
- Demo tenant mutation smoke

---

## Environment variables

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

Legacy demo smoke (`e2e/demo-smoke.spec.ts`) still uses `E2E_DEMO_SCHOOL_ADMIN_*` — separate from this suite.

**Never** commit credentials, `.env.playwright`, or real passwords to git.

---

## Production safety model

1. **Local** (`localhost`, `127.0.0.1`): no production opt-in required.
2. **Hosted / production**: requires **both**:
   - `DAT_E2E_ALLOW_PRODUCTION=true`
   - `DAT_SMOKE_ALLOWED_HOSTS` includes the target hostname
3. Guards run before API script and Playwright `beforeAll`.
4. Only **protocol + hostname** are printed — never secrets.
5. CI does **not** run this suite by default.

Example for `https://www.meengine.io`:

```bash
export DAT_E2E_ALLOW_PRODUCTION=true
export DAT_SMOKE_ALLOWED_HOSTS=www.meengine.io
```

---

## Commands

| Script                    | Description                        |
| ------------------------- | ---------------------------------- |
| `pnpm e2e:smoke:api`      | API-only (health + signup blocked) |
| `pnpm e2e:smoke:readonly` | Playwright `@readonly` specs       |
| `pnpm e2e:smoke:prod`     | API then Playwright (same guards)  |

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

Use **dedicated smoke accounts** on a tenant isolated from real client operations. v1a performs **zero persisted writes**.

---

## Related

- [e2e-smoke.md](./e2e-smoke.md) — optional demo read-only smoke (`E2E_DEMO_*`)
- [deployment-readiness.md](./deployment-readiness.md) — `pnpm smoke:health` (health only)
- [production-readiness-cutline.md](../../../../docs/architecture/production-readiness-cutline.md) — DEC-032 cutline
