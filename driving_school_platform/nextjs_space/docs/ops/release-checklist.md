# Release / deploy checklist (DAT)

Practical path for shipping DAT safely. Details live in linked ops docs—do **not** commit secrets, real database URLs, Supabase keys, or runner tokens.

| Topic                                   | Doc                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Local gate, health JSON                 | [deployment-readiness.md](./deployment-readiness.md)                   |
| Manual smoke (post-deploy)              | [smoke-test-checklist.md](./smoke-test-checklist.md)                   |
| First hosted deploy smoke               | [first-deploy-smoke.md](./first-deploy-smoke.md)                       |
| Production smoke baseline note          | [production-smoke-baseline.md](./production-smoke-baseline.md)         |
| Public demo / portfolio gaps            | [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md) |
| Public demo policy (credentials / data) | [public-demo-policy.md](./public-demo-policy.md)                       |
| Env vars by surface                     | [environment-variables.md](./environment-variables.md)                 |
| Vercel project settings                 | [vercel-deployment.md](./vercel-deployment.md)                         |
| Prisma + Supabase migrations            | [supabase-prisma-migrations.md](./supabase-prisma-migrations.md)       |
| Local GitLab Runner (optional)          | [gitlab-runner-docker.md](./gitlab-runner-docker.md)                   |

---

## Preconditions

- **Branch / tree clean:** you are releasing from the intended branch (often `main`) with no unintended uncommitted changes; merge request reviewed as per team process.
- **Local gate:** `pnpm -C driving_school_platform/nextjs_space check` passes on the commit you intend to deploy.
- **GitLab pipeline green:** pipeline for that commit succeeded (see `.gitlab-ci.yml` and optional [gitlab-runner-docker.md](./gitlab-runner-docker.md) if you use a project runner).
- **Vercel env configured:** production (and preview, if used) variables set per [vercel-deployment.md](./vercel-deployment.md) and [environment-variables.md](./environment-variables.md)—never from git.
- **Migrations reviewed and committed:** `prisma/migrations` matches what you expect to apply; see [supabase-prisma-migrations.md](./supabase-prisma-migrations.md).

---

## Pre-deploy (operator machine)

```bash
git pull --ff-only
pnpm -C driving_school_platform/nextjs_space install
pnpm -C driving_school_platform/nextjs_space check
```

- **Review Prisma migrations** in git (diff / folder review). Confirm target DB and `DATABASE_URL` / `DIRECT_URL` before any migrate command.

---

## Deploy

1. **Apply committed migrations intentionally** when the release includes schema changes—typically `pnpm exec prisma migrate deploy` from `driving_school_platform/nextjs_space` against the **target** database, or an equivalent protected step. Do not run destructive Prisma commands against production.
2. **Deploy the app** through **Vercel** (merge to tracked branch, promote, or your team’s flow—see [vercel-deployment.md](./vercel-deployment.md)).
3. **Do not** rely on the Vercel build to perform destructive or ad hoc database changes.

---

## Post-deploy smoke

For the **first** Vercel-hosted validation in order, see **[first-deploy-smoke.md](./first-deploy-smoke.md)**. For a fuller manual pass (public routes, auth, role surfaces, licensing smoke, logs, and re-check of `/api/health`), follow **[smoke-test-checklist.md](./smoke-test-checklist.md)**. A **high-level** record of the first successful production smoke (no credentials, no raw logs) is in **[production-smoke-baseline.md](./production-smoke-baseline.md)**—update that doc only when the baseline meaningfully changes; **every** deploy still needs fresh smoke and log review. The bullets below stay as a minimal reminder only.

1. **`GET /api/health`** on the deployment URL — expect `200` and JSON `ok: true` (DB-free; [deployment-readiness.md](./deployment-readiness.md)). Optionally run `pnpm smoke:health` from `driving_school_platform/nextjs_space` with `HEALTH_BASE_URL` or `--url` set to your deployment base URL (see that doc).
2. **Load the login page** in a browser (sanity: routing, assets).
3. **If safe for this environment:** one short **authenticated** admin or platform smoke path (credentials only from your secret process—never log real passwords).
4. **Vercel / app logs:** scan for obvious errors after traffic hits the new deployment.

---

## Rollback notes

- **Application:** roll back to a **previous Vercel deployment** from the Vercel UI when the app binary/config is wrong. This is usually the first lever for a bad release.
- **Database:** **schema/data rollback is not automatic** with an app redeploy. Reverting migrations or data requires a **planned** procedure (often forward-fix or manual SQL with backups). Coordinate with [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) guidance; do not assume `git revert` alone fixes live schema.

---

## Known not yet integrated (baseline scope)

The following are intentionally **not** part of minimal release validation for DAT in this baseline:

- Real **billing providers**
- **Checkout**
- **Billing portal** / billing management UI
- **i18n** (internationalization)

Any **public demo** must follow [public-demo-policy.md](./public-demo-policy.md): no public privileged credentials; fictional / resettable data; read-mostly demo tenants until guards are wired.

See also **Not integrated in this baseline** in [deployment-readiness.md](./deployment-readiness.md). For **public demo / portfolio** gaps after smoke (data isolation, credential policy, messaging), see [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md).
