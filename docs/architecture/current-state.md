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

**IA v1 (done):** `people-management-information-architecture-v1` — Admin nav **Pessoas** (`/admin/users` unchanged); page prioritizes **Alunos / Fichas registadas**; flat login list labeled **Contas da app**; helper copy for ficha vs conta; invitations unchanged (de-emphasized wrapper only). Route split, invitation-on-record, and student import UI remain deferred. Student records **export** UI (CSV/JSON) is implemented (`import-export-ui-students-export-v1`).

**Agreed direction (DAT_3.7):**

- **Alunos** and **Instrutores** should be the primary management entities.
- **All Users** → downgrade/rename to **Contas da App** / **Acessos**.
- **Invitation / app access** should live **inside** the student or instructor person record.
- **Import/export** should be UI buttons, not raw API URLs. **Student export** (CSV/JSON) is available on Fichas registadas; import and practical-lessons import/export UI remain deferred.

**Delete/removal (implemented):** School Admin (`SUPER_ADMIN`) may hard-delete a `MANUAL_ONLY` student ficha with no linked User, invitations, lessons of any `LessonSource`, lesson counters, lesson requests, exam registrations, or payments. Blocked deletes return stable **409** codes. Demo org uses the existing user-management mutation guard. Soft-delete/archive remains deferred.

**Product UI language:** baseline is **English** for new product surfaces. Portuguese labels on `/admin/users` from `people-management-information-architecture-v1` are a **temporary approved exception**; reconcile via `product-ui-language-baseline-english-v1` or future i18n (see [roadmap-todo.md](./roadmap-todo.md)).

---

## DAT operational memory (Cursor)

Documented and in use (docs/rules only; no runtime change):

- **Cursor Super-Agent protocols** — [cursor-operating-model.md](../ops/cursor-operating-model.md) (Delegated Technical Lead, Sensitive Batch Gate, Smallest Safe Slice, Memory Update, Final Evidence Pack, etc.)
- **Reviewer workflow** — [reviewer-workflow.md](../ops/reviewer-workflow.md)
- **Cursor Automations operating model** — same operating model doc (**Plan and Budget Gate**; read-only default)
- **Cursor Automations prompt templates (v1)** — [cursor-automations-prompts.md](../ops/cursor-automations-prompts.md)
- **External database architecture audit triage** — critique classified into roadmap items (`tenant-required-operational-organization-id-audit`, `audit-log-tenant-context-foundation`, `lesson-student-nullability-policy-review`); triage itself is **docs-only**, no schema changes from triage alone

**Daily guidance (no extra Cursor cost):** **Daily Manual Super-Agent Check** is the default workflow ([cursor-automations-prompts.md](../ops/cursor-automations-prompts.md)). Use **Cursor Automations** only if available in the **current plan at no extra cost** (`cursor-automations-super-agent-scheduled-support` in roadmap).

---

## Current recommended next phase

**DAT_3.7** — UX and operational polish (see [roadmap-todo.md](./roadmap-todo.md)).

### Done (v1)

- `student-record-delete-policy-and-action`
- `people-management-information-architecture-v1` (slice of `people-management-ux-unification`)
- Cursor Super-Agent protocols (operating model + reviewer workflow)
- Cursor Automations operating model
- Cursor Automations prompt templates (v1)
- External database architecture audit triage (backlog items created; no implementation from triage alone)
- `import-export-ui-students-export-v1` — Student records export UI (CSV/JSON) on Fichas registadas (`StudentRecordsManager`); reuses `GET /api/admin/students/export`; English labels for new export controls; `search` query aligned with applied list search; validated via `pnpm check`.

### Likely next (smallest safe slices)

1. `tenant-required-operational-organization-id-audit` — docs-only; no schema in audit slice
2. `people-management-ux-unification` — **remaining:** invitations-on-record, instructor/route split, instructor parity (IA v1 nav/labels already shipped)
3. `import-export-ui-actions` — remaining slices (students import dry-run UI, apply UI, practical lessons import/export UI)
4. `supabase-rls-data-api-policy-matrix` — classification/docs first
5. `audit-log-tenant-context-foundation` — planning only
6. `product-ui-language-baseline-english-v1` or explicit i18n path — reconcile PT IA exception with English baseline

Engineering excellence audit items (non-blocking refactors) remain tracked separately in roadmap P2+.
