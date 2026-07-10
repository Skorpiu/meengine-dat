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
| PA-004 | 2026-06-03 | Platform remains a **future** product; DAT repo stays single-app for now | High | Separate Platform initiative (if any) | [dat-vs-platform-boundary.md](./dat-vs-platform-boundary.md) |
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
| — | — | — |
