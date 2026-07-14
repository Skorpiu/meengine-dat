# DAT Plan and Module Catalog (v1 Product Intent)

**Status:** Approved product direction (planning). **No final prices** in this document.  
**Batch:** `dat-v1-commercial-platform-cutline-plan-v1`  
**Decisions:** [DEC-048](../architecture/decision-log.md), [DEC-049](../architecture/decision-log.md), [DEC-050](../architecture/decision-log.md)

---

## Commercial model overview

| Element | Direction |
| ------- | --------- |
| **Plans** | **Basic**, **Standard**, **Premium** — entitlement bundles (not raw tenant feature flags) |
| **Billing intervals** | **Monthly** and **annual** (product concepts; provider mapping TBD) |
| **Modules** | Bundled into plans; optionally sold as **add-ons** |
| **Effective entitlements** | Subscription state + approved commercial overrides → DAT module gates |

**Supersedes (planning):** older **Basic/Starter vs Premium/Enterprise-only** packaging in [DEC-004](../architecture/decision-log.md) — see note at bottom.

---

## Plan tiers (intent)

### Basic

**Positioning:** Essential school operations for smaller schools or assisted onboarding.

| Module / capability | Included |
| ------------------- | -------- |
| Core People (students, instructors, invitations) | Yes |
| Schedule Map + lesson management (core) | Yes |
| Vehicles (core fleet) | Yes |
| Student portal (baseline) | Yes |
| Import/export (self-service) | **Provider-assisted** during onboarding; limited self-service export |
| Audit log viewer | Read-only baseline |
| Email lesson reminders | No (or trial-limited — **open decision**) |
| School ledger | No |
| Advanced reporting | No |
| Payment integration (school-facing) | No |

### Standard

**Positioning:** Full operational DAT for growing schools.

| Module / capability | Included |
| ------------------- | -------- |
| Everything in Basic | Yes |
| Self-service import/export (dry-run/apply) | Yes |
| Email lesson reminders | Yes |
| Advanced reporting (baseline) | Yes |
| Multi-language entitlement flag | Optional / add-on (**not real i18n** until framework ships) |
| School ledger | **Add-on** or bundled in upgrade path — not mandatory |
| SMS / mobile app flags | Not real product in v1; defer |

### Premium

**Positioning:** Full feature set + optional modules for larger schools.

| Module / capability | Included |
| ------------------- | -------- |
| Everything in Standard | Yes |
| School ledger (manual ledger v1) | **Included** or high-value add-on (**open packaging tie-in**) |
| Payment integration module (school-facing, when built) | Included or add-on |
| Priority support / SLA | Product/marketing — not technical in v1 |
| Import/export advanced validation + history emphasis | Yes |

---

## Module catalog (commercial modules)

Modules map to **entitlement keys** consumed by DAT — not to tenant-editable `feature_flags` CRUD.

| Module key (intent) | Description | Basic | Standard | Premium | Add-on eligible |
| ------------------- | ----------- | ----- | -------- | ------- | --------------- |
| `CORE_OPERATIONS` | People, lessons, vehicles, exams baseline | ✓ | ✓ | ✓ | No |
| `IMPORT_EXPORT_SELF_SERVICE` | Dry-run/apply UI for students + practical lessons | — | ✓ | ✓ | Yes |
| `LESSON_REMINDERS_EMAIL` | Scheduled email reminders for lessons | — | ✓ | ✓ | Yes |
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
- Examples: `SCHOOL_LEDGER`, `LESSON_REMINDERS_EMAIL` on Basic, extra instructor seats (future — **open**).
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
- Optional: included in Premium, sold as add-on on Standard/Basic.
- Existing `Payment` Prisma model is **not** assumed suitable — greenfield ledger likely (PA-008).

---

## Lesson reminders (email)

- **DAT v1 target** — entitlement-gated (`LESSON_REMINDERS_EMAIL`).
- Postmark = **delivery boundary only**; orchestration/scheduling/lifecycle not built.
- SMS/WhatsApp = **deferred**.

---

## Supersedes older packaging references

| Old (DEC-004 era) | New (this catalog) |
| ----------------- | ------------------ |
| Basic / **Starter** | **Basic** |
| Premium / **Enterprise** only | **Basic**, **Standard**, **Premium** |
| Import/export = Premium/Enterprise only | Standard+ self-service; Basic = assisted |
| School payments = Premium/Enterprise generally | **Optional module** / add-on; not mandatory per school |

DEC-004 remains in the log for history; commercial planning **supersedes tier naming** for forward work.

---

## Related documents

| Document | Role |
| -------- | ---- |
| [packaging-and-entitlements.md](./packaging-and-entitlements.md) | Updated product packaging summary |
| [platform-subscription-billing-entitlements-plan.md](../architecture/platform-subscription-billing-entitlements-plan.md) | Platform billing ownership |
| [competitive-product-discovery.md](./competitive-product-discovery.md) | Market table stakes (reminders, ledger) |
