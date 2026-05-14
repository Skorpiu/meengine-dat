# Public demo — licensed / premium feature showcase (DAT)

How to **show the full potential** of the product in a **public or controlled demo** without turning the demo into a self-service **licensing or feature-flag control plane**.

This complements **[public-demo-policy.md](./public-demo-policy.md)** (guards, credentials) and **[public-demo-seed-reset.md](./public-demo-seed-reset.md)** (seed/reset). Do **not** publish passwords, license keys, or customer data in git or tickets.

---

## Goals

- The demo **may** surface **premium / licensed** behaviour in the UI (vehicles, advanced areas, etc.) so evaluators see what the product can do.
- **Feature state** (organization features, entitlements, license-backed behaviour) must be **pre-configured by an operator** (seed, migration, admin on a **non–public-demo** path, or staging DB prep)—**not** toggled ad hoc by demo visitors.
- **Demo users** must **not** change licensing, entitlements, or feature flags through the app: **`Organization.isDemo`** plus existing **demo guards** keep those writes blocked (403).
- The demo tenant stays **read-mostly** for control-plane concerns; normal product flows (browsing, booking views, etc.) can still feel “full” if data and entitlements are prepared upfront.

---

## What we explicitly avoid

- **No PLATFORM_ADMIN credentials** in the demo story or documentation.
- **No public SUPER_ADMIN credentials** used to “fix” licensing during a demo; use private operator processes if something must be changed.
- **No real billing**, **checkout**, or **billing portal** in demo until those are product-ready and reviewed ([release-checklist.md](./release-checklist.md) baseline).
- **No client-side or public-demo feature toggling** (no hidden switches for visitors to turn entitlements on/off).
- **Demo guards** must **continue** to block writes to licensing and feature-flag APIs for demo orgs (see `lib/demo/demo-policy.ts` / `decideDemoRouteMutation`).

---

## Recommended operating modes

| Mode                                              | Description                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — Full showcase demo org**                    | One `Organization.isDemo = true` tenant with **operator-prepared** `OrganizationFeature` rows and/or **EntitlementGrant** windows so most licensed UI paths work. Visitors use **low-privilege** personas (e.g. instructor/student); they cannot mutate licensing/flags. |
| **B — Tiered demo orgs (basic / premium / full)** | Several demo orgs (each `isDemo = true`) with different **pre-seeded** feature sets for scripted tours. Same rule: no visitor control plane.                                                                                                                             |
| **C — Controlled sales demo**                     | Org (demo or staging) prepared **before** a meeting; credentials distributed privately; reset/readiness scripts validate state.                                                                                                                                          |

**Current recommendation:** prefer **A (full showcase)** or **C (controlled sales demo)** until you have automation and governance for multiple tiered orgs (**B**).

---

## Operator checklist (high level)

1. Mark the tenant **`isDemo = true`** (after migration).
2. Set **organization features** and/or **entitlement grants** (and any license activation your runbook allows **outside** the public demo UI) so the UI reflects the story you want.
3. Run **`pnpm demo:readiness`** and **`pnpm demo:features:check`** against `DEMO_ORGANIZATION_ID` before opening access.
4. Issue **non–platform-admin**, **non–public-super-admin** credentials only through **private** channels ([public-demo-seed-reset.md](./public-demo-seed-reset.md)).

---

## Related

- [public-demo-policy.md](./public-demo-policy.md) — guards and credential rules.
- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — personas, reset strategy, readiness check.
- `scripts/check-demo-feature-showcase.ts` — read-only `pnpm demo:features:check`.
