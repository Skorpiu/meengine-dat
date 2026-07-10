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

**Fact:** `Payment` Prisma model exists but is **legacy/dormant** (no `organizationId`, USD default, `userId`-linked) — **not** a tenant-ready school ledger foundation. No school-facing payment admin product surface today. Product packaging and school-facing scope are **not** finalized here.

---

## Multi-Language

**Fact:** “Multi-Language Support” exists as a **license entitlement name** in `lib/config/license-features.ts`. **Real i18n is not implemented.**

**Future slices:**

- `i18n-framework-planning-v1` — framework, fallback, switcher behavior, pricing/plan tie-in
- `language-pack-pt-PT-v1` — pt-PT copy strategy and packs

Until then: **English product UI baseline** for new surfaces.

---

## Competitive / product discovery (completed)

**Slice:** `competitive-product-discovery-v1` — **Done (docs)** 2026-07-10.

**Report:** [competitive-product-discovery.md](./competitive-product-discovery.md)

**Completion summary:** Compared DAT with **9 counted direct competitors with sufficient official evidence** (UK, PT, ES; **HIGH/MEDIUM per registry row**) and **3 adjacent** horizontal booking benchmarks (meetergo, anny, EasyWeek), plus **2 low-evidence** legacy PT products excluded from prevalence. DAT is strong on People, scheduling, import/export, audit, and tenant isolation. **Prevalence:** lesson reminders and school-facing balances are confirmed in **8/9** eligible direct competitors; controlled self-booking or lesson requests are confirmed in **6/9**. Largest DAT gaps: operational lesson reminders (Postmark delivery boundary only — no orchestration/scheduling/lifecycle), school-facing balances/ledger (`Payment` schema not tenant-ready), controlled student lesson requests (`LessonRequest` dormant schema only), progress/skills UI, and operational analytics. National regulator integration is **publicly confirmed in 4/6 counted Iberian direct competitors** (segment-specific; deferred).

**Evidence-supported packaging implications (intent only — not commitments):**

| Theme | Packaging signal |
| ----- | ---------------- |
| Self-service import/export (already shipped) | Premium/Enterprise — enforce via `import-export-business-packaging-v1` |
| Lesson reminders (email) | Premium comms; Basic may stay manual |
| School-facing balances / manual ledger | Premium/Enterprise; distinct from Platform subscription billing |
| Controlled student booking (request + approval) | Premium “self-service” gate |
| Progress/skills tracking | Premium |
| IMT/regulatory modules | Separate segment offer or services — not baseline DAT |

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
