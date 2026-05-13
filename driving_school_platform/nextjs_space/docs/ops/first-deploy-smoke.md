# First deployed render smoke (DAT)

Short **ordered** pass for validating the **first** real **Vercel** deployment after CI is green. It ties together existing ops docs without re-listing env keys or migration commands.

Do **not** commit secrets, real database URLs, Supabase keys, or production customer credentials. Use placeholders in notes; configure values only in Vercel and your secret stores.

| Topic                                               | Doc                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Release order, rollback                             | [release-checklist.md](./release-checklist.md)                   |
| Vercel wiring                                       | [vercel-deployment.md](./vercel-deployment.md)                   |
| Env matrix                                          | [environment-variables.md](./environment-variables.md)           |
| Migrations + Supabase                               | [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) |
| Health JSON, optional `pnpm smoke:health`           | [deployment-readiness.md](./deployment-readiness.md)             |
| Deeper manual smoke (roles, licensing shallow pass) | [smoke-test-checklist.md](./smoke-test-checklist.md)             |
| Optional local runner                               | [gitlab-runner-docker.md](./gitlab-runner-docker.md)             |
| Tenant vs platform host (production smoke)          | [production-host-split.md](./production-host-split.md)           |
| Recorded production smoke baseline (no secrets)     | [production-smoke-baseline.md](./production-smoke-baseline.md)   |

---

## Checklist

Run from top to bottom once the app is live on the host shown in the Vercel deployment view.

1. **GitLab pipeline green** for the commit you shipped (see `.gitlab-ci.yml` at repo root; optional project runner: [gitlab-runner-docker.md](./gitlab-runner-docker.md)).
2. **Vercel env vars** set for the target environment (Production and Preview if you use both)—details in [vercel-deployment.md](./vercel-deployment.md) and [environment-variables.md](./environment-variables.md).
3. **Migrations** either intentionally applied for this release or confirmed not needed—follow [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) and the deploy section of [release-checklist.md](./release-checklist.md).
4. **Deploy** through Vercel (merge, promote, or your team flow—[vercel-deployment.md](./vercel-deployment.md)).
5. Open the **deployment URL** from the Vercel UI in a browser (no hostnames recorded here). If you already use **split production hostnames** (tenant app vs platform on the same project), run **health and tenant login** smoke against the **tenant** origin and any **platform `/platform`** smoke against the **platform** origin—see [production-host-split.md](./production-host-split.md).
6. **`GET /api/health`** — confirm `200` and JSON match expectations in [deployment-readiness.md](./deployment-readiness.md) (DB-free liveness; `Cache-Control: no-store`). Repeat per hostname if you validate both tenant and platform domains.
7. **Optional script:** from `driving_school_platform/nextjs_space`, with `HEALTH_BASE_URL` set to the **HTTPS origin** of that deployment (scheme + host, no path; angle brackets mean “substitute your value”):

   ```bash
   HEALTH_BASE_URL=https://<your-deployment-host> pnpm smoke:health
   ```

   Equivalent: `pnpm smoke:health -- --url https://<your-deployment-host>` (see [deployment-readiness.md](./deployment-readiness.md)).

8. Open **`/auth/login`** — page and form render (routing and assets sanity).
9. **One safe authenticated path** only if a **non-production** test account exists (credentials from your own process—never log real passwords); fuller steps in [smoke-test-checklist.md](./smoke-test-checklist.md). Skip if you have no test user.
10. **Vercel / runtime logs** — quick scan for obvious errors after the steps above.
11. **Do not** hit **real payment-provider webhooks**; baseline DAT does not integrate live billing providers—keep webhook checks out of this pass (see [smoke-test-checklist.md](./smoke-test-checklist.md)).

After a successful first production validation, operators may record a **high-level** outcome (no credentials, no raw logs) in **[production-smoke-baseline.md](./production-smoke-baseline.md)** and still re-run smoke for every subsequent deploy.

When you need a broader pass (roles, surfaces, licensing shallow checks), continue with **[smoke-test-checklist.md](./smoke-test-checklist.md)**.
