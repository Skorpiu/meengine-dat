# DAT production / public demo — readiness gaps

Concise gap audit after **hosted deploy + basic smoke** (see [production-smoke-baseline.md](./production-smoke-baseline.md)). Use this to pick the **next 3–5** work batches—not as a live status page.

Do **not** put credentials, customer emails, URLs with embedded secrets, or billing identifiers in tickets or git.

---

## What already looks solid (operational)

- **CI** — pipeline green on shipped commits.
- **Hosting** — Vercel production deploy serving the app; **`GET /api/health`** OK; optional `pnpm smoke:health` pattern documented.
- **Split hosts** — tenant-facing app vs platform operator host model documented ([production-host-split.md](./production-host-split.md)); smoke baseline reflects successful login and core routes for admin / instructor / student / **PLATFORM_ADMIN** on the intended origins ([production-smoke-baseline.md](./production-smoke-baseline.md)).
- **Demo / tenant isolation (code)** — `Organization.isDemo`, P0 destructive guards, and control-plane tenant guards (settings, feature flags, licensing writes, user create/update) — see [public-demo-policy.md](./public-demo-policy.md); **demo environment, separated DB, destructive reset, and safe demo credential distribution** are still open — initial runbook: [public-demo-seed-reset.md](./public-demo-seed-reset.md), dry-run script `pnpm demo:reset:dry-run`.
- **Platform surface** — treat as a **separate operator product** over time; **do not** expand Platform UI/API for DAT’s public portfolio story in ad-hoc batches without product intent.

---

## Prioritized checklist

### P0 — must fix before broad public sharing / open demo

| Gap                         | Why it matters                                                                                                                                                                                                        | Direction (no implementation in this doc)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Demo vs production data** | Production DB today holds **real** org and user data. A public “try it” link on the **same** deployment lets visitors mutate lessons, users, vehicles, license settings, etc., via existing **SUPER_ADMIN** surfaces. | **Mitigation in code (ongoing):** `Organization.isDemo` plus demo guards — [public-demo-policy.md](./public-demo-policy.md) (_Implemented guards_). **Operational:** seed/reset runbook and dry-run tooling — [public-demo-seed-reset.md](./public-demo-seed-reset.md). **Still open:** real scoped destructive reset, dedicated demo deployment/DB, portfolio messaging, deeper smoke matrix, secure demo credential distribution, and policy follow-ups (e.g. billing webhook / platform onboarding). |
| **Credential policy**       | **PLATFORM_ADMIN** and **SUPER_ADMIN** secrets must never appear in README, issues, or “quick start” snippets ([platform-admin-runbook.md](./platform-admin-runbook.md)).                                             | Document **who** gets which role; use vault + rotation; never ship demo PLATFORM_ADMIN passwords.                                                                                                                                                                                                                                                                                                                                                                                                       |
| **High-privilege exposure** | Sharing **one** production admin account for demos is a **destructive-data** and **reputation** risk (delete users, change license, onboarding on platform host).                                                     | If demos are required on prod-like infra, use **scoped** accounts and **runbooks** for reset/restore—not “the” admin.                                                                                                                                                                                                                                                                                                                                                                                   |

### P1 — should fix soon

| Gap                              | Why it matters                                                                                                                                                                                       | Direction                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deeper validation than smoke** | Baseline smoke is **shallow** (loads, login, key routes)—not full regression, RLS edge cases, or every API with hostile input.                                                                       | Add **role-matrix** checks per release; consider **rate limiting** / abuse notes for public forms (`/auth/register`, APIs).                 |
| **Billing expectations**         | Real **checkout**, **billing portal**, and **live PSP** flows are **not** integrated ([release-checklist.md](./release-checklist.md)).                                                               | Marketing / landing must **not** claim card billing or self-serve subscriptions as production-ready; keep “contact sales” or factual scope. |
| **API user creation**            | Non-production paths may still expose sensitive patterns (e.g. dev-only temp password behavior is gated by env in code paths—operators should confirm **production** never returns secrets in JSON). | Security review of **admin/user** mutating routes and responses under `NODE_ENV=production`.                                                |
| **Platform onboarding**          | `/platform` can **create organizations and super admins** when misused.                                                                                                                              | Keep **operator-only** host + auth; optional future batch: extra guardrails or audit logging—not casual UI expansion.                       |

### P2 — later polish

| Gap                        | Why it matters                                                                                                                                                                                              | Direction                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Homepage / positioning** | Landing (`/`) is product marketing + i18n; it does not spell out “demo vs production” or data-safety expectations.                                                                                          | Short, honest **demo mode** or **portfolio** strip if you open the app to strangers. |
| **Login UX**               | `/auth/login` is functional (credentials, role redirect); little **guided** copy for “request access” vs self-serve demo.                                                                                   | Copy and links only—no i18n expansion required in one batch.                         |
| **Session affordances**    | Tenant app uses **Navbar** sign-out; **Platform** surface historically had a thinner chrome—confirm operators can **end session** without confusion ([smoke-test-checklist.md](./smoke-test-checklist.md)). | Small UX consistency passes.                                                         |
| **Error / empty states**   | Smoke confirms “no white screen”; not exhaustive for every forbidden path.                                                                                                                                  | Targeted UX for **403/404** on high-traffic routes.                                  |

---

## Suggested next batches (priority order)

1. **Demo isolation** — dedicated demo org + seeded low-priv users, separate preview project with reset script, and/or `demo.meengine.io`-style hosting; document access policy ([public-demo-policy.md](./public-demo-policy.md), [public-demo-seed-reset.md](./public-demo-seed-reset.md)). P0 API demo guards are **not** a substitute for a separate environment; implement **scoped destructive reset** only when ready ([public-demo-seed-reset.md](./public-demo-seed-reset.md)).
2. **Admin mutation audit** — remaining paths without demo guards (e.g. tenant vehicle status/maintenance APIs, other admin writes); per-org policy for billing webhooks if needed; inventory platform onboarding; confirmation modals + audit log where product requires.
3. **Public messaging** — README + landing footnote: not a billing product yet; where to get access; no embedded credentials.
4. **Security pass** — API response review in production, optional security headers / rate limits for public endpoints.
5. **Deeper smoke automation** — expand Playwright or scripted checks beyond health (still no real billing webhooks).

---

## Related

- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — demo personas (no passwords in git), reset strategy, minimum safe scope, dry-run script.
- [public-demo-policy.md](./public-demo-policy.md) — public demo data, credentials, and read-mostly expectations.
- [production-smoke-baseline.md](./production-smoke-baseline.md) — what already passed once.
- [smoke-test-checklist.md](./smoke-test-checklist.md) — how to re-smoke each deploy.
- [release-checklist.md](./release-checklist.md) — ship order and “not integrated” baseline.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hosts.
