# Packaging and Entitlements (Product Intent)

**Status:** Product/business direction (updated 2026-07-14; display names updated 2026-07-14 in `dat-plan-naming-and-doc-hygiene-v1`).

**Plan enforcement in UI/API is not fully implemented** unless a named batch says so.

**Catalog:** [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md) (DAT Core / DAT Plus / DAT Premium — **supersedes** Basic/Standard/Premium planning labels per DEC-058; DEC-004 remains historical).

**Fact:** Self-service import/export UI already exists in DAT — tier gating is a **future** slice: `import-export-business-packaging-v1`.

---

## Plan tiers (intent — DAT v1)

| Tier | Summary |
| ---- | ------- |
| **DAT Core** | Complete operational foundation; provider-assisted import; email reminders and ledger **open** per catalogue |
| **DAT Plus** | Core + automation/efficiency; self-service import/export; email lesson reminders **likely** (proposed, non-final) |
| **DAT Premium** | Most complete plan; higher-value modules; school ledger **open** (included vs add-on) |

**Stable plan keys (planned, not implemented):** `DAT_CORE`, `DAT_PLUS`, `DAT_PREMIUM`. Display names are not authorization keys.

**Billing intervals:** monthly and annual (DEC-049). **Add-ons:** modules sold separately where not bundled (DEC-050).

**No final prices** in planning docs — open decision OD-002. **Exact package composition remains provisional** — schema plan done: [platform-commercial-catalog-schema-plan.md](../architecture/platform-commercial-catalog-schema-plan.md) (DEC-060).

---

## Modules vs feature flags

- Commercial **modules** = entitlement bundles (Plan/add-on derived).
- Do **not** expose tenant-editable raw `feature_flags` as the commercial module system (DEC-050, DEC-026).
- Runtime today uses legacy `FeatureKey` in `lib/config/license-features.ts` — alignment batch deferred.

---

## Provider-assisted import (deferred runbook)

Full runbook: **`provider-assisted-import-runbook-v1`** (P2 ops).

**Outline:** template → cleanup → dry-run → fix → apply → customer validation.

Contracts: [client-data-import-export-strategy.md](../../driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md).

---

## Payment domains (two — DEC-046, DEC-052)

| Meaning | Owner | Scope |
| ------- | ----- | ----- |
| **DAT tenant subscription** | **Platform** | School pays for DAT — checkout, subscription, entitlements |
| **School-facing ledger** | **DAT** (optional module) | Student balances, packages, receipts; entitlement-gated; **not** mandatory |

**Fact:** `Payment` Prisma model is **legacy/dormant** — not tenant-ready for either domain.

---

## Email lesson reminders

- **DAT v1 target** — entitlement-gated (`LESSON_REMINDERS_EMAIL`).
- Postmark = delivery boundary only; orchestration not built.
- Core vs Plus inclusion — **open** (OD-008).
- SMS/WhatsApp deferred.

---

## Multi-Language

Entitlement placeholder only until `i18n-framework-planning-v1`. English UI baseline until then.

---

## Competitive discovery (completed)

**Report:** [competitive-product-discovery.md](./competitive-product-discovery.md)

Reminders + balances = table stakes (8/9 direct competitors). Packaging implications absorbed into [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md) as **proposed**, non-final matrix.

---

## Related roadmap slices

| Slice | Purpose |
| ----- | ------- |
| `dat-v1-commercial-platform-cutline-plan-v1` | **Done (docs)** — commercial cutline plan |
| `dat-plan-naming-and-doc-hygiene-v1` | **Done (docs)** — approved display names DEC-058 |
| `platform-commercial-catalog-schema-plan-v1` | **Done (docs)** — [platform-commercial-catalog-schema-plan.md](../architecture/platform-commercial-catalog-schema-plan.md) (DEC-060) |
| `platform-commercial-catalog-schema-foundation-v1` | **Recommended next** — additive Prisma catalogue models/enums + migration |
| `platform-subscription-checkout-foundation-v1` | Checkout + billing (sensitive — not authorized) |
| `dat-license-self-service-ui-v1` | License self-service (not authorized) |
| `import-export-business-packaging-v1` | Tier vs self-service UI enforcement |
| `lesson-reminders-email-foundation-v1` | Email reminders runtime |
| `school-balances-ledger-foundation-v1` | Optional ledger module |

See [roadmap-todo.md](../architecture/roadmap-todo.md) and [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md).
