# Vercel deployment (DAT)

Operational checklist for hosting the Next.js app on **Vercel** so builds and runtime stay predictable. This does not change application behavior; it documents how the repo expects the project to be wired.

Do **not** commit real secrets, database URLs, or Supabase keys. Configure values in **Vercel → Project → Settings → Environment Variables** (and in Supabase for database/API origin), not in git.

For the full variable matrix (local, CI, Vercel, Supabase), see **[environment-variables.md](./environment-variables.md)**.

---

## Recommended Vercel project settings

| Setting              | Recommended value                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root Directory**   | `driving_school_platform/nextjs_space`                                                                                                                                                                                        |
| **Framework Preset** | Next.js (default detection is fine)                                                                                                                                                                                           |
| **Install Command**  | `pnpm install --frozen-lockfile`                                                                                                                                                                                              |
| **Build Command**    | `pnpm build`                                                                                                                                                                                                                  |
| **Output Directory** | Leave default (Next.js on Vercel uses the framework output; no custom static export for this app).                                                                                                                            |
| **Node.js version**  | **20.x** — align with `engines.node` in `package.json` (`>=20 <21`), Volta (`20.20.0`), and GitLab CI (`node:20`). Set via Vercel **Settings → General → Node.js Version** (or `engines` if you rely on automatic selection). |

After a deployment succeeds, smoke-test liveness with **`GET /api/health`** on the deployment URL (see [deployment-readiness.md](./deployment-readiness.md)). That route is intentionally **DB-free**.

For a short **first hosted deploy** sequence (CI → env → migrations → Vercel URL → health → optional `pnpm smoke:health` → login → logs), see **[first-deploy-smoke.md](./first-deploy-smoke.md)**.

---

## Environment variables on Vercel

Set per **Production** / **Preview** / **Development** as appropriate. Values come from your **Supabase** (or other Postgres) project and your auth setup—never from committed files.

### Required for build and runtime (validated by `env-check`)

| Variable          | Notes                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Prisma Postgres URL (often Supabase pooler URL in production).                         |
| `NEXTAUTH_SECRET` | Strong random secret in production; same class of sensitivity as database credentials. |

### Strongly recommended in production

| Variable       | Notes                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL` | Canonical public base URL of the deployment (for example `https://<project>.vercel.app` or your custom domain). Improves NextAuth callback and URL correctness. |

### Supabase-related (set when your deployment uses them)

| Variable                        | Notes                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-exposed Supabase project URL; only if client code needs it.                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-exposed anon key; safe for public client use with RLS—still configure only via Vercel UI, not git. |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Server-only**, elevated privilege; never prefix with `NEXT_PUBLIC_`.                                     |

### Migrations / direct connection (when applicable)

| Variable     | Notes                                                                                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIRECT_URL` | Direct Postgres URL when it differs from `DATABASE_URL` (common with Supabase pooling). **Required** for the canonical operator migration wrapper (`pnpm ops:migrate-deploy-remote`, DEC-069). Not used by the Vercel build to run migrations. |

Additional keys validated in `lib/env.ts` (for example server-side `SUPABASE_URL`) are documented in **[environment-variables.md](./environment-variables.md)**.

### Demo sandbox cron (production demo host)

| Variable               | Notes                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `CRON_SECRET`          | Authorizes Vercel Cron calls to `GET /api/cron/demo-sandbox-reset`. Generate a long random value; never commit it. |
| `DEMO_ORGANIZATION_ID` | Demo org CUID; cron uses this env only (not query/body).                                                           |

Cron schedule is defined in **`vercel.json`** (`0 3 * * *`, 03:00 UTC). On Hobby, execution may fall anywhere within that hour. See [client-demo-runbook.md](./client-demo-runbook.md#automatic-daily-demo-sandbox-reset).

---

## Prisma and deploy cautions

- **`prisma generate`** runs during normal installs and builds via `postinstall`, **`prebuild`**, and **`pretypecheck`** in `package.json` (together with `env:check`). Vercel builds therefore expect valid `DATABASE_URL` / `NEXTAUTH_SECRET` (and any other required env) to be present for that environment.
- **Migrations** must **not** run from the Vercel build. Canonical operator path: `pnpm ops:migrate-deploy-remote` against `.env.operator.production.local` (DEC-069). Unattended CI/Vercel migration is prohibited.
- Do **not** run **destructive** migration or reset commands from the Vercel build step; keep builds non-destructive and repeatable.
- **Prisma 7** upgrades are **not** part of this baseline; the app pins Prisma 6.x per `package.json`.

Step-by-step Supabase connection guidance, safe inspection commands, and a deploy checklist: **[supabase-prisma-migrations.md](./supabase-prisma-migrations.md)**.

---

## Domains and DNS (high level)

1. Confirm the default **Vercel project URL** works and `/api/health` returns `200`.
2. Add a **custom domain** in Vercel, then point **DNS** at Vercel (this repo’s README mentions **Cloudflare** for DNS; follow Vercel’s records for your registrar).
3. After cutover, set **`NEXTAUTH_URL`** (and any public app URL vars you use) to the production hostname.
4. Do **not** hard-code production hostnames in application source; prefer environment configuration.

### Tenant host vs platform host (production)

For deployments that split **school (tenant) traffic** and **platform operator** traffic across two hostnames on the **same Vercel project**:

- Add **both** domains in Vercel (tenant/app host and platform host).
- If you use **`PLATFORM_HOSTS`**, include every platform hostname the app should treat as the platform origin (comma-separated). Details: [environment-variables.md](./environment-variables.md) and **[production-host-split.md](./production-host-split.md)**.
- **Do not** register the platform hostname as a tenant **`OrganizationDomain`**; **PLATFORM_ADMIN** users are not tenant users and must not be tied to a school domain for routing. Full checklist: [production-host-split.md](./production-host-split.md).

---

## Related

- [first-deploy-smoke.md](./first-deploy-smoke.md) — first Vercel render validation (links out for env and migrations detail).
- [deployment-readiness.md](./deployment-readiness.md) — local `pnpm check`, health JSON, migrations overview.
- [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) — safe Prisma migrate workflow with Supabase.
- [environment-variables.md](./environment-variables.md) — authoritative env list and “must not commit” paths.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hostnames, Vercel domains, `PLATFORM_HOSTS`, smoke routing.
- [gitlab-runner-docker.md](./gitlab-runner-docker.md) — optional local GitLab Runner on Windows.
