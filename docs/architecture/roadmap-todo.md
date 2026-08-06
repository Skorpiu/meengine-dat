# DAT Roadmap and To-Do

Prioritized backlog for DAT. **P0** is safety; feature work starts at **P1** unless security blocks release.

**Closed-slice history:** see [current-state.md](./current-state.md) (reference archive). This file lists **open** work and **one** recommended next slice.

---

## Single recommended next

| Slice | Priority | Status |
| ----- | -------- | ------ |
| `engineering-excellence-audit-v1` | **P1** engineering excellence | **Active — analysis-only**; normalized inventory complete; inspect responsibilities and call paths before confirming findings; no runtime/schema/data or refactor implementation |

**Closed context:** `node-24-runtime-migration-v1` closed 2026-08-04 at merge `909b69a`: Node 24.18.0 local compatibility, repository/CI pins, GitLab `node:24`, Vercel Preview, Project Setting 24.x, Production deployment and post-deploy non-destructive hosted gates passed. The earlier full mutation smoke evidence remains valid; mutation smoke was not repeated for this runtime/config-only change. Fixtures (DEC-064), invite-link repair and the earlier hosted verification remain **closed** — do not re-apply without new evidence + human authorization. Runbook: [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md).

---

## Canonical sequence

<!-- node-24-runtime-migration-v1 closed 2026-08-04 at 909b69a -->
**Closed prerequisite:** `node-24-runtime-migration-v1` merged to `main` at `909b69a`; GitLab `node:24`, Vercel Preview/Production Node 24.x, and required post-deploy non-destructive hosted gates passed.

1. `engineering-excellence-audit-v1` — **P1 / engineering excellence — active, analysis-only**; normalized inventory complete; no findings confirmed
2. `platform-separation-architecture-plan-v1`
3. Small audit-approved refactor slices (one scope per branch; behavioural equivalence + `pnpm check`)

**P1 parallel (preserved):** `people-instructor-invite-accept-list-refresh-v1`; `school-person-identifiers-settings-product-plan-v1` (DEC-065).

Do **not** resume `platform-commercial-catalog-read-services-v1` inside embedded Platform without the separation plan.

---

## P0 / Safety

- Do not merge **unvalidated** batches.
- If **`pnpm -C driving_school_platform/nextjs_space check`** fails, do not push.
- If **migration** fails or status is unknown on target DB, do not push.
- If **schema/runtime mismatch** exists, stop.
- If a batch touches **auth / security / billing / demo** unexpectedly, stop and report.
- Keep **secrets** out of docs, commits, and logs.

### Controlled production (first B2B client)

**Cutline:** [production-readiness-cutline.md](./production-readiness-cutline.md) (**DEC-032**). DAT core is production-ready for **invite-only**, no public signup, no live billing. P0 here is **operational discipline**.

| Item | Notes |
| ---- | ----- |
| Credential policy | Never expose `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, or client handoff |
| Target env deploy discipline | Per environment: `prisma migrate status` (read-only inspect); `pnpm check` green; post-deploy smoke. `prisma migrate deploy` only when migrations are required, with **explicit human authorization**, in an **isolated** operator block — never automatic / never agent-executed |
| `PUBLIC_SIGNUP_ENABLED=false` | Mandatory on first B2B client production |
| Shared hosts today | `www.meengine.io`, `platform.meengine.io`, `demo.meengine.io`, `meengine-dat.vercel.app` — same Vercel deployment; separation planned, not physical |

---

## Open engineering and product backlog

| Slice | Priority | Notes |
| ----- | -------- | ----- |
| `engineering-excellence-audit-v1` | **P1** active (analysis-only) | Normalized inventory complete on `da5aea6`; no findings confirmed; audit report records evidence; audit itself authorizes no refactor implementation |
| `platform-separation-architecture-plan-v1` | **P1** backlog | After the engineering audit — autonomous MeEngine Platform vs DAT; Node 24 prerequisite is closed |
| `people-instructor-invite-accept-list-refresh-v1` | **P1** bug | After INSTRUCTOR invite accept, instructor may not appear under People → Instructors despite correct DB rows |
| `school-person-identifiers-settings-product-plan-v1` | **P1** plan first | DEC-065 — Admin → Settings → Identifiers & numbering; plan before implementation |
| `platform-commercial-catalog-read-services-v1` | **P1** blocked | Gate after Platform separation plan — do not resume in embedded Platform |
| `lesson-reminders-email-product-plan-v1` | **P1** product backlog | Email lesson reminders; `Notification` reuse not assumed |
| `school-balances-ledger-product-plan-v1` | **P1** product backlog | Optional DAT school→student ledger module (DEC-051/052); **not** Platform subscription billing; plan only — no implementation authorization |
| `student-progress-tracking-foundation-plan-v1` | **P1** product backlog | Competency progress — plan only |
| `cursor-automations-super-agent-scheduled-support` | **P1** if free | Only if Automations available at **no extra cost**; else manual daily Super-Agent check |
| `student-lesson-request-policy-planning-v1` | **P2** backlog | Controlled request + approval (`LessonRequest` exists) |
| `import-export-business-packaging-v1` | **P2** | Tier vs self-service UI enforcement |
| `provider-assisted-import-runbook-v1` | **P2** | Operator import runbook |
| `school-operational-alerts-v1` | **P2** | Vehicle expiry/inspection/maintenance lead times |
| `platform-settings-and-feature-flags-boundary-v1` | **P2** | Future Platform ownership of flags/system settings |
| `i18n-framework-planning-v1` | **P2** | Real i18n; switcher, fallback, plan tie-in |

**Payment domains (DEC-046 / DEC-052) — keep separate; no implementation authorization:**

| Domain | Owner | Status |
| ------ | ----- | ------ |
| Platform subscription billing (school pays DAT provider) | **Platform** | Planned commercial path (DEC-046); not current deployed baseline |
| School→student ledger / balances | **DAT** optional module | Plan via `school-balances-ledger-product-plan-v1` (DEC-051/052) |

**Superseded / do not reopen as mixed “payments + balances” items:** `payment-integration-product-planning-v1`, `payments-and-balances-foundation-v1` — older labels that blur Platform subscription billing with the optional DAT school ledger. Prefer the split above.

**Abandoned:** `platform-admin-access-and-smoke-reconcile-v1` (superseded by DEC-063 / `dat-production-smoke-reconcile-v1`).

---

## P1 / Engineering excellence — planned (analysis-only)

### `engineering-excellence-audit-v1`

**Status:** **P1 — active**; analysis-only. Normalized inventory completed on 2026-08-06. No findings, severity ratings, or refactor slices are yet approved. No runtime, schema, data, or functional changes during the audit. Detailed evidence: [engineering-excellence-audit-v1.md](./engineering-excellence-audit-v1.md).

**Inherited baseline:** Node 24 P0 is closed (`909b69a` runtime merge; `da5aea6` current main/audit base). Local Node `v24.18.0`, repository engine `24.x`, GitLab `node:24`, Vercel Node 24.x, 207 test files / 1738 tests, production build, and post-deploy read-only smoke are validated. No dependency or runtime upgrades belong in this audit.

**Super Agent role:** reusable DAT operational worker for repository investigation, guarded command preparation, canonical memory maintenance, and smallest-safe-slice planning. It does not autonomously authorize remote writes, production mutations, destructive operations, or behavioural changes.

**Rulebook audit:** `SA-GOV-001` semantic gates fixed; `SA-GOV-002` authority hierarchy apt; `SA-GOV-003` operational Definition of Done apt through the canonical Merge readiness criteria; `SA-GOV-004` confirmed and fixed through the Engineering Quality Review Protocol.

**Current audit evidence focus:** production UI orchestration — begin with `components/admin/student-records-manager.tsx`, then inspect its route, service, test, modal, and data-loading boundaries before classifying a code finding.

**Goal (future execution):** Global maintainability and internal-quality audit **without** changing functional behaviour during the audit itself.

**Does not:** reopen or mix with the closed `node-24-runtime-migration-v1` P0; alter runtime/schema/data; mass-refactor; invent abstractions to cut lines; mix internal maintenance with new features.

**Scope (when executed):**

| Area | Look for |
| ---- | -------- |
| Duplication | Repeated blocks; repeated validation/normalization; repeated HTTP response construction; duplicated logic across routes/services/repositories/UI |
| Structure | Business logic in route handlers; mixed responsibilities; oversized modules/functions; helpers too specific or wrongly shared; dead/obsolete paths |
| Readability | Ambiguous names; too many parameters; deep conditionals; inconsistent similar contracts |
| Comments | Future comments in **English**; only for decisions, invariants, safety limits, non-obvious behaviour, trade-offs, cross-module contracts |
| Tests | Duplicate fixtures/mocks/builders/setup; coverage proportional to complexity; avoid redundant tests without confidence gain |

**Minimum deliverable (analysis-only report):** (1) inventory; (2) concrete evidence per file/module; (3) severity + value; (4) distinguish safe refactor / architecture / tech debt / possible functional change; (5) recommended small slices; (6) behavioural-equivalence criteria; (7) risks, rollback, and required tests.

**After the audit:** implement derived refactors later — one small scope per branch; behavioural equivalence + `pnpm check`.

---

## P2 / Topic backlog (not the global audit)

Longer-running topics; prefer audit-derived slices over inventing mass refactors here.

| Topic | Notes |
| ----- | ----- |
| `instructor-id-boundary-hygiene` | Clarify `User.id` vs `Instructor.id`; centralize resolution |
| `practical-lesson-counter-concurrency-hardening` | Unique/partial index + retry before large imports |
| `route handler consistency` | Normalize auth guards / response shapes gradually |
| DTO minimization | Role-based DTOs; never select `passwordHash` except auth |
| `supabase-rls-tenant-policies-v1` | `CREATE POLICY` only if Data API tenant access is product-required |
| Demo DB separation | Recommended for public portfolio |
| Platform subscription billing / PSP checkout | Platform domain (DEC-046) — explicit sensitive-batch approval per slice; not current baseline |
| Billing webhook hardening | When Platform billing exists — sanitize provider errors before production reliance |

**Done (do not reopen as pending):** audit log write + read + viewer + tenant CSV export; mobile/tablet readiness; competitive discovery; calendar v1a–v1d; People UX core; import/export UI; RLS Class-B revoke-only; operational `organizationId` NOT NULL; smoke fixture reconcile (DEC-064); student invite link repair.

---

## P3 / Deferred

| Slice | Notes |
| ----- | ----- |
| `calendar-lessons-polish-v1e-student-warnings` | Product policy first |
| `language-pack-pt-PT-v1` | After i18n framework |
| `people-management-ux-unification-instructor-route-split-v1` | D4; tabs-first stands |
| Soft-delete/archive for student fichas | After retention policy product need |
| `typescript-baseurl-deprecation-v1` | Non-blocking tooling hygiene |
| `cursor-rules-performance-split` | Only if Cursor context noise is confirmed |

---

## P3 / Demo and product polish

- Controlled migration demo sandbox — after DAT UI polish; no real email unless controlled
- Public demo improvements — seed examples; export read-only maybe; **no** import apply on public demo
- Platform/admin maturity — polish after separation plan

---

## P4 / Modernization

### dependency-modernization-audit

- Prisma 7, Next.js, TypeScript, Vitest, pnpm/Node, ESLint/tooling
- **One family at a time**; full `check` between upgrades
- Avoid large upgrades during critical feature work unless security requires it

---

## Explicitly do not open next

- Billing / checkout / PSP runtime (sensitive gate per slice)
- Prisma migrations / schema changes unless gated
- Platform cross-tenant audit viewer (tenant CSV export is **done**)
- `supabase-rls-tenant-policies-v1` unless Data API product-required
- Commercial catalogue read-services inside embedded Platform without separation plan
- Re-running DEC-064 repair/fixture apply without new evidence + human authorization
