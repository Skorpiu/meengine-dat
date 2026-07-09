# Audit log coverage readiness review

**Batch:** `audit-log-coverage-readiness-review-v1`  
**Last updated:** 2026-07-09 (`audit-log-coverage-final-hardening-v1`)  
**Decision context:** [DEC-044](./decision-log.md) — tenant-aware audit log foundation  
**Related:** [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md), [audit-log-tenant-context-schema-plan.md](./audit-log-tenant-context-schema-plan.md)

---

## 1. Executive summary

DAT has a **working audit write boundary** (`lib/audit/audit-log-service.ts` + domain helpers) and a **tenant-aware `audit_logs` schema** (migration `20260702120000_audit_log_tenant_context_v1`). Admin/operational routes now emit **22 distinct audit actions** covering the highest-traffic People + Lessons flows, plus **import apply** summaries and **export download access** events.

**Coverage posture (admin write paths):**

| Bucket | Approx. count | Notes |
| ------ | ------------- | ----- |
| **AUDITED** | 21+ routes / **22 actions** | Includes access events (export) and import apply summaries in addition to mutations; see §2 and §4–5 |
| **COVERED_BY_OTHER_EVENT** | 1 | `POST /api/admin/students/[id]/invite` → `student.invite` (not `invitation.create`) |
| **CANDIDATE (P1)** | 0 | — |
| **CANDIDATE (P2)** | 4 | Vehicles, invitation accept |
| **DEFERRED** | 10+ | Settings/feature flags/license, platform org, billing webhooks, bulk cleanup, legacy user create |
| **NOT_NEEDED** | 12+ | Reads, dry-runs (zero-write), blocked legacy deletes |

**Readiness verdict:** P1 write-path instrumentation for People/Lessons is **complete**. **Read API foundation** (`GET /api/admin/audit-logs`) and **viewer UI foundation** (`/admin/audit-logs`, URL-only) are available for tenant SUPER_ADMIN. Import apply summary audits are closed for Students (`student.import.apply`) and Practical lessons (`lesson.import.apply`). Next priority: viewer polish (optional) or remaining P2 candidates; **platform cross-tenant viewer** and **viewer CSV export** remain deferred.

This document is a **documentation snapshot** (no implementation in this batch).

---

## 2. Events already audited

| Action | Entity | Route | Helper |
| ------ | ------ | ----- | ------ |
| `invitation.create` | `UserInvitation` | `POST /api/admin/invitations` | `writeInvitationAuditEvent` |
| `invitation.revoke` | `UserInvitation` | `POST /api/admin/invitations/[id]/revoke` | `writeInvitationAuditEvent` |
| `invitation.email.change` | `UserInvitation` | `POST /api/admin/invitations/[id]/change-email` | `writeInvitationEmailChangeAuditEvent` |
| `instructor.qualified_categories.update` | `Instructor` | `PATCH /api/admin/instructors/[id]` | `writeInstructorQualifiedCategoriesAuditEvent` |
| `instructor.deactivate` | `Instructor` | `POST /api/admin/instructors/[id]/deactivate` | `writeInstructorDeactivateAuditEvent` |
| `instructor.reactivate` | `Instructor` | `POST /api/admin/instructors/[id]/reactivate` | `writeInstructorReactivateAuditEvent` |
| `instructor.delete` | `Instructor` | `DELETE /api/admin/instructors/[id]` | `writeInstructorDeleteAuditEvent` |
| `instructor.email.change` | `Instructor` | `POST /api/admin/instructors/[id]/change-email` | `writeInstructorEmailChangeAuditEvent` |
| `lesson.create` | `Lesson` | `POST /api/admin/lessons` | `writeLessonCreateAuditEvent` |
| `lesson.create` | `Lesson` | `POST /api/admin/students/[id]/practical-lessons` | `writeLessonCreateAuditEvent` (`createdVia: manual_practical_lesson`, `source: MANUAL`) |
| `lesson.update` | `Lesson` | `PUT /api/admin/lessons/[id]` | `writeLessonUpdateAuditEvent` |
| `lesson.delete` | `Lesson` | `DELETE /api/admin/lessons/[id]` | `writeLessonDeleteAuditEvent` |
| `lesson.import.apply` | `LessonImport` | `POST /api/admin/practical-lessons/import/apply` | `writeLessonImportApplyAuditEvent` |
| `student.app_access.remove` | `Student` | `POST /api/admin/students/[id]/app-access/remove` | `writeStudentAppAccessRemoveAuditEvent` |
| `student.app_access.reactivate` | `Student` | `POST /api/admin/students/[id]/app-access/reactivate` | `writeStudentAppAccessReactivateAuditEvent` |
| `student.update` | `Student` | `PATCH /api/admin/students/[id]` | `writeStudentProfileUpdateAuditEvent` |
| `student.email.change` | `Student` | `POST /api/admin/students/[id]/change-email` | `writeStudentEmailChangeAuditEvent` |
| `student.delete` | `Student` | `DELETE /api/admin/students/[id]` | `writeStudentDeleteAuditEvent` |
| `student.create` | `Student` | `POST /api/admin/students` | `writeStudentCreateAuditEvent` |
| `student.import.apply` | `StudentImport` | `POST /api/admin/students/import/apply` | `writeStudentImportApplyAuditEvent` |
| `student.invite` | `Student` | `POST /api/admin/students/[id]/invite` | `writeStudentInviteAuditEvent` |

**Cross-cutting properties (all wired routes):**

- `organizationId` from session + host guard — never request body
- Actor `userId` / `role` / `email` from session
- Audit after mutation success; failure non-blocking (`writeAuditEvent` default)
- Metadata redacted/minimal; no `token`, `tokenHash`, `inviteLink`, passwords, or raw emails in metadata

---

## 3. Known admin write paths (inventory)

Scanned: `app/api/admin/**/route.ts` plus operational siblings under `api/users`, `api/vehicles`, `api/platform`, `api/billing`, `api/config` (none with writes except public config reads).

**Admin mutations (write verbs):**

| Route file | Methods |
| ---------- | ------- |
| `invitations/route.ts` | POST |
| `invitations/[id]/revoke/route.ts` | POST |
| `invitations/[id]/change-email/route.ts` | POST |
| `instructors/[id]/route.ts` | PATCH, DELETE |
| `instructors/[id]/deactivate/route.ts` | POST |
| `instructors/[id]/reactivate/route.ts` | POST |
| `instructors/[id]/change-email/route.ts` | POST |
| `students/route.ts` | POST |
| `students/[id]/route.ts` | PATCH, DELETE |
| `students/[id]/invite/route.ts` | POST |
| `students/[id]/change-email/route.ts` | POST |
| `students/[id]/app-access/remove/route.ts` | POST |
| `students/[id]/app-access/reactivate/route.ts` | POST |
| `students/[id]/practical-lessons/route.ts` | POST |
| `audit-logs/route.ts` | GET |
| `students/import/apply/route.ts` | POST |
| `students/import/dry-run/route.ts` | POST (zero-write) |
| `lessons/route.ts` | POST |
| `lessons/[id]/route.ts` | PUT, DELETE |
| `practical-lessons/import/apply/route.ts` | POST |
| `practical-lessons/import/dry-run/route.ts` | POST (zero-write) |
| `vehicles/route.ts` | POST, PUT, DELETE |
| `settings/route.ts` | POST, PUT, DELETE |
| `feature-flags/route.ts` | POST, PUT, DELETE |
| `license/activate/route.ts` | POST |
| `license/features/route.ts` | POST |
| `cleanup/route.ts` | POST |

**Non-admin operational writes (reviewed):**

| Route | Methods | Role |
| ----- | ------- | ---- |
| `api/users/update` | PUT | School admin — unified instructor profile editor |
| `api/users/create` | POST | Legacy user create (superseded by invitations in product) |
| `api/users/delete` | DELETE | Legacy; blocks STUDENT/INSTRUCTOR (policy redirect) |
| `api/vehicles/update-status` | POST | Vehicle status mutation |
| `api/vehicles/update-maintenance` | POST | Vehicle maintenance mutation |
| `api/platform/organizations` | POST | Platform admin org onboarding |
| `api/billing/webhooks/[provider]` | POST | Provider webhook ingest |
| `api/invitations/accept` | POST | Public/token accept flow |
| `api/signup` | POST | Public signup (cutline: disabled for first client) |
| `api/user/preferences` | PUT | End-user preferences (out of school-admin scope) |

---

## 4–5. Coverage matrix by domain

**Status legend:** `AUDITED` | `COVERED_BY_OTHER_EVENT` | `CANDIDATE` | `DEFERRED` | `NOT_NEEDED`  
**Priority:** P0 (blocking gap) | P1 (MVP/high) | P2 (post-MVP) | P3 (low/operator)

### Invitations

| Endpoint | Mutation | Status | Action (existing / suggested) | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------------------------------ | ---- | -------- | --------------- |
| `POST /api/admin/invitations` | Create unlinked invitation | **AUDITED** | `invitation.create` | Low | — | Never log token/hash/link |
| `POST /api/admin/invitations/[id]/revoke` | Revoke pending | **AUDITED** | `invitation.revoke` | Low | — | Status transition only |
| `POST /api/admin/invitations/[id]/change-email` | Pending invite email update + token regen | **AUDITED** | `invitation.email.change` | Medium — token regen | — | Flags only; `linkedStudentId` when linked; no old/new email |
| `POST /api/admin/students/[id]/invite` | Invite linked student + profile transition | **AUDITED** | `student.invite` | Low | — | Intentionally **not** `invitation.create` (Profiles vs Onboarding) |
| `POST /api/invitations/accept` | Accept invitation (public) | **CANDIDATE** | `invitation.accept` | Medium — public route, tenant resolve | **P2** | Never log token; `targetUserId` after accept |

### Students

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `POST /api/admin/students` | Manual student create (Onboarding) | **AUDITED** | `student.create` | Low | — | Flags only; `appAccessMode`, presence booleans; no literal schoolStudentId |
| `PATCH /api/admin/students/[id]` | Profile operational fields | **AUDITED** | `student.update` | Low | — | `changedFields` names only |
| `DELETE /api/admin/students/[id]` | Hard delete (policy-gated) | **AUDITED** | `student.delete` | Medium — destructive | — | Policy flags only |
| `POST .../change-email` | Student email change policy | **AUDITED** | `student.email.change` | Medium | — | Policy flags only |
| `POST .../app-access/remove` | Remove app access | **AUDITED** | `student.app_access.remove` | Medium | — | Lifecycle modes only |
| `POST .../app-access/reactivate` | Reactivate app access | **AUDITED** | `student.app_access.reactivate` | Medium | — | `linkedUserId` ok (operational id) |
| `POST .../invite` | Profile invite | **AUDITED** | `student.invite` | Low | — | See Invitations |
| `POST .../practical-lessons` | Manual completed practical history | **AUDITED** | `lesson.create` (`source: MANUAL`, `createdVia: manual_practical_lesson`) | Low | — | Reuses lesson helper; distinct route from calendar create |
| `POST .../import/dry-run` | Preview import | **NOT_NEEDED** | — | — | — | Zero-write by contract |
| `POST .../import/apply` | Bulk student import | **AUDITED** | `student.import.apply` (summary) | High — volume | — | Row counts only; no row payloads |
| `GET .../export` | Export students | **AUDITED** | `student.export.download` (access) | Medium — PII extraction | — | Access event only; no row payloads; `includesPii: true` |

### Instructors

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `PATCH /api/admin/instructors/[id]` | Qualified categories only | **AUDITED** | `instructor.qualified_categories.update` | Low | — | Category ids/names (reference data) |
| `DELETE /api/admin/instructors/[id]` | Hard delete (zero-deps policy) | **AUDITED** | `instructor.delete` | Medium — destructive | — | Policy flags only; mirror `student.delete` |
| `POST .../deactivate` | Deactivate instructor | **AUDITED** | `instructor.deactivate` | Medium | — | Warning codes, counts |
| `POST .../reactivate` | Reactivate instructor | **AUDITED** | `instructor.reactivate` | Medium | — | Symmetric to deactivate metadata; flags only |
| `POST .../change-email` | Instructor email change | **AUDITED** | `instructor.email.change` | Medium | — | Policy flags; mirror `student.email.change` |
| `PUT /api/users/update` | Unified instructor profile (People UI) | **CANDIDATE** | `instructor.update` | Medium — overlaps PATCH route scope | **P2** | `changedFields` only; avoid duplicating qualified-categories audit |

### Lessons

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `POST /api/admin/lessons` | Create lesson(s) | **AUDITED** | `lesson.create` | Low | — | Operational ids, `lessonType` |
| `PUT /api/admin/lessons/[id]` | Update lesson | **AUDITED** | `lesson.update` | Low | — | `changedFields` + ids |
| `DELETE /api/admin/lessons/[id]` | Hard delete lesson (future-only; `deleteMany` scoped) | **AUDITED** | `lesson.delete` | Medium — destructive | — | Snapshot ids/type + `scheduledAtDateOnly`; no free text |
| `POST /api/admin/cleanup` | Bulk delete old lessons/exams | **DEFERRED** | `lesson.cleanup` (summary) | High — batch volume | **P3** | Counts + date window only |
| `POST .../practical-lessons/import/apply` | Bulk practical import | **AUDITED** | `lesson.import.apply` (summary) | High — volume | — | Summary counts only; no row payloads |
| `POST .../practical-lessons/import/dry-run` | Preview | **NOT_NEEDED** | — | — | — | Zero-write |

### Vehicles

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `POST /api/admin/vehicles` | Create vehicle | **CANDIDATE** | `vehicle.create` | Low | **P2** | Registration id ok; no owner PII |
| `PUT /api/admin/vehicles` | Update vehicle | **CANDIDATE** | `vehicle.update` | Low | **P2** | `changedFields` |
| `DELETE /api/admin/vehicles` | Delete vehicle | **CANDIDATE** | `vehicle.delete` | Medium | **P2** | Policy/deps flags |
| `POST /api/vehicles/update-status` | Status change | **CANDIDATE** | `vehicle.status.update` | Low | **P2** | Old/new status enums |
| `POST /api/vehicles/update-maintenance` | Maintenance update | **CANDIDATE** | `vehicle.maintenance.update` | Low | **P2** | Dates/flags only |

### Settings / Config

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `POST/PUT/DELETE /api/admin/settings` | Org settings CRUD | **DEFERRED** | `settings.*` | Low | **P3** | `configuration_history` already exists; operator/internal (DEC-026) |
| `POST/PUT/DELETE /api/admin/feature-flags` | Feature flag CRUD | **DEFERRED** | `feature_flag.*` | Low | **P3** | Operator/internal |
| `GET /api/admin/config-history` | Read config history | **NOT_NEEDED** | — | — | — | Read-only |
| `POST /api/admin/license/activate` | License activation | **DEFERRED** | `license.activate` (platform) | High — billing adjacent | **P3** | Platform-scoped; sensitive gate |
| `POST /api/admin/license/features` | Entitlement toggles | **DEFERRED** | `license.feature.*` | High | **P3** | Operator/internal UI read-only (DEC-026) |

### Users / App accounts

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `PUT /api/users/update` | Instructor unified editor | **CANDIDATE** | `instructor.update` | Medium | **P2** | See Instructors — may duplicate People flows |
| `POST /api/users/create` | Legacy user create | **DEFERRED** | `user.create` | Medium | **P3** | Product path is invitations; route retained |
| `DELETE /api/users/delete` | Legacy user delete | **NOT_NEEDED** | — | — | — | Blocks STUDENT/INSTRUCTOR (`use_*_delete_policy`) |
| `GET /api/admin/users` | Diagnostics read | **NOT_NEEDED** | — | — | — | Read-only |

### Audit log (read API)

| Endpoint | Operation | Status | Notes |
| -------- | --------- | ------ | ----- |
| `GET /api/admin/audit-logs` | List tenant audit events | **IMPLEMENTED** | `audit-log-read-api-foundation-v1`; SUPER_ADMIN + host guard; cursor `createdAt`+`id`; filters; DTO omits `ipAddress`/`userAgent`/`organizationId` |
| `/admin/audit-logs` | Viewer UI (read-only) | **IMPLEMENTED** | `audit-log-viewer-ui-foundation-v1`; filters + Load more; URL-only nav; no export/platform viewer |

### Platform / Billing

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| `POST /api/platform/organizations` | Platform org onboarding | **DEFERRED** | `platform.organization.create` | High — platform scope | **P2** | `organizationId` nullable; D4 gate |
| `POST /api/billing/webhooks/[provider]` | Webhook ingest | **DEFERRED** | — | High — billing | **P3** | `billing_events` store; not school-admin |

### Imports / Exports (cross-cutting)

| Endpoint | Mutation | Status | Action | Risk | Priority | PII / secrets |
| -------- | -------- | ------ | ------ | ---- | -------- | --------------- |
| Student/practical **export** GET routes | Export | **AUDITED** | `student.export.download` / `lesson.export.download` (access) | Medium — PII extraction | — | Access event only; no row payloads; `includesPii: true` |
| Student/practical **import dry-run** POST | Preview | **NOT_NEEDED** | — | — | — | Zero-write |
| Student **import apply** POST | Bulk create students | **AUDITED** | `student.import.apply` | High — volume | — | Summary metadata only |
| Practical **import apply** POST | Bulk create lessons | **AUDITED** | `lesson.import.apply` | High — volume | — | Summary metadata only |

---

## 6. Real high-value gaps

Ordered by foundation-plan MVP alignment and first-client operator need:

**Recently closed:**

- **`student.import.apply`** — Student bulk import apply summary audit (`audit-log-write-paths-student-import-apply-v1`); `POST /api/admin/students/import/apply`; one aggregated event when `applied: true`; metadata (`totalRows`, `createdCount`, `updatedCount: 0`, `skippedCount`, `failedCount: 0`, `dryRun: false`, `source: import`, `format`, `mode: createOnly`, `hasErrors: false`); `entityType: StudentImport`; `entityId` = request correlation id or UUID surrogate; no row payloads/PII; audit failure non-blocking; dry-run route unchanged (NOT_NEEDED).
- **`lesson.create` (manual practical)** — Manual completed practical history audit (`audit-log-write-paths-manual-practical-lesson-v1`); `POST /api/admin/students/[id]/practical-lessons`; reuses `writeLessonCreateAuditEvent`; metadata (`lessonType`, operational ids, `source: MANUAL`, `practicalLessonNumber`, `scheduledAtDateOnly`, `createdVia: manual_practical_lesson`); no notes/names/emails; audit failure non-blocking; separate from calendar `POST /api/admin/lessons` (no duplication).
- **`GET /api/admin/audit-logs`** — Tenant read API foundation (`audit-log-read-api-foundation-v1`); SUPER_ADMIN + host guard; cursor pagination (`createdAt` + `id`); filters; DTO omits `organizationId`, `ipAddress`, `userAgent`, `oldValues`, `newValues`; metadata re-redacted on read; no cross-tenant query param.
- **`/admin/audit-logs`** — Viewer UI foundation (`audit-log-viewer-ui-foundation-v1`); read-only table + filters + Load more; consumes list API only; URL-only (not in main navbar; DEC-026 operator pattern); metadata truncated in UI; no entity name resolution.
- **`student.create`** — Manual Onboarding student create audit (`audit-log-write-paths-student-create-v1`); `POST /api/admin/students`; `StudentCreateAuditContext` from created record; metadata flags only (`appAccessMode`, `hasEmail`, `hasAddress`, `schoolStudentIdPresent`, `createdVia: manual`); no names/emails/schoolStudentId literal; audit failure non-blocking.
- **`instructor.email.change`** — Instructor canonical login email change audit (`audit-log-write-paths-instructor-email-change-v1`); `POST /api/admin/instructors/[id]/change-email`; `InstructorEmailChangeAuditContext` on service success; metadata flags only; no old/new email; audit failure non-blocking.
- **`instructor.delete`** — Instructor hard-delete audit (`audit-log-write-paths-instructor-delete-v1`); zero-deps policy via `DELETE /api/admin/instructors/[id]`; `InstructorDeleteAuditSnapshot` on service success; metadata (`hadLinkedUser`, `hadLessons`, `isAvailableForBooking` flags only); `targetUserId` when linked user existed; audit failure non-blocking.
- **`invitation.email.change`** — Invitation admin triad complete (`audit-log-write-paths-invitation-email-change-v1`); pending email update + token regen via `POST /api/admin/invitations/[id]/change-email`.
- **`instructor.reactivate`** — Instructor lifecycle partial closure (`audit-log-write-paths-instructor-reactivate-v1`); restores booking + app login via `POST /api/admin/instructors/[id]/reactivate`.
- **`lesson.delete`** — Lessons MVP triad complete (`audit-log-write-paths-lesson-delete-v1`); hard delete via `DELETE /api/admin/lessons/[id]`; snapshot before `deleteMany`.

**Explicit non-gaps / defer:**

- **Import apply summaries** — closed for both Students and Practical lessons (`student.import.apply`, `lesson.import.apply`).
- **Settings / feature flags / license** — separate `configuration_history` + operator-internal surfaces (DEC-026).
- **`invitation.accept`** — public route; P2 until accept auditing policy is agreed (tenant resolution + no token logging).
- **Vehicles** — foundation MVP listed but lower operator urgency than People/Lessons for first client.

---

## 7. Recommended next slices (max 3)

| # | Slice name | Scope | Why now |
| - | ---------- | ----- | ------- |
| 1 | `audit-log-viewer-export-v1` | CSV export from viewer (deferred until product need) | Optional; not blocking production |
| 2 | `audit-log-viewer-platform-cross-tenant-v1` | Platform cross-tenant viewer (operator-only) | Deferred; requires stronger governance/guardrails |
| 3 | `audit-log-viewer-entity-resolution-v1` | Optional entity display (e.g. resolve student/lesson labels) | Deferred; avoid PII leaks; keep viewer minimal |

**Defer to slice 4+ (not in top 3):** import apply summaries (if not confirmed), vehicles, invitation accept.

---

## 8. When to stop instrumenting and move to viewer / read API

**Stop broad write-path instrumentation when:**

- All **P1 CANDIDATE** rows in §4–5 are **AUDITED** or explicitly **DEFERRED** with decision log entry.
- Lessons, Invitations, and People admin mutations reachable from `/admin/users` and `/admin/lessons` are covered (including delete + email-change + reactivate).
- Remaining candidates are **P2/P3** (imports, vehicles, platform, settings) unless an operator incident proves otherwise.

**Then prioritize (in order):**

1. **Tenant-scoped read API** — paginated `audit_logs` list for `SUPER_ADMIN` / operator support (no cross-tenant reads).
2. **Minimal viewer UI** — operator/internal surface (not school-admin navbar by default); reuse list API.
3. **Smoke / deploy evidence** — optional read-only smoke that asserts audit row exists after mutation smoke (DEC-036/040 family); not a substitute for viewer.

**Do not block production cutline** on P2/P3 audit candidates (imports, vehicles, settings) if P1 gaps above are closed and manual DB query remains available for incident response.

---

## Appendix: duplication rules (durable)

| Scenario | Rule |
| -------- | ---- |
| Linked student invite vs unlinked invitation create | **`student.invite`** vs **`invitation.create`** — never both for one mutation |
| Student email change vs invitation email change on linked invite | Separate actions on separate routes; metadata flags only |
| Manual practical lesson vs calendar lesson create | Prefer **`lesson.create`** + `source: MANUAL` + `createdVia: manual_practical_lesson` on manual route; calendar route uses `source: SYSTEM` — same action, distinct metadata; never duplicate on one mutation |
| Student bulk import apply vs manual/per-row create | **`student.import.apply`** (summary, `StudentImport`) on import apply route when `applied: true`; **`student.create`** on manual `POST /api/admin/students` only — never emit per-row `student.create` during import apply |
| `PUT /api/users/update` vs `PATCH /api/admin/instructors/[id]` | Avoid duplicate audit for qualified categories; profile-only `instructor.update` if instrumented |

---

*Review method: static grep of `write*AuditEvent` wiring + `app/api/**/route.ts` write verbs (2026-07-02). Re-run after each write-path batch.*
