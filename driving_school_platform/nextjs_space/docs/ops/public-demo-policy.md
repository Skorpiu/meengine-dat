# Public demo policy (DAT)

Operational expectations for any **public** or **portfolio** exposure of the driving-school app. This doc is **not** a substitute for access control in code; additional endpoint guards land in focused batches.

**Controlled demo write sandbox** is **optional** and **disabled by default** (`DEMO_WRITE_SANDBOX_ENABLED` must be exactly `true` when trimmed, case-insensitive, to allow the limited creates described in [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox)).

**Portfolio / who may receive demo links:** [public-portfolio-access.md](./public-portfolio-access.md) (controlled access, no privileged credentials, preflight before sharing).

**Client / recruiter demo (one doc):** [client-demo-runbook.md](./client-demo-runbook.md).

## Data and environment

- A public demo must **not** use real customer or pupil data.
- Prefer a **separate** deployment and **separate** database (for example a future `demo.meengine.io` stack) so mistakes cannot touch production tenants.
- Until that exists, a **transitional** option is a single tenant marked with `Organization.isDemo = true` on a non-production or tightly controlled database.

For **seed personas, reset policy, dry-run reset validation, and read-only readiness (`pnpm demo:readiness`)**, see [public-demo-seed-reset.md](./public-demo-seed-reset.md).

## Credentials

- **Demo personas** are **private operational accounts** for controlled sessions; credentials must **not** be documented in git, issues, or public prompts—prepare them with **`pnpm demo:personas:configure`** / **`pnpm demo:personas:check`** per [client-demo-runbook.md](./client-demo-runbook.md#configure-private-demo-personas).
- **Never** publish **PLATFORM_ADMIN** credentials in README, marketing, tickets, or the product UI.
- **Never** publish real **SUPER_ADMIN** (or other high-privilege) passwords; use a private secret process and rotation.

## Behaviour of a demo tenant

- Demo organizations should be **read-mostly**: browsing and light profile/preferences changes may be acceptable; **destructive or admin mutations** must be blocked by **demo guards** (`decideDemoMutation` in `lib/demo/demo-policy.ts`, applied via `decideDemoRouteMutation` in `lib/demo/demo-route-guard.ts`).
- **Optional controlled write sandbox:** when `DEMO_WRITE_SANDBOX_ENABLED=true`, demo orgs may perform **limited** creates only (`POST` lesson create and `POST` vehicle create with per-category quotas — see [client-demo-runbook.md](./client-demo-runbook.md#controlled-demo-write-sandbox)). **Default is off**; all other demo restrictions apply unchanged.
- Demo data must be **fictional** and **safe to reset** (scripts or seed refresh), not copies of production.

For **showing licensed / premium UI in demo without visitor control plane** (operator-prepared features, no public toggling), see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md).

## Implemented guards

Mutating admin paths below enforce `Organization.isDemo` via `decideDemoRouteMutation`. When blocked, responses are **403** with stable JSON:

`{ "error": "This action is restricted in the public demo environment.", "code": "demo_restricted_action" }`

**Optional write sandbox:** `POST /api/admin/lessons` and `POST /api/admin/vehicles` use a separate quota check when `DEMO_WRITE_SANDBOX_ENABLED=true`; when quota is exhausted, responses are **403** with:

`{ "error": "This demo sandbox quota has already been used.", "code": "demo_write_quota_exceeded" }`

**Tenant SUPER_ADMIN (session organization)**

- **User management:** `DELETE /api/users/delete`; `POST /api/users/create`; `PUT /api/users/update`
- **Vehicle management (writes/deletes):** `PUT`, `DELETE` on `/api/admin/vehicles` (not `GET`). **`POST`** is allowed for demo orgs **only** when `DEMO_WRITE_SANDBOX_ENABLED=true` and vehicle quota remains (max one vehicle per demo org for this phase); otherwise same stable `403` as other demo blocks.
- **Lesson management (writes/deletes):** `PUT` and `DELETE` on `/api/admin/lessons/[id]` (not lesson `GET`). **`POST`** on `/api/admin/lessons` uses the same optional sandbox when enabled; otherwise blocked like other demo mutations.
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
- **Operations:** seed/reset runbook [public-demo-seed-reset.md](./public-demo-seed-reset.md); dry-run helper `pnpm demo:reset:dry-run`; read-only **`pnpm demo:readiness`** and **`pnpm demo:features:check`** (see runbook and [public-demo-feature-showcase.md](./public-demo-feature-showcase.md)) before sharing controlled demo access.

## See also

- [public-portfolio-access.md](./public-portfolio-access.md) — controlled portfolio access, pre-share steps, and demo tier guidance.
