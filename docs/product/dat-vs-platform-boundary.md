# DAT vs Platform Boundary

**Status:** Product direction (documented). **Partial Platform runtime exists** in the monolith — not a separate deployment yet, and **not** production-ready commercial control plane.

**Updated:** 2026-07-14 (`dat-v1-commercial-platform-cutline-plan-v1`)

---

## DAT (operational product)

**Who uses it:** Driving schools (School Admin, instructors, students).

**DAT owns (now and target):**

| Area | Notes |
| ---- | ----- |
| Students | Operational fichas, school IDs, app access modes |
| Instructors | Operational records, licenses, app accounts |
| Vehicles | Fleet |
| Lessons | Calendar, practical/theory, lesson requests |
| Exams | Scheduling and registrations |
| Operational import/export | Migration and bulk data for school operations |
| Student portal | Student experience (in DAT) |
| School-facing ledger | Optional module — balances, packages, receipts (DEC-051) |
| Email lesson reminders | Orchestration and scheduling (Postmark = delivery only) |
| License self-service UI | Display plan, initiate checkout — **does not authorize paid entitlements** (DEC-047) |

**Host (today):** Tenant/school app (e.g. client subdomain, Preview QA hosts). See [system-design.md](../architecture/system-design.md).

---

## Platform (provider control plane)

**Who uses it:** MeEngine operator (`PLATFORM_ADMIN`) — manage DAT **customers**, not day-to-day school lessons.

**Platform owns (target; partial today):**

| Area | Today (code) | Target |
| ---- | ------------ | ------ |
| Organizations / customers | Onboard + list via `/platform`, `GET/POST /api/platform/organizations` | Full lifecycle management |
| Plans / subscriptions | Static billing projection + stubs | DAT Core / DAT Plus / DAT Premium + monthly/annual (DEC-048 tier structure, DEC-058 display names, DEC-049) |
| Entitlements (commercial) | `EntitlementGrant` + event processor (partial) | Authoritative projection from subscription + add-ons |
| Checkout / PSP | Webhook route + stub providers | Verified provider integration |
| Real tenant provisioning | Onboard creates org + license key | Subscription-linked provision (DEC-053) |
| Feature flags / system settings | Internal tables; school UI hidden | Platform operator surfaces |
| DAT subscription billing | Partial `lib/billing/*` | Platform-owned (DEC-046) |
| Domains / hosts | `organization_domains` | Platform registry |
| Multi-product | DAT only in practice | Reusable control plane (DEC-054) |

**Host (today):** `platform.meengine.io` for `PLATFORM_ADMIN` sign-in.

**Fact (reconciled):** Platform **has** a minimal management UI and API — **not** “no UI/API”. It **does not** yet provide commercial subscription management, post-onboard ops, or separate deployment.

Operator runbook: [platform-admin-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/platform-admin-runbook.md).

---

## Payment domains (two — do not merge)

| Domain | Owner | Meaning |
| ------ | ----- | ------- |
| **Tenant subscription billing** | **Platform** | School pays for DAT (DEC-046) |
| **School-facing ledger / payments** | **DAT** (optional module) | School tracks student money (DEC-052, DEC-051) |

School admin **Plan** page is for **DAT subscription**, not student payments.

---

## Settings and Feature Flags (today vs future)

**Fact (repo today):** `/admin/settings` exists with CRUD APIs; **hidden from school admin navbar** (DEC-026).

**Product direction:**

- Schools use **License / Plan** — not raw feature flags.
- Commercial **modules** are entitlement bundles — not tenant-editable flags (DEC-050).
- Internal settings/flags remain operator/Platform concerns.

**Audit (done):** [admin-settings-client-visibility-audit.md](../architecture/admin-settings-client-visibility-audit.md).

---

## What this doc does not claim

- Platform is **not** a separate codebase or production deployment yet (phased — DEC-054).
- Platform/billing stack is **not** production-ready for commercial self-service because partial code exists.
- Moving tables or expanding Platform UI requires explicit approved batches.

---

## References

- [decision-log.md](../architecture/decision-log.md) — DEC-001 (historical), DEC-046–DEC-054
- [platform-multi-product-control-plane-plan.md](../architecture/platform-multi-product-control-plane-plan.md)
- [platform-subscription-billing-entitlements-plan.md](../architecture/platform-subscription-billing-entitlements-plan.md)
- [packaging-and-entitlements.md](./packaging-and-entitlements.md)
- [product-assumptions.md](./product-assumptions.md)
