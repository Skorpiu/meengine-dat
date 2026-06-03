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
- **Remaining (deferred):**
- Make **Instrutores** a first-class management entity (instructor fichas; **route split** not in v1).
- Move **invitations / app access** into student or instructor person record (invitations-on-record).
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
- **Next slice (recommended):** `import-apply-demo-guard-v1`
  - Reuse existing demo mutation guard pattern on `POST /api/admin/students/import/apply` and `POST /api/admin/practical-lessons/import/apply` before exposing more apply UI.
  - **Out of scope:** UI, Prisma, RLS, demo policy changes beyond apply-route guards.
- **Then (UI slice):** `import-export-ui-practical-lessons-import-apply-v1`
  - Practical lessons import apply UI after successful preview (gated; after demo guard).
  - **Out of scope until separately sliced:** per-student history export/import UI, row-level validation UX polish.
- **Deferred slices (parent):**
  - Importar/Exportar on histórico de aulas práticas (per-student dialog).
  - Row-level validation errors in UI.
  - No raw API URLs for School Admin.

### product-ui-language-baseline-english-v1

- Audit and reconcile **hardcoded Portuguese** admin UI labels introduced by approved `people-management-information-architecture-v1` (temporary exception).
- Preserve **English product UI baseline** for new work; prepare strings for future i18n rather than adding scattered PT literals.
- **Smallest safe v1 slice:** inventory PT/EN strings on `/admin/users` (and related admin people surfaces touched by IA v1) + documented migration plan to English or locale resources.
- **Out of scope for v1 unless separately approved:** full i18n framework, repo-wide copy sweep, or changing runtime behavior/API contracts.

---

---

## P1 / Security and data policy

### supabase-rls-data-api-policy-matrix

- **Done (v1 slice):** docs-only classification matrix — [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md). All 31 Prisma tables classified; 7 with RLS in migrations; 0 intended anon/authenticated Data API access today; `rls_enabled_no_policy` documented as intentional for service-only tables. **No** SQL policies, grants, or migrations in this slice.
- **Next gated slice (recommended):** `supabase-rls-class-b-hardening-v1` — enable RLS + `REVOKE ALL FROM anon, authenticated` on remaining internal tables flagged by Security Advisor (D4 / RLS gate).
- **Deferred:** tenant-scoped RLS policies (`supabase-rls-tenant-policies-v1`) after org-id backfill/NOT NULL; dedicated `api` schema review.

### tenant-required-operational-organization-id-audit

**Source:** external database/architecture critique triage (`external-database-architecture-audit-triage`).

- **Done (v1 slice):** audit report + classification only — [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md). No Prisma/migration/RLS/runtime changes in this slice.
- **Next gated slice (recommended):** `tenant-operational-organization-id-backfill-v1` — extend `scripts/backfill-organization-scope.ts` for `Student`/`Instructor`; operator NULL-count SQL; **no NOT NULL migration** in v1.
- **Deferred:** NOT NULL migrations per table (`tenant-operational-organization-id-not-null-migrations`) after zero NULL rows verified in target DB; explicit migration approval required.

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
