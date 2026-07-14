# DAT v1 Commercial Release Plan

**Status:** Master planning document. **Not** implementation authorization for runtime slices.
**Batch:** `dat-v1-commercial-platform-cutline-plan-v1`; display names updated in `dat-plan-naming-and-doc-hygiene-v1` (DEC-058)
**Baseline:** main `42d075e` · safety tag `dat-v1-core-baseline-95b833e` @ `95b833e`
**Scope summary:** [dat-v1-commercial-release-scope.md](../product/dat-v1-commercial-release-scope.md)

---

## 1. Goal

Ship **DAT v1.0** as a **sellable, subscribable** product with Platform-owned tenant billing, self-service License flow, plan/add-on entitlements, real client provisioning, email lesson reminders, optional school ledger, and governed release tags.

---

## 2. Current core vs target DAT v1.0

| | Current deployed core | Target DAT v1.0 |
| --- | --------------------- | --------------- |
| **Git anchor** | main `42d075e`; safety tag `95b833e` | RC tags → `dat-v1.0.0` |
| **Billing** | No live self-service billing | Platform subscription billing |
| **License UI** | Read-only Plan page | Full self-service (initiate; Platform confirms) |
| **Platform** | Minimal onboard UI + API | Evolving control plane |
| **First client** | Not provisioned | **A Conquistadora** via Platform |
| **Reminders** | Not built | Email, entitlement-gated |
| **School ledger** | Not built | Optional module |

Historical [production-readiness-cutline.md](./production-readiness-cutline.md) (DEC-032) describes the **current controlled B2B path** — still valid for today’s deployment, **not** the final commercial target.

---

## 3. Release anchor and tag strategy

| Stage | Tag | Notes |
| ----- | --- | ----- |
| Safety baseline (done) | `dat-v1-core-baseline-95b833e` | Pre-commercial core; human-published |
| Release candidate 1 | `dat-v1.0.0-rc.1` | First full commercial candidate |
| Later RCs | `dat-v1.0.0-rc.N` | Increment N |
| Final release | `dat-v1.0.0` | Immutable — never move |
| Hotfixes | `dat-v1.0.1`, … | Corrective releases only |

Runbook: [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md) (DEC-055–057).

**RC entry criteria (intent):**

- Platform checkout + webhook path green in staging
- DAT Core / DAT Plus / DAT Premium entitlement projection verified
- DAT License self-service flow end-to-end (with test provider)
- Email lesson reminders MVP for entitled tenants
- **A Conquistadora** provisioned via Platform (or parallel staging client)
- `pnpm check` green; production smoke green on smoke tenant

---

## 4. Ordered implementation slices

Planning order — each runtime slice needs its own approval gate.

| # | Slice | Type | Depends on |
| - | ----- | ---- | ---------- |
| 1 | `platform-commercial-catalog-schema-plan-v1` | Docs + D4 schema proposal | This plan |
| 2 | `platform-subscription-webhook-hardening-v1` | Runtime (sensitive) | Provider choice (partial) |
| 3 | `platform-commercial-catalog-v1` | Runtime/schema (sensitive) | #1 |
| 4 | `platform-subscription-checkout-foundation-v1` | Runtime (sensitive) | #3 |
| 5 | `platform-entitlement-projection-basic-standard-premium-v1` | Runtime | #3, #4 |
| 6 | `platform-tenant-provision-subscription-v1` | Runtime | #5 |
| 7 | `dat-license-self-service-ui-v1` | UI/runtime | #4, #5 |
| 8 | `import-export-business-packaging-v1` | Runtime | #5 |
| 9 | `lesson-reminders-email-product-plan-v1` | Docs | — |
| 10 | `lesson-reminders-email-foundation-v1` | Runtime | #9, #5 |
| 11 | `school-balances-ledger-product-plan-v1` | Docs | — |
| 12 | `school-balances-ledger-foundation-v1` | Runtime (optional module) | #11, #5 |
| 13 | `a-conquistadora-platform-provision-v1` | Operator + runtime | #6 |
| 14 | `dat-v1.0.0-rc.1-release-gate-v1` | Docs + operator | #1–#13 as scoped |
| 15 | `dat-v1.0.0-final-release-v1` | Operator tag + docs | RC sign-off |

**Parallel planning (non-blocking):** `platform-multi-product-api-boundary-v1`, `student-lesson-request-policy-planning-v1`.

---

## 5. A Conquistadora provisioning policy

| Rule | Detail |
| ---- | ------ |
| Create via | **Platform** onboarding/provision path — not smoke script reuse |
| Fresh IDs | New `organizationId`, domain, users, credentials, subscription |
| No reuse | Smoke fixtures (`DAT_SMOKE_*`), smoke org `cmltn7vdl0000f8c4vxy6gcwx`, or smoke credentials |
| Smoke tenant | **`DAT Production Smoke`** remains technical-only on `www.meengine.io` |
| Record | [first-client-onboarding-record.md](./first-client-onboarding-record.md) |

---

## 6. License self-service workflow (target)

1. School Admin opens **Plan** (`/admin/license`).
2. Views current plan, modules, renewal status (from Platform-backed subscription state).
3. Compares DAT Core / DAT Plus / DAT Premium; selects monthly or annual.
4. Optional add-ons (e.g. school ledger) if not bundled.
5. **Start checkout** → Platform creates session → redirect to provider.
6. Provider confirms → Platform webhook → entitlement projection.
7. DAT refreshes effective entitlements; navbar/module gates update.
8. Upgrade/downgrade/cancel/manage billing via Platform + provider portal where supported.

**Never:** activate paid entitlements from redirect query params alone (DEC-047).

---

## 7. Document map (this batch)

| Document | Role |
| -------- | ---- |
| [dat-v1-commercial-release-scope.md](../product/dat-v1-commercial-release-scope.md) | Scope and in/out |
| [dat-plan-and-module-catalog.md](../product/dat-plan-and-module-catalog.md) | Plans, modules, add-ons |
| [platform-subscription-billing-entitlements-plan.md](./platform-subscription-billing-entitlements-plan.md) | Billing architecture |
| [platform-multi-product-control-plane-plan.md](./platform-multi-product-control-plane-plan.md) | Platform extraction |
| [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md) | Tags and recovery |

---

## 8. Open decisions (not closed in this batch)

| ID | Topic |
| -- | ----- |
| OD-001 | Payment provider (SIBS / Stripe / other) |
| OD-002 | Price points per plan and interval |
| OD-003 | Tax/VAT model |
| OD-004 | Proration on mid-cycle upgrade |
| OD-005 | Trial length and auto-conversion |
| OD-006 | Grace period duration and suspension rules |
| OD-007 | School ledger included in DAT Premium vs add-only |
| OD-008 | DAT Core vs DAT Plus lesson reminder inclusion (and trial, if any) |

---

## 9. Superseded planning recommendations

| Prior recommendation | Disposition |
| -------------------- | ----------- |
| Product README: immediate next = lesson reminders planning only | **Superseded** — commercial/platform cutline plan is now primary path; reminders remain **in** v1.0 target as slice #9–10 |
| DEC-032: no live billing as permanent product state | **Clarified** — true for **current core**; **not** final DAT v1.0 target |
| PA-004: Platform vague future only | **Superseded** — partial Platform UI/API exists; multi-product extraction phased (DEC-054) |
| Basic/Starter vs Premium/Enterprise packaging | **Superseded** by three-tier catalog (DEC-048); display names **DAT Core / DAT Plus / DAT Premium** (DEC-058) |

---

## Related

- [decision-log.md](./decision-log.md) — DEC-046 through DEC-057
- [roadmap-todo.md](./roadmap-todo.md) — backlog registration
- [current-state.md](./current-state.md) — operational memory
