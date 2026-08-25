# Supabase + Prisma migrations (DAT)

Safe, **intentional** database migration practices for deployments using **Prisma 6**, **`prisma.config.ts`** (migrations under `prisma/migrations`), and **Supabase Postgres**. This is operational documentation only: it does not change runtime behavior, schema, or migration files.

Do **not** paste real `DATABASE_URL`, `DIRECT_URL`, or Supabase credentials into tickets, chat, or git. Configure secrets in **Supabase**, **Vercel**, **GitLab CI variables**, or local `.env.local` only.

For **Supabase Data API** exposure of `public` tables (PostgREST / future `supabase-js` usage) and explicit **GRANT** / **RLS** policy, see **[supabase-data-api-grants.md](./supabase-data-api-grants.md)**. DAT’s default is Prisma + Postgres URLs, not the Data API, for application data.

**Prisma 7** upgrades and migration-format changes are **out of scope** for this project baseline.

---

## `DATABASE_URL` and `DIRECT_URL`

| Variable           | Role (high level)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`DATABASE_URL`** | Primary Postgres URL used by the app and Prisma at runtime. With Supabase, this is often the **pooled** connection string (PgBouncer / pooler port), which suits many concurrent serverless connections.                                                                                                                                                                                                                            |
| **`DIRECT_URL`**   | **Required for the canonical migration-deploy wrapper** because Prisma schema declares `directUrl = env("DIRECT_URL")`. Non-pooled (“direct”) Postgres URL to the same database when it differs from `DATABASE_URL`. Common on Supabase when the pooler cannot be used for certain Prisma operations. DIRECT_URL host is validated against `DAT_OPS_EXPECTED_DIRECT_DB_HOST` and is **not** compared to `DAT_OPS_EXPECTED_DB_HOST`. |

### Pooled vs direct (Supabase, conceptual)

- **Pooled** connections go through Supabase’s **connection pooler**. They are well suited to **application traffic** and short-lived serverless invocations.
- **Direct** connections talk to Postgres **without** that pooler path. Prisma **migration commands** that need advisory locks or session-level behavior are often run against a **direct** URL; your Supabase project settings document the exact strings to copy.

**When to use which:** use **`DATABASE_URL`** for the running app. The canonical `pnpm ops:migrate-deploy-remote` path requires both URLs. It validates pooled `DATABASE_URL` against `DAT_OPS_EXPECTED_DB_HOST`, database, and Supabase project ref, and validates `DIRECT_URL` against independent `DAT_OPS_EXPECTED_DIRECT_DB_HOST`, the same expected database, and the same project ref (DEC-069). The expected direct host is never inferred from `DATABASE_URL`. If both connection strings are identical in your setup, still set both URLs and both expected hosts. Follow Supabase’s connection docs for production.

See also **[environment-variables.md](./environment-variables.md)** for where these are set (local, CI, Vercel).

---

## Safe local validation (no production DB changes)

From the **repository root**:

```bash
pnpm -C driving_school_platform/nextjs_space check
```

That runs `lint`, `typecheck`, `test:run`, and `build`, including **`env-check`** and **`prisma generate`** via existing `package.json` hooks (`pretypecheck`, `prebuild`, `postinstall`).

**Inspect committed migrations without applying them**

- Review SQL and folders under `driving_school_platform/nextjs_space/prisma/migrations/` in git (no database required).

**Inspect migration status against a database** (connects to DB; does **not** apply pending migrations):

```bash
cd driving_school_platform/nextjs_space
pnpm exec prisma migrate status
```

Use a **non-production** database URL when experimenting. Ensure `DATABASE_URL` (and `DIRECT_URL` if configured) point at the database you intend to inspect.

---

## Production and deploy migration guidance (DEC-069)

- Apply schema changes **on purpose** as part of release planning—never as a side effect of a casual command against production.
- **Canonical Production/operator path:** `pnpm ops:migrate-deploy-remote` from `driving_school_platform/nextjs_space`. This loads `.env.operator.production.local` and runs a fail-closed identity preflight (zero DB connection, no Prisma spawn). Required identity env: `DAT_OPS_EXPECTED_DB_HOST`, `DAT_OPS_EXPECTED_DIRECT_DB_HOST`, `DAT_OPS_EXPECTED_DB_NAME`, `DAT_OPS_EXPECTED_SUPABASE_PROJECT_REF`.
- **`--execute` is separate.** It is interactive, TTY-only, refuses `CI` / `GITLAB_CI` / `VERCEL`, and requires a typed confirmation phrase. Do not persist the phrase.
- Raw `source .env` + `pnpm exec prisma migrate deploy` is **no longer** the canonical Production path. Historical mentions of that sequence in older plans remain historical only.
- **Never run `prisma migrate dev` against production.** It is for iterative local development and can prompt for destructive actions inappropriate for live data.
- **Never run destructive reset / drop commands against production** (for example `migrate reset`, raw SQL that drops schemas, or ad hoc wipes).
- **Do not rely on the Vercel build step** or GitLab CI to perform migrations. Builds should remain **repeatable and non-destructive** (see **[vercel-deployment.md](./vercel-deployment.md)**). Unattended CI/Vercel migration is prohibited.
- **Prisma 7** migration or upgrade work is **not** part of this setup; the repo pins Prisma 6.x.

---

## Deployment checklist (database + app)

1. **Migrations committed:** new migration folders and SQL are merged on the branch you deploy; history matches what you expect in `prisma/migrations/`.
2. **Environment variables:** `DATABASE_URL`, `NEXTAUTH_SECRET`, and other required keys exist for the target (Vercel / preview / production as applicable); `DIRECT_URL` set if your Supabase + Prisma workflow needs it. See **[environment-variables.md](./environment-variables.md)** and **[vercel-deployment.md](./vercel-deployment.md)**.
3. **Apply migrations intentionally:** from `driving_school_platform/nextjs_space`, run `pnpm ops:migrate-deploy-remote` (preflight) and only then `pnpm ops:migrate-deploy-remote -- --execute` after human confirmation (DEC-069). Do not use `source .env` or raw `prisma migrate deploy` as the Production path. Do not run this from CI or Vercel.
4. **Deploy the application** (for example Vercel production deploy after migrations succeed).
5. **Verify liveness:** `GET /api/health` returns `200` (DB-free smoke test; see **[deployment-readiness.md](./deployment-readiness.md)**).
6. **Optional:** manually verify an **authenticated** path in staging/production if the release touches auth or data-sensitive flows.

---

## Related

- [deployment-readiness.md](./deployment-readiness.md) — `pnpm check`, health endpoint, high-level migration note.
- [vercel-deployment.md](./vercel-deployment.md) — Vercel build env and Prisma cautions.
- [environment-variables.md](./environment-variables.md) — `DATABASE_URL` / `DIRECT_URL` and secret handling.
- [supabase-data-api-grants.md](./supabase-data-api-grants.md) — Data API grants / RLS policy; audit that migrations do not assume PostgREST access.
