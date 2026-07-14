# Packaging and Entitlements (Product Intent)

**Status:** Product/business direction (updated 2026-07-14). **Plan enforcement in UI/API is not fully implemented** unless a named batch says so.

**Catalog:** [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md) (Basic / Standard / Premium — **supersedes** Basic/Starter vs Premium/Enterprise-only forward planning; DEC-004 remains historical).

**Fact:** Self-service import/export UI already exists in DAT — tier gating is a **future** slice: `import-export-business-packaging-v1`.

---

## Plan tiers (intent — DAT v1)

| Tier | Summary |
| ---- | ------- |
| **Basic** | Core operations; provider-assisted import; no email reminders or ledger by default |
| **Standard** | Full operations + self-service import/export + email lesson reminders |
| **Premium** | Standard + school ledger (typ.) + school payment module when built |

**Billing intervals:** monthly and annual (DEC-049). **Add-ons:** modules sold separately where not bundled (DEC-050).

**No final prices** in planning docs — open decision OD-002.

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
- SMS/WhatsApp deferred.

---

## Multi-Language

Entitlement placeholder only until `i18n-framework-planning-v1`. English UI baseline until then.

---

## Competitive discovery (completed)

**Report:** [competitive-product-discovery.md](./competitive-product-discovery.md)

Reminders + balances = table stakes (8/9 direct competitors). Packaging implications absorbed into [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md).

---

## Related roadmap slices

| Slice | Purpose |
| ----- | ------- |
| `dat-v1-commercial-platform-cutline-plan-v1` | **Done (docs)** — commercial cutline plan |
| `platform-subscription-checkout-foundation-v1` | Checkout + billing (sensitive — not authorized) |
| `dat-license-self-service-ui-v1` | License self-service (not authorized) |
| `import-export-business-packaging-v1` | Tier vs self-service UI enforcement |
| `lesson-reminders-email-foundation-v1` | Email reminders runtime |
| `school-balances-ledger-foundation-v1` | Optional ledger module |

See [roadmap-todo.md](../architecture/roadmap-todo.md) and [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md).
