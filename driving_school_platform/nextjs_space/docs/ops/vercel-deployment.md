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

| Variable     | Notes                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIRECT_URL` | Optional **direct** Postgres URL when it differs from `DATABASE_URL` (common with Supabase pooling). Use for `prisma migrate deploy` or admin tooling from your machine or CI—not as a substitute for thinking through when each URL is appropriate. |

Additional keys validated in `lib/env.ts` (for example server-side `SUPABASE_URL`) are documented in **[environment-variables.md](./environment-variables.md)**.

---

## Prisma and deploy cautions

- **`prisma generate`** runs during normal installs and builds via `postinstall`, **`prebuild`**, and **`pretypecheck`** in `package.json` (together with `env:check`). Vercel builds therefore expect valid `DATABASE_URL` / `NEXTAUTH_SECRET` (and any other required env) to be present for that environment.
- **Migrations** (`prisma migrate deploy`, etc.) should be applied **intentionally** against the target database before or as part of your release process—typically from a trusted environment with the right `DATABASE_URL` / `DIRECT_URL`, not ad hoc from the Vercel build log.
- Do **not** run **destructive** migration or reset commands from the Vercel build step; keep builds non-destructive and repeatable.
- **Prisma 7** upgrades are **not** part of this baseline; the app pins Prisma 6.x per `package.json`.

---

## Domains and DNS (high level)

1. Confirm the default **Vercel project URL** works and `/api/health` returns `200`.
2. Add a **custom domain** in Vercel, then point **DNS** at Vercel (this repo’s README mentions **Cloudflare** for DNS; follow Vercel’s records for your registrar).
3. After cutover, set **`NEXTAUTH_URL`** (and any public app URL vars you use) to the production hostname.
4. Do **not** hard-code production hostnames in application source; prefer environment configuration.

---

## Related

- [deployment-readiness.md](./deployment-readiness.md) — local `pnpm check`, health JSON, migrations overview.
- [environment-variables.md](./environment-variables.md) — authoritative env list and “must not commit” paths.
- [gitlab-runner-docker.md](./gitlab-runner-docker.md) — optional local GitLab Runner on Windows.
