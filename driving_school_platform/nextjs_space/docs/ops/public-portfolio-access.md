# Public portfolio access (DAT)

Policy for presenting DAT as a **product / portfolio** asset: controlled access, honest scope, and no accidental exposure of operator or production data.

This doc complements [public-demo-policy.md](./public-demo-policy.md) (data, guards, credentials). Read both before sharing any demo URL.

For a **single end-to-end operator flow** (checklists, commands, meeting day), use **[client-demo-runbook.md](./client-demo-runbook.md)**. Private demo users are created with **`pnpm demo:personas:configure`** / verified with **`pnpm demo:personas:check`** (never commit those env values)—see the runbook’s **Configure private demo personas** section.

---

## Public portfolio access policy

- Treat the hosted app as **professional portfolio material**, not an open anonymous sandbox.
- **Demo access is controlled** and should be shared **privately** (direct message, scheduled call, agreed reviewer list)—not posted as a permanent public credential bundle or “everyone admin” link.
- **Do not publish privileged credentials** of any kind: no **PLATFORM_ADMIN**, no **SUPER_ADMIN**, no shared production passwords, no service keys or JWTs in tickets, README, or landing copy.

---

## Recommended future demo structure

When the product supports multiple demo experiences cleanly:

| Tier                   | Intent                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic Demo**         | Narrow surface: read-mostly, few personas, minimal configuration.                                                                                    |
| **Premium Demo**       | Mid scope: more modules visible, still no public control-plane or billing fiction.                                                                   |
| **Full Showcase Demo** | Broadest **curated** story: operator-prepared feature flags / showcase policy only—still not a substitute for production or platform admin exposure. |

---

## Initial recommended phase

- **Start with one Full Showcase organization** prepared **by an operator** (including `OrganizationFeature` rows via `pnpm demo:showcase:configure` where applicable — see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features)), not by public demo users. Prefer **Full Showcase Demo only** when you need to show depth: one carefully seeded demo tenant, aligned with [public-demo-feature-showcase.md](./public-demo-feature-showcase.md).
- **Basic / Premium / Full** now have **operator tier profiles** in code (`DEMO_SHOWCASE_PROFILE` — see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#demo-tier-profiles)) for repeatable configuration. **Separate demo organizations or domains per tier** (and scripted multi-tenant tours) remain **follow-up** work once isolation, reset, and governance are ready—see the tier table under **Recommended future demo structure** above.
- **No public self-service registration** for demos unless explicitly designed, reviewed, and operated (abuse, data retention, and legal expectations must be intentional).

---

## Preparing the first Full Showcase demo

Use this flow when you need a **real, operator-prepared** demo tenant for a client or portfolio review (fictional data only; no public reset endpoint; no credentials in git).

1. **DNS / hosting** — Point the public demo hostname (for example `demo.meengine.io`) at your Vercel project per [vercel-deployment.md](./vercel-deployment.md) and your DNS provider. Align preview and production hostnames with how tenant routing resolves `OrganizationDomain.host` in the app.

2. **Bootstrap the demo organization (dry-run)** — From `driving_school_platform/nextjs_space`, with `DATABASE_URL` available (for example via `.env.local`):

   ```bash
   DEMO_ORGANIZATION_NAME="DAT Demo — Full Showcase" DEMO_ORGANIZATION_DOMAIN=demo.meengine.io pnpm demo:org:bootstrap
   ```

   Review the printed plan. The script is **dry-run by default**; it does not create users, change billing, or configure feature rows.

3. **Apply bootstrap** — Only when the plan is correct, apply with **both** the env flag and the CLI flag:

   ```bash
   DEMO_ORGANIZATION_NAME="DAT Demo — Full Showcase" DEMO_ORGANIZATION_DOMAIN=demo.meengine.io DEMO_BOOTSTRAP_APPLY=true pnpm demo:org:bootstrap -- --apply
   ```

4. **List demo organizations (read-only)** — Confirm the tenant and copy the CUID without opening Supabase:

   ```bash
   pnpm demo:orgs:list
   ```

5. **Configure showcase features** — Use the id from the list output as `DEMO_ORGANIZATION_ID` with `pnpm demo:showcase:configure` (dry-run first, then apply per [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features)).

6. **Preflight** — Run `pnpm demo:readiness` and `pnpm demo:features:check` with the same `DEMO_ORGANIZATION_ID` (see [public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check) and [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).

7. **Sign-in smoke** — Complete a **manual** login on `https://demo.meengine.io` (or your chosen host) using credentials from your **private** channel only; do not publish passwords or hashes.

---

## Before sharing demo access

1. Ensure **Full Showcase** `OrganizationFeature` keys are prepared **by an operator** when the story needs licensed UI (`pnpm demo:showcase:configure` — dry-run first; see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features)).
2. Run **`pnpm demo:readiness`** (read-only preflight; see [public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check)).
3. Run **`pnpm demo:features:check`** (showcase policy alignment; see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).
4. In **Supabase**, confirm **Security Advisor** has **no critical** “RLS disabled” findings on internal `public` tables that DAT intentionally hardens ([supabase-data-api-policy.md](./supabase-data-api-policy.md)).
5. Confirm the demo organization is marked **`Organization.isDemo = true`** and that reset/seed expectations match [public-demo-seed-reset.md](./public-demo-seed-reset.md).

---

## Hard boundaries

- **Platform Admin** access is **never** part of a public demo narrative or handout; it is operator infrastructure on the platform host, not school SaaS scope for strangers.
- **Production data** must **not** be used for portfolio or public demos. Use fictional, resettable datasets only.

---

## Related

- [client-demo-runbook.md](./client-demo-runbook.md)
- [public-demo-policy.md](./public-demo-policy.md)
- [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md)
- [release-checklist.md](./release-checklist.md)
