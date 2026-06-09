# Admin Settings Client Visibility Audit

**Batch:** `admin-settings-client-visibility-review-v1` (docs-only); Fase B `admin-settings-client-visibility-hide-v1` (UI-only, **done**)  
**Status:** Fase A + B + C complete (`admin-license-client-readonly-v1` done)  
**Baseline:** main `d035ad3` (Fase C)  
**Related:** [decision-log.md](./decision-log.md) DEC-002, DEC-026; [dat-vs-platform-boundary.md](../product/dat-vs-platform-boundary.md)

---

## Purpose

Record evidence-backed classification of `/admin/settings` and `/admin/license` for School Admin (`SUPER_ADMIN` tenant role) vs operator/Platform surfaces. This audit does **not** change runtime, UI, APIs, or schema.

**Product conclusion:** `/admin/settings` is a **technical / operator / internal** surface, not a mature school-facing area. School-facing module gating uses **License / Entitlements**, not System Settings or Feature Flags CRUD.

---

## Role model (facts)

| Role | DAT meaning | Relevant routes |
| ---- | ----------- | --------------- |
| `SUPER_ADMIN` | School Admin (tenant) | `/admin/*` including Settings, License |
| `PLATFORM_ADMIN` | Vendor operator | `/platform` (no full Platform management UI today) |

Docs and ops refer to School Admin as `SUPER_ADMIN` on the tenant host.

---

## Inventory: `/admin/settings`

**Page:** `app/admin/settings/page.tsx`  
**Auth:** SSR redirect unless `session.user.role === "SUPER_ADMIN"`  
**Navbar:** link **hidden** for `SUPER_ADMIN` since Fase B (`admin-settings-client-visibility-hide-v1`); route remains reachable by direct URL

| UI element | Component / API | Description |
| ---------- | --------------- | ----------- |
| Header | page | "Configuration Management" — "system settings, feature flags, and **platform configuration**" |
| Tab **System Settings** | `SettingsManagementClient` | Full CRUD on `system_settings` |
| Tab **Feature Flags** | `FeatureFlagsClient` | Full CRUD on `feature_flags` (rollout %, roles, environment, tags) |

**APIs:**

| Method | Route | Auth | Demo guard (writes) |
| ------ | ----- | ---- | ------------------- |
| GET/POST/PUT/DELETE | `/api/admin/settings` | `SUPER_ADMIN` + tenant guard | POST/PUT/DELETE blocked on demo org |
| GET/POST/PUT/DELETE | `/api/admin/feature-flags` | `SUPER_ADMIN` + tenant guard | writes blocked on demo org |
| GET | `/api/admin/config-history` | `SUPER_ADMIN` + tenant guard | read-only; **no UI** on settings page |

**Public / session APIs (no admin UI):**

| Route | Purpose | Frontend consumer today |
| ----- | ------- | ----------------------- |
| `GET /api/config/public` | `system_settings` where `isPublic=true` | None found in app components |
| `GET /api/config/features` | `feature_flags` for current user/org | None found in app components |

---

## Inventory: `/admin/license`

**Page:** `app/admin/license/page.tsx` (client component)  
**Auth (page):** no SSR role guard; navbar link only for `SUPER_ADMIN`  
**Hook:** `useLicense` → `GET /api/admin/license/features`

| UI section | Behavior | Data |
| ---------- | -------- | ---- |
| Organization information | Read-only display | `Organization` name, `subscriptionTier` |
| Activate license key | **Hidden** (Fase C) — API retained for ops | `POST /api/admin/license/activate` → `EntitlementGrant` |
| Premium features | **Read-only** list + cards (Fase C) — API retained for ops | `POST /api/admin/license/features` → `OrganizationFeature` |
| Feature summary | Merged into **Modules & features** (read-only) | Derived from entitlements |

**This is the effective product gating surface** for navbar and `FeatureGate` (e.g. `VEHICLE_MANAGEMENT`, `LESSON_MANAGEMENT`).

---

## Three parallel "feature / settings" systems

| Layer | Location | Used for runtime gating? |
| ----- | -------- | ------------------------ |
| **A — Static config** | `lib/config/features.ts` (`FEATURE_CONFIG`) | No — dashboard school name only (`getDrivingSchoolName`) |
| **B — Feature flags DB** | `feature_flags` + `/admin/settings` tab + `/api/config/features` | **No** — no navbar/FeatureGate consumer in app UI |
| **C — License / entitlements** | `organization_features` + `entitlement_grants` + `/admin/license` + `useLicense` | **Yes** — navbar, `FeatureGate`, `LicenseService` |

**Implication:** hiding Feature Flags admin UI does not change module visibility if entitlements are unchanged. Confusing Settings with License is a product risk.

---

## Seeded `SystemSetting` keys (`scripts/seed.ts`)

| Key | Category | isPublic | Consumed by app runtime? |
| --- | -------- | -------- | ------------------------ |
| `business_name` | general | yes | No (only via `/api/config/public`) |
| `business_email` | general | yes | No |
| `business_phone` | general | yes | No |
| `default_lesson_duration` | lessons | yes | No |
| `lesson_cancellation_hours` | lessons | yes | No |
| `auto_approve_lessons` | lessons | no | No |
| `max_daily_lessons_per_student` | lessons | yes | No |
| `booking_advance_days` | lessons | yes | No |
| `theory_exam_pass_score` | exams | yes | No |
| `practical_exam_max_attempts` | exams | yes | No |
| `email_notifications_enabled` | notifications | no | No |

Lesson create, vehicles, and exams logic do **not** call `getSystemSetting()` today. Seeded settings are **potential future School Settings**, not active product knobs.

**Feature flags:** not seeded in `seed.ts`; table may be empty unless created via admin UI or ops.

---

## Vehicle operational alerts (product direction)

**Not in Settings today.** `Vehicle` has `insuranceExpiryDate`, `nextServiceDate`, `lastServiceDate`, `serviceIntervalKm` — but no configurable lead-time alerts or notification wiring. Future slice: `school-operational-alerts-v1` (spec + runtime, separate from hiding Settings).

---

## Section classification

### `/admin/settings` — System Settings tab

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| CRUD raw keys / types / categories | `MOVE_TO_PLATFORM` | Operator tooling; DEC-002 |
| Add / Delete setting | `HIDE_INTERNAL` | Risk of arbitrary keys; demo guard on writes only |
| `isPublic` toggle | `HIDE_INTERNAL` | Exposes public API concept |
| Seeded business_* keys | `RENAME_OR_REFRAME` | Future "School profile / contact" |
| Seeded lesson_* / exam_* keys | `DEFER_FUTURE_CLIENT_SETTING` | Need runtime wiring before school exposure |
| `email_notifications_enabled` | `DEFER_FUTURE_CLIENT_SETTING` | Notifications not productized |
| Entire tab for School Admin | `HIDE_INTERNAL` | Fase B — navbar + page demote |

### `/admin/settings` — Feature Flags tab

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| Entire tab | `MOVE_TO_PLATFORM` | Rollout %, A/B, environment — PA-005 |
| CRUD | `HIDE_INTERNAL` | Orphaned from product gating (system C) |

### `/admin/license`

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| Organization info (read-only) | `KEEP_CLIENT_VISIBLE` | Tier / org name useful |
| Feature summary (read-only) | `KEEP_CLIENT_VISIBLE` | What modules are active |
| Activate license key | `MOVE_TO_PLATFORM` | Commercial / operator; demo uses scripts |
| Premium feature toggles | `HIDE_INTERNAL` (Fase C done) | UI read-only; POST API retained for ops |
| Page link in navbar | `RENAME_OR_REFRAME` (Fase C done) | Navbar label **Plan** → `/admin/license` |

### Navbar

| Link | Classification |
| ---- | -------------- |
| Settings | `HIDE_INTERNAL` (Fase B) |
| License | `RENAME_OR_REFRAME` (Fase C) |

### APIs (keep when UI hidden)

| API | Keep? | Reason |
| --- | ----- | ------ |
| `/api/admin/settings` | Yes | Ops, smoke baseline, future Platform |
| `/api/admin/feature-flags` | Yes | Same |
| `/api/admin/config-history` | Yes | Audit trail |
| `/api/admin/license/*` | Yes | Entitlements + gating |
| `/api/config/public`, `/api/config/features` | Yes | Contracts; low risk |

---

## Dependency map (API / data)

```
School Admin UI (SUPER_ADMIN)
├── /admin/settings
│   ├── System Settings CRUD → system_settings (organizationId)
│   └── Feature Flags CRUD   → feature_flags (organizationId)
├── /admin/license
│   ├── GET  /api/admin/license/features  → OrganizationFeature + EntitlementGrant
│   ├── POST /api/admin/license/features  → OrganizationFeature toggle
│   └── POST /api/admin/license/activate  → EntitlementGrant
└── Navbar module visibility
    └── useLicense → GET /api/admin/license/features (NOT feature_flags)

Public / unused by admin UI
├── GET /api/config/public  → system_settings (isPublic)
└── GET /api/config/features → feature_flags (per user/org)

Legacy static
└── lib/config/features.ts → FEATURE_CONFIG (dashboard title only)

Operator scripts (demo / prod)
├── scripts/configure-demo-showcase.ts
├── scripts/seed.ts (OrganizationFeature)
└── lib/demo/demo-tier-profiles.ts
```

**Tables:** `SystemSetting`, `FeatureFlag`, `OrganizationFeature`, `EntitlementGrant`, `ConfigurationHistory` — all tenant-scoped where applicable; class-B RLS on `system_settings` / `feature_flags` per `supabase-rls-class-b-hardening-v1`.

---

## Risks of hiding / removing

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Demo loses feature toggles if License UI hidden without operator scripts | P1 | Keep `configure-demo-showcase.ts`; Fase C read-only only after script coverage verified |
| Smoke baseline expects `/admin/settings` reachable | P2 | Update runbooks when Fase B ships |
| Removing APIs breaks integration tests | P2 | Do not remove APIs in hide/readonly phases |
| School Admin toggles entitlements in production | P2 | Fase C demote toggles |
| Confusing three feature systems in docs/support | P2 | DEC-026; this audit |

---

## Phased recommendation

| Phase | Batch | Type | Scope |
| ----- | ----- | ---- | ----- |
| **A** | `admin-settings-client-visibility-review-v1` | **docs-only** | This audit + memory update (**done**) |
| **B** | `admin-settings-client-visibility-hide-v1` | UI-only | Remove Settings from navbar; operator-only message on `/admin/settings`; **APIs unchanged** (**done**) |
| **C** | `admin-license-client-readonly-v1` | UI-only | License: read-only status/summary for School Admin; hide Activate + toggles; **APIs unchanged** (**done**) |
| **D** | `school-operational-alerts-v1` | runtime (future) | Vehicle expiry / inspection / maintenance lead times — spec + wiring; not in Settings today |
| **P2** | `platform-settings-and-feature-flags-boundary-v1` | Platform | Future ownership of flags/system settings UI |

**Do not** in Fase B/C: remove APIs, change entitlements behavior, schema migrations, or demo guards.

---

## Tests (existing)

| File | Coverage |
| ---- | -------- |
| `app/api/admin/settings/route.integration.unit.test.ts` | Auth, GET, POST, tenant |
| `app/api/admin/feature-flags/route.integration.unit.test.ts` | CRUD auth |
| `app/api/admin/config-history/route.integration.unit.test.ts` | GET history |
| `app/api/admin/license/features/route.integration.unit.test.ts` | GET entitlements, POST toggle |
| `app/api/config/public/route.integration.unit.test.ts` | Host / public settings |

**Gaps (future UI slices):** navbar item tests if extracted; smoke runbook updates.

---

## Schema / migration

**Not required** for Fase A/B/C. Future School Settings or vehicle alerts may reuse `system_settings` without schema change if keys are convention-based; alert **behavior** still needs runtime wiring.

---

## References

- `app/admin/settings/page.tsx`, `components/admin/settings-management-client.tsx`, `components/admin/feature-flags-client.tsx`
- `app/admin/license/page.tsx`, `hooks/use-license.ts`
- `app/api/admin/settings/route.ts`, `feature-flags/route.ts`, `license/features/route.ts`
- `lib/config-utils.ts`, `lib/licensing/effective-entitlements.ts`, `lib/config/features.ts`
- `docs/product/dat-vs-platform-boundary.md`, `docs/product/product-assumptions.md` (PA-005)
