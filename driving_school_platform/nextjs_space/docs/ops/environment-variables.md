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

| Variable                                                                   | Typical use                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PLATFORM_HOSTS`                                                           | Comma-separated hostnames treated as the **platform** host (not tenant). In production, include your real platform hostname (for example the host serving `/platform` for operators). If unset, defaults in `lib/tenant.ts` apply—**always** set explicitly if the platform host differs. **Never** map that same hostname as a tenant `OrganizationDomain`. See [production-host-split.md](./production-host-split.md). |
| `TENANT_HOSTS`, `TENANT_ORG_ID`, `TENANT_PRIMARY_HOST`                     | Seeding / org domain scripts.                                                                                                                                                                                                                                                                                                                                                                                            |
| `ALLOW_PROD_SEED`                                                          | Must be `true` to allow seed script in production (`scripts/seed.ts`).                                                                                                                                                                                                                                                                                                                                                   |
| `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, etc.                    | `scripts/create-platform-admin.ts` — **secrets only**; never commit or publish as demo values. PLATFORM_ADMIN users are not tenant users (see [production-host-split.md](./production-host-split.md)). Operator flow: **[platform-admin-runbook.md](./platform-admin-runbook.md)**.                                                                                                                                      |
| `CI`                                                                       | Set by GitLab; consumed by Playwright config.                                                                                                                                                                                                                                                                                                                                                                            |
| `PLAYWRIGHT_BASE_URL`, `BASE_URL`                                          | Playwright base URL (`playwright.config.ts`).                                                                                                                                                                                                                                                                                                                                                                            |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `INSTRUCTOR_EMAIL`, `INSTRUCTOR_PASSWORD` | E2E tests that call `login()`.                                                                                                                                                                                                                                                                                                                                                                                           |
| `DEMO_WRITE_SANDBOX_ENABLED`                                               | Optional. When exactly `true` (trimmed, case-insensitive), enables **limited** lesson/vehicle creates for **`isDemo` orgs only** — see subsection below and [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox).                                                                                                                                                                            |
| `CRON_SECRET`                                                              | Optional locally. **Required in Vercel Production** for the daily demo sandbox cron (`GET /api/cron/demo-sandbox-reset`). Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations. Never commit a real value.                                                                                                                                                                                             |
| `DEMO_ORGANIZATION_ID`                                                     | Demo org CUID for operator scripts (`pnpm demo:sandbox:reset`, `pnpm demo:readiness`, etc.) and for **cron** reset (env-only; not accepted from HTTP query/body on the cron route).                                                                                                                                                                                                                                      |
| `DEMO_SANDBOX_RESET_APPLY`                                                 | Operator script only: must be `true` together with `--apply` for `pnpm demo:sandbox:reset` to write. Not used by the cron endpoint (cron always applies).                                                                                                                                                                                                                                                                |

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
