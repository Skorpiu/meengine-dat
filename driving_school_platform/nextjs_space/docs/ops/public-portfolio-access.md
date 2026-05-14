# Public portfolio access (DAT)

Policy for presenting DAT as a **product / portfolio** asset: controlled access, honest scope, and no accidental exposure of operator or production data.

This doc complements [public-demo-policy.md](./public-demo-policy.md) (data, guards, credentials). Read both before sharing any demo URL.

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
- Treat **Basic Demo**, **Premium Demo**, and additional **Full** variants as a **later evolution** (multiple tiered orgs or scripted tours) once automation and governance catch up—see the tier table under **Recommended future demo structure** above.
- **No public self-service registration** for demos unless explicitly designed, reviewed, and operated (abuse, data retention, and legal expectations must be intentional).

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

- [public-demo-policy.md](./public-demo-policy.md)
- [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md)
- [release-checklist.md](./release-checklist.md)
