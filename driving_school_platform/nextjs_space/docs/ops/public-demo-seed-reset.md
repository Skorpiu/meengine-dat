# Public demo — seed and reset (operational runbook)

How to think about **fictional demo data**, **refresh**, and **safety**. This is operator documentation—not a substitute for `Organization.isDemo`, demo API guards (`lib/demo/demo-policy.ts`, `lib/demo/demo-route-guard.ts`), or access control in the app.

Do **not** commit secrets, production URLs with embedded credentials, or real customer data into git or tickets.

---

## Principles

- A **public demo** must use **fictional** data only: no real driving schools, pupils, instructors, or customer PII as the demo dataset.
- **Never** publish privileged credentials in README, marketing, the repo, or the product UI.
- **PLATFORM_ADMIN** is an operator surface and must **not** be part of a public “try the product” story or documented as demo login.
- **Tenant SUPER_ADMIN** (or other high-privilege tenant roles) must **not** be shared publicly at this stage; use private channels and rotation if demos need elevated access.
- Prefer a **dedicated demo stack** when you can:
  - Hostname such as `demo.meengine.io` (example only—align with your DNS).
  - **Separate** deployment from production tenant traffic.
  - **Separate** demo database (or schema strategy your team approves).
  - **Operator-controlled** reset (scripts, CI job, or runbook steps)—not self-serve public reset.

### Transitional setup (until a separate stack exists)

- **Before** relying on seed-only or reset tooling, ensure the demo tenant and hostname exist in the database in a controlled way: use **`pnpm demo:org:bootstrap`** (dry-run by default; apply requires `DEMO_BOOTSTRAP_APPLY=true` and `--apply`) together with `DEMO_ORGANIZATION_NAME` and `DEMO_ORGANIZATION_DOMAIN`, then **`pnpm demo:orgs:list`** to read the organization id without opening Supabase. See [public-portfolio-access.md](./public-portfolio-access.md#preparing-the-first-full-showcase-demo) for the full portfolio prep flow.
- Mark one tenant with **`Organization.isDemo = true`** (after the migration is applied).
- Keep data **fictional**; rely on **demo guards** for mutating admin APIs.
- **Do not** publish demo passwords in this repository; distribute credentials only through private, auditable channels until there is a safe onboarding flow.

---

## Recommended demo personas

Use these **labels** when planning seeds or operator briefings—**without** embedding real emails or passwords in git:

| Persona               | Intent                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| **Demo School Admin** | Tenant admin for **controlled** sessions only; scoped to the demo org. |
| **Demo Instructor**   | Fictional instructor profile for schedules and lessons UI.             |
| **Demo Student**      | Fictional student profile for booking and progress UI.                 |

**Credentials**

- Do **not** document demo emails or passwords in this repo.
- Issue and rotate credentials through a **private** channel (vault, operator runbook, or internal wiki) until a secure self-serve or magic-link flow exists.

---

## Reset strategy

When a real reset is implemented (future batch—not this document’s script alone):

1. **Scope** — Delete or recreate data **only** for the **demo** organization (`organizationId` = demo org). **Never** touch non-demo organizations.
2. **Confirmation** — Require an explicit operator confirmation step (flag, typed org name, or protected CI input)—no silent deletes.
3. **Environment** — Run destructive resets only in **demo** or **staging** environments, or under explicit operator control on production **only** if policy allows and backups exist.
4. **Mechanism** — Prefer a **script or protected job** referenced in this runbook—not a **public HTTP endpoint** for reset.

Future seed/reset work should be able to prepare a **full showcase** demo org (operator-set `OrganizationFeature` / `EntitlementGrant` per [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)) **without** embedding credentials in git—same private distribution rules as today. When that automation lands, it should **call or stay aligned** with the operator showcase configuration flow (`pnpm demo:showcase:configure` — see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features)) so feature rows stay **operator-controlled**, not demo-user-controlled.

Dry-run tooling today: see `scripts/reset-demo-organization.ts` and `pnpm demo:reset:dry-run` in `package.json`.

---

## Readiness check

Before sharing **controlled** or **portfolio** demo access to a tenant:

1. Set `DEMO_ORGANIZATION_ID` to the target organization CUID (same variable as the reset dry-run script).
2. Run **`pnpm demo:readiness`** from `driving_school_platform/nextjs_space` (with `DATABASE_URL` available, e.g. via `.env.local`).
3. Run **`pnpm demo:features:check`** for the same `DEMO_ORGANIZATION_ID` to verify operator-prepared feature rows and entitlement grant windows (read-only; see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).

The readiness script is **read-only**: it does not modify the database. It prints **aggregate counts only** (no emails, password hashes, tokens, or connection strings). It **fails** if the organization is missing, is not marked `isDemo`, or has **PLATFORM_ADMIN** users tied to that organization (operator accounts must not be scoped to a public demo org).

The feature showcase script is also **read-only**; it lists **feature keys and enabled flags** plus **grant window counts** only—no grant ids, no secrets.

Use these as **preflight** gates alongside [public-demo-policy.md](./public-demo-policy.md) and manual smoke checks.

---

## Minimum safe reset scope (future implementation)

When implementing a destructive reset for a demo org, consider **tenant-scoped** data tied to that `organizationId` (align with your Prisma schema—names may vary):

- **Users** (and related auth rows such as sessions/accounts where applicable) belonging to the demo org only.
- **Students** and **instructors** linked to those users / org.
- **Lessons**, **lesson requests**, **lesson counters**, and similar scheduling entities for the org.
- **Vehicles** for the org.
- **System settings**, **feature flags**, **configuration history** scoped to the org.
- **License / entitlement / organization-feature** rows scoped to the org, if your policy allows wiping them in demo (coordinate with licensing expectations).

Also consider: **exams**, **exam registrations**, **notifications**, **payments**, **audit logs**, and any other **org-scoped** tables your schema includes. If in doubt, list tables with `organizationId` (or equivalent) and review with a second operator before coding deletes.

**Global** reference data (e.g. shared `Category`, `TransmissionType`) is usually **not** deleted in a tenant-only reset unless you run a dedicated global demo DB.

---

## Related

- [public-demo-policy.md](./public-demo-policy.md) — guards, credential rules, and “still not a full public demo”.
- [dat-production-readiness-gaps.md](./dat-production-readiness-gaps.md) — portfolio and isolation gaps.
