# Public demo policy (DAT)

Operational expectations for any **public** or **portfolio** exposure of the driving-school app. This doc is **not** a substitute for access control in code; endpoint guards are applied in dedicated batches.

## Data and environment

- A public demo must **not** use real customer or pupil data.
- Prefer a **separate** deployment and **separate** database (for example a future `demo.meengine.io` stack) so mistakes cannot touch production tenants.
- Until that exists, a **transitional** option is a single tenant marked with `Organization.isDemo = true` on a non-production or tightly controlled database.

## Credentials

- **Never** publish **PLATFORM_ADMIN** credentials in README, marketing, tickets, or the product UI.
- **Never** publish real **SUPER_ADMIN** (or other high-privilege) passwords; use a private secret process and rotation.

## Behaviour of a demo tenant

- Demo organizations should be **read-mostly**: browsing and light profile/preferences changes may be acceptable; **destructive or admin mutations** must be blocked by **demo guards** (policy in `lib/demo/demo-policy.ts`) once wired into routes.
- Demo data must be **fictional** and **safe to reset** (scripts or seed refresh), not copies of production.

## Billing

- Real **checkouts**, **billing portals**, and **live PSP** flows are **not** part of the public demo story until explicitly integrated and reviewed. The demo must not imply paid self-serve billing is available if it is not.

## This batch vs next steps

- **This batch** adds foundation only: `Organization.isDemo`, central demo mutation policy, tests, and ops documentation.
- **A following batch** wires `decideDemoMutation` into mutating API routes and UI where appropriate; until then, operators must still treat shared environments as sensitive.
