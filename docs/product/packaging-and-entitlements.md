# Packaging and Entitlements (Product Intent)

**Status:** Product/business direction. **Plan enforcement in UI/API is not implemented** unless a named batch says so.

**Fact:** Self-service import/export UI (dry-run/apply) already exists in DAT for entitled environments — see [current-state.md](../architecture/current-state.md). Tier gating is a **future** slice: `import-export-business-packaging-v1`.

---

## Plan tiers (intent)

| Tier | Import/export | Notes |
| ---- | ------------- | ----- |
| **Basic / Starter** | Provider-assisted import during onboarding; basic export may be included | Vendor/operator runs process; school admin may not get full self-service UI |
| **Premium / Enterprise** | Self-service import/export UI, dry-run/apply, templates, import history/audit, advanced validation | Aligns with shipped technical capability; packaging TBD |

---

## Provider-assisted import (deferred runbook)

Full runbook: **`provider-assisted-import-runbook-v1`** (P2 ops — not written in product sync v1).

**Outline only:**

1. **Template** — use repo examples under `driving_school_platform/nextjs_space/docs/examples/import-export/`
2. **Data cleanup** — normalize IDs, dates, instructor resolution off-repo
3. **Dry-run** — zero-write preview against QA/tenant DB
4. **Fix** — iterate on row errors
5. **Apply** — human-approved apply (non-demo org)
6. **Customer validation** — school sign-off on counts and samples

Contracts: [client-data-import-export-strategy.md](../../driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md).

---

## Payment Integration (two meanings)

| Meaning | Owner | Scope |
| ------- | ----- | ----- |
| **DAT customer subscription** | Future **Platform** + billing/entitlements | What a **school pays for DAT** — not “Payment Integration” in school admin |
| **School-facing payment operations** | Future **DAT** | Student balances, lesson packages, payments received, debts, receipts, accounting export; SIBS/Stripe/MB Way later |

School-facing work is likely **Premium/Enterprise**. Planning slices: `payment-integration-product-planning-v1`, `payments-and-balances-foundation-v1`.

**Fact:** `Payment` model and admin flows exist for tenant-scoped payment records today; product packaging and school-facing scope are **not** finalized here.

---

## Multi-Language

**Fact:** “Multi-Language Support” exists as a **license entitlement name** in `lib/config/license-features.ts`. **Real i18n is not implemented.**

**Future slices:**

- `i18n-framework-planning-v1` — framework, fallback, switcher behavior, pricing/plan tie-in
- `language-pack-pt-PT-v1` — pt-PT copy strategy and packs

Until then: **English product UI baseline** for new surfaces.

---

## Competitive / product discovery (backlog only)

**Slice:** `competitive-product-discovery-v1` — compare DAT with driving-school management platforms; prioritize high-value themes. **No deep analysis in this doc.**

**Candidate themes to evaluate:**

- Student portal depth
- Controlled self-scheduling / lesson requests
- Reminders (email / SMS / WhatsApp)
- Progress tracking
- Payments / balances / packages
- Documents / e-signatures
- Reporting dashboards
- Communications center
- Operational analytics

---

## Related roadmap slices

| Slice | Purpose |
| ----- | ------- |
| `import-export-business-packaging-v1` | Enforce or document tier vs self-service UI |
| `provider-assisted-import-runbook-v1` | Operator runbook (full) |
| `payment-integration-product-planning-v1` | School-facing payments product spec |
| `payments-and-balances-foundation-v1` | Technical foundation |
| `competitive-product-discovery-v1` | Market comparison backlog input |
| `i18n-framework-planning-v1` | Real localization |
| `language-pack-pt-PT-v1` | Portuguese product copy |

See [roadmap-todo.md](../architecture/roadmap-todo.md) — **P1 / Product and packaging**.
