# DAT v1 Commercial Release Scope

**Status:** Approved product direction (planning). **Not** implementation authorization.
**Batch:** `dat-v1-commercial-platform-cutline-plan-v1`; display names updated in `dat-plan-naming-and-doc-hygiene-v1`
**Decision:** [DEC-046](../architecture/decision-log.md) through [DEC-058](../architecture/decision-log.md)
**Master plan:** [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md)

---

## Executive summary

**DAT v1.0** must become a **sellable and subscribable** product. The primary payment domain in DAT v1 is **tenant subscription billing** — schools pay the DAT provider/owner. This is **distinct** from school-to-student financial operations.

**Current deployed core** (main `42d075e`, safety tag `dat-v1-core-baseline-95b833e` @ `95b833e`) remains usable under **controlled B2B**: invite-only, no public signup, **no live self-service subscription billing**. That state is **historically accurate** per [production-readiness-cutline.md](../architecture/production-readiness-cutline.md) (DEC-032).

**Target DAT v1.0** adds Platform-owned commercial billing, self-service License flow, plan/add-on entitlements, real tenant provisioning through Platform, email lesson reminders, optional school ledger module, **A Conquistadora** onboarding via Platform, and RC/final release governance.

---

## In scope for DAT v1.0 (target)

| Area | Owner | Notes |
| ---- | ----- | ----- |
| Tenant subscription billing | **Platform** | Products, plans, prices, monthly/annual intervals, subscriptions, checkout, provider refs, trials/grace/cancel/suspend |
| Effective entitlements | **Platform** (authoritative) + DAT (consumer) | Derived from subscription + approved overrides; not raw tenant feature flags |
| License self-service UI | **DAT** | School Admin sees plan, compares tiers, starts checkout, upgrade/downgrade/cancel — **initiates only** |
| Real tenant provisioning | **Platform** | Fresh org, domain, users, subscription for paying customers |
| Email lesson reminders | **DAT** | Entitlement-gated; Postmark = delivery boundary only |
| School-facing ledger | **DAT** (optional module) | Entitlement-gated; separate from Platform subscription billing |
| Release governance | **Project ops** | RC tags, final release tag, safety baseline tag |

---

## Out of scope for DAT v1.0 (unless explicitly approved later)

| Area | Notes |
| ---- | ----- |
| SMS / WhatsApp reminders | Deferred (DEC-046 area; see lesson-reminder policy) |
| Live PSP for school→student payments | School ledger may start manual; PSP integration is follow-up |
| Final price assignment | Product direction only; no prices in this planning batch |
| Platform as separately deployed repo | Phased extraction target; not big-bang in v1.0 |
| School Owner / Billing Admin / Ops Admin role split | Single School Admin (`SUPER_ADMIN`) in v1 |
| Public self-signup | Remains off unless product explicitly changes cutline |

---

## Current vs target (preserve historical truth)

| Dimension | **Current deployed core** | **Target DAT v1.0** |
| --------- | ------------------------- | ------------------- |
| Billing | No live checkout/PSP; operator/manual license keys | Platform subscription billing + self-service License |
| Platform UI | Minimal onboard + list (`/platform`) | Evolving multi-product control plane |
| Entitlements | Dual-source resolver exists; partial enforcement | Full plan/add-on model + authoritative Platform projection |
| First client | **A Conquistadora** not created | Provisioned via Platform with fresh IDs |
| Smoke tenant | **`DAT Production Smoke`** — technical only | Unchanged; never real client data |
| Release tag | Safety baseline `dat-v1-core-baseline-95b833e` | `dat-v1.0.0-rc.*` → `dat-v1.0.0` |

Historical documents (e.g. DEC-032 cutline at time of writing) may state **no live billing** — that remains true for the **current deployed core**, not the **final commercial target**.

---

## Smoke tenant vs real first client

| | **DAT Production Smoke** | **A Conquistadora** (real first client) |
| --- | ----------- | --- |
| Status | Exists; renamed 2026-07-13 | **Not created** |
| Org ID | `cmltn7vdl0000f8c4vxy6gcwx` | Fresh ID via Platform |
| Host | `www.meengine.io` | Dedicated client host |
| Use | Technical smoke/readiness only | Operational production data |
| Reuse | N/A | **Must not** reuse smoke fixtures, IDs, credentials, or records |

See [first-client-onboarding-record.md](../architecture/first-client-onboarding-record.md).

---

## Tenant administrator (unchanged in v1)

- Product-facing role: **School Admin**
- Persisted/auth role: **`SUPER_ADMIN`**
- No separate `ADMIN` / `SCHOOL_ADMIN` enum
- **`PLATFORM_ADMIN`** remains separate (Platform operator)

DEC-045 unchanged.

---

## Related documents

| Document | Role |
| -------- | ---- |
| [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md) | DAT Core / DAT Plus / DAT Premium modules and add-ons (proposed matrix) |
| [platform-subscription-billing-entitlements-plan.md](../architecture/platform-subscription-billing-entitlements-plan.md) | Billing and entitlement architecture |
| [platform-multi-product-control-plane-plan.md](../architecture/platform-multi-product-control-plane-plan.md) | Platform extraction and multi-product target |
| [packaging-and-entitlements.md](./packaging-and-entitlements.md) | Product packaging (updated) |
| [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md) | Tag and recovery policy |
