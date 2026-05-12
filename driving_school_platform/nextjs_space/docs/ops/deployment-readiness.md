# Deployment readiness

Concise baseline for validating the Next.js app in hosted environments. Product behavior is unchanged; this doc captures operational expectations.

## Required local commands before deploy

From the repo root, run the full gate used in CI and release prep:

```bash
pnpm -C driving_school_platform/nextjs_space check
```

That runs `lint`, `typecheck`, `test:run`, and `build`. For a quicker pre-push loop you can run individual scripts from `driving_school_platform/nextjs_space/package.json` (for example `lint`, `typecheck`, `test:run`).

**New machine:** after clone/pull, run `pnpm -C driving_school_platform/nextjs_space install` then `pnpm -C driving_school_platform/nextjs_space check` (with `.env.local` filled from `.env.example`).

## Environment and secrets

See **[environment-variables.md](./environment-variables.md)** for variables by surface (local, GitLab CI, Vercel, Supabase), required vs optional, `NEXT_PUBLIC_*` vs server-only, and files that must never be committed.

In short: `lib/env.ts` + `scripts/env-check.ts` require `DATABASE_URL` and `NEXTAUTH_SECRET` for check/build; store real values in `.env.local` (local) or the host’s secret manager (CI/Vercel), not in git.

## Vercel (hosted)

For root directory, install/build commands, Node 20, environment variables on Vercel, Prisma/migration cautions, and domain/DNS notes, see **[vercel-deployment.md](./vercel-deployment.md)**.

## Prisma migrations

- After pulling schema changes, apply migrations against the target database before or as part of deploy (for example `pnpm exec prisma migrate deploy` from `driving_school_platform/nextjs_space` with the correct `DATABASE_URL`).
- Run `pnpm exec prisma generate` as needed so the client matches the deployed schema (the app’s `prebuild` / `pretypecheck` hooks already run `prisma generate` when using pnpm scripts).

## Health endpoint

- **URL:** `GET /api/health`
- **Purpose:** Liveness check only; does not query the database or external services.
- **Success:** HTTP `200` with JSON body:

```json
{
  "ok": true,
  "service": "driving-academy-tool",
  "status": "healthy"
}
```

Use this for load balancer health checks and post-deploy smoke tests. A separate database readiness check is not part of this baseline.

## Local GitLab Runner (Windows + Docker Desktop)

If you run GitLab CI jobs on a **Windows** machine with **Docker Desktop** and **Git Bash**, see **[gitlab-runner-docker.md](./gitlab-runner-docker.md)** for runner container setup, `MSYS_NO_PATHCONV=1`, registration with `glrt` tokens, recommended Docker executor cache settings, and verification commands.

## Not integrated in this baseline

The following are intentionally out of scope for minimal deploy validation:

- **Real billing providers** — no live payment processor wiring in this baseline.
- **Checkout** — no purchase or checkout flow for deploy smoke tests.
- **Billing portal / billing UI** — no customer-facing billing management as part of readiness checks.
