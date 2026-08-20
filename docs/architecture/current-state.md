# DAT Current State

## Purpose

This file summarizes **where DAT is today** for agents, reviewers, and operators **before** starting new work. Pair with [system-design.md](./system-design.md) (rules) and [roadmap-todo.md](./roadmap-todo.md) (what’s next).

---

## Canonical current state

**Verified after Node 24 Production closure (2026-08-04).** Canonical memory and verified operational evidence take precedence over historical summaries.

| Topic | Current truth |
| ----- | ------------- |
| **Entry baseline** | `main` merge commit `909b69a` (`Merge branch 'node-24-runtime-migration-v1' into 'main'`). This is the verified baseline for the Node 24 closure record — **not** an eternal SHA. Re-confirm the commit served in Production after every later deployment. |
| **Git / CI** | Local `main` = `origin/main` = `da5aea6` after the docs-only closure integration. Node 24 runtime application merge `909b69a` and closure record `a397054` are integrated; the verified GitLab `main` pipeline passed using Docker image `node:24`. |
| **Deployment (last operator-confirmed)** | Vercel project `meengine-dat` — Production runtime validation completed on application merge commit **`909b69a`**, with the Vercel Project Setting and effective runtime aligned to Node **24.x**. A later docs-only closure deployment may advance the served commit without changing this validated runtime baseline; re-confirm after any later application or runtime deployment. |
| **Hosts (shared deployment)** | `www.meengine.io`, `platform.meengine.io`, `demo.meengine.io`, `meengine-dat.vercel.app` currently share the **same** Vercel app/deployment. DAT/Platform separation is **planned**, not yet physical. |
| **Hosted smoke** | Original full hosted verification remains closed with mutation evidence **1/0/0** and its immutable lesson trail. After the Node 24 Production deployment at `909b69a`, the operator re-ran the required non-destructive gates: fixture preflight **1/0/0**, API health + public signup guard **exit 0**, and hosted read-only UI **4/0/0**. Mutation smoke was intentionally not repeated because the slice changed runtime/configuration only and another Production write would add little signal. |
| **Smoke fixtures** | DEC-064 closed 2026-07-28 (**human**): repair apply + fixture apply (`changesApplied=18`); inspector no blockers; fixtures all-ready; idempotent dry-run; Sarah/Bob/John Doe preserved; commercial catalogue untouched; no `PLATFORM_ADMIN` recreate. Full IDs in operator vault only. |
| **Remote ops closed** | Do **not** re-run repair, fixture apply, or smoke-lesson cleanup without new evidence + explicit human authorization. `student-invite-accept-student-link-repair-v1` **done** (repo + remote). |
| **Node.js runtime** | **Node 24 migration closed.** Local compatibility passed on Node 24.18.0; repository pins, package engines, `.nvmrc`, GitLab CI and runner documentation are aligned; branch and `main` pipelines passed using `node:24`; Vercel Preview and Production deployed successfully with Project Settings and effective runtime on Node 24.x; post-deploy non-destructive hosted gates passed at `909b69a`. |
| **Engineering audit** | `engineering-excellence-audit-v1` — **CLOSED 2026-08-13 by explicit human authorization**. Final Engineering Quality Review PASS; 0 closure-blocking dimensions; 51 findings with 51/51 remediation coverage; no repository-static audit frontier remains. The findings remain active remediation debt in the post-audit execution queue. Do not reopen the global audit without contradictory evidence. |
| **Solution #1** | `BILLING-SEC-001` / `billing-webhook-authenticity-gate-v1` — **CLOSED BY CONTAINMENT** and integrated into `main`. No active Billing implementation branch at this recovery checkpoint. |
| **DAT_4.5 handoff** | Authoritative published `main`: `14c3865372502f074941a1fc81a55b5ec7f1b589` (`merge: integrate Solution #3 local database isolation`; tree `cb7b0a7409b91a70a8c601f36d4e80fd014404cf`). Solution #2 published merge `0409d92525940be751e6bc07c9da32668a834e53` remains the Solution #2 closure anchor. Resolve live HEAD through Git; this is not an eternal served-in-Production SHA. |
| **Solution #2** | `next-supported-lts-security-remediation-v1` / `DEP-SEC-001` — **CLOSED + PUBLISHED**. Published merge `0409d92525940be751e6bc07c9da32668a834e53`. `DEP-SEC-001` is **CLOSED ON PUBLISHED MAIN**. Solution #2 branch cleaned local + remote. |
| **Solution #3** | `local-development-database-isolation-v1` / `CONFIG-ENV-001` — **CLOSED ON PUBLISHED MAIN** (DEC-068). Implementation anchor `a717534ed351440fdfbf6800b218d56d6eb85282`; accepted implementation tree `5b9aa29649bdf929bf7df5f9f641eb950ce16275`; continuity/source-publication anchor `810cc9446c5f89805e282672bc03f743f8480d75`; published merge `14c3865372502f074941a1fc81a55b5ec7f1b589`. Source branch cleanup **COMPLETE** (absent locally and on `origin`). Historical in-branch wording “ACTIVE / NOT YET INTEGRATED ON MAIN” is superseded by this published merge. |
| **Solution #4** | `migration-deploy-target-safety-gate-v1` / `DB-MIGRATION-001` — **IMPLEMENTED IN WORKTREE / B1 CORRECTED / TARGETED UNIT VALIDATION PASSED / FULL CHECK EXPECTED_ENVIRONMENT_BLOCK** (DEC-069). Base / published `main`: `14c3865372502f074941a1fc81a55b5ec7f1b589`. Recovery: **COMMITTED + SOURCE BRANCH PUBLISHED** at `47a101b261a2fab144d73469e699389fc94ceb1c` (tree `ec8b4d18e10c1a42c1cca8e88292e9bce6f8a700`; `origin/migration-deploy-target-safety-gate-v1` = that SHA). Implementation remains uncommitted worktree; implementation commit **none**; implementation publication **none**; merge SHA **none**. Do not invent those SHAs. Do not claim a migration has been run. Architect EQR B1 (independent DIRECT_URL host) is corrected in the worktree. Recovery publication history: Super Agent continuity 2026-08-20 (one-shot exception; not standing hook-bypass authorization). |
| **Ordered next** | Architect re-review of Solution #4 B1 correction, then human staging/commit gate. Do not request migration-execution authorization in this slice. Then `platform-separation-architecture-plan-v1` as a parallel architecture lane → `dependency-security-monitoring-v1` remains separate; then P1/P2 according to the post-audit queue. Do not run ordinary local `pnpm dev` until the local `.env` / `.env.local` database URLs are loopback (current hosted `.env` is expected to fail `env:check`). |
| **P1 parallel** | `people-instructor-invite-accept-list-refresh-v1`; `school-person-identifiers-settings-product-plan-v1` (DEC-065). |
| **Safety baseline tag** | `dat-v1-core-baseline-95b833e` @ `95b833e` (DEC-056) — code/recovery comparison only. |
| **Archive tag** | `archive-schedule-and-vehicles-b101112` — historical archive only; **not** a release or recovery baseline. |
| **Cutline** | Controlled B2B: invite-only, `PUBLIC_SIGNUP_ENABLED=false`, no live self-service billing today (DEC-032). |

Runbooks: [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md), [production-smoke-reconciliation-inspect.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-reconciliation-inspect.md).

---

## Historical — DAT_3.4 / DAT_3.5 closed state

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

## Historical — DAT_3.6 closed state

**DAT_3.6** implemented and **Preview QA validated** (historical evidence; not a substitute for current hosted smoke):

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

## Historical — DAT_3.6 QA validation evidence

Functional results recorded during Preview QA (representative checklist; historical):

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

## Historical — early operational migrations

Committed migration folders (DAT_3.6 student/lesson operational work; later migrations exist — always check `prisma migrate status` on the target env):

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

**People Management (current):** Admin **People** hub at `/admin/users` — Students / Instructors L1 tabs with Profiles + Onboarding; English UI baseline; unified Edit Student / Edit Instructor; app-access remove/reactivate; change email (student + instructor + pending invitations); instructor invite lifecycle clarity on Profiles (**done** — `people-management-instructor-profile-invite-badge-v1`, `people-management-ux-unification-instructor-invitations-v1`). Route split to `/admin/instructors` remains **deferred (D4)**.

**Import/export (current):** Student export/import (dry-run + apply) on registered student records; practical lessons export/import (preview + apply) on `/admin/lessons` Driving tab; demo guards on apply.

**Delete/removal (implemented):** School Admin (`SUPER_ADMIN`) may hard-delete a `MANUAL_ONLY` student ficha with no linked User, invitations, lessons of any `LessonSource`, lesson counters, lesson requests, exam registrations, or payments. Blocked deletes return stable **409** codes. Soft-delete/archive remains deferred. Retention review: [student-delete-retention-policy-review.md](./student-delete-retention-policy-review.md).

**Product UI language:** English baseline for product surfaces. Future locale work via proper i18n (see [roadmap-todo.md](./roadmap-todo.md)).

---

## DAT operational memory (Cursor)

Documented and in use (docs/rules only; no runtime change):

- **Cursor Super-Agent protocols** — [cursor-operating-model.md](../ops/cursor-operating-model.md) (Delegated Technical Lead, Sensitive Batch Gate, Smallest Safe Slice, Memory Update, Final Evidence Pack, etc.)
- **Reviewer workflow** — [reviewer-workflow.md](../ops/reviewer-workflow.md)
- **Cursor Automations operating model** — same operating model doc (**Plan and Budget Gate**; read-only default)
- **Cursor Automations prompt templates (v1)** — [cursor-automations-prompts.md](../ops/cursor-automations-prompts.md)
- **External database architecture audit triage** — critique classified into roadmap items (`tenant-required-operational-organization-id-audit`, `audit-log-tenant-context-foundation`, `lesson-student-nullability-policy-review`); triage itself is **docs-only**, no schema changes from triage alone
- **Git Bash command discipline** — [command-batteries.md](../ops/command-batteries.md), [cursor-operating-model.md](../ops/cursor-operating-model.md): Git Bash/bash batteries by default (`Assumed shell: Git Bash`); no PowerShell mixing; single-line Conventional Commit messages; guarded `DAT-*.zip` generation (`cursor-git-bash-command-discipline`)
- **Canonical memory hierarchy and continuity contract (DEC-059)** — recovery reading order and mandatory slice-close gate in [architect-mode.mdc](../../.cursor/rules/architect-mode.mdc); `decision-log` = history, `current-state` = now, `roadmap-todo` = next, `architect-mode` = navigator

**Daily guidance (no extra Cursor cost):** **Daily Manual Super-Agent Check** is the default workflow ([cursor-automations-prompts.md](../ops/cursor-automations-prompts.md)). Use **Cursor Automations** only if available in the **current plan at no extra cost** (`cursor-automations-super-agent-scheduled-support` in roadmap).

---

## Production cutline (DEC-032) — current deployed core

Invite-only, `PUBLIC_SIGNUP_ENABLED=false`, **no live self-service billing** on the **current deployed core**. See [production-readiness-cutline.md](./production-readiness-cutline.md).

**Target DAT v1.0 (DEC-046–058):** sellable/subscribable product with Platform-owned tenant billing, DAT Core / DAT Plus / DAT Premium. Planning: [dat-v1-commercial-release-plan.md](./dat-v1-commercial-release-plan.md).

**First-client onboarding:** [first-client-onboarding-record.md](./first-client-onboarding-record.md) (DEC-043). Real client **A Conquistadora** — provision via Platform when commercial path ready (DEC-053).

**Do not open without approval:** billing/checkout runtime, Prisma migrations for commercial catalog, `calendar-lessons-polish-v1e-student-warnings`.

**Deployment note:** DAT, Platform, and Demo hosts still share one Vercel app today — physical separation awaits `platform-separation-architecture-plan-v1`.

---

## Closed slices (reference archive)

Detailed closed-slice inventory below is **historical reference**. For **what to do next**, use the [Canonical current state](#canonical-current-state) section and [roadmap-todo.md](./roadmap-todo.md).

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
- `production-smoke-e2e-fixture-preflight-v1` — zero-write smoke fixture preflight (DEC-039): `pnpm e2e:smoke:fixture-preflight`; explicit `DAT_SMOKE_ORG_ID` + student/instructor/vehicle IDs + optional `DAT_SMOKE_EXPECTED_*`; admin login + read-only admin API checks; technical smoke tenant **`DAT Production Smoke`** on `www.meengine.io` (DEC-045). Pre–2026-07-17 hosted runs are **historical** — do not treat as current verification.
- `production-smoke-e2e-lesson-mutations-v1` — lesson mutation smoke (DEC-040): `pnpm e2e:smoke:mutations`; dual opt-in `DAT_E2E_ALLOW_PRODUCTION_MUTATIONS`; API-first create + time-shift update; fixture preflight inside spec; immutable smoke trail (no delete/cleanup); not in `pnpm check`/CI.
- `instructor-qualified-categories-management-v1b` — School Admin can view/edit instructor qualified license categories via People → Edit Instructor; PATCH `/api/admin/instructors/[id]`; M2M `_InstructorCategories`; no migration. Validated via `pnpm check`.
- `production-smoke-e2e-testids-v1` — smoke testids + booking readiness metadata (DEC-041): `lib/smoke/smoke-testids.ts`; `qualifiedCategoryNames` / `instructorLicenseExpiry` on `GET /api/admin/instructors/all?forBooking=true`; fixture preflight category B hard-fail when exposed; improved readiness messages; not in `pnpm check`/CI.
- `production-first-client-onboarding-record-v1` — docs-only first B2B client onboarding record (DEC-043): checklist (pre-onboarding, deploy, tenant setup, minimum data, smoke, go/no-go, handover); fillable example template; smoke tenant = **`DAT Production Smoke`**; real client = future **`A Conquistadora`**; [first-client-onboarding-record.md](./first-client-onboarding-record.md). No runtime/schema changes.
- `audit-log-tenant-context-foundation-plan-v1` — docs-only foundation plan for tenant-aware audit logging (DEC-044): principles, event taxonomy, redaction rules, and slice strategy for schema + write boundary + viewer/read API. [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md).
- `audit-log-tenant-context-schema-plan-v1` — docs-only technical plan for the first tenant-aware audit log schema/migration slice: additive columns (`organizationId`, actor fields, `metadata`, `requestId`), indexes, best-effort backfill, and RLS/REVOKE preservation. [audit-log-tenant-context-schema-plan.md](./audit-log-tenant-context-schema-plan.md).
- `audit-log-tenant-context-migration-v1` — migration `20260702120000_audit_log_tenant_context_v1`: additive tenant-aware columns on `audit_logs` (`organizationId`, `actorUserId`, `actorRole`, `actorEmail`, `targetUserId`, `metadata`, `requestId`); composite indexes; best-effort backfill from legacy `userId`; idempotent Class-B RLS + REVOKE reinforcement; no write paths/API/UI. Validated via `pnpm check`. Operator `migrate deploy` human-controlled.
- `audit-log-write-paths-foundation-v1` — audit write boundary: `lib/audit/audit-log-service.ts` (`writeAuditEvent`, `buildAuditLogCreateData`, `extractAuditRequestContext`) + `lib/audit/audit-log-redaction.ts`; legacy field mapping; unit tests; no route wiring. Validated via `pnpm check`.
- `audit-log-write-paths-integration-v1` — wired `writeInvitationAuditEvent` into `POST /api/admin/invitations` (`invitation.create`) and `POST /api/admin/invitations/[id]/revoke` (`invitation.revoke`); tenant scope from session; minimal redacted metadata; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-people-v1` — wired `lib/audit/people-audit.ts` into `PATCH /api/admin/instructors/[id]` (`instructor.qualified_categories.update`) and `POST /api/admin/instructors/[id]/deactivate` (`instructor.deactivate`); tenant scope from session; minimal metadata; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-lessons-v1` — wired `lib/audit/lesson-audit.ts` into `POST /api/admin/lessons` (`lesson.create`) and `PUT /api/admin/lessons/[id]` (`lesson.update`); tenant scope from session; minimal metadata (operational ids, changedFields); exam multi-create emits one audit per lesson; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-students-v1` — wired `lib/audit/student-audit.ts` into `POST /api/admin/students/[id]/app-access/remove` (`student.app_access.remove`) and `POST /api/admin/students/[id]/app-access/reactivate` (`student.app_access.reactivate`); tenant scope from session; lifecycle metadata (`previousAppAccessMode`, `appAccessMode`, `linkedUserId` on reactivate); `targetUserId` on reactivate; no student email in audit; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-student-profile-v1` — expanded `lib/audit/student-audit.ts` into `PATCH /api/admin/students/[id]` (`student.update`; `changedFields` + `appAccessMode` only) and `POST /api/admin/students/[id]/change-email` (`student.email.change`; `policyMode`, `hasLinkedUser`, `invitationRevoked` flags); `StudentEmailChangeAuditContext` on service success; no email/address/name values in metadata; audit failure non-blocking; route + helper + service unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-student-delete-v1` — wired `student.delete` into `DELETE /api/admin/students/[id]`; `StudentDeleteAuditSnapshot` on `deleteStudentRecordIfEligible` success; metadata (`appAccessMode`, `hadLinkedUser`, `hadLessons` flags only); `targetUserId` when linked user existed (policy blocks delete today); audit failure non-blocking; route + helper + delete service unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-student-invite-v1` — wired `student.invite` into `POST /api/admin/students/[id]/invite` (not `invitation.create` — distinct Profiles flow; unlinked invites remain `invitation.create` on `POST /api/admin/invitations`); `StudentInviteAuditSnapshot` on service success; metadata (`invitationRole`, `invitationStatus`, `previousAppAccessMode`, `appAccessMode`, `hasExistingInvitation`); no token/email/inviteLink; audit failure non-blocking; route + helper + service unit tests. Validated via `pnpm check`.
- `audit-log-coverage-readiness-review-v1` — docs-only coverage readiness review: **P1 write paths complete**, import apply summary audits closed (Students + Practical lessons), export download access events wired, tenant read API + viewer UI foundation implemented; explicit deferred list for platform viewer/export polish. [audit-log-coverage-readiness-review.md](./audit-log-coverage-readiness-review.md).
- `audit-log-write-paths-lesson-delete-v1` — wired `lesson.delete` into `DELETE /api/admin/lessons/[id]`; `LessonDeleteAuditSnapshot` on `deleteAdminLesson` success (hard delete via scoped `deleteMany`; future-only guard unchanged); metadata (`lessonType`, operational ids, `source`, `practicalLessonNumber`, `scheduledAtDateOnly`); no notes/names/emails; audit failure non-blocking; route + helper + service unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-invitation-email-change-v1` — wired `invitation.email.change` into `POST /api/admin/invitations/[id]/change-email`; metadata (`role`, `status`, `emailChanged`, `tokenRegenerated`, `linkedStudentId` when linked); no old/new email/token/tokenHash/inviteLink; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-instructor-reactivate-v1` — wired `instructor.reactivate` into `POST /api/admin/instructors/[id]/reactivate`; metadata (`alreadyActive` only) + `targetUserId`; no names/emails/notes; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-instructor-delete-v1` — wired `instructor.delete` into `DELETE /api/admin/instructors/[id]`; `InstructorDeleteAuditSnapshot` on `deleteInstructorRecordIfEligible` success; metadata (`hadLinkedUser`, `hadLessons`, `isAvailableForBooking` flags only); `targetUserId` when linked user existed; audit failure non-blocking; route + helper + delete service unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-instructor-email-change-v1` — wired `instructor.email.change` into `POST /api/admin/instructors/[id]/change-email`; `InstructorEmailChangeAuditContext` on `changeInstructorEmail` success; metadata flags only; no old/new email; audit failure non-blocking; route + helper + service unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-student-create-v1` — wired `student.create` into `POST /api/admin/students`; `StudentCreateAuditContext` from created record; metadata flags only; no names/emails/schoolStudentId literal; audit failure non-blocking; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-manual-practical-lesson-v1` — wired `lesson.create` into `POST /api/admin/students/[id]/practical-lessons`; reuses `writeLessonCreateAuditEvent`; metadata (`source: MANUAL`, `createdVia: manual_practical_lesson`, `scheduledAtDateOnly`, operational ids); no notes/names/emails; audit failure non-blocking; distinct from calendar `POST /api/admin/lessons`; route + helper + service unit tests. Validated via `pnpm check`.
- `audit-log-read-api-foundation-v1` — `GET /api/admin/audit-logs` tenant-scoped read API; `lib/audit/audit-log-query-params.ts` + `lib/audit/audit-log-query-service.ts`; SUPER_ADMIN + host guard; cursor pagination; filters; DTO omits `ipAddress`/`userAgent`/`organizationId`; metadata re-redacted on read; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-viewer-ui-foundation-v1` — `/admin/audit-logs` read-only viewer; `AuditLogsClient` + `audit-log-list-client`; filters + cursor Load more; URL-only access (no main navbar link; DEC-026 pattern); SSR `SUPER_ADMIN` guard; client + ui-utils unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-student-import-apply-v1` — wired `student.import.apply` into `POST /api/admin/students/import/apply`; one aggregated audit when `applied: true`; `entityType: StudentImport`; summary metadata (counts, `format`, `mode: createOnly`); no row payloads/PII; audit failure non-blocking; dry-run route unchanged; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-write-paths-practical-lessons-import-apply-v1` — wired `lesson.import.apply` into `POST /api/admin/practical-lessons/import/apply`; one aggregated audit when `applied: true`; `entityType: LessonImport`; summary metadata (counts, `format`, `mode: createOnly`, `lessonSource: IMPORT`, `lessonType: DRIVING`); no row payloads/PII (no instructor email, no adminNotes, no schoolStudentId literals); audit failure non-blocking; dry-run route unchanged; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-access-events-student-export-v1` — wired `student.export.download` into `GET /api/admin/students/export`; one access event per successful export; `entityType: StudentExport`; metadata: `format`, `exportedCount`, `hasFilters`, `filterKeys` (names only), `source: admin_export`, `includesPii: true`; no query raw, no search values, no row payloads; audit failure non-blocking; export response headers/body unchanged; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-access-events-practical-lessons-export-v1` — wired `lesson.export.download` into `GET /api/admin/practical-lessons/export`; one access event per successful export; `entityType: LessonExport`; metadata: `format`, `exportedCount`, `hasFilters`, `filterKeys` (names only), `source: admin_export`, `includesPii: true`, `lessonType: DRIVING`; no query raw, no filter values, no row payloads; audit failure non-blocking; export response headers/body unchanged; route + helper unit tests. Validated via `pnpm check`.
- `audit-log-viewer-export-v1` — CSV export from `/admin/audit-logs`; `GET /api/admin/audit-logs/export`; privacy-minimal DTO columns only; filters respected; server-side paginated export up to 10_000 rows; `guardCsvInjection` + reused `escapeCsvField`; no export access audit event (viewer-internal polish; avoids audit-loop noise); UI **Export CSV** button; route + export helper + client tests. Validated via `pnpm check`.

- `student-delete-retention-policy-review-v1` — docs-only retention policy review (2026-07-10); [student-delete-retention-policy-review.md](./student-delete-retention-policy-review.md). No schema/runtime changes.
- `mobile-tablet-readiness-review-v1` — docs-only mobile/tablet readiness review (2026-07-10) + localized layout fixes (Vehicles rows, Lessons header, People L2 tabs); [mobile-tablet-readiness-review.md](./mobile-tablet-readiness-review.md). No API/schema/auth/billing/audit changes. Validated via `pnpm check`.
- `mobile-tablet-readiness-schedule-map-v1` — Schedule Map responsive UX: week/month disabled below `lg` (1024px); auto day fallback on resize; helper copy; edit/delete/nav touch targets `h-11` on narrow viewports; `lib/schedule/schedule-map-responsive.ts` + unit tests. No API/schema/auth changes. Validated via `pnpm check`.
- `mobile-tablet-readiness-pwa-manifest-v1` — minimal PWA install metadata: `public/manifest.webmanifest`, `public/icons/dat-icon.svg`, `app/icon.svg`; `app/layout.tsx` metadata + `viewport.themeColor` (`#2563eb`); `display: standalone`; no service worker/offline/push. Validated via `pnpm check`.
- `mobile-tablet-readiness-admin-surfaces-v1` — localized admin mobile polish: Lessons rows stack on narrow viewports; Vehicles badge wrap + `h-11` action targets; Audit logs card fallback below `md` via `buildAuditLogMobileCardFields` (privacy-minimal); Settings deferred. Validated via `pnpm check`.
- `mobile-tablet-readiness-playwright-viewports-v1` — opt-in Playwright mobile/tablet viewport smoke: `pnpm e2e:mobile-viewports` via `playwright.mobile-viewports.config.ts`; projects `desktop-chromium`, `mobile-chromium` (Pixel 5), `tablet-chromium` (810×1080); read-only admin page loads on `/admin`, `/admin/lessons`, `/admin/vehicles`, `/admin/audit-logs`, `/admin/users` (15 tests); helpers `e2e/helpers/smoke-viewport-layout.ts`; not in `pnpm check`/CI default. Includes pre-existing PWA layout export fix (`app/layout.tsx`). Validated via `pnpm check`.
- `competitive-product-discovery-v1` — docs-only market comparison (DEC-007 waiver granted 2026-07-10): **9 eligible direct + 3 adjacent** benchmarks (canonical registry; HIGH/MEDIUM per row); prevalence denominators; corrected schema-readiness (`LessonRequest`/`Payment`/`Notification` = dormant partial, not product-ready); [competitive-product-discovery.md](../product/competitive-product-discovery.md). No runtime/schema changes. Validated via `pnpm check`.
- `dat-v1-smoke-tenant-school-admin-identity-v1` — smoke org **`DAT Production Smoke`**; School Admin label; production rename completed 2026-07-13 (DEC-045)
- `dat-v1-commercial-platform-cutline-plan-v1` — commercial/platform cutline planning (DEC-046–057); [dat-v1-commercial-release-plan.md](./dat-v1-commercial-release-plan.md); safety tag `dat-v1-core-baseline-95b833e`; [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md); no runtime
- `dat-plan-naming-and-doc-hygiene-v1` — approved commercial plan display names (DEC-058): DAT Core, DAT Plus, DAT Premium; stable keys `DAT_CORE`/`DAT_PLUS`/`DAT_PREMIUM` documented; package composition remains provisional; canonical memory continuity contract (DEC-059); Markdown hygiene; no runtime
- `platform-commercial-catalog-schema-plan-v1` — D4 commercial catalogue schema plan (DEC-060); hybrid Option C; [platform-commercial-catalog-schema-plan.md](./platform-commercial-catalog-schema-plan.md); no runtime/schema/migration
- `platform-commercial-catalog-schema-foundation-v1` — additive Prisma catalogue foundation (DEC-061): enums + 11 models; migration `20260714160000_platform_commercial_catalog_schema_foundation_v1`; product-scoped compound FKs on offerings/grants; Class-B RLS; contract test; **no runtime services; migration not deployed by agent**. Validated via `pnpm check`.
- `platform-commercial-catalog-seed-v1` — deterministic idempotent **seed code in repo** (`lib/platform/commercial-catalog-seed-manifest.ts`, `lib/platform/seed-dat-commercial-catalogue.ts`, `lib/platform/commercial-catalog-seed-cli.ts`); dedicated non-destructive CLI `scripts/seed-commercial-catalog.ts` (`pnpm seed:commercial-catalog`; **`--apply` required for DB writes**); **not** wired into legacy `scripts/seed.ts` / `prisma db seed`; product `DAT`, plans `DAT_CORE`/`DAT_PLUS`/`DAT_PREMIUM`, DRAFT shell `DAT_V1_INITIAL_DRAFT`; **zero entitlement definitions**; **no offerings/prices/grants/add-ons**; **seed not executed by agent**; **no confirmed catalogue rows in any database**. **DEC-062:** legacy `scripts/seed.ts` is **local-only fail-closed** (`lib/ops/destructive-seed-safety.ts`; requires `ALLOW_DESTRUCTIVE_LOCAL_SEED=DELETE_LOCAL_DAT_APP_DATA`); remote targets refused with no bypass. **Incident 2026-07-17:** accidental remote legacy seed against technical smoke DB wiped/reseeded **test-only** data ([incident record](../ops/incidents/2026-07-17-remote-legacy-seed-reset.md)); no real clients; previous smoke org/entity IDs are **historical pre-incident identifiers** — **stale after 2026-07-17** — **must not be used in `DAT_SMOKE_*` configuration**; commercial migration still undeployed; commercial seed still unexecuted. Validated via `pnpm check`.
- `dat-production-smoke-reconcile-v1` (inspect-only sub-slice) — **DEC-063:** do not recreate embedded `PLATFORM_ADMIN`; autonomous MeEngine Platform is future authority; embedded `/platform` transitional/non-authoritative. Repo tooling: `lib/ops/remote-operator-target-guard.ts`, `lib/ops/production-smoke-reconciliation-inspection.ts`, `pnpm ops:inspect-production-smoke-reconciliation`; runbook [production-smoke-reconciliation-inspect.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-reconciliation-inspect.md).
- `dat-production-smoke-canonical-fixtures-v1` — **done (code + technical smoke DB)** (DEC-064): manual rename targets + invite fixtures + negatives + feature overrides + plates; reconcile CLI dry-run/`--apply`. **Human operator (2026-07-28):** (1) applied `pnpm ops:repair-accepted-student-invitation-link -- --apply` — STUDENT ACCEPTED invite with coherent `acceptedUserId`, category B, `APP_USER`; linked `UserInvitation.studentId` only; (2) applied fixture reconcile (`changesApplied=18`: 3 feature overrides, 9 name changes, 5 plate enrollments, 1 audit log); (3) read-only inspector confirmed `organizationReady` / `domainReady` / `canonicalSchoolAdminFound` / `categoryBReady` / `requiredFeaturesReady` / all canonical positive fixture groups ready / `readOnlySmokePotentiallyReady` / `mutationSmokePotentiallyReady` / `fixturesPotentiallyReady` with **no blockers**; invited fixtures `provenance=invite`; negatives Non-B / A1 / `03-DS-24` intact; Sarah Williams, Bob Wilson, John Doe preserved; only informative warning `additional_school_admins_informative_only`; (4) second dry-run idempotent (`noop` features, 0 name changes, all fixtures `canonical=true`). **Agent did not execute remote repair/apply.** Commercial catalogue untouched; embedded `PLATFORM_ADMIN` not recreated. Full IDs/emails stay in operator vault only. Follow-up ops: **`dat-production-smoke-hosted-verification-v1`**. P1 People list bug remains: **`people-instructor-invite-accept-list-refresh-v1`**.
- `student-invite-accept-student-link-repair-v1` — **done (repo + remote):** accept path persists `studentId`; repair CLI applied by human on smoke tenant (2026-07-28); agent did not run remote apply.

### School person identifiers (code today vs Settings product)

**Exists in repo (not Settings UI):** `Student.schoolStudentId` (+ `schoolStudentYearSuffix` / `schoolStudentSequence` / `schoolStudentIdSource`), helpers `lib/students/student-school-id.ts` (hardcoded **YY+NNN** 5-digit build/parse for A Conquistadora-style IDs), unit tests `student-school-id.unit.test.ts`; manual create/import paths set school IDs; tenant unique `@@unique([organizationId, schoolStudentId])`. **Also:** `Student.studentNumber` global `@unique` autoincrement; `Student.studentIdNumber` global `@unique` (nullable; often legacy/smoke labels). **Instructor:** `instructorIdNumber` global `@unique` (nullable); `instructorLicenseNumber` global `@unique` (official license — must not be reused as internal school number). **Unlinked invite accept** creates Student with `userId` + `organizationId` only — leaves `schoolStudentId` / `studentIdNumber` empty (gap vs manual create). **`/admin/settings`** has no identifiers/numbering product config (Settings currently operator/internal per DEC-026). Product plan backlog: **`school-person-identifiers-settings-product-plan-v1`** (DEC-065) — plan first; no schema/numbering system in this batch.

### Likely next (canonical sequence) — historical archive

Superseded by [Canonical current state](#canonical-current-state). The sentence
below is preserved historical sequence text and is **not** the live recommended next.

See [Canonical current state](#canonical-current-state). Historical sequence at
the time of this archive: **`node-24-runtime-migration-v1`** (since closed).
The later DAT_4.5 planned next `next-security-patch-containment-v1` was
superseded by DEC-067 / `next-supported-lts-security-remediation-v1`. After the closed Node 24 and
audit work: Platform separation plan → audit-approved refactors. P1 parallel and
product backlog: [roadmap-todo.md](./roadmap-todo.md).

### Engineering excellence (audit status) — historical start snapshot

- Localized refactors and hygiene have occurred across many prior slices.
- The global, systematic maintainability audit **started on 2026-08-06** in `engineering-excellence-audit-v1`, based on `da5aea6`.
- **Live supersession:** the audit is formally **CLOSED** (2026-08-13; explicit human GO) with 51 findings and 51/51 remediation coverage. Do not read the start-snapshot bullets below as current live status.
- The normalized inventory phase is complete: 661 TypeScript/TSX files, 438 production files, 223 test/E2E files, 58 API routes, 96 components, 9 hooks, 369 `lib` files, and 27 scripts.
- No concrete finding, severity, extraction target, file move, or refactor slice is confirmed yet.
- Detailed evidence and audit invariants are maintained in [engineering-excellence-audit-v1.md](./engineering-excellence-audit-v1.md).
- The audit inherits the closed Node 24 baseline: local Node `v24.18.0`, repository engine `24.x`, GitLab `node:24`, Vercel Node 24.x, application merge `909b69a`, closure/main baseline `da5aea6`, 207 test files / 1738 tests, production build, and post-deploy read-only smoke passed.
<!-- node24-local-runtime-chain-v1 -->
- Local Windows/Git Bash runtime-chain clarification (2026-08-07): bare `pnpm` is a Volta shim currently executed with Volta's Node `v20.20.0`. Explicitly launching only the outer pnpm process with portable Node 24 is also insufficient because nested bare pnpm calls can fall back to Volta/Node 20. Full transitive Node-24 validation was proven with a temporary guarded PATH shim forcing direct and nested pnpm calls through portable Node `v24.18.0` + pnpm `10.24.0`; 9 nested shim invocations were recorded and the resulting check passed 207/207 test files, 1738/1738 tests, and the production build before the shim was removed.
- The Super Agent remains the reusable repository-aware operational worker, but remote writes, production mutation, destructive actions, and behavioural changes always require explicit human authorization.
- Rulebook audit finding `SA-GOV-001` is confirmed and fixed in the audit branch: blocking gates must validate exact propositions, inspect semantic context, distinguish current from historical evidence, and explicitly account for untracked files.
- Rulebook validation completed: `SA-GOV-002` authority hierarchy is apt; `SA-GOV-003` is satisfied by the canonical Merge readiness criteria and must not be duplicated.
- Governance finding `SA-GOV-004` is confirmed and fixed in the audit branch through a proportional, evidence-based Engineering Quality Review Protocol and reviewer expectations.
<!-- ui-orch-001-linked-student-profile-split-mutation -->
- Production UI finding `UI-ORCH-001` confirmed: linked student profile editing uses two sequential writes (`Student` then linked `User`) and may leave the records divergent if the second write fails.
- The client reports partial success and reloads the persisted student state, but no atomic server operation, compensation, or direct orchestration test exists.
<!-- api-atom-001-generic-user-update-split-write -->
- `API-ATOM-001` confirmed: `/api/users/update` can persist `User` before a related `Student` or `Instructor` write fails because the route has no transaction or compensation.
<!-- ui-orch-002-instructor-profile-category-split-mutation -->
- `UI-ORCH-002` confirmed: instructor editing performs profile/license and qualified-category writes separately and can produce an explicitly reported partial success.
- Approved planning direction: move student and instructor edits to aggregate-specific transactional services behind their existing PATCH routes, then narrow the generic user-update contract.
- No runtime implementation is authorized in this analysis-only branch.
<!-- super-agent-continuity-recovery-v1 -->
- Conversation-independent Super Agent continuity is now mandatory through `docs/ops/super-agent-continuity-state.md` and the Recovery Reconstruction Drill.
<!-- ui-struct-001-people-manager-orchestration-concentration -->
- `UI-STRUCT-001` confirmed: both people-management components retain multiple workflows and local reconciliation states without direct component tests.
- Structural simplification is deferred until the approved atomicity and generic-contract slices are complete.
- No generic cross-domain People manager is recommended.
<!-- a11y-001-people-search-accessible-names -->
- `A11Y-001` confirmed: People search fields and icon-only search actions lack complete programmatic accessible names.
<!-- a11y-002-people-badge-help-touch-discoverability -->
- `A11Y-002` confirmed: badge explanations remain tooltip-dependent and are not reliably discoverable on touch.
- Performance review completed with no separate finding: list rendering is bounded and no measured user-visible cost was established.
<!-- api-dup-001-config-route-skeleton-duplication -->
- `API-DUP-001` confirmed: Settings and Feature Flags duplicate a substantial route skeleton; normalized similarity measured 0.7739.
<!-- api-struct-001-vehicle-route-domain-concentration -->
- `API-STRUCT-001` confirmed: Vehicles combines transport, access, business rules, projection, validation, and persistence.
<!-- small-typed-helpers-over-generic-route-factories-v1 -->
- Approved direction: small typed auxiliary functions and domain-specific services; no generic CRUD route factory.
- Configuration audit logging remains best-effort and does not propagate its own persistence failures.
<!-- api-dup-002-local-super-admin-tenant-helper-duplication -->
- `API-DUP-002` confirmed: 17 routes declare a local SUPER_ADMIN/organization/tenant context helper, with 16 local implementation variants.
<!-- domain-modular-design-and-thin-route-adapters-v1 -->
- The repository already follows a domain-modular direction; the correction is to place proven cross-cutting behavior in a focused admin-route-access module.
- Domain access, demo, feature, schema, DTO, persistence, and audit rules remain in their existing modules.
<!-- ui-struct-002-schedule-map-view-orchestration -->
- `UI-STRUCT-002` confirmed: Month and Week substantially duplicate the same wide-grid card and interaction structure.
- Day is structurally distinct and should remain a separate timeline view.
- Schedule Map already has meaningful modular extraction that must be preserved.
- No generic calendar framework is recommended.
<!-- ui-struct-003-lesson-form-orchestration-concentration -->
- `UI-STRUCT-003` confirmed: LessonForm coordinates option loading, form state, role/mode/type policies, validation, payload composition, and all visual sections.
- Existing create/update request builders, edit hook, parsers, services, styles, and Student option mapping are positive modular boundaries.
- No create/edit HTTP-contract duplication finding was confirmed.
- LessonForm should remain the composition root while focused policies, option loading, and sections move to typed modules.
<!-- a11y-003-lesson-form-control-associations -->
- `A11Y-003` confirmed: LessonForm Select labels are not associated with their triggers, while Student search inputs and icon-only clear actions lack accessible names.
- Existing date/time and Student checkbox associations remain positive.
<!-- lesson-form-client-server-policy-classification-v1 -->
- No broad client/server lesson-policy duplication finding was confirmed.
- The hard-coded client EXAM limit belongs in `lesson-form-policy-module-v1`; server validation remains authoritative.
- The next read-only target is the EXAM/THEORY_EXAM edit participant contract.

### Operator housekeeping (local / Git — human-executed)

- Obsolete remote branch `feature/schedule-and-vehicles` removed; historical commit `b101112` preserved via annotated tag **`archive-schedule-and-vehicles-b101112`** (**historical archive only** — not a release or recovery baseline).
- Docker/local runner cleanup completed by human operator (ephemeral IDs not recorded here).

### Deferred (not next)

- **`calendar-lessons-polish-v1e-student-warnings`** (P3)
- `people-management-ux-unification-instructor-route-split-v1` — **deferred (D4)**
- Platform cross-tenant audit viewer — deferred; tenant-aware CSV export from `/admin/audit-logs` is **done**

### Product direction (backlog — post-production polish)

**Done:** mobile/tablet readiness; competitive product discovery; commercial cutline planning; catalogue schema foundation + seed **code** (not executed); DEC-063/064 smoke reconcile + fixtures; student invite link repair.

**Open product backlog:** `lesson-reminders-email-product-plan-v1`, `school-balances-ledger-product-plan-v1`, controlled lesson requests, student progress by competencies, import/export commercial packaging; `school-person-identifiers-settings-product-plan-v1` (DEC-065). Commercial catalogue read-services gated by Platform separation plan.

---

## Lesson ↔ Student nullability policy (review)

Docs-only review completed: [lesson-student-nullability-policy-review.md](./lesson-student-nullability-policy-review.md).

<!-- hosted-production-smoke-closure-2026-07-31 -->
## Hosted Production smoke verification — closed 2026-07-31

The P0 slice `dat-production-smoke-hosted-verification-v1` is operationally complete.

**Deployment provenance**

- Vercel Production status at smoke close: **Ready**.
- Production domain verified: `www.meengine.io`.
- Runtime commit against which hosted gates passed: `14bdc40` — `Merge branch 'canonical-state-reconciliation-v1'`.
- Hosted-smoke docs merge on `main`: `07371e7`.
- Last operator-confirmed Production served commit (after that merge): **`07371e7`**. Re-confirm after every later deployment; do **not** assert a newer `main` SHA is served without fresh Vercel evidence.
- The Vercel dashboard displayed `1d ago` when checked on 2026-07-31; an exact deployment timestamp was not captured.
- Local closure branch was based on the same canonical runtime commit (`14bdc40`).

**Hosted verification evidence**

- Fixture preflight: **1 passed, 0 skipped, 0 failed**.
- API health + public signup guard: **exit code 0**; health passed and public signup returned the expected disabled response.
- Hosted read-only UI: **4 passed, 0 skipped, 0 failed**.
- Hosted lesson mutations: **1 passed, 0 skipped, 0 failed**.
- The created lesson was retained as the required immutable smoke trail.
- The production mutation opt-in was process-local and was not persisted.
- No fixture repair, reseed, cleanup, schema change, or unapproved database operation was performed.

**Operational follow-up**

The deployment log reported that Node.js 20 is deprecated for future Vercel deployments. Handle this only in the separate slice `node-24-runtime-migration-v1`; do not mix the runtime migration into the completed hosted-smoke slice.

<!-- dat-toolchain-rationalization-v1 -->
### Toolchain rationalization state

- `TOOLCHAIN-001` confirmed: project `engines.node=24.x` conflicts with project Volta Node `20.20.0`; bare Volta pnpm was proven to execute under Node 20.
- pnpm `10.24.0` is the sole authoritative package manager.
- Vitest and Playwright have distinct unit/integration and browser/E2E ownership respectively.
- `tsx` is actively required by repository scripts.
- Corepack currently remains justified in CI.
- `ts-node` and Playwright child-runtime provenance require targeted read-only evidence before any cleanup decision.
- No tool removal or runtime/package/config change is authorized in the active audit slice.

<!-- lesson-edit-contract-finding-v1 -->
### Lesson edit contract audit state

- `UI-CONTRACT-001` confirmed: edit mode exposes EXAM/THEORY_EXAM participant multi-select and lesson-type changes that the current PUT contract cannot persist.
- Exam edit currently operates on one persisted Lesson row with one `studentId`; no grouped-exam update path was found.
- `studentIds` and `lessonType` are silently dropped before or at the update boundary.
- no implementation is authorized in the audit branch.
- remediation is queued as `lesson-edit-contract-alignment-v1`.

<!-- exhaustive-snapshot-audit-5eded00-v1 -->
### Full-project engineering audit snapshot

- Snapshot HEAD: `5eded00ae3d0dedde8b1a251d393a9180911814b`.
- First transversal pass: 817 safe-snapshot files / 661 TS/TSX files.
- Audit total after exhaustive second pass: 46 confirmed findings = 2 governance + 40 code/runtime/security/architecture/test + 4 toolchain/configuration/dependency-security.
- Highest-priority new safety finding: `BILLING-SEC-001`.
- Other P1 additions: `LICENSING-001`, `AUTH-RATE-001`, `API-ATOM-002`, `ONBOARD-001`.
- P2 additions: `AUTHZ-OPERATOR-001`, `AUTH-LEGACY-001`, `CODE-HYGIENE-001`, `UI-DUP-001`, `SCHEMA-LEGACY-001`.
- Toolchain addition: `TOOLCHAIN-002`.
- No implementation is authorized in the engineering audit branch.

<!-- exhaustive-snapshot-audit-5eded00-v2 -->
### Exhaustive engineering audit — static snapshot completion

- Static snapshot discovery is complete for HEAD `5eded00ae3d0dedde8b1a251d393a9180911814b`.
- Static-snapshot total before hosted Wave A1: 46 confirmed findings = 2 governance + 40 code/runtime/security/architecture/test + 4 toolchain/configuration/dependency-security.
- Security is the implementation-order priority.
- P0/P1 security containment leads with billing authenticity/idempotency, JWT revocation and Next security patching.
- Every remaining static signal has been resolved as a confirmed finding, a named evidence/refactor slice, or a documented false positive.
- Data-sensitive model disposition and real concurrency behavior still require their explicitly queued read-only/execution validations; hosted response headers are now confirmed as `SEC-HEADERS-001`.
- No implementation is authorized in this audit branch.

<!-- exhaustive-audit-master-remediation-ledger-v1 -->
### Finding-to-slice coverage

- 48/48 confirmed findings have an explicit remediation/disposition mapping in `roadmap-todo.md`.
- Security-first execution waves are defined; DAT_4.4 should start only after audit evidence/disposition work is sufficiently delineated for slice execution.

<!-- hosted-security-wave-a1-headers-v1 -->
### Hosted security Wave A1 checkpoint

- Current total after hosted Wave A1: 47 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 4 toolchain/configuration/dependency-security.
- HTTPS redirect and two-year HSTS are confirmed on tenant and Platform hosts.
- Anonymous GET access to tenant license/features, settings and feature-flags APIs fails closed with 401.
- Billing webhook route presence is confirmed on both public hosts by non-mutating GET=405 evidence, reinforcing `BILLING-SEC-001`.
- New `SEC-HEADERS-001` maps to `security-response-headers-hardening-v1`.
- No hosted mutation was performed.

<!-- security-wave-a2-dependency-audit-v1 -->
### Dependency security Wave A2 checkpoint

- Current total after A2/A2.1: 48 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 5 toolchain/configuration/dependency-security.
- 113 direct dependencies; 81 unique lockfile advisories; 61 appear in the production graph.
- `DEP-SEC-001` remains P0/P1: immediate Next 14.2.35-level containment followed by deliberate supported-LTS migration.
- New `DEP-SEC-002` maps to `dependency-security-monitoring-v1`.
- NextAuth advisory paths do not match the current Credentials-only/no-getToken application path; patch alignment remains evidence-first.
- nine zero-importer direct-prod roots enter the dependency responsibility/pruning ledger.
- no dependency mutation was performed.

<!-- security-wave-a3-hosted-auth-v1 -->
### Hosted authentication Wave A3 checkpoint

- Current total remains 48 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 5 toolchain/configuration/dependency-security.
- NextAuth CSRF/callback cookies are Secure, HttpOnly, SameSite=Lax, Path=/ and host-only on both public hosts.
- no cross-subdomain cookie Domain was observed.
- authoritative hosted sign-in path is `/auth/login`; earlier `/login=404` is closed as a false positive.
- session endpoint edge probes remained Vercel MISS with age=0 across repeat and dummy-cookie requests.
- no new auth-cookie/cache finding was promoted.
- `AUTH-SESSION-001` remains open because stateless JWT revocation is a separate server-side contract.

<!-- security-wave-a4-commercial-evidence-v1 -->
### Commercial security Wave A4 checkpoint

- Current total remains 48 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 5 toolchain/configuration/dependency-security.
- billing webhook is POST-only, publicly deployed on both hosts and contains no detected authenticity-verification signal in its route.
- commercial/admin endpoints fail closed anonymously with 401 on both hosts.
- no new anonymous commercial exposure was found.
- A4 reinforces `BILLING-SEC-001`, `LICENSING-001` and `AUTHZ-OPERATOR-001`; it does not create another finding.
- `BILLING-SEC-002` and `LICENSING-002` remain open and were intentionally not mutation-tested.
- Security Wave A1-A4 is complete.
- next evidence phase: Wave B data-sensitive read-only model disposition.

<!-- data-wave-b1-legacy-dormant-inventory-v1 -->
### Data Wave B1 checkpoint

- Current total remains 48 confirmed findings with 48/48 roadmap coverage.
- B1 used an explicit PostgreSQL read-only transaction against the currently configured remote Supabase target.
- `Exam`, `ExamRegistration`, `LessonRequest`, `Payment`, and `Notification` each contain 0 rows.
- `SCHEMA-LEGACY-001` and `SCHEMA-LEGACY-002` are therefore stronger removal/disposition candidates, but deletion remains unauthorized until runtime/migration/environment responsibility is proven.
- current `DATABASE_URL` source is local `.env`; environment/configuration responsibility audit is the next evidence slice.

<!-- environment-configuration-responsibility-audit-v1 -->
### Environment configuration E1-E4 checkpoint

- Current total: 49 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 6 toolchain/configuration/dependency-security.
- `CONFIG-ENV-001` is confirmed.
- automatic local `DATABASE_URL`/`DIRECT_URL` resolution currently selects `.env` and matches the Production operator database target.
- `.env.local` provides no database override.
- current `env:check` has no explicit Production database identity/isolation guard.
- remediation: `local-development-database-isolation-v1`.
- operator and smoke production profiles remain intentionally separate; they have zero key overlap.
- follow-up cleanup: `environment-configuration-contract-consolidation-v1` and `public-env-pruning-v1`.
- until isolation is implemented, ordinary local write-capable runtime workflows must not rely blindly on automatic `.env` database resolution.

<!-- environment-configuration-disposition-e5-e7-v1 -->
### Environment E5-E7 disposition checkpoint

- Finding total remains 49 with 49/49 remediation coverage.
- KEEP: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- CONSOLIDATE: remove `AUTH_SECRET` alias and standardize DAT on `NEXTAUTH_SECRET`.
- REMOVE: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LICENSE_TIER`.
- DEFER external ownership: `VERCEL_OIDC_TOKEN`; zero DAT responsibility is proven, but external-tool ownership must be verified before deletion.
- cleanup implementation remains unauthorized on the audit branch.
- `local-development-database-isolation-v1` remains the first environment execution slice.

<!-- data-wave-b2-responsibility-and-sa-handoff-v1 -->
### Data Wave B2 checkpoint

- Findings remain 49 with 49/49 remediation coverage.
- The five B1 zero-row models are **not yet removal-ready** because B2 found remaining schema/runtime/ops/script responsibilities.
- `Exam`: 2 runtime delegates.
- `ExamRegistration`: 1 runtime/ops delegate.
- `LessonRequest`: 3 runtime delegates including instructor/student pages.
- `Payment`: 3 runtime delegates including instructor/student deletion logic.
- `Notification`: 1 runtime/ops delegate.
- next evidence-only phase: `legacy-model-runtime-responsibility-classification-v1`.

<!-- data-wave-b3-runtime-responsibility-v1 -->
### Data Wave B3 checkpoint

- Findings remain 49 / 49 mappings.
- No target model has a runtime write; all writes are destructive-local-seed compatibility only.
- `ExamRegistration`: retirement candidate, active business blocker none.
- `Notification`: retirement candidate, active business blocker none.
- `Payment`: retirement candidate after defensive delete/retention decoupling.
- `Exam`: blocked by one admin-vehicles API read that requires semantic classification.
- `LessonRequest`: blocked by two active page counts on instructor/student pages.
- next evidence phase: `legacy-model-blocker-semantic-closure-v1`.

<!-- data-wave-b4-blocker-semantics-v1 -->
### Data Wave B4 checkpoint

- Findings remain 49 / 49 mappings.
- `Exam`: semantic legacy fallback confirmed; retirement-ready after legacy vehicle-status/delete-relation cleanup plus mechanical/schema retirement.
- `ExamRegistration`: retirement-ready pending coordinated ops/demo/seed/schema retirement.
- `Notification`: retirement-ready pending coordinated Smoke/seed/schema retirement.
- `Payment`: near retirement-ready; only zero-dependency delete-policy semantics remain to close.
- `LessonRequest`: previous active-page classification weakened; both observed page count results are discarded by tuple destructuring, but instructor Pending Requests JSX requires one final data-flow proof.
- next evidence phase: `legacy-model-blocker-final-semantic-closure-v1`.

<!-- data-wave-b41-final-semantics-ui-data-001-v1 -->
### Data Wave B4.1 checkpoint

- Findings: **50**.
- Remediation coverage: **50/50**.
- New finding: `UI-DATA-001` → `dashboard-statistics-contract-alignment-v1`.
- instructor dashboard visibly renders two misbound statistics; true pending LessonRequest count is discarded.
- student pending LessonRequest count is dead/unconsumed work.
- all five B1 zero-row models are now retirement-ready at the semantic layer, subject to coordinated relation/policy/ops/schema cleanup and execution-time safety gates.
- next evidence/planning phase: `legacy-model-retirement-execution-contract-v1`.

<!-- data-wave-b5-retirement-execution-contract-v1 -->
### Data Wave B5 checkpoint

- Findings remain 50 / 50 mappings.
- Runtime-decoupling candidate scope: 20 files.
- Targeted affected tests detected: at least 7.
- B5 raw Prisma-reference graph falsely suggested target cycles; historical DDL proves physical FK order `payments -> exam_registrations -> exams`.
- Stage A: `legacy-model-runtime-decoupling-v1`.
- Stage B: `legacy-model-schema-retirement-v1`.
- Stage B requires completed local DB isolation, validated deployed Stage A, exact target identity, five zero-row preflights and explicit human GO.
- next evidence phase: `legacy-model-migration-workflow-closure-v1`.

<!-- data-wave-b51-migration-workflow-db-migration-001-v1 -->
### Data Wave B5.1 checkpoint

- Findings: **51**.
- Remediation coverage: **51/51**.
- New finding: `DB-MIGRATION-001` → `migration-deploy-target-safety-gate-v1`.
- migration deploy remains intentionally human-operated; zero CI/script/package ownership was found.
- the existing remote target guard is fail-closed and identity-aware but explicitly documented as inspect-only.
- Stage B therefore requires a purpose-scoped migration-write target gate rather than raw env trust.
- migration authoring workflow is the remaining Data Wave contract gap.
- next phase: `legacy-model-migration-authoring-contract-v1`.

<!-- data-wave-b52-authoring-and-data-wave-b-closure-v1 -->
### Data Wave B5.2 / Wave B closure

- Findings remain **51**.
- Remediation coverage remains **51/51**.
- No new authoring finding: ownership is already covered by CONFIG-ENV-001, TEST-ARCH-001 and DB-MIGRATION-001.
- no isolated local/Supabase/test/shadow DB authoring workflow currently exists.
- Data Wave B audit/disposition is closed.
- legacy-model retirement has a staged implementation contract with explicit prerequisites; implementation remains unauthorized in DAT_4.3.
- next phase: `audit-surface-completeness-reconciliation-v1`.

<!-- engineering-excellence-audit-v1-formal-closure-v1 -->
## Engineering excellence audit closure

`engineering-excellence-audit-v1` was formally closed on **2026-08-13** after
explicit human authorization and a Final Engineering Quality Review with zero
closure-blocking dimensions.

The audit closed with **51 confirmed findings and 51/51 remediation coverage**.
Closure does not mean those findings are fixed; they remain active remediation
debt governed by the post-audit execution queue.

**At this audit-closure checkpoint (historical):** the first P0 execution
priority was `billing-webhook-authenticity-gate-v1`, followed by
`next-security-patch-containment-v1`. Database/migration safety foundations and
the Platform separation architecture lane proceed according to their documented
prerequisites and independence boundaries.

**Live supersession (2026-08-20 Git-verified):** Solution #1 is CLOSED BY CONTAINMENT. Solution #2 / `DEP-SEC-001` / `next-supported-lts-security-remediation-v1` is **CLOSED + PUBLISHED** on `main` at `0409d92525940be751e6bc07c9da32668a834e53`. `DEP-SEC-001` is **CLOSED ON PUBLISHED MAIN**. Solution #3 / `CONFIG-ENV-001` / `local-development-database-isolation-v1` is **CLOSED ON PUBLISHED MAIN** at merge `14c3865372502f074941a1fc81a55b5ec7f1b589`. Solution #4 / `DB-MIGRATION-001` is **IMPLEMENTED IN WORKTREE / B1 CORRECTED / TARGETED UNIT VALIDATION PASSED / FULL CHECK EXPECTED_ENVIRONMENT_BLOCK** (DEC-069; recovery **COMMITTED + SOURCE BRANCH PUBLISHED** at `47a101b261a2fab144d73469e699389fc94ceb1c`; implementation uncommitted).

**Historical (2026-08-18 in-branch Solution #3 checkpoint):** Solution #3 was **ACTIVE** and **IMPLEMENTED + VALIDATED IN-BRANCH** (DEC-068), **SOURCE BRANCH PUBLISHED**, **NOT YET INTEGRATED ON MAIN**, **NOT CLOSED ON MAIN**. That wording is preserved as pre-publication evidence and is superseded by the published merge above.

<!-- engineering-excellence-audit-main-integration-v1 -->
## Engineering audit integration baseline

The formally closed `engineering-excellence-audit-v1` audit was integrated
locally into `main` using an explicit `--no-ff` merge.

- Audit source HEAD: `9d275cfa57bc7fe809c95f7c7a0326f339014809`.
- Main merge commit: `81ec6079fb41289e951dfa900b7d90635aa03425`.
- Post-merge canonical validation: PASS.
- Findings retained: 51.
- Remediation coverage: 51/51.
- Next working slice **at this integration checkpoint (historical):** `billing-webhook-authenticity-gate-v1`.

This integration does not itself publish `main` remotely or authorize a
behavioural remediation.

<!-- billing-webhook-authenticity-gate-v1-kickoff -->
## Historical P0 kickoff — billing webhook authenticity (CLOSED)

This section is the post-audit working-slice navigator as of kickoff. It is
**not** current live state.

- Historical branch: `billing-webhook-authenticity-gate-v1`.
- Parent integrated `main`: `25a656382f46b6d79868510aeef697c788341113`.
- Priority: P0.
- Audit branch local cleanup: complete.
- First phase at kickoff: read-only implementation preflight.
- **Supersession:** Solution #1 / `BILLING-SEC-001` is CLOSED BY CONTAINMENT and
  integrated into `main`. There is no active Billing implementation branch at
  the DAT_4.5 recovery checkpoint.

<!-- deferred-commercial-billing-product-boundary-v1 -->
## Deferred commercial Billing product boundary

Commercial Billing is intentionally **not a current client-delivery feature**.

- `billing-webhook-authenticity-gate-v1` **was** security containment only and
  is now **CLOSED BY CONTAINMENT**. It existed to remove the unauthenticated
  public mutation path; it is not a live implementation slice.
- School-to-MeEngine/DAT commercial subscriptions and feature add-ons depend on
  the autonomous Platform commercial authority.
- Student-to-school payments remain a separate optional DAT add-on/premium
  product concept and are deferred until after the first client web app is live
  and stable in Production.
- Current documented commercial cadence remains monthly/annual unless a later
  product decision explicitly changes it.
- No current containment work determines final pricing, package composition,
  PSP choice, proration, payment UX or student-payment workflow.

<!-- billing-sec-001-current-state-closure-v1 -->
### `BILLING-SEC-001` remediation state

`BILLING-SEC-001` is closed by containment for the current v1 public webhook
boundary and is integrated into local `main`.

Supported provider webhook requests currently fail closed before body parsing,
provider parsing, persistence or subscription/entitlement mutation because
provider authenticity verification has not yet been implemented.

This state is intentionally temporary in product terms but complete as the
current security remediation: any future reopening of provider webhook
processing requires provider-specific cryptographic authenticity proof first.

Implementation anchor: `b584f7608ae37c7ad5cbf62b37613b2823b84f37`.
Local-main integration recovery anchor: `38812394107e96649cb2b61bbeae73ae6ae3be04`.

<!-- dat-45-live-navigator-v1 -->
## DAT_4.5 live navigator

**Conversation-recovery note (2026-08-20):** part of the external ChatGPT
conversation became unavailable after Solution #3 work. Live Git evidence is
authoritative. This recovery checkpoint reconciles canonical docs to the
published Solution #3 merge. No product behavior was changed by the recovery
itself.

- DAT_4.4: CLOSED.
- Engineering Excellence Audit: **CLOSED** (explicit human GO). Findings 51;
  coverage 51/51; repository-static frontier: none. Do not reopen the global
  audit.
- Solution #1: **CLOSED BY CONTAINMENT**, integrated into `main`.
- Solution #2 / `next-supported-lts-security-remediation-v1`: **CLOSED +
  PUBLISHED**. Published merge `0409d92525940be751e6bc07c9da32668a834e53`.
  `DEP-SEC-001` is **CLOSED ON PUBLISHED MAIN**. Solution #2 branch cleaned
  local + remote.
- Solution #3 / `local-development-database-isolation-v1`: **CLOSED ON
  PUBLISHED MAIN**. Implementation anchor
  `a717534ed351440fdfbf6800b218d56d6eb85282`; accepted implementation tree
  `5b9aa29649bdf929bf7df5f9f641eb950ce16275`; continuity/source-publication
  anchor `810cc9446c5f89805e282672bc03f743f8480d75`; published merge
  `14c3865372502f074941a1fc81a55b5ec7f1b589` (tree
  `cb7b0a7409b91a70a8c601f36d4e80fd014404cf`). Source branch cleanup
  **COMPLETE**. Historical in-branch wording “ACTIVE / SOURCE BRANCH
  PUBLISHED / NOT YET INTEGRATED ON MAIN” is superseded by this merge.
- Solution #4 / `migration-deploy-target-safety-gate-v1`: **IMPLEMENTED IN
  WORKTREE / B1 CORRECTED / TARGETED UNIT VALIDATION PASSED / FULL CHECK
  EXPECTED_ENVIRONMENT_BLOCK** (DEC-069). Base / published `main`
  `14c3865372502f074941a1fc81a55b5ec7f1b589`. Recovery: **COMMITTED +
  SOURCE BRANCH PUBLISHED** at `47a101b261a2fab144d73469e699389fc94ceb1c`
  (tree `ec8b4d18e10c1a42c1cca8e88292e9bce6f8a700`). Implementation
  remains uncommitted worktree; implementation commit **none**;
  implementation publication **none**; merge SHA **none**. Do not invent
  those SHAs. Do not claim a migration has been run. Architect EQR B1
  (independent DIRECT_URL host) is corrected in the worktree. Recovery
  publication history: Super Agent continuity 2026-08-20 (one-shot
  exception; not standing hook-bypass authorization). Next human gate:
  architect re-review of B1, then staging/commit — not migration
  execution.
- Authoritative published `main`: `14c3865372502f074941a1fc81a55b5ec7f1b589`.
- Canonical documentation and Super Agent continuity are updated in each
  solution branch. Do not create a separate documentation-only branch for
  normal solution state. Do not invent future commit SHAs.
- `dependency-security-monitoring-v1` and `TOOLCHAIN-002` remain separate.
- Residual after DEC-069: raw `prisma migrate deploy` / `migrate dev` /
  `db push` remain possible bypasses if an operator ignores the wrapper;
  `next start`; scripts that instantiate PrismaClient without `env:check`;
  demo apply scripts without DB identity guard; `create-platform-admin`;
  `seed-commercial-catalog --apply`; environment contract consolidation;
  Vercel Preview-vs-Production DB separation; Docker/local DB provisioning;
  changing any local `.env` file. `CONFIG-ENV-001` does not make every
  Prisma command safe. Canonical remote migrate deploy is DEC-069.
- Residual Solution #2 debt (keep, do not fix here): React Hooks v7
  `set-state-in-effect` 29, `immutability` 2, `purity` 1; existing
  `no-explicit-any` / `no-unused-vars` / `no-empty-object-type` warnings;
  Turbopack CSS `.print\\:hidden` **BENIGN_WARNING**;
  `DEP-SEC-002`; `@next/swc-wasm-nodejs` zero-consumer cleanup; React 19
  ecosystem peer review; browserslist/IE11 cleanup.
