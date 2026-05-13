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

Mutating admin paths below enforce `Organization.isDemo` via `decideDemoRouteMutation`. When blocked, responses are **403** with stable JSON:

`{ "error": "This action is restricted in the public demo environment.", "code": "demo_restricted_action" }`

**Tenant SUPER_ADMIN (session organization)**

- **User management:** `DELETE /api/users/delete`; `POST /api/users/create`; `PUT /api/users/update`
- **Vehicle management (writes/deletes):** `POST`, `PUT`, `DELETE` on `/api/admin/vehicles` (not `GET`)
- **Lesson management (writes/deletes):** `POST` on `/api/admin/lessons`; `PUT` and `DELETE` on `/api/admin/lessons/[id]` (not lesson `GET`)
- **Cleanup:** `POST /api/admin/cleanup`
- **Settings (writes/deletes):** `POST`, `PUT`, `DELETE` on `/api/admin/settings` (not `GET`)
- **Feature flags (writes/deletes):** `POST`, `PUT`, `DELETE` on `/api/admin/feature-flags` (not `GET`)
- **Licensing / entitlements (tenant admin writes):** `POST /api/admin/license/activate`; `POST /api/admin/license/features` (`GET` remains allowed)

**GET** `/api/admin/lessons` remains read-only for demo orgs: automatic `cleanupOldLessons` inside that handler is **skipped** when `Organization.isDemo` is true (no 403 on read).

**Not covered in this batch (follow-up)**

- **`POST /api/billing/webhooks/[provider]`** — skeleton inbound webhook; events may carry `organizationId` but there is no single clear “target org” for a stable demo guard without per-event policy; treat as follow-up if demo tenants must never persist billing side-effects from webhooks.
- **`POST /api/platform/organizations`** — platform onboarding creates **new** organizations; no existing `organizationId` to evaluate for `isDemo` in the same request. Optional future: block or flag demo onboarding separately; not required for tenant demo read-mostly.

## Still not a full public demo

Guards reduce risk on marked demo tenants; they do **not** replace:

- **Seed / reset strategy** — repeatable fictional data and refresh cadence
- **Demo data policy** — what may be stored, retention, and who may operate resets
- **Optional separated demo deployment / database** — strongest isolation from production
- **Public portfolio messaging** — landing and docs that set expectations (no billing claims, no embedded credentials)
- **Deeper role smoke matrix** — automated checks beyond shallow smoke for admin/instructor/student paths

## Billing

- Real **checkouts**, **billing portals**, and **live PSP** flows are **not** part of the public demo story until explicitly integrated and reviewed. The demo must not imply paid self-serve billing is available if it is not.

## Deployment note

- Before relying on guards in production, ensure the migration that adds `organizations.isDemo` has been applied on the target database.

## Foundation vs batches

- **Foundation:** `Organization.isDemo`, pure policy in `lib/demo/demo-policy.ts`, and route helper `lib/demo/demo-route-guard.ts`.
- **Shipped batches:** P0 destructive routes, then control-plane tenant admin (settings, feature flags, licensing writes, user create/update) as listed above.
