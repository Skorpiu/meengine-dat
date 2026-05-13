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

---

## Optional variables (not in `lib/env.ts`)

These are used by **scripts**, **Playwright**, or **tenant defaults** and are **not** validated by `env-check`. Set them only when you need that workflow.

| Variable                                                                   | Typical use                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PLATFORM_HOSTS`                                                           | Comma-separated hostnames treated as the **platform** host (not tenant). In production, include your real platform hostname (for example the host serving `/platform` for operators). If unset, defaults in `lib/tenant.ts` apply—**always** set explicitly if the platform host differs. **Never** map that same hostname as a tenant `OrganizationDomain`. See [production-host-split.md](./production-host-split.md). |
| `TENANT_HOSTS`, `TENANT_ORG_ID`, `TENANT_PRIMARY_HOST`                     | Seeding / org domain scripts.                                                                                                                                                                                                                                                                                                                                                                                            |
| `ALLOW_PROD_SEED`                                                          | Must be `true` to allow seed script in production (`scripts/seed.ts`).                                                                                                                                                                                                                                                                                                                                                   |
| `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, etc.                    | `scripts/create-platform-admin.ts` — **secrets only**; never commit or publish as demo values. PLATFORM_ADMIN users are not tenant users (see [production-host-split.md](./production-host-split.md)).                                                                                                                                                                                                                   |
| `CI`                                                                       | Set by GitLab; consumed by Playwright config.                                                                                                                                                                                                                                                                                                                                                                            |
| `PLAYWRIGHT_BASE_URL`, `BASE_URL`                                          | Playwright base URL (`playwright.config.ts`).                                                                                                                                                                                                                                                                                                                                                                            |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `INSTRUCTOR_EMAIL`, `INSTRUCTOR_PASSWORD` | E2E tests that call `login()`.                                                                                                                                                                                                                                                                                                                                                                                           |

---

## Related docs

- [deployment-readiness.md](./deployment-readiness.md) — pre-deploy commands, migrations, `/api/health`.
- [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) — `DATABASE_URL` / `DIRECT_URL`, safe migrate workflow, deploy checklist.
- [vercel-deployment.md](./vercel-deployment.md) — Vercel project settings and build-time Prisma notes.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hosts, `PLATFORM_HOSTS`, OrganizationDomain cautions.
