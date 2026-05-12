# Release / deploy checklist (DAT)

Practical path for shipping DAT safely. Details live in linked ops docs—do **not** commit secrets, real database URLs, Supabase keys, or runner tokens.

| Topic                          | Doc                                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| Local gate, health JSON        | [deployment-readiness.md](./deployment-readiness.md)             |
| Env vars by surface            | [environment-variables.md](./environment-variables.md)           |
| Vercel project settings        | [vercel-deployment.md](./vercel-deployment.md)                   |
| Prisma + Supabase migrations   | [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) |
| Local GitLab Runner (optional) | [gitlab-runner-docker.md](./gitlab-runner-docker.md)             |

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

1. **`GET /api/health`** on the deployment URL — expect `200` and JSON `ok: true` (DB-free; [deployment-readiness.md](./deployment-readiness.md)).
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

See also **Not integrated in this baseline** in [deployment-readiness.md](./deployment-readiness.md).
