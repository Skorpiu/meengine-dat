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

## Configuring Full Showcase features

Use the **operator-only** script `scripts/configure-demo-showcase.ts` (`pnpm demo:showcase:configure`) to prepare **`OrganizationFeature`** rows for a single demo tenant. This keeps **licensing and org feature-flag APIs** off the path for demo visitors: they should **not** receive credentials or UI that can mutate entitlements or feature flags; **`Organization.isDemo`** and existing **demo guards** remain the enforcement layer.

**Environment**

- **`DEMO_ORGANIZATION_ID`** — CUID of the target organization (required).
- **`DEMO_SHOWCASE_FEATURE_KEYS`** — comma-separated list of feature keys to enable (required, non-empty after parsing). Example: `vehicles,reports,advanced-scheduling` or `VEHICLE_MANAGEMENT,ADVANCED_REPORTING`. Keys are stored as provided (trimmed); align with your product’s `featureKey` strings (see `lib/config/license-features.ts` where applicable).

**Dry-run by default**

- Without explicit apply confirmations, the script **prints a plan only** and exits successfully after: `Dry run only. No data was changed.`
- The script **refuses** organizations that are missing or with **`isDemo !== true`** (same safety posture as other demo scripts).

**Applying changes (two confirmations)**

Both must be present for any database write:

1. **CLI:** `--apply` (with pnpm, pass arguments after `--`, e.g. `pnpm demo:showcase:configure -- --apply`).
2. **Env:** `DEMO_SHOWCASE_APPLY=true`

If either is missing, behaviour stays **dry-run** (plan printed, no writes).

**Examples (no secrets)**

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> DEMO_SHOWCASE_FEATURE_KEYS=vehicles pnpm demo:showcase:configure
```

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> DEMO_SHOWCASE_FEATURE_KEYS=vehicles DEMO_SHOWCASE_APPLY=true pnpm demo:showcase:configure -- --apply
```

(Replace `vehicles` with real `featureKey` values your deployment expects, e.g. from `lib/config/license-features.ts`.)

The script does **not** print emails, passwords, or tokens. It only touches **`organization_features`** for the given org and keys (no users, credentials, **`billing_events`**, or **`EntitlementGrant`** in this flow unless you extend it elsewhere).

---

## Operator checklist (high level)

1. Mark the tenant **`isDemo = true`** (after migration).
2. Set **organization features** and/or **entitlement grants** (and any license activation your runbook allows **outside** the public demo UI) so the UI reflects the story you want.
3. Run **`pnpm demo:showcase:configure`** (dry-run, then apply with dual confirmation if needed), then **`pnpm demo:readiness`** and **`pnpm demo:features:check`** against `DEMO_ORGANIZATION_ID` before opening access.
4. Issue **non–platform-admin**, **non–public-super-admin** credentials only through **private** channels ([public-demo-seed-reset.md](./public-demo-seed-reset.md)).

---

## Related

- [public-demo-policy.md](./public-demo-policy.md) — guards and credential rules.
- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — personas, reset strategy, readiness check.
- `scripts/check-demo-feature-showcase.ts` — read-only `pnpm demo:features:check`.
- `scripts/configure-demo-showcase.ts` — operator `pnpm demo:showcase:configure` (dry-run by default; apply requires `--apply` and `DEMO_SHOWCASE_APPLY=true`).
