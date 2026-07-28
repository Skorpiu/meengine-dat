# DAT Production-Readiness Cutline

**Status:** Active cutline for **current deployed core** — controlled first B2B client production.
**Baseline commit (historical doc):** `5f41082` (main at DEC-032 write time).
**Current main (2026-07-14):** `d75dd22`.
**Safety tag:** `dat-v1-core-baseline-95b833e` @ `95b833e` (DEC-056).
**Decision:** [DEC-032](./decision-log.md) — `production-readiness-cutline-doc-v1`.  
**Commercial target:** [dat-v1-commercial-release-scope.md](../product/dat-v1-commercial-release-scope.md) — **final DAT v1.0 includes self-service billing**; this cutline describes what is **deployed today**, not the commercial end state.

---

## Scope

Controlled production deployment for a **first B2B driving-school client** using DAT as the operational product. This cutline is **not** a public open-demo or self-serve signup launch.

**Important distinction (2026-07-14):** The **no live billing** assumption below applies to the **current deployed core** and controlled B2B path (DEC-032). It is **not** the final DAT v1.0 product target (DEC-046). Do not rewrite historical DEC-032 evidence; add forward docs for commercial scope.

---

## Assumptions

| Assumption | Requirement |
| ---------- | ----------- |
| Onboarding model | **Invite-only** (copy-link); admin-provisioned students/instructors |
| Public signup | **`PUBLIC_SIGNUP_ENABLED=false`** (unset or explicit `false`) on client production |
| Billing / checkout | **Out of current deployed baseline** — no live PSP, checkout, or billing portal for controlled B2B today. **Target DAT v1.0:** Platform subscription billing (DEC-046) — see [dat-v1-commercial-release-plan.md](./dat-v1-commercial-release-plan.md) |
| Target environment | Each env gets its own **`prisma migrate status` / `migrate deploy`**, **`pnpm check`**, and **post-deploy smoke** |
| Credentials | **No** `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, tickets, or client handoff |
| Audit logs | **Not P0** before controlled production; **foundation implemented** (tenant schema + write paths + read API + URL-only viewer). Optional polish (viewer export/platform view) deferred. |
| Mobile / discovery | **`mobile-tablet-readiness-review-v1`** penultimate/deferred; **Competitive/Product Discovery** after production + cohesion + mobile |

---

## Production-readiness by area

| Area | Status | Notes |
| ---- | ------ | ----- |
| **Auth/session** | Ready | NextAuth credentials; password reset; email verification; auth rate-limit foundation (DAT_3.5). Postmark validated for production email. |
| **Tenant isolation** | Ready | Operational `organizationId` NOT NULL (six tables, deploy recorded). SSR People page tenant-scoped. Host guard + session org. |
| **RLS/security** | Ready | Class-B revoke-only complete (31/31 Prisma tables; B1+B2+B3 deployed + smoke green on validated env). Tenant `CREATE POLICY` = P2 only if Data API required. |
| **Demo safeguards** | Ready (code) | Demo guards, sandbox quotas, cron reset, import apply guards. Demo/prod **operational separation** remains operator discipline (P0 for portfolio; P2 for dedicated client tenant). |
| **People management** | Ready | Unified People IA on `/admin/users` (Students, Instructors, Onboarding). Lifecycle, change email, app access remove/reactivate, instructor deactivate. |
| **Onboarding** | Ready | Manual student/instructor create; invitation flows (unlinked/linked); copy-link accept; Preview QA validated (DAT_3.6). |
| **Lessons/Calendar** | Ready | Schedule Map + Lesson Management; v1a–v1d shipped (colors, edit refresh, truncation, 7-day upcoming, vehicle warnings display-only). v1e student warnings = P3. |
| **Vehicles/Fleet** | Ready (core) | CRUD, maintenance, status; display-only warnings on scheduled lessons. Fleet expiry lead times = P2 (`school-operational-alerts-v1`). |
| **Invitations/email** | Ready | Copy-link invitations; change-email on pending invites; Postmark for transactional auth email. B2B does not require auto-send invite email. |
| **License/Settings** | Ready | Settings **not** in school admin navbar (operator/internal URL only). **Plan** (`/admin/license`) read-only for school admin (DEC-026). |
| **Admin UX** | Cohesive | People, Schedule Map, Lessons, Vehicles, Plan — sufficient for first client operations. |
| **Instructor UX** | Solid | Dashboard, Schedule Map, lesson management, inactive-instructor warnings, booking enforcement. |
| **Student UX** | Functional | Dashboard + lessons; less polished than admin — **acceptable** for first B2B client where school staff drive operations. |
| **Import/export** | Ready | Students + practical lessons: export, dry-run, apply UI; demo guards on apply. |
| **Docs/runbooks** | Ready (baseline) | Release checklist, smoke, demo runbooks exist. First-client onboarding record (DEC-043) added. Residual drift: `production-smoke-runbook-sync-v1` if needed. |
| **Observability/audit** | Ready (foundation) | Tenant-aware `audit_logs` schema + redacted write boundary + major write-path coverage + tenant read API + URL-only viewer are implemented. Platform cross-tenant viewer/export polish deferred. |
| **Deployment/CI/QA** | Ready (gate) | GitLab CI = `pnpm check`. Operator deploy + smoke required per environment before client go-live. |

**Summary:** DAT core is **production-ready enough** for controlled B2B production under invite-only, no public signup, no live billing assumptions.

---

## P0 / P1 / P2 / P3

### P0 — before controlled production (operational, not feature work)

| Item | Notes |
| ---- | ----- |
| Credential policy | Vault + rotation; scoped accounts; never expose high-privilege secrets |
| Target env deploy discipline | `migrate status` / `migrate deploy`, `pnpm check` green, post-deploy smoke |
| `PUBLIC_SIGNUP_ENABLED=false` | Mandatory for first B2B client production |
| `dat-production-smoke-hosted-verification-v1` | **P0 immediate** (current ops) — vault `DAT_SMOKE_*` → fixture preflight → hosted read-only → hosted mutations → runbook validation. Does **not** wait on engineering excellence audit. |

### P1 — strongly recommended on path to / immediately after cutline

| Item | Notes |
| ---- | ----- |
| `production-readiness-cutline-doc-v1` | This document + memory sync (**done** in batch) |
| `production-smoke-runbook-sync-v1` | **Done (docs)** — production smoke runbook synced after DEC-041/042/043/044 |
| `audit-log-tenant-context-foundation-plan-v1` | **Done (docs)** — tenant-aware audit log foundation plan (DEC-044); no migration |
| First-client operator smoke | People onboarding, Schedule Map, invite accept, lesson create/edit, import dry-run |
| `engineering-excellence-audit-v1` | **P1 / engineering excellence — planned (analysis-only)** — global maintainability audit; **not executed**; does **not** replace/delay hosted smoke P0; no runtime/schema/data changes during audit; later small refactor slices only. See [roadmap-todo.md](./roadmap-todo.md). |

**Canonical sequence (current):** (1) `dat-production-smoke-hosted-verification-v1` — P0; (2) `engineering-excellence-audit-v1` — P1 analysis-only; (3) `platform-separation-architecture-plan-v1`; (4) small audit-approved refactor slices.

### P2 — post-production or non-blocking

| Item | Notes |
| ---- | ----- |
| Audit log polish (optional) | Viewer CSV export, platform cross-tenant viewer governance, entity resolution — only if operator need/compliance requires |
| Demo DB separation | Recommended for public portfolio; dedicated client tenant lowers urgency |
| `lesson-student-nullability-policy-review-v1` | Policy doc + validation gap grep |
| `mobile-tablet-readiness-review-v1` | Penultimate before Competitive/Product Discovery |
| Engineering excellence topic backlog (not the global audit) | Route consistency, DTO minimization, concurrency hardening, etc. — longer-running P2 topics; **global** audit is P1 (`engineering-excellence-audit-v1`) |
| Billing/checkout/PSP | Explicit product scope only |
| `supabase-rls-tenant-policies-v1` | Only if Data API tenant access is product-required |

### P3 — deferred

| Item | Notes |
| ---- | ----- |
| `calendar-lessons-polish-v1e-student-warnings` | Product policy first |
| `competitive-product-discovery-v1` | After production + mobile readiness (DEC-007) |
| i18n / `language-pack-pt-PT-v1` | After i18n framework |
| `people-management-ux-unification-instructor-route-split-v1` | D4; tabs-first stands |

---

## Recommended sequence to first production

| # | Step | Type |
| - | ---- | ---- |
| 1 | `production-readiness-cutline-doc-v1` | Docs — **done** |
| 2 | `production-smoke-runbook-sync-v1` (or residual sync) | Docs — **done** — `production-smoke-e2e.md` canonical |
| 3 | **Operator: deploy + smoke first client** | Human gate — migrate deploy, smoke, invite QA on **target env** |
| 4 | `audit-log-tenant-context-foundation-plan-v1` | Docs — **done** — [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md) (DEC-044) |
| 5 | `production-first-client-onboarding-record-v1` | Docs — **done** — [first-client-onboarding-record.md](./first-client-onboarding-record.md) (DEC-043) |
| 6 | `lesson-student-nullability-policy-review-v1` | Docs — policy hygiene |

After stable production: `mobile-tablet-readiness-review-v1` → `competitive-product-discovery-v1`.

---

## Explicitly deferred (do not open next)

- `calendar-lessons-polish-v1e-student-warnings`
- `mobile-tablet-readiness-review-v1` (until after production/cohesion)
- `competitive-product-discovery-v1`
- Mass engineering-excellence **refactor** batches — open only as small slices recommended by `engineering-excellence-audit-v1` (analysis-only audit itself is **P1 planned**, not deferred here)
- Audit log platform cross-tenant viewer / viewer CSV export / additional RLS policy work (separate slices; only if required)
- Billing / checkout / PSP integration
- i18n framework and locale packs
- RLS tenant `CREATE POLICY` unless product-required
- `people-management-ux-unification-instructor-route-split-v1` (D4)

---

## Risks and unknowns

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Stale runbooks | P1 | This cutline + smoke doc sync; `production-smoke-runbook-sync-v1` for residual |
| Env-specific migrations | P1 | Never assume validated env = all envs; run gate per target |
| Demo + prod same DB | P0 (portfolio) / P2 (dedicated client tenant) | Dedicated org/host for client; separate demo DB still recommended for portfolio |
| Audit log gaps (platform view/export) | P2 | Foundation exists; defer platform cross-tenant viewer/export until governance need is explicit |
| Student UX minimal | P2 | Acceptable for B2B; polish after go-live if needed |
| Doc drift (signup/email) | P2 | `signup-hardening-plan.md` synced in cutline batch; re-audit if auth changes |

---

## Operator smoke reminders (school admin navbar)

After DEC-026 and Calendar/Lessons v1a–v1d, school admin smoke should expect:

- **Navbar:** Dashboard, People (`/admin/users`), Lessons, Vehicles, **Plan** (not Settings)
- **Settings:** `/admin/settings` — operator/internal direct URL only; not required in school-facing smoke
- **Plan:** `/admin/license` — read-only Plan & features
- **People:** Students (Profiles + Onboarding), Instructors (Profiles + Onboarding)
- **Lessons:** Schedule Map on `/admin`; Lesson Management on `/admin/lessons` with aligned colors, truncation notice, 7-day upcoming, vehicle/instructor warnings (display-only)

See [production-smoke-baseline.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-baseline.md) and [smoke-test-checklist.md](../../driving_school_platform/nextjs_space/docs/ops/smoke-test-checklist.md).

---

## Related

- [first-client-onboarding-record.md](./first-client-onboarding-record.md) — controlled first B2B client checklist + evidence template (DEC-043)
- [dat-production-readiness-gaps.md](../../driving_school_platform/nextjs_space/docs/ops/dat-production-readiness-gaps.md) — portfolio/demo gaps (partially superseded by this cutline for B2B path)
- [preview-qa-runbook.md](../ops/preview-qa-runbook.md) — Preview validation before production merge
- [command-batteries.md](../ops/command-batteries.md) — deploy and smoke commands
