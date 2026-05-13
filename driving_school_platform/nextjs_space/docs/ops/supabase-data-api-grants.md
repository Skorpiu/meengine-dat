# Supabase Data API and `public` grants (DAT)

Operational policy and audit notes for **Supabase’s Data API** (PostgREST under `/rest/v1/`, GraphQL under `/graphql/v1/`, and client access via keys such as the **anon** or **service_role** JWT). This complements **[supabase-prisma-migrations.md](./supabase-prisma-migrations.md)** (Prisma + Postgres URLs), **[supabase-data-api-policy.md](./supabase-data-api-policy.md)** (RLS + consolidated Data API posture), and does **not** replace them.

Supabase has announced that, on a defined timeline, **new tables in `public` will not be exposed to the Data API by default** without explicit grants. DAT operators should assume that future Supabase defaults may require deliberate SQL if anything ever reads app tables through the Data API.

Do **not** paste real project URLs, keys, or database connection strings into tickets, chat, or git.

---

## Audit findings (repository baseline)

As of this document, **DAT does not depend on the Supabase Data API for application table access.**

| Area                                                                              | Finding                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`package.json`**                                                                | No `@supabase/supabase-js` (or other Supabase client SDK) dependency.                                                                                                                                                                                   |
| **Runtime code** (`app/`, `components/`, `hooks/`, `lib/` excluding `lib/env.ts`) | No `createClient`, `supabase.from(...)`, fetches to `/rest/v1/` or `/graphql/v1/`, or other PostgREST/GraphQL client usage for DAT models.                                                                                                              |
| **`lib/env.ts`**                                                                  | Optional validation only for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nothing in the app runtime imports these keys for queries today.                            |
| **Primary data path**                                                             | **`DATABASE_URL` / `DIRECT_URL`** with **Prisma** to Postgres (often hosted on Supabase). That path uses the **database connection**, not the HTTP Data API.                                                                                            |
| **`prisma/migrations/`**                                                          | Prisma-generated SQL creates objects in the default **`public`** schema as usual. Searches for explicit **`GRANT`** statements targeting Data API roles did not find migration-authored grants (baseline relies on platform defaults where applicable). |

**Conclusion:** Supabase is used in this stack primarily as **managed Postgres** (plus dashboard/API settings for operators). A future feature that used `supabase-js` or REST against `public` tables would be **additive** and must follow the policy below.

---

## DAT default policy

1. **Prefer Prisma and server-side Postgres** (`DATABASE_URL` / `DIRECT_URL`) for all application persistence. Do **not** expose Prisma-managed tables through the Supabase Data API **by default**.
2. **Do not** assume that new `public` tables are visible to `anon` or `authenticated` PostgREST roles after Supabase’s grant changes. Treat lack of exposure as the safe default.
3. **`SUPABASE_SERVICE_ROLE_KEY`** (if ever used) is **secret** and **server-only**; it bypasses RLS and must never appear in client bundles or public repos. Same discipline as other service secrets (see **[environment-variables.md](./environment-variables.md)**).
4. If **`NEXT_PUBLIC_SUPABASE_*`** vars are set without a client, they only increase bundle/env surface—prefer omitting them until a reviewed client feature exists.

---

## When a future feature _must_ use the Data API

If a table (or view) must be readable/writable via **PostgREST / `supabase-js`**, treat it as a **security design task**, not a migration afterthought:

- **Explicit `GRANT`** — only the minimum privileges on the specific objects (typically not blanket `public` grants for all app tables).
- **RLS enabled** on exposed tables (unless using `service_role` only on a locked-down server path—and even then, justify why RLS is not required).
- **Least-privilege RLS policies** — reviewed for `anon` vs `authenticated` vs service paths.
- **Review before merge** — same bar as auth or billing-sensitive changes; document the threat model in the PR.

Prisma-created tables used by the Next.js app should **not** automatically be granted to **`anon`** / **`authenticated`** for PostgREST unless that access is explicitly required and reviewed.

---

## Related docs

- **[supabase-data-api-policy.md](./supabase-data-api-policy.md)** — RLS on internal tables, no default anon/authenticated policies, future schema posture.
- **[environment-variables.md](./environment-variables.md)** — Supabase-related env vars and secret handling.
- **[supabase-prisma-migrations.md](./supabase-prisma-migrations.md)** — pooled vs direct URLs, `prisma migrate deploy`, deploy checklist.
- **[deployment-readiness.md](./deployment-readiness.md)** — pre-deploy checks and health smoke.
