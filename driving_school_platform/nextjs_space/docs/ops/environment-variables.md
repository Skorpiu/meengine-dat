# Environment variables (DAT)

This document describes how configuration is split across **local development**, **GitLab CI**, **Vercel**, and **Supabase**, without listing real secrets.

**Source of truth for “will `env-check` pass?”**  
`lib/env.ts` is parsed when you run `pnpm exec tsx scripts/env-check.ts` (via `pretypecheck`, `prebuild`, `pretest:run`, `predev`). Only variables in that schema are validated there.

**Source of truth for the database**  
Connection strings come from your **Supabase** (or other Postgres) project. Vercel and local `.env.local` hold the values; Supabase holds the actual database.

---

## New machine (desktop or laptop)

After cloning or pulling:

```bash
pnpm -C driving_school_platform/nextjs_space install
pnpm -C driving_school_platform/nextjs_space check
```

Copy `.env.example` to `.env.local`, fill in real values locally (never commit them). See **Files that must not be committed** below.

---

## Files that must not be committed

Do not commit credentials or local business data:

| Path                                                       | Reason                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `.env`                                                     | Local or deployment secrets                                   |
| `.env.local`                                               | Next.js local overrides (secrets)                             |
| `.env.*.local`                                             | Environment-specific local files                              |
| `private/` (under `driving_school_platform/nextjs_space/`) | Local-only private data                                       |
| `private/billing-business-profile.local.json`              | Example of billing/business profile data that must stay local |

These paths are covered by `.gitignore`; keep them out of version control even if Git tooling suggests otherwise.

---

## Variables validated by `lib/env.ts` / `env-check`

| Variable                        | Required | Public (`NEXT_PUBLIC_*`) | Purpose                                                                                                                                                                       |
| ------------------------------- | -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | **Yes**  | No                       | Prisma Postgres connection URL (pooler or primary URL, depending on your setup).                                                                                              |
| `NEXTAUTH_SECRET`               | **Yes**  | No                       | NextAuth signing secret; must be a strong random value in production.                                                                                                         |
| `DIRECT_URL`                    | No       | No                       | Optional direct Postgres URL (e.g. for migrations) when it differs from `DATABASE_URL` (common with Supabase connection pooling).                                             |
| `NEXTAUTH_URL`                  | No       | No                       | Canonical site URL for NextAuth (e.g. `http://localhost:3000` locally, `https://your-app.vercel.app` on Vercel). Set in production so callbacks and emails resolve correctly. |
| `NEXT_PUBLIC_APP_URL`           | No       | **Yes**                  | Optional public base URL for the app when used from the browser.                                                                                                              |
| `SUPABASE_URL`                  | No       | No                       | Supabase project URL (server-side).                                                                                                                                           |
| `SUPABASE_ANON_KEY`             | No       | No                       | Supabase anon key (server-side if used only on server).                                                                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | No       | No                       | Supabase service role key (**secret**, server-only, elevated privileges).                                                                                                     |
| `NEXT_PUBLIC_SUPABASE_URL`      | No       | **Yes**                  | Supabase URL exposed to the browser when client code needs it.                                                                                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No       | **Yes**                  | Supabase anon key exposed to the browser when client code needs it.                                                                                                           |

`NODE_ENV` is set by Node/Next (`development` / `production` / `test`); you normally do not set it manually in `.env.local`.

### Where to configure (by environment)

**Local development**

| Kind          | Where                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Secrets + DB  | `.env.local` (preferred) or `.env` in `driving_school_platform/nextjs_space` (ignored by git) |
| Copy template | Start from `.env.example`                                                                     |

**GitLab CI**

| Kind                                                | Where                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Dummy / placeholder values for `env-check` + Prisma | `variables` in `.gitlab-ci.yml` (see existing `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`) |

CI uses non-production placeholder URLs so `prisma generate` and builds can run without a live database for unit tests.

**Vercel**

| Kind                         | Where                                                               |
| ---------------------------- | ------------------------------------------------------------------- |
| Production / preview secrets | Project → **Settings** → **Environment Variables**                  |
| `NEXT_PUBLIC_*`              | Same UI; values are embedded in client bundles—use only public keys |

Set `DATABASE_URL` / `DIRECT_URL` from your Supabase connection strings. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` per environment (Preview vs Production) as needed.

**Supabase**

| Kind                                   | Where                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Database host, user, password, DB name | **Project Settings** → **Database** (connection strings, pooling vs direct) |
| API URL and keys                       | **Project Settings** → **API** (`SUPABASE_URL`, anon key, service role key) |

Supabase is the **source of truth** for the database and project API identifiers; Vercel and local env files **reference** those values.

**Data API vs Postgres URL:** the app’s primary data path is **Prisma over `DATABASE_URL` / `DIRECT_URL`**, not PostgREST/GraphQL. Optional `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` keys are validated in `lib/env.ts` for future or ancillary use; baseline runtime code does not call the Data API for `public` tables. Policy and Supabase grant timelines: **[supabase-data-api-grants.md](./supabase-data-api-grants.md)**.

---

## Optional variables (not in `lib/env.ts`)

These are used by **scripts**, **Playwright**, or **tenant defaults** and are **not** validated by `env-check`. Set them only when you need that workflow.

| Variable                                                                   | Typical use                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLATFORM_HOSTS`                                                           | Comma-separated hostnames treated as the **platform** host (not tenant). In production, include your real platform hostname (for example the host serving `/platform` for operators). If unset, defaults in `lib/tenant.ts` apply—**always** set explicitly if the platform host differs. **Never** map that same hostname as a tenant `OrganizationDomain`. See [production-host-split.md](./production-host-split.md).                          |
| `TENANT_HOSTS`, `TENANT_ORG_ID`, `TENANT_PRIMARY_HOST`                     | Seeding / org domain scripts.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ALLOW_PROD_SEED`                                                          | Must be `true` to allow seed script in production (`scripts/seed.ts`).                                                                                                                                                                                                                                                                                                                                                                            |
| `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, etc.                    | `scripts/create-platform-admin.ts` — **secrets only**; never commit or publish as demo values. PLATFORM_ADMIN users are not tenant users (see [production-host-split.md](./production-host-split.md)). Operator flow: **[platform-admin-runbook.md](./platform-admin-runbook.md)**.                                                                                                                                                               |
| `CI`                                                                       | Set by GitLab; consumed by Playwright config.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `E2E_BASE_URL`                                                             | Preferred Playwright tenant origin for optional demo smoke ([e2e-smoke.md](./e2e-smoke.md)); e.g. `https://demo.meengine.io`. Falls back to `PLAYWRIGHT_BASE_URL`, then `http://localhost:3000`.                                                                                                                                                                                                                                                  |
| `E2E_DEMO_SCHOOL_ADMIN_EMAIL`, `E2E_DEMO_SCHOOL_ADMIN_PASSWORD`            | Optional demo smoke only — Demo School Admin credentials (**secrets**; never commit). If either is missing, `e2e/demo-smoke.spec.ts` **skips**.                                                                                                                                                                                                                                                                                                   |
| `E2E_SKIP_WEB_SERVER`                                                      | When `1`, Playwright does not auto-start `pnpm dev` (use with a running local server or remote `E2E_BASE_URL`).                                                                                                                                                                                                                                                                                                                                   |
| `PLAYWRIGHT_BASE_URL`, `BASE_URL`                                          | Legacy Playwright base URL aliases (`playwright.config.ts`).                                                                                                                                                                                                                                                                                                                                                                                      |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `INSTRUCTOR_EMAIL`, `INSTRUCTOR_PASSWORD` | Legacy E2E specs under `tests/` that call `login()`.                                                                                                                                                                                                                                                                                                                                                                                              |
| `DEMO_WRITE_SANDBOX_ENABLED`                                               | Optional. When exactly `true` (trimmed, case-insensitive), enables **limited** lesson/vehicle creates for **`isDemo` orgs only** — see subsection below and [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox).                                                                                                                                                                                                     |
| `CRON_SECRET`                                                              | Optional locally. **Required in Vercel Production** for the daily demo sandbox cron (`GET /api/cron/demo-sandbox-reset`). Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations. Never commit a real value.                                                                                                                                                                                                                      |
| `DEMO_ORGANIZATION_ID`                                                     | Demo org CUID for operator scripts (`pnpm demo:sandbox:reset`, `pnpm demo:readiness`, etc.) and for **cron** reset (env-only; not accepted from HTTP query/body on the cron route).                                                                                                                                                                                                                                                               |
| `DEMO_SANDBOX_RESET_APPLY`                                                 | Operator script only: must be `true` together with `--apply` for `pnpm demo:sandbox:reset` to write. Not used by the cron endpoint (cron always applies).                                                                                                                                                                                                                                                                                         |
| `PUBLIC_SIGNUP_ENABLED`                                                    | Optional. When exactly `true` (trimmed, case-insensitive), allows `POST /api/signup` for **non-demo** organizations. **Default:** disabled if unset or any other value. Demo orgs remain blocked with `demo_signup_disabled` regardless. Not recommended for broad production until invite-only policy, email verification, and distributed rate limiting are in place — see [signup-hardening-plan.md](../engineering/signup-hardening-plan.md). |
| `EMAIL_PROVIDER`                                                           | Optional. **`noop` (default)** if unset/empty/`noop`. Set `postmark` for real sends via Postmark. `resend` / `smtp` not implemented. Not in `env-check`. Operator guide: [email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md).                                                                                                                                                                                              |
| `POSTMARK_SERVER_TOKEN`                                                    | Required **only when** `EMAIL_PROVIDER=postmark`. Postmark server token (`X-Postmark-Server-Token`). Use vendor value `POSTMARK_API_TEST` in Preview for API validation **without real inbox delivery**. **Secret** — never commit; set only in Vercel/env vault.                                                                                                                                                                                 |
| `POSTMARK_FROM_EMAIL`                                                      | Required **only when** `EMAIL_PROVIDER=postmark`. Must match a **verified** sender signature in Postmark (e.g. `invites@yourdomain.com`). Not needed for local/CI when using noop.                                                                                                                                                                                                                                                                |
| `POSTMARK_MESSAGE_STREAM`                                                  | Optional when `EMAIL_PROVIDER=postmark`. Defaults to `outbound`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `POSTMARK_API_BASE_URL`                                                    | Optional. Defaults to `https://api.postmarkapp.com`. **Operators leave unset** in Vercel; used by unit tests with a mock host. Do not point Production at non-Postmark URLs unless you run an approved proxy.                                                                                                                                                                                                                                     |

<a id="email-provider"></a>

### `EMAIL_PROVIDER` (optional — email boundary only)

- **Optional.** Not part of `lib/env.ts` / `env-check`.
- **Default:** **noop** when unset, empty, or `noop` (case-insensitive after trim). Local dev, CI, and `pnpm check` need **no** email env vars.
- **Effect:** Selects the email adapter for `sendEmail()` in `lib/email/*`.
  - **`noop`** — no network; no inbox delivery; `emailDelivery.noop: true` on invite create.
  - **`postmark`** — REST send via `lib/email/providers/postmark-provider.ts` (fetch, no SDK). Requires `POSTMARK_SERVER_TOKEN` + `POSTMARK_FROM_EMAIL` in that deployment; if either is missing → `emailDelivery.errorCode: PROVIDER_MISCONFIGURED` (app does not crash).
  - **`resend` / `smtp`** — `PROVIDER_NOT_IMPLEMENTED` (no network).
  - **Unknown** — `PROVIDER_UNKNOWN`.
- **Invitation create:** `POST /api/admin/invitations` always attempts delivery after a successful create. Response includes `emailDelivery` (status only — no `html`/`text`). HTTP **201** even when email fails. **`inviteLink` is always returned** — copy-link remains the mandatory fallback for admins.

<a id="postmark-email"></a>

### Postmark vars (only when `EMAIL_PROVIDER=postmark`)

Use **[email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md)** for Vercel setup, `POSTMARK_API_TEST`, validation order, and rollback.

| Variable                  | Operator notes                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `EMAIL_PROVIDER`          | Must be `postmark` for this adapter.                                                                                     |
| `POSTMARK_SERVER_TOKEN`   | Required for Postmark sends. `POSTMARK_API_TEST` for safe Preview checks without real delivery.                          |
| `POSTMARK_FROM_EMAIL`     | Required; must be verified in Postmark before Production.                                                                |
| `POSTMARK_MESSAGE_STREAM` | Optional; default `outbound`.                                                                                            |
| `POSTMARK_API_BASE_URL`   | Optional; default `https://api.postmarkapp.com`. **Not required** in normal operations — only tests and special proxies. |

**Not required globally:** unset all of the above → noop everywhere; builds and tests stay green.

<a id="public-signup-enabled"></a>

### `PUBLIC_SIGNUP_ENABLED` (optional — public self-registration)

- **Optional.** Not part of `lib/env.ts` / `env-check`.
- **Default:** disabled unless explicitly set to `true` (trimmed, case-insensitive).
- **Effect:** When `true`, non-demo tenants can use public signup (`POST /api/signup`, `/auth/register`). When disabled, API returns **403** with `code: public_signup_disabled`.
- **Demo orgs:** always blocked with `demo_signup_disabled` even when this flag is `true`.
- **Production:** leave unset or `false` unless operators intentionally enable self-serve registration and have documented hardening decisions ([release-checklist.md](./release-checklist.md)).

<a id="demo-write-sandbox-enabled"></a>

### `DEMO_WRITE_SANDBOX_ENABLED` (optional — demo write sandbox)

- **Optional.** Not part of `lib/env.ts` / `env-check`. If unset or not exactly `true` (case-insensitive, trimmed), the app keeps the default **read-mostly** behaviour for demo orgs.
- **Default:** disabled unless explicitly set to `true`.
- **Effect:** When `true`, enables the **controlled write sandbox** for organizations with `Organization.isDemo = true` only: limited creates (lessons / vehicles) by quota as documented in [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox).
- **Use:** Turn on **intentionally** for controlled client/recruiter demos; do not treat it as a general “enable all writes” switch.

**Where to set**

- **Production** (e.g. `demo.meengine.io` on Vercel): Project → **Settings** → **Environment Variables** → **Production**; set `DEMO_WRITE_SANDBOX_ENABLED=true` and **redeploy** so serverless functions pick up the value.
- **Local dev:** `.env.local` or an inline env prefix on the command (e.g. `DEMO_WRITE_SANDBOX_ENABLED=true pnpm dev`). Do **not** assume values from a developer’s `.env.local` exist in production.

**Security / scope**

- Does **not** affect non-demo organizations.
- Does **not** unlock user management, settings, licensing, feature-flag writes, billing, cleanup, or platform onboarding — those remain blocked for demo orgs as in [public-demo-policy.md](./public-demo-policy.md).

<a id="cron-secret-demo-sandbox"></a>

### `CRON_SECRET` and `DEMO_ORGANIZATION_ID` (demo cron / operator scripts)

- **`CRON_SECRET`** — long random value in **Vercel Production** only (for typical hosted demo). Used by Vercel Cron to authorize `GET /api/cron/demo-sandbox-reset`. If missing at runtime, the route returns **503** with a safe JSON error (no stack traces).
- **`DEMO_ORGANIZATION_ID`** — CUID of the organization marked `isDemo`. Used by operator scripts and by the cron route (read from env only). If missing on the cron route, returns **500** with a safe JSON error.
- **Scope of cron reset:** deletes **lessons** and **vehicles** for that org only; does not remove users, personas, domains, features, entitlements, settings, or billing.
- **Schedule:** `0 3 * * *` (03:00 UTC) in `vercel.json`; Hobby plans may run within the hour window.
- See [client-demo-runbook.md](./client-demo-runbook.md#automatic-daily-demo-sandbox-reset).

---

## Related docs

- [deployment-readiness.md](./deployment-readiness.md) — pre-deploy commands, migrations, `/api/health`.
- [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) — `DATABASE_URL` / `DIRECT_URL`, safe migrate workflow, deploy checklist.
- [supabase-data-api-grants.md](./supabase-data-api-grants.md) — Data API / `public` grants policy; audit that DAT uses Prisma, not PostgREST, for app tables.
- [vercel-deployment.md](./vercel-deployment.md) — Vercel project settings and build-time Prisma notes.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hosts, `PLATFORM_HOSTS`, OrganizationDomain cautions.
- [platform-admin-runbook.md](./platform-admin-runbook.md) — create/update PLATFORM_ADMIN with `create-platform-admin.ts` (no demo credentials).
- [email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md) — enable Postmark on Vercel safely; noop default; copy-link fallback.
