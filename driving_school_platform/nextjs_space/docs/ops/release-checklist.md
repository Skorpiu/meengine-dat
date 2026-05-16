# Release / deploy checklist (DAT)

Practical path for shipping DAT safely. Details live in linked ops docs—do **not** commit secrets, real database URLs, Supabase keys, or runner tokens.

| Topic                                   | Doc                                                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local gate, health JSON                 | [deployment-readiness.md](./deployment-readiness.md)                                                                                                                              |
| Manual smoke (post-deploy)              | [smoke-test-checklist.md](./smoke-test-checklist.md)                                                                                                                              |
| First hosted deploy smoke               | [first-deploy-smoke.md](./first-deploy-smoke.md)                                                                                                                                  |
| Production smoke baseline note          | [production-smoke-baseline.md](./production-smoke-baseline.md)                                                                                                                    |
| Public demo / portfolio gaps            | [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md)                                                                                                            |
| Public demo policy (credentials / data) | [public-demo-policy.md](./public-demo-policy.md)                                                                                                                                  |
| Public portfolio / demo access policy   | [public-portfolio-access.md](./public-portfolio-access.md)                                                                                                                        |
| Client demo runbook                     | [client-demo-runbook.md](./client-demo-runbook.md)                                                                                                                                |
| Client demo readiness smoke             | `pnpm demo:client-ready` — see [client-demo-runbook.md](./client-demo-runbook.md#client-demo-readiness-smoke)                                                                     |
| Client demo personas (operator)         | `pnpm demo:personas:configure`, `pnpm demo:personas:check`, `pnpm demo:personas:cleanup` — see [client-demo-runbook.md](./client-demo-runbook.md#configure-private-demo-personas) |
| Demo practical lesson readiness         | `pnpm demo:practical:configure` — see [client-demo-runbook.md](./client-demo-runbook.md#prepare-practical-lesson-demo)                                                            |
| Demo seed / reset runbook               | [public-demo-seed-reset.md](./public-demo-seed-reset.md)                                                                                                                          |
| Demo sandbox reset (operator)           | `pnpm demo:sandbox:reset` — see [client-demo-runbook.md](./client-demo-runbook.md#reset-demo-sandbox-after-a-meeting)                                                             |
| Demo feature showcase (policy + check)  | [public-demo-feature-showcase.md](./public-demo-feature-showcase.md); `pnpm demo:features:check`; operator prep: `pnpm demo:showcase:configure` (see doc)                         |
| Demo readiness (read-only preflight)    | `pnpm demo:readiness` — see [public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check)                                                                              |
| Env vars by surface                     | [environment-variables.md](./environment-variables.md)                                                                                                                            |
| Vercel project settings                 | [vercel-deployment.md](./vercel-deployment.md)                                                                                                                                    |
| Prisma + Supabase migrations            | [supabase-prisma-migrations.md](./supabase-prisma-migrations.md)                                                                                                                  |
| Supabase Data API + RLS policy          | [supabase-data-api-policy.md](./supabase-data-api-policy.md)                                                                                                                      |
| Supabase Data API grants audit          | [supabase-data-api-grants.md](./supabase-data-api-grants.md)                                                                                                                      |
| Local GitLab Runner (optional)          | [gitlab-runner-docker.md](./gitlab-runner-docker.md)                                                                                                                              |

---

## Preconditions

- **Branch / tree clean:** you are releasing from the intended branch (often `main`) with no unintended uncommitted changes; merge request reviewed as per team process.
- **Client or recruiter demo:** before a client or recruiter session, follow [client-demo-runbook.md](./client-demo-runbook.md) end-to-end (prep, checks, and on-site rules).
- **Private demo personas:** configure and verify demo users with `pnpm demo:personas:configure` and `pnpm demo:personas:check` (see [client-demo-runbook.md](./client-demo-runbook.md#configure-private-demo-personas)); never commit persona passwords into git.
- **Practical driving lesson demo:** if the session will create a **DRIVING** lesson, run `pnpm demo:practical:configure` (dry-run then apply) before the meeting — see [client-demo-runbook.md](./client-demo-runbook.md#prepare-practical-lesson-demo).
- **Demo org hygiene:** remove obsolete temporary persona accounts (duplicate Gmail, etc.) before controlled client/recruiter access—see **`pnpm demo:personas:cleanup`** in [client-demo-runbook.md](./client-demo-runbook.md#cleanup-old-demo-personas); do not rely on ad hoc DB edits.
- **Destructive lesson cleanup:** must remain **explicit** only — operators use **POST** `/api/admin/cleanup` (tenant-scoped, demo-guarded). Do **not** rely on read endpoints (e.g. **GET** `/api/admin/lessons`) to delete or mutate data.
- **Lesson calendar reads:** **GET** `/api/admin/lessons`, `/api/instructor/lessons`, and `/api/student/lessons` with `from`/`to` must use **bounded** date ranges (max **90 days** via `validateLessonCalendarRange`); clients should not request wider windows. Invalid dates return **400** with `invalid_calendar_range` or `calendar_range_too_large`.
- **Controlled client/recruiter demo:** `pnpm demo:client-ready` must **PASS** (read-only aggregate smoke; see [client-demo-runbook.md](./client-demo-runbook.md#client-demo-readiness-smoke)) before sharing controlled demo access with a client or recruiter.
- **`demo.meengine.io` in Vercel and DNS:** the hostname must be configured on the Vercel project and in Cloudflare (CNAME as in [client-demo-runbook.md](./client-demo-runbook.md#vercel-and-dns-setup-for-demo-meengine-io)) before a client/recruiter demo—not only the database `OrganizationDomain` row.
- **Demo organization bootstrap / listing (when sharing controlled demo access):** use `pnpm demo:org:bootstrap` and `pnpm demo:orgs:list` so the demo tenant and `OrganizationDomain.host` are prepared and the demo org id is obtained **without** opening Supabase ad hoc; then follow [public-portfolio-access.md](./public-portfolio-access.md#preparing-the-first-full-showcase-demo) before handing any demo URL to a reviewer.
- **Local gate:** `pnpm -C driving_school_platform/nextjs_space check` passes on the commit you intend to deploy.
- **GitLab pipeline green:** pipeline for that commit succeeded (see `.gitlab-ci.yml` and optional [gitlab-runner-docker.md](./gitlab-runner-docker.md) if you use a project runner).
- **Vercel env configured:** production (and preview, if used) variables set per [vercel-deployment.md](./vercel-deployment.md) and [environment-variables.md](./environment-variables.md)—never from git.
- **Migrations reviewed and committed:** `prisma/migrations` matches what you expect to apply; see [supabase-prisma-migrations.md](./supabase-prisma-migrations.md).
- **Supabase Security Advisor:** no **critical** “RLS disabled” findings for internal `public` tables that DAT intentionally hardens (see [supabase-data-api-policy.md](./supabase-data-api-policy.md)); do **not** add blanket permissive `anon` / `authenticated` policies on internal tables by default.
- **Public demo / portfolio (if applicable):** follow [public-portfolio-access.md](./public-portfolio-access.md) before sharing any demo URL privately; then confirm the demo tenant is marked `Organization.isDemo = true`; **Full Showcase** licensed UI should be prepared with the **operator** script `pnpm demo:showcase:configure` (not by public demo users—see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features)); where a **repeatable tier** (basic / premium / full-showcase) is enough, prefer **`DEMO_SHOWCASE_PROFILE`** over ad hoc key lists ([public-demo-feature-showcase.md](./public-demo-feature-showcase.md#demo-tier-profiles)); run **`pnpm demo:readiness`** and **`pnpm demo:features:check`** (read-only; see [public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check) and [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)); confirm Supabase Security Advisor has no **critical** RLS-disabled internal-table findings per [supabase-data-api-policy.md](./supabase-data-api-policy.md); ensure refresh/reset follows the seed runbook (no public reset endpoint; no privileged credentials in git).
- **Controlled demo writes (optional):** if you enable **`DEMO_WRITE_SANDBOX_ENABLED=true`** for a session, confirm it is **intentional** and that operators understand **per-category quotas** (one theory lesson, one driving lesson, one theoretical exam, one practical exam, one vehicle — seed rows count toward each type; see [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox)). Turn it off again for default read-mostly posture when the session ends. After sandbox use, either run **`pnpm demo:sandbox:reset`** (with apply flags per [client-demo-runbook.md](./client-demo-runbook.md#reset-demo-sandbox-after-a-meeting)) or **intentionally** keep org state until the next reset.
- **Controlled demo writes on Vercel:** if limited writes are expected on the **production** demo host (e.g. `demo.meengine.io`), confirm **`DEMO_WRITE_SANDBOX_ENABLED=true`** is set under **Vercel → Environment Variables → Production** and that the project was **redeployed** after the change ([environment-variables.md](./environment-variables.md#demo-write-sandbox-enabled), [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox)).

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

When billing webhooks are exposed (staging or production), **HTTP error responses must not include raw provider messages, stack traces, signature details, or other internal `detail` fields** — only stable `error` + `code` shapes (`lib/billing/webhook-http.ts`). Real PSP **signature verification** remains out of scope until a live provider is integrated.

Any **public demo** must follow [public-demo-policy.md](./public-demo-policy.md): no public privileged credentials; fictional / resettable data; read-mostly demo tenants until guards are wired. Seed and reset expectations: [public-demo-seed-reset.md](./public-demo-seed-reset.md) (`pnpm demo:reset:dry-run` for org validation only).

See also **Not integrated in this baseline** in [deployment-readiness.md](./deployment-readiness.md). For **public demo / portfolio** gaps after smoke (data isolation, credential policy, messaging), see [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md).
