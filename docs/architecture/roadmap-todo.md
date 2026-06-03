# DAT Roadmap and To-Do

Prioritized backlog for DAT. **P0** is safety; feature work starts at **P1** unless security blocks release.

---

## P0 / Safety

- Do not merge **unvalidated** batches.
- If **`pnpm -C driving_school_platform/nextjs_space check`** fails, do not push.
- If **migration** fails or status is unknown on target DB, do not push.
- If **schema/runtime mismatch** exists, stop.
- If a batch touches **auth / security / billing / demo** unexpectedly, stop and report.
- Keep **secrets** out of docs, commits, and logs.

---

## P1 / DAT_3.7 start

### student-record-delete-policy-and-action

- Done (v1): guarded hard delete + Admin UI “Remover ficha” + API `DELETE /api/admin/students/[id]` + tests.
- Follow-up (deferred): soft-delete/archive for fichas with operational history.

### people-management-ux-unification

- **Done (v1 slice):** `people-management-information-architecture-v1` — PT IA on `/admin/users` (Pessoas nav, Alunos primary, **Contas da app** section label, helper copy; same route/API/invitation behavior). **Not pending:** primary Alunos/Fichas hierarchy or Contas da app labeling from v1.
- **Done (v1 slice):** `people-management-ux-unification-invitations-v1` — invitations-on-record for student fichas (list `pendingInvitation`, row Send/Revoke, revoke→`MANUAL_ONLY` when safe).
- **Done (v1 slice):** `people-management-ux-unification-instructors-section-v1` — read-only **Instructors** section on `/admin/users` (license display, Edit app account reuse, Invitations helper); reuses SSR `User` + `instructor` include; no new routes/API/schema.
- **Done (v1 docs slice):** `product-roadmap-and-platform-boundary-sync-v1` — `docs/product/` hub, [decision-log.md](./decision-log.md), DAT vs Platform, packaging intent; People **tabs before route split** ([decision-log.md](./decision-log.md) DEC-003).
- **Next preferred (UX):** `people-management-internal-tabs-v1` — internal tabs on `/admin/users`: Students (+ Invitations), Instructors (+ Invitations), App accounts; same route; English UI baseline.
- **Remaining (deferred):** `people-management-ux-unification-instructor-route-split-v1` (**D4** — `/admin/instructors` or similar; **not** recommended next while tabs-first stands), invitations on instructor record, manual instructor without User (schema), instructor import/export.
- Avoid exposing Student vs User as competing tables in admin flows.
- Natural flows (product direction; English UI baseline for new copy unless batch approves exception):
  - New student ficha
  - New instructor
  - Create/send app access as optional step on the person record

### import-export-ui-actions

Parent batch — always slice before implementing.

- **Done (v1 slice):** `import-export-ui-students-export-v1`
  - Export CSV/JSON on Fichas registadas (`/admin/users` → Alunos).
  - Reuses `GET /api/admin/students/export` (no API contract change).
  - English UI labels for new export controls.
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-export-ui-students-import-dry-run-v1`
  - Import dry-run preview UI on Fichas registadas (`StudentRecordsImportDialog`).
  - Reuses `POST /api/admin/students/import/dry-run` (zero-write preview).
  - English UI labels for new import controls.
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-export-ui-students-import-apply-v1`
  - Import apply UI on same dialog after successful preview.
  - Reuses `POST /api/admin/students/import/apply` (`createOnly`; no API contract change).
  - Confirmation before write; list refresh on success.
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-export-ui-practical-lessons-export-v1`
  - Export CSV/JSON on `/admin/lessons` (Driving tab only).
  - Reuses `GET /api/admin/practical-lessons/export` (no API contract change).
  - English UI labels for new export controls.
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-export-ui-practical-lessons-import-dry-run-v1`
  - Import dry-run preview UI on `/admin/lessons` (`PracticalLessonsImportDialog`).
  - Reuses `POST /api/admin/practical-lessons/import/dry-run` (zero-write preview).
  - English UI labels for new import controls.
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-apply-demo-guard-v1`
  - Demo mutation guard on student import apply (`rejectDemoUserManagementMutation` / `user_management`) and practical-lessons import apply (`decideDemoRouteMutation` / `lesson_management`).
  - Dry-run routes unchanged (zero-write).
  - Validated via `pnpm check`.
- **Done (v1 slice):** `import-export-ui-practical-lessons-import-apply-v1`
  - Practical lessons import apply UI on `/admin/lessons` after successful preview.
  - Explicit confirmation; reuses `POST /api/admin/practical-lessons/import/apply` (`createOnly`).
  - Invalidates apply when file changes; demo 403 messaging; list refresh on success.
  - Validated via `pnpm check`.
- **Out of scope until separately sliced:** per-student history export/import UI, row-level validation UX polish.
- **Deferred slices (parent):**
  - Importar/Exportar on histórico de aulas práticas (per-student dialog).
  - Row-level validation errors in UI.
  - No raw API URLs for School Admin.

### product-ui-language-baseline-english-v1

- **Done (v1 slice):** English baseline copy on `/admin/users` tree — nav **People**, page IA, student records, app accounts, practical lessons dialog, `student-record-ui-utils` / `student-practical-history-ui-utils` user messages; import dialog alert without PT “fichas”. Route `/admin/users` unchanged; no API/behavior changes. Validated via `pnpm check`.
- **Deferred:** full i18n framework, repo-wide copy sweep (`translations.ts`, other admin pages), locale switching.

---

---

## P1 / Security and data policy

### supabase-rls-data-api-policy-matrix

- **Done (v1 slice):** docs-only classification matrix — [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md). All 31 Prisma tables classified; 7 with RLS in migrations; 0 intended anon/authenticated Data API access today; `rls_enabled_no_policy` documented as intentional for service-only tables. **No** SQL policies, grants, or migrations in this slice.
- **Done (v1 slice):** `supabase-rls-class-b-hardening-v1` — migration `20260603120000_supabase_rls_class_b_hardening_v1`: 8 tables only (`billing_events`, `entitlement_grants`, `organization_domains` REVOKE; `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags` ENABLE RLS + REVOKE); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no Prisma schema/runtime changes. Operator `migrate deploy` on Preview/Production is human-controlled. Validated via `pnpm check`.
- **Next gated slice (recommended):** `people-management-internal-tabs-v1` (UX) or `supabase-rls-class-b-hardening-v1b` (D4 — remaining internal tables — separate approval). **Not recommended next:** `people-management-ux-unification-instructor-route-split-v1`.
- **Deferred:** `supabase-rls-class-b-hardening-v1b` — NextAuth adapter, tenant business, global reference tables (not in v1); tenant-scoped RLS policies (`supabase-rls-tenant-policies-v1`) after org-id backfill/NOT NULL; dedicated `api` schema review.

### tenant-required-operational-organization-id-audit

**Source:** external database/architecture critique triage (`external-database-architecture-audit-triage`).

- **Done (v1 slice):** audit report + classification only — [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md). No Prisma/migration/RLS/runtime changes in this slice.
- **Done (v1 slice):** `tenant-operational-organization-id-null-counts-report-v1` — read-only report script `scripts/report-tenant-organization-null-scope.ts` (`pnpm tenant:org-null-report`); helpers `lib/tenant-organization-null-scope-report.ts`. No writes.
- **Done (v1 slice):** `tenant-operational-organization-id-backfill-dry-run-v1` — `scripts/dry-run-tenant-organization-backfill.ts` (`pnpm tenant:org-backfill:dry-run`); helpers `lib/tenant-organization-backfill-dry-run.ts`; legacy `backfill-organization-scope.ts` fail-safe by default. Preview: 0 operational NULLs.
- **Next gated slice (recommended):** `people-management-internal-tabs-v1` or other P1 per priority. Route split **deferred (D4)**.
- **Deferred:** `tenant-operational-organization-id-backfill-apply-v1` — only when a future dry-run reports proposed rows; `tenant-operational-organization-id-not-null-migrations` / `tenant-operational-organization-id-not-null-readiness-review-v1` after sustained zero NULL verification (explicit migration approval).

### billing webhook hardening

- No raw provider errors in HTTP `detail` for clients.
- Sanitize external/provider errors before production reliance.

### cursor-automations-super-agent-scheduled-support

**Priority:** **P1** if Automations are **available at no extra cost** in the current Cursor plan **and** useful for **August Production v1** daily operational guidance; otherwise **P2** or **deferred** (manual fallback still applies).

- **Budget guard:** only if available in the **current Cursor plan at no extra cost** — no paid plan upgrades, overages, usage-based automation, or paid add-ons unless the user explicitly approves budget.
- **Fallback:** if Automations are not available, run the same **daily project-health / next-batch recommendation** prompt **manually** in Cursor (Super-Agent; see **Manual fallback** in [cursor-operating-model.md](../ops/cursor-operating-model.md) — Cursor Automations Operating Model).
- Set up **daily read-only** automations (when budget gate passes) for: project health summary, next-batch recommendation ([Delegated Technical Lead Protocol](../ops/cursor-operating-model.md)), roadmap/`current-state` freshness, and security-sensitive drift review.
- Keep automations **managed by the Cursor Super-Agent**; **weekly** review of automation prompts/rules themselves.
- **Avoid:** automatic merges, migrations, production deploys, and autonomous auth/billing/RLS/demo/import/apply/data-deletion changes.
- **Later:** evaluate **PR-only** automations only after read-only mode proves reliable (still no auto-merge).
- Operating model: [cursor-operating-model.md](../ops/cursor-operating-model.md) — **Cursor Automations Operating Model** (including **Plan and Budget Gate**).

---

## P1 / Product and packaging

**Source:** [docs/product/](../product/), [decision-log.md](./decision-log.md). **Docs sync v1 done:** `product-roadmap-and-platform-boundary-sync-v1`. Runtime/UI enforcement deferred per slice.

| Slice | Priority | Notes |
| ----- | -------- | ----- |
| `people-management-internal-tabs-v1` | P1 | Preferred next People UX; tabs on `/admin/users` |
| `admin-settings-client-visibility-review-v1` | P1 | Review hiding/demoting Settings for school admins |
| `platform-settings-and-feature-flags-boundary-v1` | P2 | Future Platform ownership of flags/system settings |
| `import-export-business-packaging-v1` | P2 | Tier vs self-service UI enforcement |
| `provider-assisted-import-runbook-v1` | P2 | Full operator runbook (outline in [packaging-and-entitlements.md](../product/packaging-and-entitlements.md)) |
| `payment-integration-product-planning-v1` | P2 | School-facing payments product spec |
| `payments-and-balances-foundation-v1` | P2 | Technical foundation for balances/packages |
| `competitive-product-discovery-v1` | P2 | Market comparison; prioritize feature themes only |
| `i18n-framework-planning-v1` | P2 | Real i18n; switcher, fallback, plan tie-in |
| `language-pack-pt-PT-v1` | P3 | pt-PT copy after framework |
| `super-agent-product-strategy-protocol-v1` | — | **Done** in `cursor-operating-model.md` (this sync batch) |

**Deferred explicitly:** `people-management-ux-unification-instructor-route-split-v1` (D4; not recommended next).

---

## P2 / Engineering excellence

### audit-log-tenant-context-foundation

**Source:** external database/architecture critique triage; **planning only** — no schema changes in this item. Also **Security and data policy** (tenant-scoped audit queries).

- Plan adding `organizationId` to `AuditLog` for tenant-scoped audit queries (model currently has `userId` / `userEmail` / `userRole` only; no tenant column).
- Allow nullable `organizationId` for platform/global events (consistent with `ConfigurationHistory`, `BillingEvent`).
- Index `organizationId` and `(organizationId, createdAt)` in a future migration batch.
- `AuditLog` is a sensitive/internal table per `database.mdc` — RLS/grants and migration require explicit approval.
- **Smallest safe v1 slice:** design doc + write-path contract (how org is resolved on audit insert); no migration in planning batch.

### lesson-student-nullability-policy-review

**Source:** external database/architecture critique triage; **policy review only** — no schema changes in this item.

- Clarify `Lesson.studentId` nullability policy in architecture docs and validation contracts.
- Allow NULL only for group **THEORY** lessons if that remains the business rule (already reflected in `lessonCreationSchema` superRefine).
- Require `Student.id` for **DRIVING**, **EXAM**, and **THEORY_EXAM** at application level (enforce consistently across create/update/import paths).
- Consider DB-level check constraint later if worthwhile after audit of existing rows.
- **Smallest safe v1 slice:** document policy + grep validation/API gaps; defer migration/check constraint.

### instructor-id-boundary-hygiene

- Clarify `User.id` vs `Instructor.id`.
- `Lesson.instructorId` = `Instructor.id`.
- Rename ambiguous types gradually; centralize User → Instructor resolution.
- Keep tests where `User.id` ≠ `Instructor.id`.

### practical-lesson-counter-concurrency-hardening

- Evaluate unique/partial index for org/student/DRIVING/`practicalLessonNumber`.
- Retry/conflict handling before large imports or multi-admin use.

### route handler consistency

- Normalize auth guards, response shapes, error codes gradually.
- **Do not** combine with feature work.

### DTO minimization

- Role-based DTOs; minimal instructor read-only views.
- Never select `passwordHash` except internal auth verification.

### calendar/admin lessons polish

- Query window limits/pagination; refetch after creation.
- No cleanup on GET; compact schedule cards.

### Prisma/Prettier polish

- `prisma format` / formatting review in dedicated batch only.

---

## P3 / DX

### cursor-rules-performance-split

**Source:** external architecture critique triage; **defer implementation** until Cursor performance/context noise is a confirmed problem.

- Do **not** narrow `architect-mode.mdc` `globs: ["**/*"]` prematurely while `alwaysApply: true` is required for global safety protocols.
- If Cursor performance or context noise becomes a real issue, split a lean `alwaysApply` core from scoped detailed rules (e.g. keep protocols in core; move domain/deep runbooks to scoped rules like `database.mdc`).
- Preserve global behavior protocols (Sensitive Batch Gate, memory paths, validation requirements).
- **Smallest safe v1 slice:** measure/confirm problem first; no rule file changes until justified.

---

## P3 / Demo and product polish

### controlled migration demo sandbox

- Not public demo initially; resettable data; limited imports; sample files.
- No real email unless controlled.
- After DAT_3.7 UI polish.

### public demo improvements

- Seed manual students, counters, manual history examples.
- Export read-only maybe; **no** import apply on public demo.

### platform/admin maturity

- Platform admin UI polish; Basic/Premium/Enterprise demo orgs; i18n later.

---

## P4 / Modernization

### dependency-modernization-audit

- Prisma 7, Next.js, TypeScript, Vitest, pnpm/Node, ESLint/tooling.
- **One family at a time**; full `check` between upgrades.
- Avoid large upgrades during critical feature work unless security requires it.
