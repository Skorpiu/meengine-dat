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

**People UX (tabs + profiles polish done):** **`people-management-internal-tabs-v1`** — L1 tabs; **`people-management-onboarding-reframe-v1`** — Onboarding flows; **`people-management-profiles-status-and-pagination-v1`** — Students → **Profiles**, profile origin + app-access badges, label guide, list limit 15 + Load more, instructor client search + Load more, Pending invitations copy (list retained). **`people-management-record-status-badges-v1`** absorbed by profiles batch. **`people-management-app-accounts-demote-v1`** — App Accounts removed from L1 tabs (historical; Advanced accounts UI removed in **`people-management-advanced-accounts-removal-and-profile-avatars-v1`**). Primary People UX is Students/Instructors only. **`people-management-advanced-accounts-removal-and-profile-avatars-v1`** — Advanced accounts section removed; profile initials avatars (`PeopleProfileAvatar`). **`people-management-student-profile-operational-fields-v1`** — license category + transmission on Student profile (not App access); MANUAL_ONLY App access section in Edit Student. **`people-management-onboarding-unlinked-invitations-v1`** — Students → Onboarding unlinked pending invites only. **`people-management-ux-unification-instructor-route-split-v1`** **deferred (D4)**. Next polish: instructor invite on profile (see roadmap).

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
- `people-management-app-access-remove-v1` — **Remove app access** for APP_USER students: `POST /api/admin/students/[id]/app-access/remove`; transactional service `lib/students/student-app-access-lifecycle-service.ts`; Edit Student → App access UI + confirmation modal; preserves Student/User rows and history; disables login via `isApproved=false` + session invalidation; Student → `MANUAL_ONLY` + `userId=null`; reactivate/change email/app-accounts demote still deferred. Policy: [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md). Validated via `pnpm check`.
- `people-management-app-access-reactivate-v1` — **Reactivate app access** for eligible MANUAL_ONLY students: `POST /api/admin/students/[id]/app-access/reactivate`; orphan User relink by canonical email (Path A); Path B → stable 409 + Send invitation; preserves Student id/history; no duplicate Student; change email/app-accounts demote still deferred. Policy: [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md). Validated via `pnpm check`.
- `people-management-edit-instructor-unified-v1` — Instructors → Profiles **Edit Instructor** + **Delete** (always blocked v1); unified editor (Instructor profile + App access); login email read-only; `PUT /api/users/update` only; App accounts tab retained; instructor delete policy + app access lifecycle deferred (DEC-018). No API/schema/SSR changes. Validated via `pnpm check`.
- `instructor-delete-policy-v1-docs` — Docs-only formal policy for Instructor **Delete** (zero-deps hard delete), **Deactivate** (normal leave-school path), and deferred **Remove app access**; eligibility matrix; future API contracts; legacy `DELETE /api/users/delete` guard requirement. Policy: [instructor-delete-policy.md](./instructor-delete-policy.md). DEC-019. Validated via `pnpm check`.
- `instructor-hard-delete-zero-deps-v1` — Zero-dependency instructor hard delete (see policy doc). Validated via `pnpm check`.
- `instructor-deactivate-v1` — Instructor deactivate + reactivate lifecycle in Edit Instructor → App access; APIs; People badges aligned with Vehicles (Active/Inactive) and Students (app-access pending / Edit App access blue section); Schedule Map + admin lesson inactive-instructor warning; booking enforcement; credentials login block. Shared UX constants: `lib/people/people-app-access-ui-theme.ts`. No schema/migration/RLS changes. Validated via `pnpm check`.
- `people-management-app-accounts-demote-v1` — UI-only demotion of App Accounts L1 tab on `/admin/users`; **Advanced accounts** collapsible read-only diagnostics (name, email, role, approval, linked/unlinked); removed New/Edit/Delete and technical stats cards; no `POST /api/users/create` or `DELETE /api/users/delete` UI paths; APIs unchanged. Constants: `lib/people/people-management-ui.ts`. Validated via `pnpm check`.
- `users-delete-student-guard-v1` — `DELETE /api/users/delete` returns **409** `use_student_delete_policy` for STUDENT role (symmetric to INSTRUCTOR guard); no User delete, no Student unlink/mutation; legacy endpoint no longer supports STUDENT or INSTRUCTOR deletion — use People → Students/Instructors policies. Validated via `pnpm check`.
- `admin-users-page-tenant-scope-v1` — Docs-only audit: SSR `/admin/users` loaded Users without `organizationId` (P1 cross-tenant read leak via Advanced accounts + Instructors Profiles). Report: [admin-users-page-tenant-scope-audit.md](./admin-users-page-tenant-scope-audit.md).
- `admin-users-page-tenant-scope-fix-v1` — SSR People page scopes `prisma.user.findMany` to `session.user.organizationId`; redirects when org missing (same as `/admin` dashboard); loader `lib/people/admin-users-page-data.ts` + unit tests. Category/TransmissionType remain global catalogs. No API/schema/RLS/auth changes. Validated via `pnpm check`.
- `people-management-onboarding-unlinked-invitations-v1` — Students → Onboarding lists only pending student invites without a profile (`studentId == null`); linked invites omitted with copy pointing to Students → Profiles; client-side Expired badge/copy when `expiresAt` passed; helpers in `lib/invitations/invitation-ui-utils.ts`; Instructors → Onboarding unchanged. No API/schema/RLS/auth changes. Validated via `pnpm check`.
- `people-management-advanced-accounts-removal-and-profile-avatars-v1` — UI-only: removed **Advanced accounts** section and diagnostics copy from `/admin/users`; `PeopleProfileAvatar` + `getPeopleProfileInitials` on Students/Instructors Profiles rows; removed `ADVANCED_ACCOUNTS_SECTION` and Advanced-accounts-only helpers from `people-management-ui.ts`; `loadAdminUsersPageData` + APP_USER bridge unchanged. No API/schema/RLS/auth changes. Validated via `pnpm check`.
- `people-management-student-profile-operational-fields-v1` — License category + transmission moved to **Student profile** (all access modes); `PATCH /api/admin/students/[id]` accepts `categoryName`/`transmissionTypeName`; DTO exposes `category`/`transmissionType`; App access section shows login/lifecycle only; MANUAL_ONLY gets **No app access yet** section in Edit Student; row badges use profile operational fields. No schema/migration/RLS/auth changes. Validated via `pnpm check`.
- `people-management-profile-address-fields-v1` — **Address** on operational person profiles (DEC-023): migration `20260608120000_add_student_address` adds `Student.address`; `PATCH`/`POST /api/admin/students` accept `address`; DTO exposes `address` with `student.address ?? linkedUser.address` read fallback in UI; Edit Student/Instructor show address in **profile** (not App access); APP_USER dual-save syncs `User.address`; Instructor UI-only on `User.address`. No import/export/RLS/auth/lifecycle changes. Validated via `pnpm check`.
- `people-management-student-email-change-policy-v1` — **Change email** for Students (DEC-024): `POST /api/admin/students/[id]/change-email`; transactional service `lib/students/student-email-change-service.ts`; PATCH email guard (`use_change_email_flow`); Edit Student **Change email** modal; policy by MANUAL_ONLY / INVITED / APP_USER / post-remove. No schema/migration/RLS changes. Validated via `pnpm check`.
- `people-management-instructor-profile-invite-badge-v1` — UI-only instructor invite/profile lifecycle clarity (DEC-025): Onboarding copy explains pending invites stay pre-profile; Profiles conditional app-account subtitle (`linked` / `awaiting approval` / `inactive`); expanded instructor label guide; helpers `getInstructorProfileAppAccountSubtitle` / `formatInstructorProfileContactLine`. No `Pending invite` badge on Profiles; no API/schema/RLS changes. Validated via `pnpm check`.
- `admin-settings-client-visibility-review-v1` — docs-only audit: `/admin/settings` is operator/internal (System Settings + Feature Flags CRUD); module gating uses License/Entitlements (DEC-026). Report: [admin-settings-client-visibility-audit.md](./admin-settings-client-visibility-audit.md). Phased next: hide Settings nav (B), License read-only (C), vehicle alerts (D). No runtime/UI/API/schema changes. Validated via `pnpm check`.
- `admin-settings-client-visibility-hide-v1` — UI-only (DEC-026 Fase B): Settings removed from school admin navbar (`components/navigation/navbar.tsx`); `/admin/settings` retained with operator/internal header + alert copy; CRUD tabs unchanged; all settings/feature-flags/config APIs unchanged. Validated via `pnpm check`.
- `admin-license-client-readonly-v1` — UI-only (DEC-026 Fase C): `/admin/license` reframed as **Plan & features** read-only; Activate key form and feature toggles removed from UI; consolidated Modules & features section; navbar label **Plan**; `useLicense`/APIs/gating unchanged. Validated via `pnpm check`.
- `tenant-operational-organization-id-not-null-readiness-review-v1` — analysis-only readiness review for future NOT NULL on six operational tables; no runtime/schema changes. Validated via prior `pnpm check` on main.
- `tenant-operational-organization-id-not-null-readiness-doc-v1` — docs-only readiness artifact + **DEC-027**; report [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md). Operator evidence 2026-06-09: 22 migrations up to date; 0 operational NULLs; `SAFE_TO_DRY_RUN`; 0 dry-run proposals; backfill apply not required. No schema/migration/runtime changes. Validated via `pnpm check`.
- `people-management-instructor-email-change-policy-v1` — analysis-only Instructor change-email policy; no runtime/schema changes.
- `people-management-instructor-email-change-policy-doc-v1` — docs-only policy + **DEC-028**; [instructor-email-change-policy.md](./instructor-email-change-policy.md). Future runtime: `POST /api/admin/instructors/[id]/change-email`. Validated via `pnpm check`.
- `people-management-instructor-email-change-v1` — **Change email** for Instructors (DEC-028): `POST /api/admin/instructors/[id]/change-email`; transactional service `lib/instructors/instructor-email-change-service.ts`; Edit Instructor → App access **Change email** modal; preserves `isApproved` / `isAvailableForBooking`; revokes PENDING INSTRUCTOR invites on old email; invalidates sessions/tokens; demo guard. No schema/migration/RLS changes. Validated via `pnpm check`.
- `invitation-email-update-v1` — analysis-only pending invitation email update; no runtime/schema changes.
- `invitation-email-update-policy-doc-v1` — docs-only policy + **DEC-029**; [invitation-email-update-policy.md](./invitation-email-update-policy.md). Future runtime: `POST /api/admin/invitations/[id]/change-email` (sliced). Validated via `pnpm check`.

### Likely next (smallest safe slices)

1. `invitation-email-update-unlinked-instructor-v1` — runtime: invitation change-email API + Onboarding UI (INSTRUCTOR); regenerate token; explicit approval required
2. `tenant-operational-organization-id-not-null-migrations` — **deferred (D4):** per-table NOT NULL on six operational tables only; requires explicit approval + human `migrate deploy`; re-run `pnpm tenant:org-null-report` on target DB first
3. `supabase-rls-class-b-hardening-v1b` — **deferred (D4):** optional RLS + REVOKE on remaining internal tables — separate approval
4. `people-management-ux-unification-instructor-route-split-v1` — **deferred (D4):** separate `/admin/instructors` route — **not** recommended next
5. `tenant-operational-organization-id-backfill-apply-v1` — **deferred** until a future environment dry-run shows proposed changes (not needed in 2026-06-09 validated env)
6. `audit-log-tenant-context-foundation` — planning only
7. Product/packaging planning slices — see [roadmap-todo.md](./roadmap-todo.md) **P1 / Product and packaging** and [docs/product/](../product/)

Engineering excellence audit items (non-blocking refactors) remain tracked separately in roadmap P2+.
