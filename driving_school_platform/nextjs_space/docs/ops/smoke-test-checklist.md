# Manual smoke test checklist (DAT)

Short manual pass to confirm core surfaces load and role paths are not obviously broken after a **local build** or **hosted deployment**. Use a **non-production** test tenant and credentials from your own secret process—do **not** record real passwords, API keys, or billing data in tickets or screenshots.

For release ordering, env, migrations, and rollback, see **[release-checklist.md](./release-checklist.md)** and the linked ops docs below instead of duplicating them here. For a **first** hosted deploy on Vercel, start with **[first-deploy-smoke.md](./first-deploy-smoke.md)** then return here for depth.

| Topic                                      | Doc                                                              |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Preconditions, deploy order, rollback      | [release-checklist.md](./release-checklist.md)                   |
| Local gate (`pnpm … check`), health JSON   | [deployment-readiness.md](./deployment-readiness.md)             |
| Environment variables                      | [environment-variables.md](./environment-variables.md)           |
| Vercel project settings                    | [vercel-deployment.md](./vercel-deployment.md)                   |
| Prisma + Supabase migrations               | [supabase-prisma-migrations.md](./supabase-prisma-migrations.md) |
| Optional GitLab Runner                     | [gitlab-runner-docker.md](./gitlab-runner-docker.md)             |
| First Vercel deploy (ordered minimal pass) | [first-deploy-smoke.md](./first-deploy-smoke.md)                 |

---

## When to use

- After a **Vercel** (or equivalent) deploy to production or preview.
- After a **migration deploy** to the same environment you are validating (then re-run health and key browser checks).
- **Before a demo** or stakeholder walkthrough.
- After changes that touch **auth**, **tenant** boundaries, **licensing**, or **billing-related** code paths—even if real payment providers are not integrated.

---

## Public checks

Run against the deployment base URL (or `http://localhost:3000` for a local production build).

1. **`GET /api/health`** — expect `200` and JSON with `ok: true` (DB-free; details in [deployment-readiness.md](./deployment-readiness.md)). You can hit it with a browser, `curl`, or the optional `pnpm smoke:health` script from `driving_school_platform/nextjs_space` (`HEALTH_BASE_URL` or `pnpm smoke:health -- --url <base>`).
2. **Landing** — open `/` (home); page loads, no blank shell from asset or routing failure.
3. **Login** — open `/auth/login`; form and layout render.

---

## Authentication checks

Use a **known non-production test account** if your environment has one (seeded dev user, staging-only account, etc.). Never use production customer credentials for smoke.

1. **Login** — submit valid test credentials; session establishes and you reach an expected post-login route (role-dependent).
2. **Logout** — end session; unauthenticated requests to protected routes redirect or show sign-in as designed.
3. **Failed login** — wrong password; expect a controlled error or message, **no** unhandled exception or white screen.

---

## Role / surface checks

Adjust URLs if your app’s routing differs; current App Router examples:

| Role / intent       | Example path  | Expect                                                                                                                                             |
| ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin               | `/admin`      | Dashboard loads for an admin-capable test user.                                                                                                    |
| Instructor          | `/instructor` | Instructor dashboard loads for an instructor test user.                                                                                            |
| Student             | `/student`    | Student dashboard loads for a student test user.                                                                                                   |
| Platform (elevated) | `/platform`   | Loads **only** for a user authorized for that surface; others should not see full privileged UI (redirect, forbidden, or empty state—not a crash). |

If a user lacks a role, confirm **access denied or redirect** rather than a broken page.

---

## Licensing / billing smoke

Baseline product does **not** integrate real billing providers; keep checks shallow.

1. **License** — as an admin test user, open `/admin/license` (or your team’s equivalent); page loads.
2. **Feature-gated surface** — open a route that depends on license or entitlements (for example an admin lesson list at `/admin/lessons`); confirm the UI renders or shows an expected empty or “not available” state **without** a client-side crash loop.
3. **Webhooks** — **do not** exercise real payment-provider webhooks in smoke; providers are not integrated for live validation. When they are, extend this checklist separately.

---

## Operational checks

1. **Browser** — DevTools console: no obvious **fatal** errors during the steps above (warnings from extensions or third-party scripts can be noted separately).
2. **Server / host logs** — Vercel (or local server) logs: no **repeated** unhandled errors or stack traces tied to your smoke traffic.
3. **Health after smoke** — `GET /api/health` again; still `200` and `ok: true`.

---

## Reference route map (read-only)

These paths match the current App Router layout for naming only; if routes move, update this table in the same doc.

| Path                                            | Notes                         |
| ----------------------------------------------- | ----------------------------- |
| `/`                                             | Landing                       |
| `/auth/login`                                   | Login                         |
| `/auth/register`                                | Registration (optional smoke) |
| `/admin`, `/admin/lessons`, `/admin/license`, … | Admin area                    |
| `/instructor`                                   | Instructor home               |
| `/student`                                      | Student home                  |
| `/platform`                                     | Platform / elevated surface   |
| `/api/health`                                   | Liveness JSON                 |
