# DAT Production-Readiness Cutline

**Status:** Active cutline for **current deployed core** — controlled first B2B client production.
**Decision:** [DEC-032](./decision-log.md) — `production-readiness-cutline-doc-v1`.
**Entry baseline (this memory reconciliation):** `b408075` — verified at branch creation for `canonical-state-reconciliation-v1`; re-confirm served Production commit before hosted smoke.
**Safety tag:** `dat-v1-core-baseline-95b833e` @ `95b833e` (DEC-056) — code/recovery comparison only.
**Commercial target:** [dat-v1-commercial-release-scope.md](../product/dat-v1-commercial-release-scope.md) — **final DAT v1.0 includes self-service billing**; this cutline describes what is **deployed today**, not the commercial end state.

---

## Scope

Controlled production deployment for a **first B2B driving-school client** using DAT as the operational product. This cutline is **not** a public open-demo or self-serve signup launch.

**Deployment reality:** `www.meengine.io`, `platform.meengine.io`, `demo.meengine.io`, and `meengine-dat.vercel.app` currently share the **same** Vercel app/deployment. DAT/Platform separation is decided and planned, but **not** yet physical separate products.

**Important distinction:** The **no live billing** assumption below applies to the **current deployed core** and controlled B2B path (DEC-032). It is **not** the final DAT v1.0 product target (DEC-046).

---

## Assumptions

| Assumption | Requirement |
| ---------- | ----------- |
| Onboarding model | **Invite-only** (copy-link); admin-provisioned students/instructors |
| Public signup | **`PUBLIC_SIGNUP_ENABLED=false`** (unset or explicit `false`) on client production |
| Billing / checkout | **Out of current deployed baseline** — no live PSP, checkout, or billing portal for controlled B2B today. **Target DAT v1.0:** Platform subscription billing (DEC-046) |
| Target environment | Each env: **`prisma migrate status`** (read-only inspect), **`pnpm check`**, and **post-deploy smoke**. **`prisma migrate deploy`** only when migrations are required — **explicit human authorization**, isolated operator block; never automatic / never agent-executed |
| Credentials | **No** `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, tickets, or client handoff |
| Audit logs | **Not P0** before controlled production; **foundation implemented** (tenant schema + write paths + read API + URL-only viewer + **tenant-aware CSV export**). Platform cross-tenant viewer remains deferred. |
| Mobile / discovery | **Done** — mobile/tablet readiness and competitive product discovery are closed; not future cutline blockers |

---

## Production-readiness by area

| Area | Status | Notes |
| ---- | ------ | ----- |
| **Auth/session** | Ready | NextAuth credentials; password reset; email verification; auth rate-limit foundation (DAT_3.5). Postmark validated for production email. |
| **Tenant isolation** | Ready | Operational `organizationId` NOT NULL (six tables, deploy recorded). SSR People page tenant-scoped. Host guard + session org. |
| **RLS/security** | Ready | Class-B revoke-only complete (31/31 Prisma tables; B1+B2+B3 deployed + smoke green on validated env). Tenant `CREATE POLICY` = P2 only if Data API required. |
| **Demo safeguards** | Ready (code) | Demo guards, sandbox quotas, cron reset, import apply guards. Demo/prod **operational separation** remains operator discipline. |
| **People management** | Ready | Unified People IA on `/admin/users` (Students, Instructors, Onboarding). Lifecycle, change email, app access remove/reactivate, instructor deactivate. |
| **Onboarding** | Ready | Manual student/instructor create; invitation flows (unlinked/linked); copy-link accept; Preview QA validated (DAT_3.6). |
| **Lessons/Calendar** | Ready | Schedule Map + Lesson Management; v1a–v1d shipped. v1e student warnings = P3. |
| **Vehicles/Fleet** | Ready (core) | CRUD, maintenance, status; display-only warnings on scheduled lessons. Fleet expiry lead times = P2 (`school-operational-alerts-v1`). |
| **Invitations/email** | Ready | Copy-link invitations; change-email on pending invites; Postmark for transactional auth email. |
| **License/Settings** | Ready | Settings **not** in school admin navbar (operator/internal URL only). **Plan** (`/admin/license`) read-only for school admin (DEC-026). |
| **Admin UX** | Cohesive | People, Schedule Map, Lessons, Vehicles, Plan — sufficient for first client operations. |
| **Instructor UX** | Solid | Dashboard, Schedule Map, lesson management, inactive-instructor warnings, booking enforcement. |
| **Student UX** | Functional | Dashboard + lessons; less polished than admin — **acceptable** for first B2B client. |
| **Import/export** | Ready | Students + practical lessons: export, dry-run, apply UI; demo guards on apply. |
| **Docs/runbooks** | Ready (baseline) | Release checklist, smoke, demo runbooks; first-client onboarding record (DEC-043). |
| **Observability/audit** | Ready (foundation) | Tenant-aware `audit_logs` + write coverage + read API + viewer + **tenant CSV export**. Platform cross-tenant viewer deferred. |
| **Mobile/tablet** | Done | Review + Schedule Map + PWA manifest + admin surfaces + Playwright viewports. |
| **Competitive discovery** | Done | [competitive-product-discovery.md](../product/competitive-product-discovery.md) (2026-07-10). |
| **Deployment/CI/QA** | Ready (gate) | GitLab CI = `pnpm check`. Operator deploy + smoke required per environment. Hosted smoke re-verification is **P0 ops** after fixture close. |

**Summary:** DAT core is **production-ready enough** for controlled B2B production under invite-only, no public signup, no live billing assumptions.

---

## P0 / P1 / P2 / P3

### P0 — before controlled production (operational, not feature work)

| Item | Notes |
| ---- | ----- |
| Credential policy | Vault + rotation; scoped accounts; never expose high-privilege secrets |
| Target env deploy discipline | `prisma migrate status` (read-only); `pnpm check` green; post-deploy smoke. `migrate deploy` only when needed + explicit human authorization in an isolated block |
| `PUBLIC_SIGNUP_ENABLED=false` | Mandatory for first B2B client production |
| `dat-production-smoke-hosted-verification-v1` | **P0 immediate** — re-confirm deployment/commit → vault `DAT_SMOKE_*` → fixture preflight → hosted read-only → hosted mutations → runbook validation. Does **not** wait on engineering excellence audit. Pre–2026-07-17 hosted evidence is not current. |

### P1 — strongly recommended after P0

| Item | Notes |
| ---- | ----- |
| `engineering-excellence-audit-v1` | **P1 / engineering excellence — planned (analysis-only)** — **not executed**; does **not** replace/delay hosted smoke P0 |
| `platform-separation-architecture-plan-v1` | After hosted smoke + engineering audit |
| Small audit-approved refactor slices | One small scope per branch; behavioural equivalence + `pnpm check` |
| First-client operator smoke | People onboarding, Schedule Map, invite accept, lesson create/edit, import dry-run (when real client path opens) |

**Canonical sequence (current):** (1) `dat-production-smoke-hosted-verification-v1` — P0; (2) `engineering-excellence-audit-v1` — P1 analysis-only; (3) `platform-separation-architecture-plan-v1`; (4) small audit-approved refactor slices.

### P2 — post-production or non-blocking

| Item | Notes |
| ---- | ----- |
| Platform cross-tenant audit viewer | Separate from tenant CSV export (already done); only if platform product need |
| Demo DB separation | Recommended for public portfolio; dedicated client tenant lowers urgency |
| Engineering excellence topic backlog | Route consistency, DTO minimization, concurrency hardening — longer-running; **global** audit is P1 |
| Billing/checkout/PSP | Explicit product scope only |
| `supabase-rls-tenant-policies-v1` | Only if Data API tenant access is product-required |
| `school-operational-alerts-v1` | Vehicle expiry/inspection/maintenance lead times |

### P3 — deferred

| Item | Notes |
| ---- | ----- |
| `calendar-lessons-polish-v1e-student-warnings` | Product policy first |
| i18n / `language-pack-pt-PT-v1` | After i18n framework |
| `people-management-ux-unification-instructor-route-split-v1` | D4; tabs-first stands |

---

## Recommended sequence (current)

| # | Step | Type |
| - | ---- | ---- |
| 1 | `dat-production-smoke-hosted-verification-v1` | **P0 ops** — current next |
| 2 | `engineering-excellence-audit-v1` | P1 analysis-only — planned |
| 3 | `platform-separation-architecture-plan-v1` | Docs/architecture |
| 4 | Audit-approved refactor slices | Small, behavioural equivalence |
| 5 | First-client operator onboarding | Human gate when commercial path ready |

Historical cutline prep steps (`production-readiness-cutline-doc-v1`, smoke runbook sync, audit foundation plan, first-client record, lesson nullability review) are **done** — see [current-state.md](./current-state.md).

---

## Explicitly deferred (do not open next)

- `calendar-lessons-polish-v1e-student-warnings`
- Mass engineering-excellence **refactor** batches — open only as small slices recommended by `engineering-excellence-audit-v1` (analysis-only audit itself is **P1 planned**, not deferred here)
- Platform cross-tenant audit viewer (tenant CSV export is **done**)
- Billing / checkout / PSP integration
- i18n framework and locale packs
- RLS tenant `CREATE POLICY` unless product-required
- `people-management-ux-unification-instructor-route-split-v1` (D4)

**Not deferred (already done):** mobile/tablet readiness; competitive product discovery; tenant-aware audit viewer CSV export.

---

## Risks and unknowns

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Stale hosted smoke evidence | P0 | Re-run `dat-production-smoke-hosted-verification-v1` with post-incident vault IDs; re-confirm deployed commit |
| Shared DAT/Platform/Demo deployment | P1 | Separation plan after engineering audit; do not assume separate products today |
| Env-specific migrations | P1 | Never assume validated env = all envs; run gate per target |
| Possible shared demo/production database | Historical / unconfirmed | Historical operational risk; **not revalidated** in `canonical-state-reconciliation-v1`. Do not treat as current verified fact. Dedicated org/host for client remains good practice. |
| Audit platform cross-tenant view | P2 | Tenant foundation + CSV export exist; defer platform viewer until governance need is explicit |
| Student UX minimal | P2 | Acceptable for B2B; polish after go-live if needed |

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

- [current-state.md](./current-state.md) — canonical present truth
- [roadmap-todo.md](./roadmap-todo.md) — open backlog + single next slice
- [first-client-onboarding-record.md](./first-client-onboarding-record.md) — controlled first B2B client checklist (DEC-043)
- [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md) — hosted smoke P0 runbook
- [command-batteries.md](../ops/command-batteries.md) — deploy and smoke commands
