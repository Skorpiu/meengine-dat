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

## Production cutline (DEC-032)

**Baseline:** main `5f41082` · `pnpm check` 167 test files / 1255 tests / build OK · Calendar/Lessons v1d closed.

**Path:** Controlled first **B2B client** production under invite-only, `PUBLIC_SIGNUP_ENABLED=false`, no live billing assumptions. DAT core is **production-ready enough** for that scope.

**Cutline doc:** [production-readiness-cutline.md](./production-readiness-cutline.md) (`production-readiness-cutline-doc-v1`).

**First-client onboarding:** [first-client-onboarding-record.md](./first-client-onboarding-record.md) (`production-first-client-onboarding-record-v1`, DEC-043).

**Analysis approved:** `production-readiness-cutline-review-v1` (analysis-only).

**Do not open next:** `calendar-lessons-polish-v1e-student-warnings`, mobile/tablet review, Competitive/Product Discovery, audit log runtime, billing/checkout.

---

## Current recommended next phase

**Production path** — controlled first B2B client (see [production-readiness-cutline.md](./production-readiness-cutline.md) and [roadmap-todo.md](./roadmap-todo.md)).

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
- `people-management-ux-unification-instructor-invitations-v1` — UI-only closure slice under `people-management-ux-unification` (DEC-025): refined Onboarding/Profiles copy and instructor label guide (Student vs Instructor invitation asymmetry); Profiles header clarifies post-account states; helpers reused from `lib/instructors/instructor-record-ui-utils.ts`. No `Pending invite` badge on Profiles; no API/schema/RLS changes. Validated via `pnpm check`.
- `admin-settings-client-visibility-review-v1` — docs-only audit: `/admin/settings` is operator/internal (System Settings + Feature Flags CRUD); module gating uses License/Entitlements (DEC-026). Report: [admin-settings-client-visibility-audit.md](./admin-settings-client-visibility-audit.md). Phased next: hide Settings nav (B), License read-only (C), vehicle alerts (D). No runtime/UI/API/schema changes. Validated via `pnpm check`.
- `admin-settings-client-visibility-hide-v1` — UI-only (DEC-026 Fase B): Settings removed from school admin navbar (`components/navigation/navbar.tsx`); `/admin/settings` retained with operator/internal header + alert copy; CRUD tabs unchanged; all settings/feature-flags/config APIs unchanged. Validated via `pnpm check`.
- `admin-license-client-readonly-v1` — UI-only (DEC-026 Fase C): `/admin/license` reframed as **Plan & features** read-only; Activate key form and feature toggles removed from UI; consolidated Modules & features section; navbar label **Plan**; `useLicense`/APIs/gating unchanged. Validated via `pnpm check`.
- `tenant-operational-organization-id-not-null-readiness-review-v1` — analysis-only readiness review for future NOT NULL on six operational tables; no runtime/schema changes. Validated via prior `pnpm check` on main.
- `tenant-operational-organization-id-not-null-readiness-doc-v1` — docs-only readiness artifact + **DEC-027**; report [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md). Operator evidence 2026-06-09: 22 migrations up to date; 0 operational NULLs; `SAFE_TO_DRY_RUN`; 0 dry-run proposals; backfill apply not required. No schema/migration/runtime changes. Validated via `pnpm check`.
- `people-management-instructor-email-change-policy-v1` — analysis-only Instructor change-email policy; no runtime/schema changes.
- `people-management-instructor-email-change-policy-doc-v1` — docs-only policy + **DEC-028**; [instructor-email-change-policy.md](./instructor-email-change-policy.md). Future runtime: `POST /api/admin/instructors/[id]/change-email`. Validated via `pnpm check`.
- `people-management-instructor-email-change-v1` — **Change email** for Instructors (DEC-028): `POST /api/admin/instructors/[id]/change-email`; transactional service `lib/instructors/instructor-email-change-service.ts`; Edit Instructor → App access **Change email** modal; preserves `isApproved` / `isAvailableForBooking`; revokes PENDING INSTRUCTOR invites on old email; invalidates sessions/tokens; demo guard. No schema/migration/RLS changes. Validated via `pnpm check`.
- `invitation-email-update-v1` — analysis-only pending invitation email update; no runtime/schema changes.
- `invitation-email-update-policy-doc-v1` — docs-only policy + **DEC-029**; [invitation-email-update-policy.md](./invitation-email-update-policy.md). Validated via `pnpm check`.
- `invitation-email-update-unlinked-instructor-v1` — **Change email** on pending unlinked INSTRUCTOR invitations (DEC-029 slice 2a): `POST /api/admin/invitations/[id]/change-email`; service `lib/invitations/invitation-email-update-service.ts`; Instructors → Onboarding **Change email** modal; regenerates `tokenHash`; returns new `inviteLink` once; no auto-send; demo guard. No schema/migration/accept-route changes. Validated via `pnpm check`.
- `invitation-email-update-unlinked-student-v1` — **Change email** on pending unlinked STUDENT invitations (DEC-029 slice 2b): same endpoint/service/dialog; Students → Onboarding **Change email**; org `Student.email` collision check (`student_email_already_in_use`); linked student invitations remain blocked. No schema/migration/accept-route changes. Validated via `pnpm check`.
- `invitation-email-update-linked-student-v1` — **Change invitation email** on pending linked STUDENT invitations (DEC-029 slice 2c): syncs `UserInvitation.email` + `Student.email`; preserves `INVITED` / `userId = null`; Students → Profiles App access + profile row; token regeneration; no auto-send. No schema/migration/accept-route changes. Validated via `pnpm check`.
- `tenant-operational-organization-id-not-null-migrations-plan-v1` — docs-only D4 gate: GO/NO-GO checklist, operator pre-migration battery, single-migration proposal, post-migration smoke tests; report [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md). No schema/migration/runtime/data changes. Validated via `pnpm check`.
- `tenant-operational-organization-id-not-null-migrations-v1` — migration `20260610140000_make_operational_organization_id_required`: `SET NOT NULL` on six operational tables; Prisma schema `organizationId String` on `Student`, `Instructor`, `Vehicle`, `Lesson`, `Exam`, `LessonRequest`. Validated via `pnpm check`.
- `tenant-operational-organization-id-not-null-deploy-record-v1` — docs-only deploy record on main `1854d1b`: operator `migrate deploy` succeeded on validated target env; post-deploy 23 migrations up to date; 0 operational NULLs; `SAFE_TO_DRY_RUN`; dry-run 0 proposed/conflicts/ambiguous; `pnpm check` OK. **`User.organizationId` and dual-scope/global tables remain nullable by design** (DEC-027). Report: [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md).
- `supabase-rls-class-b-hardening-v1b-review` — analysis-only RLS posture after D4 NOT NULL; 12 tables hardened, 19 candidates, 0 policies, Prisma-primary, no `supabase-js`. No SQL/runtime changes.
- `supabase-rls-class-b-hardening-v1b-plan-v1` — docs-only sliced plan + **DEC-030**; report [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md). B1 nextauth → B2 tenant business → B3 global reference; `supabase-rls-tenant-policies-v1` deferred P2. No migration/runtime.
- `supabase-rls-class-b-hardening-v1b-nextauth-v1` — Prisma migration `20260610150000_supabase_rls_class_b_hardening_v1b_nextauth`: RLS + `REVOKE ALL FROM anon, authenticated` on 4 NextAuth tables (`accounts`, `sessions`, `verification_tokens`, `users`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no `schema.prisma`/runtime changes. Merged main `edd73de` (feature `d579a1f`). Validated via `pnpm check`.
- `supabase-rls-class-b-hardening-v1b-nextauth-deploy-record-v1` — docs-only deploy + smoke record (2026-06-10): operator `migrate deploy` succeeded on validated target env; post-deploy **24** migrations, schema up to date; `pnpm check` 163 files / 1223 tests / build OK; B1 manual auth smoke matrix **pass** (operator-confirmed). Report: [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md).
- `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` — Prisma migration `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke`: RLS + `REVOKE ALL FROM anon, authenticated` on 12 B2 tables (`students`, `instructors`, `vehicles`, `lessons`, `exams`, `lesson_requests`, `lesson_counters`, `exam_registrations`, `payments`, `notifications`, `organizations`, `organization_features`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no `schema.prisma`/runtime changes. Merged main `dd26d18` (feature `dce55c7`). Validated via `pnpm check`.
- `supabase-rls-class-b-hardening-v1b-tenant-business-deploy-record-v1` — docs-only deploy + smoke record (2026-06-10): operator `migrate deploy` succeeded on validated target env; post-deploy **25** migrations, schema up to date; `pnpm check` 163 files / 1223 tests / build OK; B2 manual smoke matrix **pass** (operator-confirmed green). Report: [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md).
- `supabase-rls-class-b-hardening-v1b-global-reference-v1` — Prisma migration `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference`: RLS + `REVOKE ALL FROM anon, authenticated` on 3 B3 tables (`categories`, `transmission_types`, `user_preferences`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no `schema.prisma`/runtime changes. Merged main `cdfacf2` (feature `f63f19d`). Validated via `pnpm check`.
- `supabase-rls-class-b-hardening-v1b-global-reference-deploy-record-v1` — docs-only deploy + smoke record (2026-06-10): operator `migrate deploy` succeeded on validated target env; post-deploy **26** migrations, schema up to date; `pnpm check` 163 files / 1223 tests / build OK; B3 manual smoke matrix **pass** (operator-confirmed all green). **RLS Class-B v1b revoke-only complete (31/31 Prisma tables; B1+B2+B3 deployed + smoke green).** Report: [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md). **`supabase-rls-tenant-policies-v1` (CREATE POLICY) remains P2 separate — not next.**
- `calendar-lessons-polish-v1` — analysis-only Calendar/Lessons operational UX audit: Schedule Map (`/admin`) vs Lesson Management (`/admin/lessons`); colors, labels, SSR seed, refresh, dashboard window gaps documented. No runtime changes.
- `calendar-lessons-polish-v1-plan-v1` — docs-only sub-slice plan (**DEC-031**): v1a–v1e registered in [roadmap-todo.md](./roadmap-todo.md) `calendar-lessons-polish-v1`. No runtime changes.
- `calendar-lessons-polish-v1a-consistency-ui` — UI + SSR mapping (DEC-031 slice 1): aligned `/admin/lessons` tab/dot colors with Schedule Map (`lib/lessons/lesson-type-ui-theme.ts`); `Practice #N`; Title Case status via `getLessonStatusDisplayLabel`; SSR `isAvailableForBooking` on admin/instructor/student dashboard seeds; inactive instructor warning deduplicated. No schema/migrations/API changes. Validated via `pnpm check`.
- `calendar-lessons-polish-v1b-edit-refresh` — UI navigation (DEC-031 slice 2): after lesson/exam edit, return to admin/instructor dashboard with Schedule Map refresh + date focus via `?focusDate=YYYY-MM-DD&scheduleRefresh=1`; helpers `lib/schedule/schedule-map-navigation.ts`; shared hook `hooks/use-schedule-dashboard-controls.ts`; cancel/back unchanged (no query params). No schema/migrations/API/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (165 files / 1232 tests / build OK).
- `calendar-lessons-polish-v1c-a-truncation-indicator` — read behaviour (DEC-031 slice 3a): honest truncation on `/admin/lessons` Recent/Upcoming — `getAdminDashboardLessons` uses `take: 51`, returns max 50 items; additive API flags `recentHasMore` / `upcomingHasMore`; helper `admin-dashboard-lessons-truncation.ts`; UI notice + link to Schedule Map when truncated; parser backward-compatible (defaults `false`); `current` and temporal window unchanged; Schedule Map unchanged. No schema/migrations/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (166 files / 1237 tests / build OK).
- `calendar-lessons-polish-v1c-b-upcoming-horizon` — read behaviour (DEC-031 slice 3b): Upcoming on `/admin/lessons` covers today remaining + next 7 days (`ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS`); `getAdminDashboardUpcomingHorizonEnd`; v1c-a truncation preserved (`take: 51`, max 50 UI, `upcomingHasMore`); UI copy updated; Recent/Current/Schedule Map unchanged. No schema/migrations/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (167 files / 1245 tests / build OK).
- `calendar-lessons-polish-v1d-vehicle-warnings` — display-only (DEC-031 slice 4): vehicle operational warnings on Schedule Map + `/admin/lessons` using persisted nested `vehicle.{isActive,underMaintenance,status}` on `LESSON_LIST_VEHICLE_SELECT`; helpers `getLessonVehicleWarning` / `isLessonVehicleProblematic`; red chip styling mirrors inactive instructor; no create/update blocking; expiry/service warnings deferred. No schema/migrations/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (167 files / 1255 tests / build OK).
- `production-readiness-cutline-review-v1` — analysis-only production cutline after v1d; no runtime/schema changes.
- `production-readiness-cutline-doc-v1` — docs-only cutline + DEC-032 + memory/smoke sync; [production-readiness-cutline.md](./production-readiness-cutline.md). No runtime/schema changes.
- `calendar-lessons-edit-flow-refresh-fix-v1` — analysis-only P1 blocker from first B2B operator smoke: edit PUT omitted instructor/student; edit form `instructorUserId` used wrong id type; Schedule Map refresh v1b OK for persisted fields.
- `calendar-lessons-edit-persistence-refresh-fix-v1` — runtime fix (DEC-033): `PUT /api/admin/lessons/[id]` accepts/persists `instructorId` (User.id → Instructor.id) and `studentId`; `buildAdminLessonUpdateRequestBody`; `EditLessonClient` fixed defaults + full PUT body; instructor role cannot reassign instructor; booking availability enforced on instructor change. Schedule Map v1b refresh unchanged. No schema/migration/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (168 files / 1271 tests / build OK).
- `calendar-lessons-edit-practical-number-reassign-v1` — runtime fix (DEC-034): DRIVING lesson edit recalculates `practicalLessonNumber` when operational `studentId` changes via `resolvePracticalLessonNumberOnStudentChange` / `getNextPracticalLessonNumber`; `LESSON_DETAIL_ACCESS_SELECT` extended; display `Practice No. N`. No renumber of other lessons; no schema/migration/auth/RLS/billing/demo-guard changes.
- `calendar-lessons-edit-modal-ux-v1` — UI-only (DEC-035): Schedule Map edit opens in `EditLessonDialog` on admin + instructor dashboards; shared `useEditLessonForm` hook; GET/PUT unchanged; modal success uses `handleLessonBooked`; `/admin/lessons/edit/[id]` fallback + v1b return preserved. No persistence/numbering/schema/auth/API changes.
- `production-smoke-e2e-readonly-v1` — test infra (DEC-036): hybrid read-only automated smoke — `pnpm e2e:smoke:api`, `e2e:smoke:readonly`, `e2e:smoke:prod`; env guards (`DAT_E2E_ALLOW_PRODUCTION`, `DAT_SMOKE_ALLOWED_HOSTS`); API health + signup blocked + Playwright auth/page loads; zero persisted writes; not in `pnpm check`/CI default. Runbook: `driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md`.
- `instructor-invite-auto-approve-v1` — auth/invitations fix (DEC-037): invitation accept sets `isApproved=true` for all invited roles (including INSTRUCTOR); public signup policy unchanged; no schema/migration/RLS changes. Validated via `pnpm check`.
- `instructor-invite-license-fields-v1` — People/invitations data integrity (DEC-038): INSTRUCTOR invite requires license number + expiration date; stored on `UserInvitation`; accept uses stored values (no `INVITE-PENDING-*`); placeholder detection in Profiles; migration `20260623120000_add_instructor_license_fields_to_invitations`; DEC-037 and public signup unchanged. Validated via `pnpm check`.
- `production-smoke-e2e-fixture-preflight-v1` — zero-write smoke fixture preflight (DEC-039): `pnpm e2e:smoke:fixture-preflight`; explicit `DAT_SMOKE_ORG_ID` + student/instructor/vehicle IDs + optional `DAT_SMOKE_EXPECTED_*`; admin login + read-only admin API checks; temporary `A Conquistadora` smoke tenant on `www.meengine.io`; hosted green.
- `production-smoke-e2e-lesson-mutations-v1` — lesson mutation smoke (DEC-040): `pnpm e2e:smoke:mutations`; dual opt-in `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS`; API-first create + time-shift update; fixture preflight inside spec; immutable smoke trail (no delete/cleanup); not in `pnpm check`/CI.
- `instructor-qualified-categories-management-v1b` — School Admin can view/edit instructor qualified license categories via People → Edit Instructor; PATCH `/api/admin/instructors/[id]`; M2M `_InstructorCategories`; no migration. Validated via `pnpm check`.
- `production-smoke-e2e-testids-v1` — smoke testids + booking readiness metadata (DEC-041): `lib/smoke/smoke-testids.ts`; `qualifiedCategoryNames` / `instructorLicenseExpiry` on `GET /api/admin/instructors/all?forBooking=true`; fixture preflight category B hard-fail when exposed; improved readiness messages; not in `pnpm check`/CI.
- `production-first-client-onboarding-record-v1` — docs-only first B2B client onboarding record (DEC-043): checklist (pre-onboarding, deploy, tenant setup, minimum data, smoke, go/no-go, handover); fillable example template; A Conquistadora = smoke only; [first-client-onboarding-record.md](./first-client-onboarding-record.md). No runtime/schema changes.
- `audit-log-tenant-context-foundation-plan-v1` — docs-only foundation plan for tenant-aware audit logging (DEC-044): current `audit_logs` is Class-B hardened but lacks `organizationId` and has no app write paths; defines principles, event candidates, and future slices (schema + service boundary + optional viewer). [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md). No runtime/schema changes.
- `audit-log-tenant-context-schema-plan-v1` — docs-only technical plan for the first tenant-aware audit log schema/migration slice: additive columns (`organizationId`, actor fields, `metadata`, `requestId`), indexes, best-effort backfill, and RLS/REVOKE preservation. [audit-log-tenant-context-schema-plan.md](./audit-log-tenant-context-schema-plan.md). No runtime/schema changes.
- `audit-log-tenant-context-migration-v1` — migration `20260702120000_audit_log_tenant_context_v1`: additive tenant-aware columns on `audit_logs` (`organizationId`, `actorUserId`, `actorRole`, `actorEmail`, `targetUserId`, `metadata`, `requestId`); composite indexes; best-effort backfill from legacy `userId`; idempotent Class-B RLS + REVOKE reinforcement; no write paths/API/UI. Validated via `pnpm check`. Operator `migrate deploy` human-controlled.

### Likely next (production path)

1. `audit-log-write-paths-foundation-v1` — write service + wire 1–2 high-value mutations (P2)

### Deferred (not next)

- **`calendar-lessons-polish-v1e-student-warnings`** (P3) — product policy first
- `people-management-ux-unification-instructor-route-split-v1` — **deferred (D4)**
- Audit log write paths — P2 unless compliance requires earlier (`audit-log-write-paths-foundation-v1`)

### Product direction (backlog — deferred post-production polish)

**Penultimate (before Competitive/Product Discovery):** `mobile-tablet-readiness-review-v1` — responsive UX review for admin/instructor/student; Schedule Map on small screens; touch targets; forms/tables/dialogs; mobile performance/INP; PWA/installable readiness (manifest/icons/theme-color; service worker/offline only if justified); Playwright mobile viewport smoke. **Deferred until** DAT core is solid, cohesive, and in production.

**Competitive/Product Discovery** (`competitive-product-discovery-v1`, P2 deferred; DEC-007): pesquisar features de concorrentes que possam acrescentar valor ao DAT; discutir, maturar, arquitetar e implementar por slices futuros. **Deferred until** DAT core is cohesive, polished, and in production — after `mobile-tablet-readiness-review-v1`.

Engineering excellence audit items (non-blocking refactors) remain tracked separately in roadmap P2+.
