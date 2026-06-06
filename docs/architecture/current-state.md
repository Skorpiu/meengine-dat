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
| Practical lessons import dry-run (API + UI) | Done |
| Practical lessons import apply (API) | Done |
| Practical lessons import apply (UI) | Done |
| Import apply demo guard (student + practical lessons apply routes) | Done (`import-apply-demo-guard-v1`) |
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

**IA v1 (done):** `people-management-information-architecture-v1` — Admin **People** hub at `/admin/users` (route unchanged); page prioritizes **Students / Registered student records**; **Instructors** section (read-only operational view); flat login list labeled **App accounts**; helper copy for student record vs app account vs instructor. **Invitations-on-record v1 (done):** `people-management-ux-unification-invitations-v1` — Send/Revoke on student row, `pendingInvitation` in list API, English access copy on invitation slice; global Invitations section retained for instructors. **Instructors section v1 (done):** `people-management-ux-unification-instructors-section-v1` — first-class Instructors block on same page; no route split.

**People UX (tabs + profiles polish done):** **`people-management-internal-tabs-v1`** — L1 tabs; **`people-management-onboarding-reframe-v1`** — Onboarding flows; **`people-management-profiles-status-and-pagination-v1`** — Students → **Profiles**, profile origin + app-access badges, label guide, list limit 15 + Load more, instructor client search + Load more, Pending invitations copy (list retained). **`people-management-record-status-badges-v1`** absorbed by profiles batch. App accounts tab retained. **`people-management-ux-unification-instructor-route-split-v1`** **deferred (D4)**. Next polish: row app access, app-accounts demote, unlinked invitations section, instructor invite on profile (see roadmap).

Student records **export/import** UI on registered student records is implemented (`import-export-ui-students-export-v1`, `import-export-ui-students-import-dry-run-v1`, `import-export-ui-students-import-apply-v1`).

**Agreed direction (DAT_3.7):**

- **Alunos** and **Instrutores** should be the primary management entities.
- **All Users** → downgrade/rename to **Contas da App** / **Acessos**.
- **Invitation / app access** should live **inside** the student or instructor person record.
- **Import/export** should be UI buttons, not raw API URLs. **Student** export/import on Fichas registadas; **practical lessons export + import (preview + apply)** on `/admin/lessons` (Driving tab).

**Delete/removal (implemented):** School Admin (`SUPER_ADMIN`) may hard-delete a `MANUAL_ONLY` student ficha with no linked User, invitations, lessons of any `LessonSource`, lesson counters, lesson requests, exam registrations, or payments. Blocked deletes return stable **409** codes. Demo org uses the existing user-management mutation guard. Soft-delete/archive remains deferred.

**Product UI language:** baseline is **English** for new product surfaces. `/admin/users` People Management copy reconciled in `product-ui-language-baseline-english-v1` (English labels; route `/admin/users` unchanged). Future locale work via proper i18n, not scattered literals (see [roadmap-todo.md](./roadmap-todo.md)).

---

## DAT operational memory (Cursor)

Documented and in use (docs/rules only; no runtime change):

- **Cursor Super-Agent protocols** — [cursor-operating-model.md](../ops/cursor-operating-model.md) (Delegated Technical Lead, Sensitive Batch Gate, Smallest Safe Slice, Memory Update, Final Evidence Pack, etc.)
- **Reviewer workflow** — [reviewer-workflow.md](../ops/reviewer-workflow.md)
- **Cursor Automations operating model** — same operating model doc (**Plan and Budget Gate**; read-only default)
- **Cursor Automations prompt templates (v1)** — [cursor-automations-prompts.md](../ops/cursor-automations-prompts.md)
- **External database architecture audit triage** — critique classified into roadmap items (`tenant-required-operational-organization-id-audit`, `audit-log-tenant-context-foundation`, `lesson-student-nullability-policy-review`); triage itself is **docs-only**, no schema changes from triage alone
- **Git Bash command discipline** — [command-batteries.md](../ops/command-batteries.md), [cursor-operating-model.md](../ops/cursor-operating-model.md): Git Bash/bash batteries by default (`Assumed shell: Git Bash`); no PowerShell mixing; single-line Conventional Commit messages; guarded `DAT-*.zip` generation (`cursor-git-bash-command-discipline`)

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
- `tenant-required-operational-organization-id-audit` — Docs-only classification of nullable `organizationId` on operational models; unique-constraint notes; backfill/migration phased plan. Report: [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md).
- `supabase-rls-data-api-policy-matrix` — Docs-only RLS/Data API classification matrix for all Prisma tables; `rls_enabled_no_policy` intentional for service-only; RLS policy SQL deferred. Report: [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md).
- `cursor-git-bash-command-discipline` — Ops command batteries and Cursor rules require Git Bash/bash syntax by default (`Assumed shell: Git Bash`); no PowerShell mixing; single-line Conventional Commit commands; guarded `DAT-*.zip` generation. See [command-batteries.md](../ops/command-batteries.md), [cursor-operating-model.md](../ops/cursor-operating-model.md).
- `import-export-ui-students-import-dry-run-v1` — Student import dry-run preview UI on Fichas registadas (`StudentRecordsImportDialog`); reuses `POST /api/admin/students/import/dry-run`; English labels for new import controls; zero-write preview. Validated via `pnpm check`.
- `import-export-ui-students-import-apply-v1` — Student import apply UI on same dialog; reuses `POST /api/admin/students/import/apply` (`createOnly`); confirmation before write; refreshes list on success; English labels. Validated via `pnpm check`.
- `import-export-ui-practical-lessons-export-v1` — Practical lessons export UI (CSV/JSON) on `/admin/lessons` Driving tab; reuses `GET /api/admin/practical-lessons/export`; English labels; org-wide export (not dashboard window only). Validated via `pnpm check`.
- `import-export-ui-practical-lessons-import-dry-run-v1` — Practical lessons import dry-run preview UI on same page (`PracticalLessonsImportDialog`); reuses `POST /api/admin/practical-lessons/import/dry-run`; English labels; zero-write preview only. Validated via `pnpm check`.
- `super-agent-operational-housekeeping-sync-v1` — Ops/rules sync: Human-Controlled Merge Protocol, complete close/merge battery, Prepare next recommended branch, Daily Branch Housekeeping (list-only), Memory Consistency Gate (eight rows). See `docs/ops/cursor-operating-model.md`, `docs/ops/command-batteries.md`, `docs/ops/reviewer-workflow.md`.
- `import-apply-demo-guard-v1` — Demo mutation guard on `POST /api/admin/students/import/apply` (`rejectDemoUserManagementMutation` / `user_management`) and `POST /api/admin/practical-lessons/import/apply` (`decideDemoRouteMutation` / `lesson_management`); blocks writes in demo orgs before body parse/apply; dry-run routes unchanged. Validated via `pnpm check`.
- `import-export-ui-practical-lessons-import-apply-v1` — Practical lessons import apply UI on `/admin/lessons` (`PracticalLessonsImportDialog`); preview then explicit confirmation; reuses `POST /api/admin/practical-lessons/import/apply` (`createOnly`); invalidates apply after file change; demo 403 messaging; refreshes lessons list on success. Validated via `pnpm check`.
- `tenant-operational-organization-id-null-counts-report-v1` — Read-only operator report for nullable operational `organizationId` NULL counts and conflict detection; `pnpm tenant:org-null-report`; helpers in `lib/tenant-organization-null-scope-report.ts`. No DB writes. Validated via `pnpm check`.
- `tenant-operational-organization-id-backfill-dry-run-v1` — Dry-run-only per-row backfill planner for operational allowlist; `pnpm tenant:org-backfill:dry-run`; rejects `--apply`; legacy `backfill-organization-scope.ts` disabled unless `ALLOW_UNSAFE_BROAD_ORG_BACKFILL=1`. Preview report: 0 operational NULLs, 0 conflicts. Validated via `pnpm check`.
- `people-management-ux-unification-invitations-v1` — Student-record-centered invitation UX: `pendingInvitation` on list API, Send/Revoke on row, English access copy; `InvitationDto.studentId`; revoke resets linked `Student.appAccessMode` to `MANUAL_ONLY` when safe. Invitations screen retained. Validated via `pnpm check`.
- `product-ui-language-baseline-english-v1` — English baseline copy on `/admin/users` tree (People nav label, student records, app accounts, practical lessons dialog, UI error helpers); no route/API/behavior changes. Validated via `pnpm check`.
- `people-management-ux-unification-instructors-section-v1` — Read-only Instructors section on `/admin/users` (license, app account status, Edit app account); SSR data reuse; invitations-on-instructor deferred. Validated via `pnpm check`.
- `supabase-rls-class-b-hardening-v1` — Prisma migration `20260603120000_supabase_rls_class_b_hardening_v1`: RLS + explicit `REVOKE ALL FROM anon, authenticated` on 8 class-B internal tables (`billing_events`, `entitlement_grants`, `organization_domains`, `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags`); no policies, no schema/runtime changes. **Preview:** migration applied; SQL gate 8/8 RLS; zero grants to `anon`/`authenticated` on those tables; smoke passed. Production deploy human-controlled. Validated via `pnpm check`.
- `product-roadmap-and-platform-boundary-sync-v1` — Docs-only product hub (`docs/product/`), [decision-log.md](./decision-log.md), DAT vs Platform boundary, packaging intent, People tabs-before-split, Super-Agent Product Strategy Protocol. No runtime changes. Validated via `pnpm check`.
- `people-management-internal-tabs-v1` — Internal tabs on `/admin/users` (Students/Records+Invitations, Instructors/Profiles+Invitations, App accounts); `InvitationsManagementClient` `roleFilter` client-side; row-level student Send/Revoke preserved; `page.tsx`/SSR unchanged. Validated via `pnpm check`.
- `people-management-onboarding-reframe-v1` — L2 **Onboarding** subtabs; `StudentManualRecordCreateForm` + `InstructorAccountCreateForm`; Records/Profiles list-only focus; App accounts secondary copy; no API/schema changes. Validated via `pnpm check`.
- `people-management-profiles-status-and-pagination-v1` — Students → **Profiles** tab; profile origin + app-access badges + collapsible label guide; student list `limit=15` + server Load more; instructor client search + 15/page Load more; **Pending invitations** Onboarding copy (list not removed); absorbs `people-management-record-status-badges-v1` and `instructor-people-search-v1` UI scope. No API/schema/SSR tenant changes. Validated via `pnpm check`.
- `people-management-row-app-access-v1` — Students → Profiles **Edit Student** + **Delete**; compact APP_USER row badges (status, transmission, categories) with post-save overlay; canonical email once in row; improved blocked Delete modal; unified editor (Student profile + App access); dual-save `PATCH` + `PUT`; App accounts tab retained; remove/reactivate app access + Change email deferred (DEC-014/015); instructor unified editor deferred (`people-management-edit-instructor-unified-v1`). No API/schema/SSR changes. Validated via `pnpm check`.

### Likely next (smallest safe slices)

1. `people-management-app-accounts-demote-v1` — demote/simplify App accounts tab after row-level edit parity (remove/unlink still deferred)
2. `people-management-onboarding-unlinked-invitations-v1` — dedicated unlinked pending invitations section (list removal still deferred)
3. `admin-settings-client-visibility-review-v1` — review hiding/demoting Settings for school admins (product/packaging P1)
2. `tenant-operational-organization-id-not-null-readiness-review-v1` — operator/docs review for NOT NULL migrations when NULL counts stay at zero (no apply batch needed yet)
3. `supabase-rls-class-b-hardening-v1b` — **deferred (D4):** optional RLS + REVOKE on remaining internal tables — separate approval
4. `people-management-ux-unification-instructor-route-split-v1` — **deferred (D4):** separate `/admin/instructors` route — **not** recommended next; only if product reverses tabs-first decision
5. `tenant-operational-organization-id-backfill-apply-v1` — **deferred** until a future environment dry-run shows proposed changes
6. `audit-log-tenant-context-foundation` — planning only
7. Product/packaging planning slices — see [roadmap-todo.md](./roadmap-todo.md) **P1 / Product and packaging** and [docs/product/](../product/)

Engineering excellence audit items (non-blocking refactors) remain tracked separately in roadmap P2+.
