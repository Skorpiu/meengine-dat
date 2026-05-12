# Deployment readiness

Concise baseline for validating the Next.js app in hosted environments. Product behavior is unchanged; this doc captures operational expectations.

## Required local commands before deploy

From the repo root, run the full gate used in CI and release prep:

```bash
pnpm -C driving_school_platform/nextjs_space check
```

That runs `lint`, `typecheck`, `test:run`, and `build`. For a quicker pre-push loop you can run individual scripts from `driving_school_platform/nextjs_space/package.json` (for example `lint`, `typecheck`, `test:run`).

## Environment and secrets

- Ensure production (and staging) environment variables match what `scripts/env-check.ts` expects for the target environment. Missing or placeholder values often surface only at build or first request.
- Store secrets in the host’s secret manager or encrypted env configuration; do not commit `.env` files with real credentials.
- Review NextAuth, database URL, and any license or feature-flag related variables for the deployment target.

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

## Not integrated in this baseline

The following are intentionally out of scope for minimal deploy validation:

- **Real billing providers** — no live payment processor wiring in this baseline.
- **Checkout** — no purchase or checkout flow for deploy smoke tests.
- **Billing portal / billing UI** — no customer-facing billing management as part of readiness checks.
