# DAT production / public demo — readiness gaps

Concise gap audit after **hosted deploy + basic smoke** (see [production-smoke-baseline.md](./production-smoke-baseline.md)). Use this to pick the **next 3–5** work batches—not as a live status page.

Do **not** put credentials, customer emails, URLs with embedded secrets, or billing identifiers in tickets or git.

---

## What already looks solid (operational)

- **CI** — pipeline green on shipped commits.
- **Hosting** — Vercel production deploy serving the app; **`GET /api/health`** OK; optional `pnpm smoke:health` pattern documented.
- **Split hosts** — tenant-facing app vs platform operator host model documented ([production-host-split.md](./production-host-split.md)); smoke baseline reflects successful login and core routes for admin / instructor / student / **PLATFORM_ADMIN** on the intended origins ([production-smoke-baseline.md](./production-smoke-baseline.md)).
- **Demo isolation foundation** — `Organization.isDemo`, demo route/mutation guards, and read-only **`pnpm demo:readiness`** plus **`pnpm demo:features:check`** aligned with showcase policy ([public-demo-policy.md](./public-demo-policy.md), [public-demo-seed-reset.md](./public-demo-seed-reset.md), [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).
- **Mutation / control-plane guards (tenant demo)** — destructive and tenant admin control-plane writes gated for marked demo orgs (same policy doc); **not** a substitute for a separate demo database or operator-only platform discipline.
- **Demo seed / reset runbook** — documented expectations, personas without passwords in git, **`pnpm demo:reset:dry-run`** for org validation ([public-demo-seed-reset.md](./public-demo-seed-reset.md)).
- **Supabase RLS (internal `public` tables)** — Security Advisor–flagged tables such as `billing_events`, `entitlement_grants`, and `organization_domains` have **RLS enabled** without permissive `anon`/`authenticated` policies (migration + policy: [supabase-data-api-policy.md](./supabase-data-api-policy.md)). **Future:** optional hardening such as removing `public` from exposed Data API schemas or a dedicated `api` schema if PostgREST is adopted.
- **Public portfolio messaging** — root README and [public-portfolio-access.md](./public-portfolio-access.md) set honest expectations (no embedded credentials, no live billing claims).
- **Demo tier profiles (operator)** — `lib/demo/demo-tier-profiles.ts` plus `DEMO_SHOWCASE_PROFILE` on **`pnpm demo:showcase:configure`** give repeatable **basic / premium / full-showcase** key sets without auto-creating orgs ([public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).

---

## Still open (prioritized themes)

| Theme                                                | Notes                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Optional / recommended separate demo environment** | Strongest isolation from production tenants; e.g. dedicated preview stack / DB or `demo.*` host—still recommended even with code-side demo guards.                                                                                                                                                                            |
| **Destructive / scoped seed–reset in reality**       | Dry-run and runbook exist; a **controlled**, operator-run destructive reset on the **right** database remains a deliberate ops milestone—not a public endpoint.                                                                                                                                                               |
| **Basic / Premium / Full demo organizations**        | **Tier profiles + script flags are prepared** (`DEMO_SHOWCASE_PROFILE`); **separate demo orgs/domains per tier** and productized multi-tenant tours are still **pending**—portfolio guidance remains: start with **one Full Showcase** org when depth is needed ([public-portfolio-access.md](./public-portfolio-access.md)). |
| **Real billing provider / checkout / portal**        | Live PSP, checkout, and customer billing portal are **not** integrated for production validation; marketing and demos must stay factual ([release-checklist.md](./release-checklist.md)).                                                                                                                                     |
| **Engineering excellence audit**                     | Deeper than baseline smoke: role matrix automation, hostile-input passes, optional rate limits on public forms, response-shape review under production, expanded Playwright or scripted checks.                                                                                                                               |

---

## Prioritized checklist (detail)

### P0 — must fix before broad public sharing / open demo

| Gap                         | Why it matters                                                                                                                                                            | Direction (no implementation in this doc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Demo vs production data** | Production DB may hold **real** org and user data. A public “try it” link on the **same** deployment without discipline still carries reputation and data risk.           | **Mitigation in code (shipped):** `Organization.isDemo` plus demo guards — [public-demo-policy.md](./public-demo-policy.md). **Operational:** seed/reset runbook and dry-run — [public-demo-seed-reset.md](./public-demo-seed-reset.md). **Still open:** real scoped destructive reset, **dedicated demo deployment/DB**, secure private distribution of any low-priv demo accounts, billing webhook / platform onboarding policy follow-ups. **Access:** [public-portfolio-access.md](./public-portfolio-access.md). |
| **Credential policy**       | **PLATFORM_ADMIN** and **SUPER_ADMIN** secrets must never appear in README, issues, or “quick start” snippets ([platform-admin-runbook.md](./platform-admin-runbook.md)). | Document **who** gets which role; use vault + rotation; never ship demo PLATFORM_ADMIN passwords.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **High-privilege exposure** | Sharing **one** production admin account for demos is a **destructive-data** and **reputation** risk (delete users, change license, onboarding on platform host).         | If demos are required on prod-like infra, use **scoped** accounts and **runbooks** for reset/restore—not “the” admin.                                                                                                                                                                                                                                                                                                                                                                                                 |

### P1 — should fix soon

| Gap                              | Why it matters                                                                                                                                                                                       | Direction                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deeper validation than smoke** | Baseline smoke is **shallow** (loads, login, key routes)—not full regression, RLS edge cases, or every API with hostile input.                                                                       | Add **role-matrix** checks per release; consider **rate limiting** / abuse notes for public forms (`/auth/register`, APIs).                 |
| **Billing expectations**         | Real **checkout**, **billing portal**, and **live PSP** flows are **not** integrated ([release-checklist.md](./release-checklist.md)).                                                               | Marketing / landing must **not** claim card billing or self-serve subscriptions as production-ready; keep “contact sales” or factual scope. |
| **API user creation**            | Non-production paths may still expose sensitive patterns (e.g. dev-only temp password behavior is gated by env in code paths—operators should confirm **production** never returns secrets in JSON). | Security review of **admin/user** mutating routes and responses under `NODE_ENV=production`.                                                |
| **Platform onboarding**          | `/platform` can **create organizations and super admins** when misused.                                                                                                                              | Keep **operator-only** host + auth; optional future batch: extra guardrails or audit logging—not casual UI expansion.                       |

### P2 — later polish

| Gap                           | Why it matters                                                                                                                                                                                              | Direction                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Homepage / positioning**    | Landing (`/`) is product marketing + i18n; portfolio docs now set expectations—optional short in-app strip if strangers land unguided.                                                                      | Copy and links only when product asks for it.                                                                                                                                                |
| **Login UX**                  | `/auth/login` is functional (credentials, role redirect); little **guided** copy for “request access” vs self-serve demo.                                                                                   | Copy and links only—no i18n expansion required in one batch.                                                                                                                                 |
| **Session affordances**       | Tenant app uses **Navbar** sign-out; **Platform** surface historically had a thinner chrome—confirm operators can **end session** without confusion ([smoke-test-checklist.md](./smoke-test-checklist.md)). | Small UX consistency passes.                                                                                                                                                                 |
| **Error / empty states**      | Smoke confirms “no white screen”; not exhaustive for every forbidden path.                                                                                                                                  | Targeted UX for **403/404** on high-traffic routes.                                                                                                                                          |
| **Supabase Data API surface** | If the project later exposes more of `public` to PostgREST, RLS and grants must stay least-privilege; today’s app path is Prisma-only.                                                                      | Prefer keeping internal tables out of exposed schemas; follow [supabase-data-api-policy.md](./supabase-data-api-policy.md) and [supabase-data-api-grants.md](./supabase-data-api-grants.md). |

---

## Suggested next batches (priority order)

1. **Demo environment** — optional but recommended **separate** DB / deployment for portfolio; align access with [public-portfolio-access.md](./public-portfolio-access.md); implement **scoped destructive reset** only when operators are ready ([public-demo-seed-reset.md](./public-demo-seed-reset.md)).
2. **Demo org tiers (runtime)** — wire **separate demo orgs / hosts** and seed–reset flows to tier profiles once isolation and destructive reset are trustworthy; profiles and `pnpm demo:showcase:configure` are already aligned ([public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).
3. **Admin mutation audit** — remaining paths without demo guards (e.g. tenant vehicle status/maintenance APIs, other admin writes); per-org policy for billing webhooks if needed; inventory platform onboarding; confirmation modals + audit log where product requires.
4. **Security pass** — API response review in production, optional security headers / rate limits for public endpoints.
5. **Deeper smoke automation** — expand Playwright or scripted checks beyond health (still no real billing webhooks).
6. **Billing integration** — only when explicitly in scope: real provider, checkout, portal, and legal/ops readiness—not implied by current baseline.

---

## Related

- [public-portfolio-access.md](./public-portfolio-access.md) — controlled portfolio / demo access.
- [supabase-data-api-policy.md](./supabase-data-api-policy.md) — Supabase Data API posture, RLS on internal tables.
- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — demo personas (no passwords in git), reset strategy, minimum safe scope, dry-run script.
- [public-demo-policy.md](./public-demo-policy.md) — public demo data, credentials, and read-mostly expectations.
- [production-smoke-baseline.md](./production-smoke-baseline.md) — what already passed once.
- [smoke-test-checklist.md](./smoke-test-checklist.md) — how to re-smoke each deploy.
- [release-checklist.md](./release-checklist.md) — ship order and “not integrated” baseline.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hosts.
