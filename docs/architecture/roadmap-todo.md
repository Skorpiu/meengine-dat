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

- **Done (v1 slice):** `people-management-information-architecture-v1` — PT IA on `/admin/users` (Pessoas nav, Alunos primary, Contas da app, helper copy; same route/API/invitation behavior).
- **Remaining:**
- Make **Alunos** and **Instrutores** the main management entities (instructor fichas / route split not in v1).
- Rebrand/reduce **All Users** → **Contas da App** / **Acessos**.
- Move invitations/app access into student/instructor record.
- Avoid exposing Student vs User as competing tables.
- Natural flows:
  - Nova ficha de aluno
  - Novo instrutor
  - Criar/enviar acesso à app as optional step

### import-export-ui-actions

- Importar/Exportar on Alunos / Fichas Registadas.
- Importar/Exportar on Aulas Práticas / history.
- CSV and JSON exports.
- Dry-run preview UI before apply.
- Row-level validation errors in UI.
- No raw API URLs for School Admin.

---

## P1 / Security and data policy

### supabase-rls-data-api-policy-matrix

- Classify tables: service-only/internal, auth/security, business/client-facing, reference, audit/billing/system.
- `rls_enabled_no_policy` INFO warnings are **not** automatically P0 — RLS with no policies is deny-by-default.
- Still document **explicit policy per table** and deliberate future grants.

### billing webhook hardening

- No raw provider errors in HTTP `detail` for clients.
- Sanitize external/provider errors before production reliance.

---

## P2 / Engineering excellence

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
