# DAT Roadmap and To-Do

Prioritized backlog for DAT. **P0** is safety; feature work starts at **P1** unless security blocks release.

**Closed-slice history:** see [current-state.md](./current-state.md) (reference archive). This file lists **open** work and **one** recommended next slice.

---

## Single recommended next

| Slice | Priority | Status |
| ----- | -------- | ------ |
| `dat-production-smoke-hosted-verification-v1` | **P0** ops | **Closed 2026-07-31** — Production `Ready`; served commit `14bdc40`; fixture preflight 1/0/0; API exit 0; read-only 4/0/0; mutations 1/0/0 |

Runbook: [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md). Fixtures (DEC-064) and invite-link repair are **closed** — do not re-apply without new evidence + human authorization.

---

## Canonical sequence (after P0)

<!-- node-24-runtime-migration-v1 -->
1. `node-24-runtime-migration-v1` — **P0 release-enablement / next**; migrate all Node 20 pins to Node 24, validate local + CI + Vercel, deploy, and repeat the required hosted smoke gates
2. `engineering-excellence-audit-v1` — **P1 / engineering excellence — planned (analysis-only)**; **not executed**
3. `platform-separation-architecture-plan-v1`
4. Small audit-approved refactor slices (one scope per branch; behavioural equivalence + `pnpm check`)

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
| `engineering-excellence-audit-v1` | **P1** planned (analysis-only) | Global maintainability audit — **not executed**; does not delay P0 smoke |
| `platform-separation-architecture-plan-v1` | **P1** backlog | After hosted smoke + engineering audit — autonomous MeEngine Platform vs DAT |
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

**Status:** **P1** — **planned**; analysis-only; **not executed**. No findings claimed; no refactor slices pre-created. No runtime / schema / data changes during the audit.

**Goal (future execution):** Global maintainability and internal-quality audit **without** changing functional behaviour during the audit itself.

**Does not:** replace, delay, or mix with `dat-production-smoke-hosted-verification-v1` (P0); alter runtime/schema/data; mass-refactor; invent abstractions to cut lines; mix internal maintenance with new features.

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
