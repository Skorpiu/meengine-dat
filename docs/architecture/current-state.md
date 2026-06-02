# DAT Current State

## Purpose

This file summarizes **where DAT is today** for agents, reviewers, and operators **before** starting new work. Pair with [system-design.md](./system-design.md) (rules) and [roadmap-todo.md](./roadmap-todo.md) (what’s next).

---

## DAT_3.4 / DAT_3.5 closed state

The following are **implemented and validated** at a baseline suitable for controlled demo and production auth/email:

- Controlled **Full Showcase** demo operational
- Demo **reset** (manual scripts + daily cron sandbox reset)
- **Invite-only copy-link** flow for `STUDENT` and `INSTRUCTOR`
- **Public signup disabled** by default
- **Invitation existing-user guard** (no duplicate account edge cases)
- Email provider **evaluation** completed; **Postmark** selected and implemented
- **Preview Postmark** validated
- **Production Postmark** validated
- **Password reset** implemented
- **Email verification** implemented
- **Auth rate-limit** foundation implemented
- Sensitive auth tables **hardened with RLS**
- Production readiness **docs and checklists** created

Detail: `driving_school_platform/nextjs_space/docs/ops/release-checklist.md` and linked ops/engineering docs.

---

## DAT_3.6 closed state

**DAT_3.6** implemented and **Preview QA validated**:

| Area | Status |
| ---- | ------ |
| Student operational foundation | Done |
| `Student.userId` optional | Done |
| Manual student record API | Done |
| Manual student record UI (`/admin/users`) | Done |
| Lessons use `Student.id` | Done |
| Instructor read-only student option DTO minimized | Done |
| `practicalLessonNumber` foundation | Done |
| Manual practical lesson history | Done |
| Student invitation linking | Done |
| Import/export strategy docs/contracts | Done |
| Students export (CSV/JSON) | Done |
| Students import dry-run / apply | Done |
| Practical lessons export (CSV/JSON) | Done |
| Practical lessons import dry-run / apply | Done |
| Preview QA validation | Completed |

---

## DAT_3.6 QA validation evidence

Functional results recorded during Preview QA (representative checklist):

- Manual student creation — **passed**
- Manual practical lesson history — **passed**
- Counter behavior — **passed** (manual `#1` → next normal driving lesson `#2`)
- Students export — **passed**
- Students import dry-run / apply — **passed**
- Practical lessons export — **passed**
- Practical lessons import dry-run / apply — **passed**
- Invitation linked to existing Student — **passed**
- No duplicate Student after invitation accept — **passed**

---

## Recent migrations

Committed migration folders (DAT_3.6 student/lesson operational work):

| Migration | Topic |
| --------- | ----- |
| `20260529130000_student_operational_foundation` | Student operational model |
| `20260529140000_practical_lesson_number` | Practical lesson numbering |
| `20260529150000_lesson_source` | `LessonSource` enum |
| `20260529160000_user_invitation_student_id` | Invitation → Student link |

**Important:** Do **not** assume these are applied in every environment. Always run `prisma migrate status` against the **target** database before deploy or QA in a new environment.

```bash
cd driving_school_platform/nextjs_space
pnpm exec prisma migrate status
```

---

## Known UX / product observations

**`/admin/users` today** exposes a technical split that confuses school admins:

- All Users
- Fichas Registadas
- Invitations

**Product feedback:** “Alunos → Fichas Registadas” is more natural than “All Users” as the primary mental model.

**IA v1 (done):** `people-management-information-architecture-v1` — Admin nav **Pessoas** (`/admin/users` unchanged); page prioritizes **Alunos / Fichas registadas**; flat login list labeled **Contas da app**; helper copy for ficha vs conta; invitations unchanged (de-emphasized wrapper only). Route split, invitation-on-record, and import/export UI remain deferred.

**Agreed direction (DAT_3.7):**

- **Alunos** and **Instrutores** should be the primary management entities.
- **All Users** → downgrade/rename to **Contas da App** / **Acessos**.
- **Invitation / app access** should live **inside** the student or instructor person record.
- **Import/export** should be UI buttons (Importar/Exportar), not raw API URLs.

**Delete/removal (implemented):** School Admin (`SUPER_ADMIN`) may hard-delete a `MANUAL_ONLY` student ficha with no linked User, invitations, lessons of any `LessonSource`, lesson counters, lesson requests, exam registrations, or payments. Blocked deletes return stable **409** codes. Demo org uses the existing user-management mutation guard. Soft-delete/archive remains deferred.

---

## Current recommended next phase

**DAT_3.7** — UX and operational polish (see [roadmap-todo.md](./roadmap-todo.md)):

1. `student-record-delete-policy-and-action` (v1 done)
2. `people-management-ux-unification` (IA v1 done; invitations-on-record + route split remain)
3. `import-export-ui-actions`
4. Instructor / person management polish
5. `supabase-rls-data-api-policy-matrix`
6. Engineering excellence audit items (non-blocking refactors, tracked separately)
