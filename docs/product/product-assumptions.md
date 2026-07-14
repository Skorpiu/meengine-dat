# Product Assumptions (Living)

Short-lived or evolving assumptions. When an assumption becomes a **decision**, add an entry to [decision-log.md](../architecture/decision-log.md) and update roadmap/current-state as needed.

**Format per row:** ID | Date | Assumption | Confidence | Validate by | Links

---

## Active assumptions

| ID | Date | Assumption | Confidence | Validate by | Links |
| -- | ---- | ---------- | ---------- | ------------- | ----- |
| PA-001 | 2026-06-03 | English is the default product UI language until i18n ships | High | `i18n-framework-planning-v1` | [roadmap-todo.md](../architecture/roadmap-todo.md) |
| PA-002 | 2026-06-03 | People UX should use **internal tabs** on `/admin/users` before any `/admin/instructors` route split | High | `people-management-internal-tabs-v1` UX + user feedback | [dat-vs-platform-boundary.md](./dat-vs-platform-boundary.md) |
| PA-003 | 2026-06-03 | Import/export is high business value; tier packaging will distinguish provider-assisted vs self-service | Medium | Sales/onboarding practice; `import-export-business-packaging-v1` | [packaging-and-entitlements.md](./packaging-and-entitlements.md) |
| PA-011 | 2026-07-14 | **Target DAT v1.0** includes Platform-owned tenant subscription billing and License self-service — distinct from **current deployed core** (no live billing) | High | First implementation slices in [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md) | DEC-046–057; [dat-v1-commercial-release-scope.md](./dat-v1-commercial-release-scope.md) |
| PA-004 | 2026-06-03 | ~~Platform remains a **future** product~~ — **superseded:** partial Platform UI/API exists; phased multi-product extraction (DEC-054) | — | — | Retired 2026-07-14 → DEC-054 |
| PA-005 | 2026-06-03 | School admins should not manage raw system settings / feature flags long-term | Medium | `admin-settings-client-visibility-review-v1` | DEC-002 |
| PA-006 | 2026-06-03 | Self-service import/export UI may exist before plan enforcement — enforcement is a follow-up, not a rollback | High | Code + `import-export-business-packaging-v1` | [current-state.md](../architecture/current-state.md) |
| PA-007 | 2026-07-10 | Automated **lesson reminders (email)** are **COMMON_TABLE_STAKE** (**8/9** eligible direct competitors); DAT already has a Postmark **delivery boundary** but **no** lesson-reminder orchestration, scheduling, or lifecycle runtime; **`Notification` reuse undecided** | Medium | First-client ops feedback (prioritization risk — no interviews in discovery batch); `lesson-reminders-email-product-plan-v1` | [competitive-product-discovery.md](./competitive-product-discovery.md) |
| PA-008 | 2026-07-10 | **School-facing balances/ledger** (without PSP) is **COMMON_TABLE_STAKE** (**8/9** eligible direct); **`Payment` schema is not a tenant-ready foundation** — greenfield ledger likely | Medium | Client onboarding; architecture review; `school-balances-ledger-product-plan-v1` | [competitive-product-discovery.md](./competitive-product-discovery.md) |
| PA-010 | 2026-07-10 | **Controlled self-booking or lesson requests** are **EMERGING_PATTERN** (**6/9** eligible direct); DAT has dormant `LessonRequest` schema only — no API/UI workflow | Medium | First-client ops feedback; `student-lesson-request-policy-planning-v1` | [competitive-product-discovery.md](./competitive-product-discovery.md) |
| PA-009 | 2026-07-10 | **IMT/SAFT/regulatory filing** belongs to segment-specific backlog unless a client contract mandates it in DAT core | Medium | Sales/client contract review | [competitive-product-discovery.md](./competitive-product-discovery.md) |

---

## Retired assumptions

Move rows here with date retired and pointer to decision that superseded them.

| ID | Retired | Superseded by |
| -- | ------- | ------------- |
| PA-004 | 2026-07-14 | DEC-054 — partial Platform runtime + phased multi-product control plane plan |
