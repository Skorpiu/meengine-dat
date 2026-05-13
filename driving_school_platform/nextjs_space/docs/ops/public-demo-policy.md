# Public demo policy (DAT)

Operational expectations for any **public** or **portfolio** exposure of the driving-school app. This doc is **not** a substitute for access control in code; additional endpoint guards land in focused batches.

## Data and environment

- A public demo must **not** use real customer or pupil data.
- Prefer a **separate** deployment and **separate** database (for example a future `demo.meengine.io` stack) so mistakes cannot touch production tenants.
- Until that exists, a **transitional** option is a single tenant marked with `Organization.isDemo = true` on a non-production or tightly controlled database.

## Credentials

- **Never** publish **PLATFORM_ADMIN** credentials in README, marketing, tickets, or the product UI.
- **Never** publish real **SUPER_ADMIN** (or other high-privilege) passwords; use a private secret process and rotation.

## Behaviour of a demo tenant

- Demo organizations should be **read-mostly**: browsing and light profile/preferences changes may be acceptable; **destructive or admin mutations** must be blocked by **demo guards** (`decideDemoMutation` in `lib/demo/demo-policy.ts`, applied via `decideDemoRouteMutation` in `lib/demo/demo-route-guard.ts`).
- Demo data must be **fictional** and **safe to reset** (scripts or seed refresh), not copies of production.

## Implemented guards

The following mutating admin paths enforce `Organization.isDemo` (403 with stable JSON: `error` + `code: "demo_restricted_action"` when blocked):

- **User management (destructive):** `DELETE /api/users/delete`
- **Vehicle management (writes/deletes):** `POST`, `PUT`, `DELETE` on `/api/admin/vehicles` (not `GET`)
- **Lesson management (writes/deletes):** `POST` on `/api/admin/lessons`; `PUT` and `DELETE` on `/api/admin/lessons/[id]` (not lesson `GET`)
- **Cleanup:** `POST /api/admin/cleanup`

**GET** `/api/admin/lessons` remains read-only for demo orgs: automatic `cleanupOldLessons` inside that handler is **skipped** when `Organization.isDemo` is true (no 403 on read).

Future batches may extend guards to settings, feature flags, licensing, billing admin actions, and a dedicated demo seed/reset strategy.

## Billing

- Real **checkouts**, **billing portals**, and **live PSP** flows are **not** part of the public demo story until explicitly integrated and reviewed. The demo must not imply paid self-serve billing is available if it is not.

## Deployment note

- Before relying on guards in production, ensure the migration that adds `organizations.isDemo` has been applied on the target database.

## This batch vs next steps

- **Foundation:** `Organization.isDemo`, pure policy in `lib/demo/demo-policy.ts`, and route helper `lib/demo/demo-route-guard.ts`.
- **Current scope:** P0 destructive/admin routes listed under **Implemented guards**; broader surfaces remain for later batches.
