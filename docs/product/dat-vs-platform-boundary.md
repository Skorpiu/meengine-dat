# DAT vs Platform Boundary

**Status:** Product direction (documented). **Platform is future/deferred** — not a separate implemented product or repo today.

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
| Student portal | Future-facing student experience (in DAT) |
| School-facing payments | Future: balances, packages, receipts — see [packaging-and-entitlements.md](./packaging-and-entitlements.md) |

**Host (today):** Tenant/school app (e.g. `www.meengine.io`, Preview QA hosts). See [system-design.md](../architecture/system-design.md).

---

## Platform (future provider product)

**Who uses it:** Rui/vendor — manage DAT **customers** (organizations), not day-to-day school lessons.

**Platform will own (deferred):**

| Area | Notes |
| ---- | ----- |
| Organizations / customers | Tenant registry, onboarding |
| Plans / subscriptions | Commercial packaging for DAT |
| Entitlements | Feature gates per customer |
| Feature flags | Internal/product flags (not school-admin knobs) |
| System / internal settings | Operator configuration |
| DAT subscription billing | What schools pay **for DAT** — not school→student payments |
| Domains / hosts | `organization_domains`, platform host mapping |
| Advanced onboarding / admin ops | Operator workflows beyond school admin |

**Host (today):** `platform.meengine.io` exists for `PLATFORM_ADMIN` sign-in; **no dedicated Platform management UI** in baseline — operators use scripts (e.g. [platform-admin-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/platform-admin-runbook.md)).

---

## Settings and Feature Flags (today vs future)

**Fact (repo today):** School Admin can open `/admin/settings` and manage system settings and feature flags via admin APIs.

**Product direction:**

- Current Settings / System Settings / Feature Flags are **too technical** for client-facing school admins.
- **Future:** demote, hide, or reposition from client-facing DAT.
- **Ownership:** most of this moves to **future Platform**; DAT keeps only **School Settings** a school admin can understand (branding, practical prefs, etc. — to be defined per slice).

**Audit (done):** [admin-settings-client-visibility-audit.md](../architecture/admin-settings-client-visibility-audit.md) — `admin-settings-client-visibility-review-v1`. **Module gating** uses License/Entitlements (DEC-026), not `feature_flags` CRUD. **Fase B (done):** `admin-settings-client-visibility-hide-v1` — Settings hidden from school admin nav; `/admin/settings` operator copy. **Next UI slice:** `admin-license-client-readonly-v1`. Platform extraction: `platform-settings-and-feature-flags-boundary-v1` (P2).

---

## What this doc does not claim

- Platform is **not** a separate codebase or deployment yet.
- Moving tables or building Platform UI is **out of scope** until explicitly approved batches.
- RLS/Data API posture for internal tables remains engineering-owned — see [supabase-rls-data-api-policy-matrix.md](../architecture/supabase-rls-data-api-policy-matrix.md).

---

## References

- [decision-log.md](../architecture/decision-log.md) — DEC-001, DEC-002
- [packaging-and-entitlements.md](./packaging-and-entitlements.md)
- [product-assumptions.md](./product-assumptions.md)
