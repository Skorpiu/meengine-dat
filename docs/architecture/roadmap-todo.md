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

## P0 / Controlled production (first B2B client)

**Cutline:** [production-readiness-cutline.md](./production-readiness-cutline.md) (**DEC-032**). DAT core is production-ready for **invite-only**, no public signup, no live billing. P0 here is **operational discipline**, not new features.

| Item | Notes |
| ---- | ----- |
| **Credential policy (operational)** | Never expose `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, or client handoff; scoped accounts + vault |
| **Target env deploy discipline** | Per environment: `prisma migrate status` / `migrate deploy`, `pnpm check` green, post-deploy smoke |
| **`PUBLIC_SIGNUP_ENABLED=false`** | Mandatory on first B2B client production (unset or explicit `false`) |

---

## P1 / Production path (post–Calendar v1d)

| Slice | Status | Notes |
| ----- | ------ | ----- |
| `production-readiness-cutline-review-v1` | **Done (analysis)** | Analysis-only; approved |
| `production-readiness-cutline-doc-v1` | **Done (docs)** | Cutline + DEC-032 + minimal smoke sync |
| `calendar-lessons-edit-flow-refresh-fix-v1` | **Done (analysis)** | P1 blocker from operator smoke: PUT omitted instructor/student; wrong edit form default; v1b refresh OK |
| `calendar-lessons-edit-persistence-refresh-fix-v1` | **Done** | DEC-033: PUT persists instructor (User.id) + student; `lesson-update-request-body.ts`; edit form fix; no schema/migration |
| `calendar-lessons-edit-practical-number-reassign-v1` | **Done** | DEC-034: DRIVING edit recalculates `practicalLessonNumber` when `studentId` changes; `Practice No. N` label; no schema/migration |
| `calendar-lessons-edit-modal-ux-v1` | **Done** | DEC-035: Dialog edit in Schedule Map; admin + instructor dashboards; fallback page retained; no schema/API |
| `production-smoke-e2e-readonly-v1` | **Done** | DEC-036: hybrid API + Playwright read-only smoke; env guards; `pnpm e2e:smoke:api` / `e2e:smoke:readonly` / `e2e:smoke:prod`; runbook [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md); no mutations; not in `pnpm check`/CI default |
| `instructor-invite-auto-approve-v1` | **Done** | DEC-037: invitation accept sets `isApproved=true` for all invited roles (including INSTRUCTOR); public signup unchanged; no schema/migration/RLS |
| `instructor-invite-license-fields-v1` | **Done** | DEC-038: INSTRUCTOR invite collects license number + expiry; stored on `UserInvitation`; accept uses real data; no `INVITE-PENDING-*`; migration `20260623120000_add_instructor_license_fields_to_invitations` |
| `production-smoke-e2e-fixture-preflight-v1` | **Done** | DEC-039: zero-write fixture preflight; `pnpm e2e:smoke:fixture-preflight`; explicit org/student/instructor/vehicle IDs; technical smoke tenant **`DAT Production Smoke`** on www.meengine.io (DEC-045) |
| `production-smoke-e2e-lesson-mutations-v1` | **Done** | DEC-040: API-first DRIVING create + time update; `pnpm e2e:smoke:mutations`; dual opt-in; no cleanup; not in `pnpm check`/CI |
| `instructor-qualified-categories-management-v1b` | **Done** | School Admin qualified categories on Edit Instructor; PATCH admin instructor; M2M `_InstructorCategories`; no migration |
| `production-smoke-e2e-testids-v1` | **Done** | DEC-041: smoke `data-testid` markers; booking endpoint exposes `qualifiedCategoryNames` + `instructorLicenseExpiry` when `forBooking=true`; preflight category B validation |
| `production-first-client-onboarding-record-v1` | **Done (docs)** | DEC-043: operator checklist + evidence template; [first-client-onboarding-record.md](./first-client-onboarding-record.md); smoke tenant vs real client; no runtime |
| `production-smoke-runbook-sync-v1` | **Done (docs)** | Runbook sync after DEC-041/042/043/044: canonical commands, opt-in guards, category B via People UI (no SQL), smoke tenant vs first client separation; `production-smoke-e2e.md` |
| `audit-log-tenant-context-foundation-plan-v1` | **Done (docs)** | DEC-044: tenant-aware audit log foundation plan (no runtime/schema); [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md) |
| `audit-log-tenant-context-schema-plan-v1` | **Done (docs)** | Technical plan for first schema/migration slice (additive columns + indexes + backfill + RLS/REVOKE preservation); [audit-log-tenant-context-schema-plan.md](./audit-log-tenant-context-schema-plan.md) |
| `audit-log-tenant-context-migration-v1` | **Done** | Migration `20260702120000_audit_log_tenant_context_v1`: additive tenant-aware `audit_logs` columns + indexes + best-effort backfill; Class-B RLS/REVOKE preserved; no write paths |
| `audit-log-write-paths-foundation-v1` | **Done** | `writeAuditEvent` service + redaction utility + unit tests; no route wiring |
| `audit-log-write-paths-integration-v1` | **Done** | Invitation create + revoke audit wiring; `lib/audit/invitation-audit.ts`; tests |
| `audit-log-write-paths-people-v1` | **Done** | Instructor qualified categories + deactivate audit wiring; `lib/audit/people-audit.ts`; tests |
| `audit-log-write-paths-lessons-v1` | **Done** | Lesson create + update audit wiring; `lib/audit/lesson-audit.ts`; `POST /api/admin/lessons`, `PUT /api/admin/lessons/[id]`; tests |
| `audit-log-write-paths-students-v1` | **Done** | Student app-access remove + reactivate audit wiring; `lib/audit/student-audit.ts`; tests |
| `audit-log-write-paths-student-profile-v1` | **Done** | Student profile PATCH + change-email audit wiring; field names/flags only; tests |
| `audit-log-write-paths-student-delete-v1` | **Done** | Student hard-delete audit wiring; `DELETE /api/admin/students/[id]` (`student.delete`); policy flags only; tests |
| `audit-log-write-paths-student-invite-v1` | **Done** | Student profile invite audit wiring; `POST /api/admin/students/[id]/invite` (`student.invite`); distinct from `invitation.create`; tests |
| `audit-log-write-paths-lesson-delete-v1` | **Done** | Lesson hard-delete audit wiring; `DELETE /api/admin/lessons/[id]` (`lesson.delete`); snapshot before delete; tests |
| `audit-log-write-paths-invitation-email-change-v1` | **Done** | Invitation pending email-change audit wiring; `POST /api/admin/invitations/[id]/change-email` (`invitation.email.change`); flags only; tests |
| `audit-log-write-paths-instructor-reactivate-v1` | **Done** | Instructor reactivate audit wiring; `POST /api/admin/instructors/[id]/reactivate` (`instructor.reactivate`); flags only; tests |
| `audit-log-write-paths-instructor-delete-v1` | **Done** | Instructor hard-delete audit wiring; `DELETE /api/admin/instructors/[id]` (`instructor.delete`); policy flags only; tests |
| `audit-log-write-paths-instructor-email-change-v1` | **Done** | Instructor email-change audit wiring; `POST /api/admin/instructors/[id]/change-email` (`instructor.email.change`); flags only; tests |
| `audit-log-write-paths-student-create-v1` | **Done** | Student manual create audit wiring; `POST /api/admin/students` (`student.create`); flags only; tests |
| `audit-log-write-paths-manual-practical-lesson-v1` | **Done** | Manual practical history audit wiring; `POST /api/admin/students/[id]/practical-lessons` (`lesson.create` + `source: MANUAL`); tests |
| `audit-log-read-api-foundation-v1` | **Done** | Tenant read API `GET /api/admin/audit-logs`; cursor pagination + filters; SUPER_ADMIN; tests |
| `audit-log-viewer-ui-foundation-v1` | **Done** | `/admin/audit-logs` read-only viewer; filters + Load more; URL-only nav; client tests |
| `audit-log-coverage-readiness-review-v1` | **Done (docs)** | Admin write-path audit coverage matrix + P1 gap analysis + next 3 slices; [audit-log-coverage-readiness-review.md](./audit-log-coverage-readiness-review.md) |
| `audit-log-write-paths-student-import-apply-v1` | **Done** | Student import apply summary audit; `POST /api/admin/students/import/apply` (`student.import.apply`); aggregated metadata; `StudentImport` entity; tests |
| `audit-log-write-paths-practical-lessons-import-apply-v1` | **Done** | Practical lessons import apply summary audit; `POST /api/admin/practical-lessons/import/apply` (`lesson.import.apply`); aggregated metadata; `LessonImport` entity; tests |
| `audit-log-access-events-student-export-v1` | **Done** | Student export download access audit; `GET /api/admin/students/export` (`student.export.download`); minimal metadata; `StudentExport` entity; tests |
| `audit-log-access-events-practical-lessons-export-v1` | **Done** | Practical lessons export download access audit; `GET /api/admin/practical-lessons/export` (`lesson.export.download`); minimal metadata; `LessonExport` entity; tests |
| `audit-log-viewer-export-v1` | **Done** | CSV export from `/admin/audit-logs`; `GET /api/admin/audit-logs/export`; privacy-minimal DTO; filters; max 10_000 rows; no export audit event; tests |
| **First-client operator smoke (re-run lessons edit)** | **Done (operator)** | Manual smoke green after modal edit deploy (main `a9549bf`) |

---

## P2 / Post-production or non-blocking

| Slice | Notes |
| ----- | ----- |
| Audit log runtime implementation | **Write + read API + viewer UI + CSV export done** — see [audit-log-coverage-readiness-review.md](./audit-log-coverage-readiness-review.md); import apply summary audits closed (Students + Practical lessons) |
| Demo DB separation | Recommended for public portfolio; lower urgency with dedicated client tenant |
| `lesson-student-nullability-policy-review-v1` | Policy doc + validation gap grep — **Done (docs)** |
| `student-delete-retention-policy-review-v1` | **Done (docs)** — [student-delete-retention-policy-review.md](./student-delete-retention-policy-review.md) |
| `mobile-tablet-readiness-review-v1` | **Done (docs + minor UI)** — [mobile-tablet-readiness-review.md](./mobile-tablet-readiness-review.md) |
| `mobile-tablet-readiness-schedule-map-v1` | **Done** — `lg` gate week/month; day fallback; touch targets; `schedule-map-responsive.ts` |
| `mobile-tablet-readiness-pwa-manifest-v1` | **Done** — `manifest.webmanifest`, SVG icon, theme-color metadata; no service worker |
| `mobile-tablet-readiness-admin-surfaces-v1` | **Done** — Lessons rows, Vehicles badges/actions, Audit logs mobile cards; Settings deferred |
| `mobile-tablet-readiness-playwright-viewports-v1` | **Done** — opt-in `pnpm e2e:mobile-viewports` via dedicated config; 5 admin routes × 3 projects = 15 tests; not in `pnpm check` |
| `competitive-product-discovery-v1` | **Done (docs)** — [competitive-product-discovery.md](../product/competitive-product-discovery.md); commercial planning: `dat-v1-commercial-platform-cutline-plan-v1` **done** |
| `dat-v1-smoke-tenant-school-admin-identity-v1` | **Done** | DEC-045: smoke org **`DAT Production Smoke`**; School Admin product label; Platform `schoolAdmin*` onboarding; rename script + **production rename completed** (human operator 2026-07-13). Pre-incident org identifier is **historical** — stale after 2026-07-17; must not be used in `DAT_SMOKE_*` configuration. No migration |
| Engineering Excellence Audit | Refactors, route consistency, optional E2E CI |
| Billing / checkout / PSP | Explicit product scope only; not in baseline |
| `supabase-rls-tenant-policies-v1` | Only if Data API tenant access is product-required |

---

## P3 / Deferred

| Slice | Notes |
| ----- | ----- |
| `calendar-lessons-polish-v1e-student-warnings` | Product policy first |
| i18n / `language-pack-pt-PT-v1` | After i18n framework |
| `people-management-ux-unification-instructor-route-split-v1` | D4; tabs-first stands |

---

## P1 / DAT_3.7 start

### student-record-delete-policy-and-action

- Done (v1): guarded hard delete + Admin UI “Remover ficha” + API `DELETE /api/admin/students/[id]` + tests.
- Follow-up (deferred): soft-delete/archive for fichas with operational history.

**Docs review:** **Done (docs)** — [student-delete-retention-policy-review.md](./student-delete-retention-policy-review.md) (2026-07-10). Notes: app policy blocks hard delete when operational history exists; DB-level `onDelete: Cascade` on `Lesson.student` is a P2 out-of-band risk (operator discipline).

### people-management-ux-unification

- **Done (v1 slice):** `people-management-information-architecture-v1` — PT IA on `/admin/users` (Pessoas nav, Alunos primary, **Contas da app** section label, helper copy; same route/API/invitation behavior). **Not pending:** primary Alunos/Fichas hierarchy or Contas da app labeling from v1.
- **Done (v1 slice):** `people-management-ux-unification-invitations-v1` — invitations-on-record for student fichas (list `pendingInvitation`, row Send/Revoke, revoke→`MANUAL_ONLY` when safe).
- **Done (v1 slice):** `people-management-ux-unification-instructors-section-v1` — read-only **Instructors** section on `/admin/users` (license display, Edit app account reuse, Invitations helper); reuses SSR `User` + `instructor` include; no new routes/API/schema.
- **Done (v1 docs slice):** `product-roadmap-and-platform-boundary-sync-v1` — `docs/product/` hub, [decision-log.md](./decision-log.md), DAT vs Platform, packaging intent; People **tabs before route split** ([decision-log.md](./decision-log.md) DEC-003).
- **Done (v1 slice):** `people-management-internal-tabs-v1` — L1/L2 tabs on `/admin/users` (Students, Instructors, App accounts); client-side invitation role filter; same route/API/SSR; English UI.
- **Done (v1 slice):** `people-management-onboarding-reframe-v1` — L2 **Onboarding** (manual student create, new instructor account, role-scoped invitations); Records/Profiles list focus; App accounts tab retained.
- **Done (v1 slice):** `people-management-profiles-status-and-pagination-v1` — Students → **Profiles**; profile origin + app-access badges; collapsible label guide; student list 15 + server Load more; instructor client search + Load more; **Pending invitations** Onboarding (list retained, PENDING-only display); English UI. No API/schema changes. Absorbs **`people-management-record-status-badges-v1`** and **`instructor-people-search-v1`** (UI-only). Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-row-app-access-v1` — unified **Edit Student**; compact **APP_USER** row badges (active app access, transmission, categories); client overlay so transmission/categories visible after save; canonical email once in row; improved Delete blocked modal; dual-save `PATCH` + `PUT`; App accounts tab retained; **Instructors deferred** (`people-management-edit-instructor-unified-v1`); remove/reactivate app access and Change email **deferred** (DEC-014, DEC-015). No API/schema changes. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-app-access-remove-v1` — Remove app access (see policy doc).
- **Done (v1 slice):** `people-management-app-access-reactivate-v1` — Reactivate app access: orphan User relink by canonical email; Path B → Send invitation; no duplicate Student. Policy: [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md). Change email / App accounts demote still deferred. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-edit-instructor-unified-v1` — Instructors → Profiles **Edit Instructor** + **Delete** (blocked v1); unified editor (Instructor profile + App access); read-only login email; `PUT /api/users/update`; App accounts tab retained; instructor delete policy + lifecycle deferred (DEC-018). No API/schema changes. Validated via `pnpm check`.
- **Done (v1 docs slice):** `instructor-delete-policy-v1-docs` — Formal Instructor delete/deactivate policy; eligibility matrix; future API contracts; legacy guard requirement. Policy: [instructor-delete-policy.md](./instructor-delete-policy.md). DEC-019. No runtime/API/UI/schema changes. Validated via `pnpm check`.
- **Done (v1 slice):** `instructor-deactivate-v1` — Deactivate + Reactivate lifecycle in Edit Instructor → App access; APIs; People badge colors aligned with Vehicles/Students app semantics; Schedule Map + admin lesson inactive-instructor warning; booking enforcement; credentials login block. Policy: [instructor-delete-policy.md](./instructor-delete-policy.md). DEC-020. App accounts demote deferred. Validated via `pnpm check`.
- **UX principle (durable):** Status labels/badges with the same semantic meaning use consistent wording and Badge variants across DAT (Vehicles Active/Inactive, Students app-access, People/Instructors).
- **Done (v1 slice):** `people-management-app-accounts-demote-v1` — App Accounts removed from People L1 tabs; removed New/Edit/Delete and stats cards; APIs unchanged. Constants: `lib/people/people-management-ui.ts`. Validated via `pnpm check`. **Superseded (UI):** Advanced accounts diagnostics section removed in `people-management-advanced-accounts-removal-and-profile-avatars-v1`.
- **Done (v1 slice):** `people-management-advanced-accounts-removal-and-profile-avatars-v1` — UI-only: removed **Advanced accounts** section from `/admin/users`; profile initials avatars on Students/Instructors Profiles (`PeopleProfileAvatar`, `lib/people/people-profile-initials.ts`); header copy no longer references diagnostics; `loadAdminUsersPageData` bridge retained for Instructors Profiles + Students APP_USER. No API/schema/RLS/auth changes. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-student-profile-operational-fields-v1` — License category + transmission on **Student profile** (MANUAL_ONLY/INVITED/APP_USER); `PATCH /api/admin/students/[id]` accepts `categoryName`/`transmissionTypeName`; DTO exposes `category`/`transmissionType`; App access = login/lifecycle only; MANUAL_ONLY Edit Student shows **No app access yet**; row badges from profile fields. No schema/migration/RLS/auth changes. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-profile-address-fields-v1` — **Address** on Student/Instructor **profile** (DEC-023); migration `Student.address`; `PATCH`/`POST /api/admin/students` + manual create UI; profile read fallback `student.address ?? linkedUser.address`; APP_USER syncs `User.address`; Instructor UI-only (`User.address`). App access = login/lifecycle only. Import/export address deferred. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-student-email-change-policy-v1` — **Change email** for Students (DEC-024): `POST /api/admin/students/[id]/change-email`; PATCH email guard; Edit Student modal; INVITED revokes pending invite → MANUAL_ONLY; APP_USER atomic User+Student update + session/token invalidation. Policy: [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md). No schema/migration. Validated via `pnpm check`.
- **Done (v1 slice):** `users-delete-student-guard-v1` — `DELETE /api/users/delete` returns **409** `use_student_delete_policy` for STUDENT (symmetric to INSTRUCTOR); no User delete or Student mutation; legacy endpoint no longer supports STUDENT/INSTRUCTOR deletion. Validated via `pnpm check`.
- **Done (v1 docs slice):** `admin-users-page-tenant-scope-v1` — Analysis-only audit of SSR `/admin/users` tenant scope; P1 leak confirmed. Report: [admin-users-page-tenant-scope-audit.md](./admin-users-page-tenant-scope-audit.md).
- **Done (v1 slice):** `admin-users-page-tenant-scope-fix-v1` — SSR People page scopes Users to `session.user.organizationId`; loader `lib/people/admin-users-page-data.ts` + tests; Advanced accounts + Instructors Profiles no longer receive cross-tenant SSR data. No API/schema/RLS/auth changes. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-instructor-profile-invite-badge-v1` — UI-only instructor invite/profile lifecycle clarity (DEC-025): Onboarding copy; Profiles conditional app-account subtitle; instructor label guide; helpers in `lib/instructors/instructor-record-ui-utils.ts`. No `Pending invite` badge on Profiles; no API/schema changes. Validated via `pnpm check`.
- **Done (v1 slice):** `people-management-ux-unification-instructor-invitations-v1` — UI-only closure under `people-management-ux-unification` (DEC-025): refined Onboarding/Profiles copy + label guide (Student vs Instructor invitation asymmetry); helpers reused from `instructor-record-ui-utils.ts`. No API/schema changes. Validated via `pnpm check`.
- **Done (analysis):** `people-management-instructor-email-change-policy-v1` — analysis-only; no runtime/schema changes.
- **Done (docs):** `people-management-instructor-email-change-policy-doc-v1` — [instructor-email-change-policy.md](./instructor-email-change-policy.md); **DEC-028**.
- **Done (v1 slice):** `people-management-instructor-email-change-v1` — **Change email** for Instructors (DEC-028): `POST /api/admin/instructors/[id]/change-email`; service `lib/instructors/instructor-email-change-service.ts`; Edit Instructor → App access modal; preserves lifecycle flags; demo guard. Policy: [instructor-email-change-policy.md](./instructor-email-change-policy.md). No schema/migration. Validated via `pnpm check`.
- **Done (analysis):** `invitation-email-update-v1` — analysis-only pending invitation email update; no runtime/schema changes.
- **Done (docs):** `invitation-email-update-policy-doc-v1` — [invitation-email-update-policy.md](./invitation-email-update-policy.md); **DEC-029**.
- **Done (v1 slice):** `invitation-email-update-unlinked-instructor-v1` — **Change email** on pending unlinked INSTRUCTOR invitations (DEC-029 slice 2a): `POST /api/admin/invitations/[id]/change-email`; service `lib/invitations/invitation-email-update-service.ts`; Instructors → Onboarding UI; token regeneration; no auto-send; demo guard. No schema/migration. Validated via `pnpm check`.
- **Done (v1 slice):** `invitation-email-update-unlinked-student-v1` — **Change email** on pending unlinked STUDENT invitations (DEC-029 slice 2b): same endpoint/service/dialog; Students → Onboarding UI; org `Student.email` collision check; linked student blocked. No schema/migration. Validated via `pnpm check`.
- **Done (v1 slice):** `invitation-email-update-linked-student-v1` — **Change invitation email** on pending linked STUDENT invitations (DEC-029 slice 2c): syncs invitation + `Student.email`; preserves `INVITED`; Students → Profiles App access; token regeneration. No schema/migration. Validated via `pnpm check`.
- **Done (docs/plan):** `tenant-operational-organization-id-not-null-migrations-plan-v1` — D4 GO/NO-GO gate, operator battery, migration proposal, smoke checklist; [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md). No schema/migration. Validated via `pnpm check`.
- **Done (D4):** `tenant-operational-organization-id-not-null-migrations-v1` — migration `20260610140000_make_operational_organization_id_required`; schema NOT NULL on six operational models. Validated via `pnpm check`.
- **Done (docs):** `tenant-operational-organization-id-not-null-deploy-record-v1` — operator deploy recorded on validated target env (main `1854d1b`); post-deploy gate passed. Other environments need own deploy.
- **People polish (deferred):** `people-management-instructor-app-access-lifecycle-policy-v1`, `people-management-app-account-unlink-policy-v1`, `invitation-email-update-unlinked-student-v1`, `invitation-email-update-linked-student-v1`, `instructor-records-list-api-v1`, `instructor-records-export-v1`, `instructor-records-import-dry-run-v1`, `cleanup-test-people-dry-run-v1` — see parent note `people-management-records-polish-v1`. **Absorbed/done:** `people-management-record-status-badges-v1`, `instructor-people-search-v1`, `people-management-app-access-lifecycle-policy-v1` (analysis → remove + reactivate implemented), `people-management-student-email-change-policy-v1`, `people-management-instructor-profile-invite-badge-v1`, `instructor-hard-delete-zero-deps-v1`, `instructor-deactivate-v1`, `instructor-reactivate-v1` (absorbed into deactivate UX correction), `people-management-app-accounts-demote-v1`, `users-delete-student-guard-v1`, `admin-users-page-tenant-scope-v1`, `admin-users-page-tenant-scope-fix-v1`, `people-management-onboarding-unlinked-invitations-v1` (Students → Onboarding unlinked-only list + client-side Expired display; no API/schema)`, `admin-users-page-tenant-scope-fix-v1`, `invitation-email-update-v1`, `invitation-email-update-policy-doc-v1`.
- **Remaining (deferred):** `people-management-ux-unification-instructor-route-split-v1` (**D4** — `/admin/instructors` or similar; **not** recommended next while tabs-first stands), manual instructor without User (schema), instructor import/export (beyond search/export slices). **Absorbed/done:** invitations on instructor record (`people-management-instructor-profile-invite-badge-v1`, `people-management-ux-unification-instructor-invitations-v1`).
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

- **Done (v1 slice):** docs-only classification matrix — [supabase-rls-data-api-policy-matrix.md](./supabase-rls-data-api-policy-matrix.md). All 31 Prisma tables classified; 12 with RLS in migrations (after class-B v1); 0 intended anon/authenticated Data API access today; `rls_enabled_no_policy` documented as intentional for service-only tables. **No** SQL policies in repo.
- **Done (v1 slice):** `supabase-rls-class-b-hardening-v1` — migration `20260603120000_supabase_rls_class_b_hardening_v1`: 8 tables only (`billing_events`, `entitlement_grants`, `organization_domains` REVOKE; `audit_logs`, `license_keys`, `configuration_history`, `system_settings`, `feature_flags` ENABLE RLS + REVOKE); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no Prisma schema/runtime changes. Operator `migrate deploy` on Preview/Production is human-controlled. Validated via `pnpm check`.
- **Done (analysis):** `supabase-rls-class-b-hardening-v1b-review` — analysis-only; 12 hardened / 19 candidates / 0 policies; Prisma-primary.
- **Done (docs/plan):** `supabase-rls-class-b-hardening-v1b-plan-v1` — sliced v1b plan + **DEC-030**; [supabase-rls-class-b-hardening-v1b-plan.md](./supabase-rls-class-b-hardening-v1b-plan.md). No SQL/runtime.
- **Done (B1 slice):** `supabase-rls-class-b-hardening-v1b-nextauth-v1` — migration `20260610150000_supabase_rls_class_b_hardening_v1b_nextauth`: RLS + REVOKE on `accounts`, `sessions`, `verification_tokens`, `users` only; merged main `edd73de` (feature `d579a1f`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no Prisma schema/runtime changes. Validated via `pnpm check`.
- **Done (deploy record):** `supabase-rls-class-b-hardening-v1b-nextauth-deploy-record-v1` — operator `migrate deploy` succeeded on validated target env (2026-06-10); post-deploy 24 migrations up to date; `pnpm check` 163/1223/build OK; B1 manual auth smoke matrix **pass** (operator-confirmed).
- **Done (B2 slice):** `supabase-rls-class-b-hardening-v1b-tenant-business-revoke-v1` — migration `20260610160000_supabase_rls_class_b_hardening_v1b_tenant_business_revoke`: RLS + REVOKE on 12 tenant/platform tables only; merged main `dd26d18` (feature `dce55c7`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no Prisma schema/runtime changes. Validated via `pnpm check`.
- **Done (deploy record):** `supabase-rls-class-b-hardening-v1b-tenant-business-deploy-record-v1` — operator `migrate deploy` succeeded on validated target env (2026-06-10); post-deploy 25 migrations up to date; `pnpm check` 163/1223/build OK; B2 manual smoke matrix **pass** (operator-confirmed green).
- **Done (B3 slice):** `supabase-rls-class-b-hardening-v1b-global-reference-v1` — migration `20260610170000_supabase_rls_class_b_hardening_v1b_global_reference`: RLS + REVOKE on `categories`, `transmission_types`, `user_preferences` only; merged main `cdfacf2` (feature `f63f19d`); no `CREATE POLICY`, no `FORCE ROW LEVEL SECURITY`, no Prisma schema/runtime changes. Validated via `pnpm check`.
- **Done (deploy record):** `supabase-rls-class-b-hardening-v1b-global-reference-deploy-record-v1` — operator `migrate deploy` succeeded on validated target env (2026-06-10); post-deploy 26 migrations up to date; `pnpm check` 163/1223/build OK; B3 manual smoke matrix **pass** (operator-confirmed all green). **RLS Class-B v1b revoke-only complete (31/31; B1+B2+B3 deployed + smoke green).**
- **Revoke-only track closed:** no further v1b RLS+REVOKE slices planned. **Not recommended next:** monolithic v1b or `people-management-ux-unification-instructor-route-split-v1`.
- **Deferred (P2):** `supabase-rls-tenant-policies-v1` (`CREATE POLICY`; separate from v1b revoke-only; only if Data API tenant access is product-required); `supabase-exposed-schema-review`.

### tenant-required-operational-organization-id-audit

**Source:** external database/architecture critique triage (`external-database-architecture-audit-triage`).

- **Done (v1 slice):** audit report + classification only — [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md). No Prisma/migration/RLS/runtime changes in this slice.
- **Done (v1 slice):** `tenant-operational-organization-id-null-counts-report-v1` — read-only report script `scripts/report-tenant-organization-null-scope.ts` (`pnpm tenant:org-null-report`); helpers `lib/tenant-organization-null-scope-report.ts`. No writes.
- **Done (v1 slice):** `tenant-operational-organization-id-backfill-dry-run-v1` — `scripts/dry-run-tenant-organization-backfill.ts` (`pnpm tenant:org-backfill:dry-run`); helpers `lib/tenant-organization-backfill-dry-run.ts`; legacy `backfill-organization-scope.ts` fail-safe by default. Preview: 0 operational NULLs.
- **Done (analysis):** `tenant-operational-organization-id-not-null-readiness-review-v1` — analysis-only; no runtime/schema changes.
- **Done (docs):** `tenant-operational-organization-id-not-null-readiness-doc-v1` — [tenant-operational-organization-id-not-null-readiness.md](./tenant-operational-organization-id-not-null-readiness.md); **DEC-027**. Operator evidence 2026-06-09: 0 operational NULLs, `SAFE_TO_DRY_RUN`, 0 dry-run proposals; backfill apply not required in validated env.
- **Done (docs/plan):** `tenant-operational-organization-id-not-null-migrations-plan-v1` — D4 gate checklist, operator battery, single-migration proposal, post-migration smoke tests (same readiness doc). No schema/migration.
- **Done (D4):** `tenant-operational-organization-id-not-null-migrations-v1` + deploy record `tenant-operational-organization-id-not-null-deploy-record-v1` on validated target env (main `1854d1b`). Route split **deferred (D4)**.
- **Deferred:** `tenant-operational-organization-id-backfill-apply-v1` — only when a future dry-run reports proposed rows.

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
| `people-management-internal-tabs-v1` | — | **Done** — tabs on `/admin/users` |
| `admin-settings-client-visibility-review-v1` | — | **Done (docs)** — audit [admin-settings-client-visibility-audit.md](./admin-settings-client-visibility-audit.md); DEC-026 |
| `admin-settings-client-visibility-hide-v1` | — | **Done** — Settings hidden from school admin nav; operator copy on `/admin/settings`; APIs unchanged |
| `admin-license-client-readonly-v1` | — | **Done** — `/admin/license` Plan & features read-only; navbar **Plan**; APIs unchanged |
| `school-operational-alerts-v1` | P2 | Future: vehicle expiry/inspection/maintenance lead times (spec + wiring) |
| `platform-settings-and-feature-flags-boundary-v1` | P2 | Future Platform ownership of flags/system settings |
| `import-export-business-packaging-v1` | P2 | Tier vs self-service UI enforcement |
| `provider-assisted-import-runbook-v1` | P2 | Full operator runbook (outline in [packaging-and-entitlements.md](../product/packaging-and-entitlements.md)) |
| `payment-integration-product-planning-v1` | P2 | School-facing payments product spec |
| `payments-and-balances-foundation-v1` | P2 | Technical foundation for balances/packages |
| `mobile-tablet-readiness-review-v1` | — | **Done (docs + minor UI)** — readiness matrix + DEC-032 alignment; [mobile-tablet-readiness-review.md](./mobile-tablet-readiness-review.md); localized layout fixes (Vehicles, Lessons header, People L2 tabs); no API/schema/auth changes |
| `mobile-tablet-readiness-schedule-map-v1` | — | **Done** — week/month gated below `lg` (1024px); day fallback on resize; helper copy; edit/delete/nav touch targets `h-11` on narrow; `lib/schedule/schedule-map-responsive.ts` + hook + unit tests; no API/schema/auth |
| `mobile-tablet-readiness-pwa-manifest-v1` | — | **Done** — `public/manifest.webmanifest`, `public/icons/dat-icon.svg`, `app/icon.svg`; layout metadata + theme-color; no service worker/offline |
| `mobile-tablet-readiness-admin-surfaces-v1` | — | **Done** — Lessons row stack; Vehicles badge wrap + touch targets; Audit logs card fallback `<md`; `buildAuditLogMobileCardFields`; Settings deferred |
| `mobile-tablet-readiness-playwright-viewports-v1` | — | **Done** — opt-in `pnpm e2e:mobile-viewports` via `playwright.mobile-viewports.config.ts`; 5 admin routes × 3 projects = 15 tests; hard-fail markers; not in `pnpm check` |
| `competitive-product-discovery-v1` | — | **Done (docs)** 2026-07-10 — canonical registry (9 eligible direct / 3 adjacent / 2 low-evidence excluded); prevalence: reminders + balances **8/9**, self-booking/requests **6/9**; Iberian regulator **4/6**; schema-readiness correction; [competitive-product-discovery.md](../product/competitive-product-discovery.md). **Recommended next (planning only):** `dat-v1-commercial-platform-cutline-plan-v1`. Backlog candidates (not approved): `lesson-reminders-email-product-plan-v1`, `school-balances-ledger-product-plan-v1`, `student-lesson-request-policy-planning-v1`, `student-progress-tracking-foundation-plan-v1`. |
| `dat-v1-commercial-platform-cutline-plan-v1` | **Done (docs)** | DEC-046–057; [dat-v1-commercial-release-plan.md](./dat-v1-commercial-release-plan.md); tag runbook [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md); safety tag `dat-v1-core-baseline-95b833e`; no runtime |
| `dat-plan-naming-and-doc-hygiene-v1` | **Done (docs)** | DEC-058 (plan display names) + DEC-059 (canonical memory continuity contract); DAT Core / DAT Plus / DAT Premium; stable keys documented; Markdown hygiene; no runtime |
| `platform-commercial-catalog-schema-plan-v1` | **Done (docs)** | DEC-060; hybrid Option C; [platform-commercial-catalog-schema-plan.md](./platform-commercial-catalog-schema-plan.md); candidate schema proposed — not implemented; no runtime |
| `platform-commercial-catalog-schema-foundation-v1` | **Done (repo)** | DEC-061; migration `20260714160000_platform_commercial_catalog_schema_foundation_v1`; 3 enums + 11 models; product-scoped compound FKs; Class-B RLS; contract test; **not deployed by agent**; no catalogue data |
| `platform-commercial-catalog-seed-v1` | **Done (repo)** | Idempotent seed manifest + service + dedicated CLI (`pnpm seed:commercial-catalog`, `--apply` for writes); product `DAT`; plans `DAT_CORE`/`DAT_PLUS`/`DAT_PREMIUM`; DRAFT `DAT_V1_INITIAL_DRAFT`; zero entitlement defs; **not** in legacy `prisma db seed`; **not executed by agent**; no offerings/prices/grants; DEC-062 local-only destructive seed guard; incident 2026-07-17 recorded |
| `dat-production-smoke-reconcile-v1` | P0 / ops **in progress** | DEC-063: smoke-only reconcile; **no** embedded Platform-admin restore; inspect-only tooling in repo (`pnpm ops:inspect-production-smoke-reconciliation`); remote inspect **not executed by agent** in inspect-only sub-slice |
| `platform-admin-access-and-smoke-reconcile-v1` | **Abandoned / superseded** | Replaced by `dat-production-smoke-reconcile-v1` + DEC-063 (do not recreate embedded PLATFORM_ADMIN) |
| `platform-separation-architecture-plan-v1` | P1 backlog | **Recommended next after smoke reconcile** — autonomous MeEngine Platform vs DAT boundary plan; embedded `/platform` transitional |
| `platform-commercial-catalog-read-services-v1` | P1 backlog | Read-only catalogue repositories — **do not resume blindly** inside embedded Platform; gate after Platform separation plan |
| `lesson-reminders-email-product-plan-v1` | P1 backlog | Email lesson reminder policy, events, templates, non-goals (no SMS/WhatsApp/payment reminders); **`Notification` reuse not assumed**. Not implementation authorization. |
| `school-balances-ledger-product-plan-v1` | P1 backlog | Manual school-facing ledger/balances product plan (no PSP). From discovery O2. |
| `student-lesson-request-policy-planning-v1` | P2 backlog | Controlled request + approval policy (`LessonRequest` schema exists). From discovery O3. |
| `i18n-framework-planning-v1` | P2 | Real i18n; switcher, fallback, plan tie-in |
| `language-pack-pt-PT-v1` | P3 | pt-PT copy after framework |
| `super-agent-product-strategy-protocol-v1` | — | **Done** in `cursor-operating-model.md` (this sync batch) |

**Deferred explicitly:** `people-management-ux-unification-instructor-route-split-v1` (D4; not recommended next).

**Product direction (backlog — commercial path):** **Mobile/tablet** — **done**. **Competitive discovery** — **done**. **Commercial cutline planning** — **done** (`dat-v1-commercial-platform-cutline-plan-v1`, DEC-046–057). **Plan display names + memory continuity** — **done** (`dat-plan-naming-and-doc-hygiene-v1`, DEC-058/059). **Catalogue schema plan** — **done** (`platform-commercial-catalog-schema-plan-v1`, DEC-060). **Catalogue schema foundation** — **done (repo)** (`platform-commercial-catalog-schema-foundation-v1`, DEC-061). **Catalogue seed code** — **done (repo)** (`platform-commercial-catalog-seed-v1`; not executed; DEC-062 local-only legacy seed). **Smoke identity** — **done** (DEC-045) then **incident reset 2026-07-17** (test-only; IDs stale). **DEC-063:** do not recreate embedded Platform Admin; smoke-only reconcile via `dat-production-smoke-reconcile-v1`. **Recommended next after smoke close:** `platform-separation-architecture-plan-v1` (not blind catalogue read-services inside embedded Platform).

---

## P2 / Engineering excellence

### audit-log-tenant-context-foundation

**Source:** external database/architecture critique triage; **schema slice done** in `audit-log-tenant-context-migration-v1`. Also **Security and data policy** (tenant-scoped audit queries).

- ~~Plan adding `organizationId` to `AuditLog`~~ — **done** (nullable; platform-scoped NULL preserved).
- ~~Index `organizationId` and `(organizationId, createdAt)`~~ — **done** in migration `20260702120000_audit_log_tenant_context_v1`.
- ~~Expand audit wiring to student delete/invite and lesson delete/import~~ — **done** (write paths, import apply summaries, and export access events wired; read API + viewer UI foundation implemented).
- `AuditLog` remains a sensitive/internal table per `database.mdc` — RLS/grants unchanged (Class-B).

### lesson-student-nullability-policy-review

**Source:** external database/architecture critique triage; **policy review only** — no schema changes in this item.

- Clarify `Lesson.studentId` nullability policy in architecture docs and validation contracts.
- Allow NULL only for group **THEORY** lessons if that remains the business rule (already reflected in `lessonCreationSchema` superRefine).
- Require `Student.id` for **DRIVING**, **EXAM**, and **THEORY_EXAM** at application level (enforce consistently across create/update/import paths).
- Consider DB-level check constraint later if worthwhile after audit of existing rows.
- **Smallest safe v1 slice:** document policy + grep validation/API gaps; defer migration/check constraint.

**Status:** **Done (docs)** — [lesson-student-nullability-policy-review.md](./lesson-student-nullability-policy-review.md) (2026-07-09).

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

### calendar-lessons-polish-v1

**Parent track:** operational Calendar/Lessons UX polish before production — lapidar o core operacional, not large new features.

**Done (analysis):** `calendar-lessons-polish-v1` — analysis-only. Two surfaces: **Schedule Map** on `/admin` (day/week/month, book/edit/delete) and **Lesson Management** on `/admin/lessons` (Recent/Current/Upcoming lists + Driving import/export). No runtime changes.

**Done (docs):** `calendar-lessons-polish-v1-plan-v1` — docs-only sub-slice plan; **DEC-031**. No runtime changes.

**Baseline already shipped (do not regress):**

- Schedule Map type colors — Theory green, Driving blue, Theory exam yellow, Practical exam orange (`lib/schedule/schedule-map-card.ts`; demo-validated).
- Compact schedule chips; 90-day calendar range guard (`lib/lessons/calendar-range.ts`); create refresh via `refreshKey` / `focusLessonDate` (`use-schedule-dashboard-controls.ts`); edit return refresh/focus via `focusDate` + `scheduleRefresh` query params (`schedule-map-navigation.ts`, `EditLessonClient.tsx`); dashboard list truncation via `take: 51` + `recentHasMore` / `upcomingHasMore` (`admin-dashboard-lessons-truncation.ts`, `lesson-queries.ts`).
- Instructor inactive warning on map + `/admin/lessons` list (after client refetch); create blocks inactive instructor (`lesson-create-service.ts`).

**Analysis gaps (sliced — implement in order):**

| Gap | Notes |
| --- | ----- |
| Theory/Driving colors inverted on `/admin/lessons` tabs vs Schedule Map | `lessons-management-client.tsx` dots vs `schedule-map-card.ts` |
| PT label `Prática #N` in English UI baseline | `lesson-display.ts` |
| Status badges raw lowercase enum on Lesson Management | `lessons-management-client.tsx` |
| SSR seed omits `instructor.isAvailableForBooking` | First-paint inactive warning may fail until client refetch — `app/admin/page.tsx`, `app/instructor/page.tsx` |
| ~~Edit refresh/focus weaker than create~~ | **Resolved in v1b** — `EditLessonClient.tsx` + `schedule-map-navigation.ts` |
| ~~Dashboard `take: 50` silent cap~~ | **Resolved in v1c-a** — `admin-dashboard-lessons-truncation.ts`; `recentHasMore` / `upcomingHasMore` |
| ~~Upcoming only until tomorrow~~ | **Resolved in v1c-b** — `ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS = 7` in `admin-dashboard-lessons-truncation.ts` |
| ~~No vehicle inactive/maintenance warning on scheduled lessons~~ | **Resolved in v1d** — `LESSON_LIST_VEHICLE_SELECT` + `getLessonVehicleWarning` |
| Student lifecycle warnings | Deferred — product policy first |

**Sub-slices (smallest safe order):**

| Sub-slice | Priority | Type | Scope |
| --------- | -------- | ---- | ----- |
| `calendar-lessons-polish-v1a-consistency-ui` | — | **Done** | UI + SSR mapping: aligned `/admin/lessons` tab/dot colors with Schedule Map (`lesson-type-ui-theme.ts`); `Practice #N`; `getLessonStatusDisplayLabel` Title Case; SSR `isAvailableForBooking` on admin/instructor/student dashboard seeds; deduplicated inactive instructor warning. **No** schema/migrations/API changes. Validated via `pnpm check`. |
| `calendar-lessons-polish-v1b-edit-refresh` | — | **Done** | UI navigation: edit lesson/exam returns to dashboard with Schedule Map refresh + date focus via `?focusDate=YYYY-MM-DD&scheduleRefresh=1`; `lib/schedule/schedule-map-navigation.ts`; `hooks/use-schedule-dashboard-controls.ts`; admin/instructor dashboards consume params and clean URL; cancel/back without params. **No** schema/migrations/API changes. Validated via `pnpm check` (165/1232/build OK). |
| `calendar-lessons-polish-v1c-a-truncation-indicator` | — | **Done** | Honest truncation on `/admin/lessons` Recent/Upcoming: `take: 51`, max 50 UI items; additive `recentHasMore` / `upcomingHasMore`; `admin-dashboard-lessons-truncation.ts`; discrete notice + Schedule Map link; parser defaults `false`; `current` and temporal window unchanged. **No** schema/migrations/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (166/1237/build OK). |
| `calendar-lessons-polish-v1c-b-upcoming-horizon` | — | **Done** | Upcoming on `/admin/lessons`: today remaining + next 7 days (`ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS`); `getAdminDashboardUpcomingHorizonEnd`; v1c-a truncation preserved; UI copy updated; Recent/Current/Schedule Map unchanged. **No** schema/migrations/auth/RLS/billing/demo-guard changes. Validated via `pnpm check` (167/1245/build OK). |
| `calendar-lessons-polish-v1d-vehicle-warnings` | — | **Done** | Display-only vehicle warnings on Schedule Map + `/admin/lessons`; `LESSON_LIST_VEHICLE_SELECT` adds `isActive`, `underMaintenance`, `status`; helpers in `lesson-display.ts` + `schedule-map-card.ts`; persisted fields only (not derived fleet status); no create/update blocking. **No** schema/migrations/auth/RLS/billing/demo-guard changes. |
| `calendar-lessons-polish-v1e-student-warnings` | P3 deferred | Policy + UI | Student app-access/lifecycle warnings on lessons — requires product policy before implementation. |

**Recommended next (Calendar track):** none — v1a–v1d **done**; v1e **P3 deferred**. Production path: [production-readiness-cutline.md](./production-readiness-cutline.md).

**v1c parent track:** v1c-a truncation **done**; v1c-b horizon **done**; pagination/load-more **deferred** within v1c.

**v1d:** **done** — vehicle warnings (display-only). **v1e:** deferred — product policy first.

**Deferred explicitly:** monolithic `calendar-lessons-polish-v1` runtime batch; `people-management-ux-unification-instructor-route-split-v1` (D4).

### Prisma/Prettier polish

- `prisma format` / formatting review in dedicated batch only.

---

## P3 / DX

### typescript-baseurl-deprecation-v1

**Source:** editor TypeScript language service (newer than project `5.2.2`) warns that `baseUrl` is deprecated in `driving_school_platform/nextjs_space/tsconfig.json`.

- Inventory imports that rely on `baseUrl`.
- Confirm `paths` works without `baseUrl`.
- Remove `baseUrl` safely; add explicit path mappings only where required.
- Validate lint, typecheck, tests and build.
- Do **not** use `ignoreDeprecations` as the permanent solution.
- **Not** the next commercial slice; non-blocking tooling hygiene.

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
