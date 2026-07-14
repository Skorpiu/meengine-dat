# DAT Plan and Module Catalog (v1 Product Intent)

**Status:** Approved product direction (planning). **No final prices** in this document.
**Batch:** `dat-v1-commercial-platform-cutline-plan-v1`; display names updated in `dat-plan-naming-and-doc-hygiene-v1`
**Decisions:** [DEC-048](../architecture/decision-log.md), [DEC-049](../architecture/decision-log.md), [DEC-050](../architecture/decision-log.md), [DEC-058](../architecture/decision-log.md)

---

## Commercial model overview

| Element | Direction |
| ------- | --------- |
| **Plans** | **DAT Core**, **DAT Plus**, **DAT Premium** — entitlement bundles (not raw tenant feature flags) |
| **Stable plan keys (planned)** | `DAT_CORE`, `DAT_PLUS`, `DAT_PREMIUM` — internal identifiers; separate from display names and billing interval |
| **Billing intervals** | **Monthly** and **annual** — product concepts; provider mapping TBD; stored separately from plan keys |
| **Modules** | Bundled into plans; optionally sold as **add-ons** |
| **Effective entitlements** | Subscription state + add-ons + approved commercial overrides → DAT module gates |

**Catalogue rule:** Plans are bundles of **versioned entitlements**. Plan identity, display name, billing interval, price, included entitlements, optional add-ons, contractual overrides, and grandfathered subscriptions are **distinct**. Changing a display name must not require migrating subscriptions. Changing plan composition must not silently modify historical customer agreements.

**Authorization rule:** Display names are **not** authorization keys. Plan authorization is derived from **effective entitlements**, not from matching display strings in UI or docs.

**Supersedes (planning labels):** **Basic**, **Standard**, and bare **Premium** as DAT v1 commercial plan display names (DEC-048 era) — superseded by DEC-058. Older **Basic/Starter vs Premium/Enterprise-only** packaging in [DEC-004](../architecture/decision-log.md) remains historical.

---

## Plan display names and positioning (approved)

### DAT Core

The complete operational foundation required to run a driving school with DAT. The name must **not** imply a crippled, trial, or incomplete product.

### DAT Plus

Additional automation, operational control, and administrative efficiency beyond DAT Core.

### DAT Premium

The most complete DAT plan, containing higher-value capabilities and eligibility for advanced modules. **Do not** describe Premium as automatically including every future DAT capability forever — plan contents are defined by versioned entitlements and the applicable commercial catalogue.

---

## Stable internal plan keys (recommended — not implemented)

Plan keys must **not** encode prices, billing interval, provider IDs, temporary campaign names, or plan display copy.

| Plan key | Display name |
| -------- | -------------- |
| `DAT_CORE` | DAT Core |
| `DAT_PLUS` | DAT Plus |
| `DAT_PREMIUM` | DAT Premium |

Billing intervals remain separate: `MONTHLY`, `ANNUAL`.

Examples (documentation only — no schema/types in this batch):

```ts
{
  planKey: "DAT_CORE",
  displayName: "DAT Core",
  billingInterval: "MONTHLY"
}
```

```ts
{
  planKey: "DAT_PREMIUM",
  displayName: "DAT Premium",
  billingInterval: "ANNUAL"
}
```

---

## Plan tiers — proposed package matrix (non-final)

The matrix below is **explicitly proposed** and **non-final**. Schema plan: [platform-commercial-catalog-schema-plan.md](../architecture/platform-commercial-catalog-schema-plan.md) (DEC-060). Open decisions include: email reminders in Core vs Plus; school ledger in Premium vs add-on vs both; usage/storage/user/student limits; final prices; annual discount; trial duration; add-on eligibility; grandfathering policy.

### DAT Core

**Positioning:** Essential school operations — the complete operational foundation (not a crippled tier).

| Module / capability | Proposed |
| ------------------- | -------- |
| Core People (students, instructors, invitations) | Yes |
| Schedule Map + lesson management (core) | Yes |
| Vehicles (core fleet) | Yes |
| Student portal (baseline) | Yes |
| Import/export (self-service) | **Provider-assisted** during onboarding; limited self-service export |
| Audit log viewer | Read-only baseline |
| Email lesson reminders | **Open** — Core vs Plus (OD-008) |
| School ledger | No |
| Advanced reporting | No |
| Payment integration (school-facing) | No |

### DAT Plus

**Positioning:** Full operational DAT plus automation and administrative efficiency.

| Module / capability | Proposed |
| ------------------- | -------- |
| Everything in DAT Core | Yes |
| Self-service import/export (dry-run/apply) | Yes |
| Email lesson reminders | **Open** — likely Plus+ |
| Advanced reporting (baseline) | Yes |
| Multi-language entitlement flag | Optional / add-on (**not real i18n** until framework ships) |
| School ledger | **Add-on** or bundled in upgrade path — **open** |
| SMS / mobile app flags | Not real product in v1; defer |

### DAT Premium

**Positioning:** Most complete plan; higher-value modules and advanced-module eligibility — not “every future capability forever.”

| Module / capability | Proposed |
| ------------------- | -------- |
| Everything in DAT Plus | Yes |
| School ledger (manual ledger v1) | **Open** — included vs add-on (OD-007) |
| Payment integration module (school-facing, when built) | Included or add-on |
| Priority support / SLA | Product/marketing — not technical in v1 |
| Import/export advanced validation + history emphasis | Yes |

---

## Module catalog (commercial modules) — proposed

Modules map to **entitlement keys** consumed by DAT — not to tenant-editable `feature_flags` CRUD.

| Module key (intent) | Description | Core | Plus | Premium | Add-on eligible |
| ------------------- | ----------- | ---- | ---- | ------- | --------------- |
| `CORE_OPERATIONS` | People, lessons, vehicles, exams baseline | ✓ | ✓ | ✓ | No |
| `IMPORT_EXPORT_SELF_SERVICE` | Dry-run/apply UI for students + practical lessons | — | ✓ | ✓ | Yes |
| `LESSON_REMINDERS_EMAIL` | Scheduled email reminders for lessons | — | **Open** | **Open** | Yes |
| `ADVANCED_REPORTING` | Analytics/reporting surfaces | — | ✓ | ✓ | Yes |
| `AUDIT_LOG` | Tenant audit viewer (+ export) | ✓ | ✓ | ✓ | No |
| `SCHOOL_LEDGER` | School→student balances/ledger (DAT-owned) | — | Add-on | ✓ (typ.) | **Yes** |
| `PAYMENT_INTEGRATION` | School-facing PSP when implemented | — | Add-on | ✓ (typ.) | **Yes** |
| `STUDENT_ACCESS` | Student app login surfaces | ✓ | ✓ | ✓ | No |
| `MULTI_LANGUAGE` | Entitlement placeholder until i18n | — | Add-on | Add-on | Yes |

**Runtime mapping note:** Today’s code uses legacy `FeatureKey` values in `lib/config/license-features.ts` (all currently classified PREMIUM in code). A future batch will align **commercial module keys** → `FeatureKey` / new keys without exposing raw flags to schools.

---

## Add-on model

- Add-ons are **commercial products** attached to an active subscription (subscription items).
- Add-ons grant **additional entitlements** for a billing period or until removed.
- Examples: `SCHOOL_LEDGER`, `LESSON_REMINDERS_EMAIL` on DAT Core, extra instructor seats (future — **open**).
- Platform owns add-on catalog, pricing references, and attachment to subscription.
- DAT **displays** add-ons on License UI and **reflects** effective entitlements after Platform confirmation.

---

## Monthly and annual billing

| Concept | Direction |
| ------- | --------- |
| Monthly | Recurring monthly subscription item |
| Annual | Recurring annual subscription item (discount policy **open**) |
| Upgrade mid-cycle | Proration rules **open** (provider-dependent) |
| Downgrade | **Schedule at period end** preferred (product default; implementation TBD) |
| Trial | Product-supported concept; duration **open** |
| Grace period | Product-supported concept; duration **open** |

Platform stores interval on **price/plan** entities (target schema — see billing plan doc). DAT License UI lets School Admin **choose** interval at checkout; confirmation is **never** from browser redirect alone.

---

## School ledger (optional module)

- **DAT-owned** domain: school→student balances, packages, receipts (manual v1 acceptable).
- **Not** Platform subscription billing.
- Optional: included in DAT Premium, sold as add-on on lower tiers — **open** (OD-007).
- Existing `Payment` Prisma model is **not** assumed suitable — greenfield ledger likely (PA-008).

---

## Lesson reminders (email)

- **DAT v1 target** — entitlement-gated (`LESSON_REMINDERS_EMAIL`).
- Postmark = **delivery boundary only**; orchestration/scheduling/lifecycle not built.
- Whether included in DAT Core or DAT Plus — **open** (OD-008).
- SMS/WhatsApp = **deferred**.

---

## Supersedes older packaging references

| Old (historical) | Current forward planning (DEC-058) |
| ---------------- | ---------------------------------- |
| Basic / **Starter** (DEC-004) | **DAT Core** |
| **Standard** (DEC-048 planning label) | **DAT Plus** |
| Premium / **Enterprise** only (DEC-004) | **DAT Core**, **DAT Plus**, **DAT Premium** |
| Import/export = Premium/Enterprise only | Plus+ self-service; Core = assisted (**proposed**) |
| School payments = Premium/Enterprise generally | **Optional module** / add-on; not mandatory per school |

DEC-004 and DEC-048 remain in the log for history; **display names** for forward work use DAT Core / DAT Plus / DAT Premium per DEC-058.

---

## Related documents

| Document | Role |
| -------- | ---- |
| [packaging-and-entitlements.md](./packaging-and-entitlements.md) | Updated product packaging summary |
| [platform-subscription-billing-entitlements-plan.md](../architecture/platform-subscription-billing-entitlements-plan.md) | Platform billing ownership |
| [competitive-product-discovery.md](./competitive-product-discovery.md) | Market table stakes (reminders, ledger) |
