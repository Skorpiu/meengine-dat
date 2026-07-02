# DAT Production-Readiness Cutline

**Status:** Active cutline for controlled first B2B client production.  
**Baseline commit:** `5f41082` (main).  
**Decision:** [DEC-032](./decision-log.md) — `production-readiness-cutline-doc-v1`.  
**Related:** [current-state.md](./current-state.md), [roadmap-todo.md](./roadmap-todo.md), [release-checklist.md](../../driving_school_platform/nextjs_space/docs/ops/release-checklist.md).

---

## Scope

Controlled production deployment for a **first B2B driving-school client** using DAT as the operational product. This cutline is **not** a public open-demo or self-serve signup launch.

---

## Assumptions

| Assumption | Requirement |
| ---------- | ----------- |
| Onboarding model | **Invite-only** (copy-link); admin-provisioned students/instructors |
| Public signup | **`PUBLIC_SIGNUP_ENABLED=false`** (unset or explicit `false`) on client production |
| Billing / checkout | **Out of baseline** — no live PSP, checkout, or billing portal; do not market as production-ready |
| Target environment | Each env gets its own **`prisma migrate status` / `migrate deploy`**, **`pnpm check`**, and **post-deploy smoke** |
| Credentials | **No** `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, tickets, or client handoff |
| Audit logs | **Not P0** before controlled production; planning P1; runtime implementation P2 unless client/compliance requires earlier |
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
| **Observability/audit** | Gap (planned) | `AuditLog` model exists (RLS hardened) but **no application write paths** today. Planning P1; implementation P2. |
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

### P1 — strongly recommended on path to / immediately after cutline

| Item | Notes |
| ---- | ----- |
| `production-readiness-cutline-doc-v1` | This document + memory sync (**done** in batch) |
| `production-smoke-runbook-sync-v1` | **Done (docs)** — production smoke runbook synced after DEC-041/042/043/044 |
| `audit-log-tenant-context-foundation-plan-v1` | **Done (docs)** — tenant-aware audit log foundation plan (DEC-044); no migration |
| First-client operator smoke | People onboarding, Schedule Map, invite accept, lesson create/edit, import dry-run |

### P2 — post-production or non-blocking

| Item | Notes |
| ---- | ----- |
| Audit log runtime | Migration `organizationId`, write paths, tenant queries — unless compliance pulls earlier |
| Demo DB separation | Recommended for public portfolio; dedicated client tenant lowers urgency |
| `lesson-student-nullability-policy-review-v1` | Policy doc + validation gap grep |
| `mobile-tablet-readiness-review-v1` | Penultimate before Competitive/Product Discovery |
| Engineering Excellence Audit | Refactors, route consistency, optional E2E CI |
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
- Engineering Excellence Audit implementation batches
- Audit log migration / runtime writes / UI (until planning batch approved)
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
| No `AuditLog` writes | P2 | Vercel logs + manual DB investigation until audit slice ships |
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
