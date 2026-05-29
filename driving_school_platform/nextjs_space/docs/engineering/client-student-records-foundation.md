# Client student records foundation (DAT_3.6)

## Problem

The `Student` model was tightly coupled to `User`:

- `Student.userId` was required and unique.
- `Student.user` was required.

That blocked **manual students** (operational/academic records without app login) and did not match how **A Conquistadora** assigns official student IDs and manages enrollment outside self-signup.

## Previous state

Every `Student` row required a linked `User`. Contact and display data lived only on `User`, so the app could not represent a school-managed record before (or without) an app account.

## Conceptual decision

| Concept     | Role                                         |
| ----------- | -------------------------------------------- |
| **Student** | Operational/academic record (ficha do aluno) |
| **User**    | Authentication/login account only            |

Rules:

- A `Student` **may exist without** a `User`.
- A `Student` **may later** be linked to a `User` via invitation (see **Student record invitation linking** below).
- We **keep** the Prisma model name `Student` and table `students` (no `StudentRecord` table in this batch).

## `appAccessMode`

| Value         | Meaning                                             |
| ------------- | --------------------------------------------------- |
| `MANUAL_ONLY` | School-managed record; no app access                |
| `INVITED`     | Invite sent / pending link to `User`                |
| `APP_USER`    | Linked app account (signup or future invite accept) |

Existing rows with `userId` were backfilled to `APP_USER` in migration `20260529130000_student_operational_foundation`.

## Planned manual operational record

Future UI/API will manage on `Student`:

- Official school ID (`schoolStudentId`)
- Name (`firstName`, `lastName`)
- Contact (`email`, `phoneNumber`)
- `enrollmentDate` (operational enrollment date; may be set automatically on create)

Manual list/create APIs are in the **manual-student-records-api** batch (see below). UI and autonumbering are still future work.

## `schoolStudentId` rule (A Conquistadora)

Canonical ID is **exactly 5 digits**: `YY` + `NNN`

- `YY` = two-digit enrollment year suffix (e.g. `26` for 2026)
- `NNN` = enrollment sequence that year, zero-padded to 3 digits

| yearSuffix | sequence | canonical |
| ---------- | -------- | --------- |
| 26         | 1        | 26001     |
| 26         | 12       | 26012     |
| 26         | 78       | 26078     |
| 26         | 123      | 26123     |

**Invalid as canonical:** `26000` (sequence 000), `2601` (wrong length), `260001`, `26-001`, non-digits.

Helpers: `lib/students/student-school-id.ts`

## Future creation UI

Two fields:

1. **Ano** (e.g. `26`)
2. **Nº inscrição** (e.g. `1`)

The system builds and persists the canonical ID (e.g. `26001`). If enrollment number is left empty, a **future** batch may add per-year autonumbering.

Signup **does not** assign `schoolStudentId` (school admin controls the official record).

## Future search shortcuts

Numeric queries of 3–5 digits normalize to canonical 5-digit IDs:

| query | canonical |
| ----- | --------- |
| 261   | 26001     |
| 2678  | 26078     |
| 26078 | 26078     |

Implemented in `normalizeSchoolStudentIdSearchQuery`; wired on `GET /api/admin/students?search=`.

## Invitation policy

- **School Admin** completes the operational `Student` record.
- **Invited learner** only manages login/account details.
- Invite accept links an existing `Student` to a new `User` when `UserInvitation.studentId` is set (see **Student record invitation linking**).

## Future practical lesson data

Implemented in **practical-lesson-counter-foundation** (see section below). Manual history is implemented; bulk import/export is documented separately (see **Import/export strategy** below).

## Import/export strategy

Bulk migration from legacy software is documented in [client-data-import-export-strategy.md](./client-data-import-export-strategy.md).

Key points:

- The operational **`Student` ficha** is the import target for learner data — not `User`.
- Import **does not create** login accounts; `appAccessMode` stays `MANUAL_ONLY` until School Admin sends an invite.
- Phased rollout: ~~export~~ → ~~student dry-run~~ → student apply → practical lesson dry-run → practical lesson apply.
- **Student export:** `GET /api/admin/students/export` (`format=csv|json`, `SUPER_ADMIN`).
- **Student import dry-run:** `POST /api/admin/students/import/dry-run` (JSON body, no DB writes).
- Templates: `docs/examples/import-export/`; types: `lib/import-export/import-export-contracts.ts`; helpers: `lib/import-export/student-record-export.ts`, `lib/import-export/student-record-import-dry-run.ts`.

## Why no separate `StudentRecord` table

- Avoid duplicate entities and migration churn.
- `Student` already owns lessons, counters, and org scope.
- Operational fields extend the same row; `User` becomes optional.

## Risks

| Risk                                       | Mitigation                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| Code assuming `student.user` is always set | Display helpers + expanded selects; pages updated incrementally |
| Duplicate `schoolStudentId` per org        | `@@unique([organizationId, schoolStudentId])`                   |
| Legacy `studentIdNumber` / `studentNumber` | Kept unchanged for compatibility                                |
| Nullable `userId` + `onDelete: SetNull`    | Deleting a user unlinks but preserves the ficha                 |

## Manual student records API foundation

**Auth:** `SUPER_ADMIN` only, tenant-scoped via `assertUserTenantHost` + `session.user.organizationId` (never from request body). `INSTRUCTOR` / `STUDENT` blocked.

### Endpoints

| Method  | Path                       | Purpose                                          |
| ------- | -------------------------- | ------------------------------------------------ |
| `GET`   | `/api/admin/students`      | List operational students for current org        |
| `POST`  | `/api/admin/students`      | Create manual student (`MANUAL_ONLY`, no `User`) |
| `GET`   | `/api/admin/students/[id]` | Detail                                           |
| `PATCH` | `/api/admin/students/[id]` | Update operational fields                        |

### Query params (`GET`)

- `search` — name, email, phone, `schoolStudentId`; numeric 3–5 digit shortcuts normalized (e.g. `261` → `26001`)
- `appAccessMode` — `MANUAL_ONLY` \| `INVITED` \| `APP_USER`
- `limit` — default 50, max 100
- `cursor` — optional student `id` for simple pagination

Response shape: `{ success: true, data: { students, nextCursor } }`.

### Create body (`POST`)

Required: `firstName`, `yearSuffix`, `sequenceNumber`. Optional: `lastName`, `email`, `phoneNumber`, `enrollmentDate` (defaults to now).

Server builds `schoolStudentId` with `buildSchoolStudentId(yearSuffix, sequenceNumber)` and stores `schoolStudentIdSource: MANUAL`, `appAccessMode: MANUAL_ONLY`, `userId: null`.

Legacy `studentIdNumber` is **not** set on manual create (remains `null`). The official school identifier is `schoolStudentId` only.

Duplicate `schoolStudentId` in the same organization → `409` (`school_student_id_already_exists`).

### Patch body (`PATCH`)

Partial: `firstName`, `lastName`, `phoneNumber`, `email`, `yearSuffix` + `sequenceNumber` (both required together), `enrollmentDate`.

Does **not** update `userId` or `appAccessMode`.

### Implementation modules

- `lib/students/student-record-dto.ts`
- `lib/students/student-record-validation.ts`
- `lib/students/student-record-queries.ts`
- `app/api/admin/students/route.ts`
- `app/api/admin/students/[id]/route.ts`

## Manual student records UI foundation

**Location:** `/admin/users` — section **Alunos** (`StudentRecordsManager`), below the app-user list and above invitations. Same `SUPER_ADMIN` gate as the users page.

### Create form

| Field             | API field        | Notes                                 |
| ----------------- | ---------------- | ------------------------------------- |
| Ano de inscrição  | `yearSuffix`     | Required; 2 digits (e.g. `26`)        |
| Nº inscrição      | `sequenceNumber` | Required; 1–999                       |
| Nome              | `firstName`      | Required                              |
| Apelido           | `lastName`       | Optional                              |
| Contacto          | `phoneNumber`    | Optional                              |
| Email             | `email`          | Optional                              |
| Data de inscrição | `enrollmentDate` | Optional; defaults to today on server |

Live preview uses `buildSchoolStudentId` (e.g. `26` + `1` → `26001`). Submit: `POST /api/admin/students`.

### List & search

`GET /api/admin/students?search=…&limit=100` — search by name, phone, email, canonical ID, or numeric shortcuts (`261` → `26001`). Optional **Carregar mais** when `nextCursor` is returned.

Columns: school ID, name, contact, enrollment date, app access label, edit action.

### Edit dialog

`PATCH /api/admin/students/[id]` — same operational fields; `yearSuffix` and `sequenceNumber` sent together when the ID changes. Does not expose `userId`, `appAccessMode`, or legacy counters.

### Access labels (UI)

| `appAccessMode` | Label            |
| --------------- | ---------------- |
| `MANUAL_ONLY`   | Sem acesso à app |
| `INVITED`       | Convite enviado  |
| `APP_USER`      | Com acesso à app |

### UI modules

- `components/admin/student-records-manager.tsx`
- `lib/students/student-record-ui-types.ts`
- `lib/students/student-record-ui-utils.ts`

### UI limitations

- No autonumbering when enrollment number is empty (still required).
- No practical lesson counter editing from this section (history dialog only).
- Demo org: POST/PATCH/invite show API demo restriction message (unchanged quotas).
- List uses `limit=100` per request; simple load-more only.

### Limitations (API batch)

- No autonumbering when `sequenceNumber` is omitted (still required on create).
- POST/PATCH use existing demo `user_management` mutation guard.

## Lessons use operational Student records

**Contract:** `studentId` / `studentIds` in lesson create payloads represent **`Student.id`** (operational ficha), not `User.id`.

### Create / update API

- `createAdminLesson` resolves students with `{ id: studentId, organizationId }`.
- For `EXAM` / `THEORY_EXAM`, all `studentIds` are validated via `findOperationalStudentsInOrg` **before** any `lesson.create`; missing IDs return `404` with no partial creates. Creates run inside `prisma.$transaction`.
- Manual students (`MANUAL_ONLY`, no linked `User`) can be assigned to DRIVING, EXAM, and THEORY_EXAM lessons.
- Students from another organization return `404 Student not found`.
- Lesson update (`PUT /api/admin/lessons/[id]`) does not change the assigned student (unchanged scope).

### Lesson form student list

- `LessonForm` loads options from `GET /api/admin/students?limit=100`.
- Dropdown/checkbox values are **`Student.id`**.
- Labels use `getStudentDisplayLabel` (e.g. `26001 — João Silva`, or name-only when no school ID).
- Includes `APP_USER`, `MANUAL_ONLY`, and `INVITED` records (not filtered to linked User only).
- **GET** `/api/admin/students` allows `INSTRUCTOR` read access with a **minimal lesson-selection DTO** (no email, phone, enrollment/timestamps); POST/PATCH remain `SUPER_ADMIN` only.

### Display / DTOs

- Lesson list/detail selects include operational student fields (`firstName`, `lastName`, `schoolStudentId`, …).
- Display helpers (`getStudentDisplayName`, `getLessonParticipantName`) prefer operational fields, then fall back to linked `User`, then `schoolStudentId`, then `"Student"`.
- No runtime access assumes `lesson.student.user` is always present.

### Modules

- `lib/students/student-lesson-resolve.ts` — tenant-scoped Student lookup for lesson create
- `lib/students/student-lesson-form-options.ts` — LessonForm option mapping/parsing
- `lib/students/student-lesson-select.ts` — Prisma select for lesson reads
- `lib/students/student-display.ts` — shared display helpers

### Limitations (this batch)

- No import/export endpoints (strategy documented separately).
- Lesson edit form still does not allow changing the assigned student.

## Practical lesson counter foundation

**Goal:** School Admin and Instructor can see which practical lesson number each student is on when viewing lesson lists and the Schedule Map.

### Data model

- `Lesson.practicalLessonNumber` (`Int?`) — sequential practical lesson number for the operational `Student`.
- Applies only to `lessonType = DRIVING` in this batch.
- `null` for THEORY, EXAM, THEORY_EXAM, and other types.
- Migration: `prisma/migrations/20260529140000_practical_lesson_number` (column only; no backfill).

### Counting rules

| Rule                           | Detail                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Counted type                   | `DRIVING` only                                                                                                           |
| Not counted                    | `THEORY`, `THEORY_EXAM`, `EXAM` (EXAM is treated as exam, not a numbered practical lesson in this batch)                 |
| Assignment                     | Server-side on `createAdminLesson` when `lessonType = DRIVING` and `studentId` is set                                    |
| Formula                        | `max(maxAssignedNumber, totalDrivingCount) + 1` per `(organizationId, studentId)`                                        |
| Legacy rows                    | Existing DRIVING lessons may have `practicalLessonNumber = null`; they still advance the counter via total DRIVING count |
| Multi-student EXAM/THEORY_EXAM | No `practicalLessonNumber` assigned                                                                                      |

Helpers: `lib/lessons/practical-lesson-counter.ts`

### API / DTO

- `LESSON_LIST_SELECT` and `LESSON_DETAIL_SELECT` include `practicalLessonNumber`.
- Display helper: `getPracticalLessonNumberLabel` → `"Prática #N"` when `DRIVING` and number present.

### UI (minimal)

| Surface                                    | Behaviour                                           |
| ------------------------------------------ | --------------------------------------------------- |
| Schedule Map chips                         | First line shows `Prática #N · HH:MM` when assigned |
| Admin lessons dashboard (`/admin/lessons`) | Student row shows `Prática #N` badge on DRIVING tab |
| Instructor calendar                        | Same Schedule Map chip behaviour via shared DTO     |

Frontend does **not** recalculate numbers; it displays the field from the API.

### Limitations (this batch)

- No broad backfill for historical DRIVING lessons.
- No import/export endpoints (strategy documented separately).
- No special handling for cancellations or rescheduling (numbers are assigned at create and not recomputed).
- `EXAM` does not receive a practical lesson number even if it represents a practical exam in product language elsewhere.

## Manual practical lesson history

**Goal:** School Admin can register DRIVING lessons already completed outside DAT (legacy software or paper records), so the practical lesson counter and school view reflect real history.

### Data model

- Reuses `Lesson` rows (`lessonType = DRIVING`).
- `Lesson.lessonSource` enum: `SYSTEM` (default), `MANUAL`, `IMPORT` (reserved).
- Migration: `prisma/migrations/20260529150000_lesson_source` — existing rows default to `SYSTEM`.
- Manual entries: `status = COMPLETED`, `lessonSource = MANUAL`, explicit `practicalLessonNumber`, `vehicleId = null`.

### Endpoints (`SUPER_ADMIN` only, tenant-scoped)

| Method | Path                                         | Purpose                                                                                  |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/api/admin/students/[id]/practical-lessons` | List DRIVING lessons for student (ordered by `practicalLessonNumber`, then `lessonDate`) |
| `POST` | `/api/admin/students/[id]/practical-lessons` | Create manual history row                                                                |

**POST body:**

| Field                   | Required | Notes                                                                            |
| ----------------------- | -------- | -------------------------------------------------------------------------------- |
| `lessonDate`            | yes      | ISO date string                                                                  |
| `startTime`             | yes      | `HH:mm`                                                                          |
| `instructorId`          | yes      | Instructor **User.id** (same as lesson create / `/api/admin/instructors/all`)    |
| `practicalLessonNumber` | yes      | Integer 1–999, set explicitly (does **not** call `getNextPracticalLessonNumber`) |
| `durationMinutes`       | no       | Default **60**; used to compute `endTime`                                        |
| `notes`                 | no       | Stored in `adminNotes`                                                           |

**Duplicate rule:** two DRIVING lessons for the same `(organizationId, studentId)` with the same `practicalLessonNumber` → `409` (`practical_lesson_number_already_exists`). Application-level check only (no DB unique constraint in this batch).

**Demo org:** POST uses the same `decideDemoLessonCreate` guard as `/api/admin/lessons` POST.

### Interaction with automatic counter

Manual rows are normal DRIVING lessons with `practicalLessonNumber` set. `getNextPracticalLessonNumber` uses `max(maxAssignedNumber, totalDrivingCount) + 1`, so after manual `#5` the next system-created DRIVING lesson receives `#6`.

System-created lessons set `lessonSource = SYSTEM`.

### UI

- `/admin/users` → **Alunos** section → **Aulas práticas** button per student row.
- Dialog: list existing history + form to add (date, time, instructor, lesson number, duration, optional notes).
- Instructors loaded from existing `GET /api/admin/instructors/all`.

### Modules

- `lib/lessons/manual-practical-lesson-validation.ts`
- `lib/lessons/manual-practical-lesson-service.ts`
- `lib/students/student-practical-history-ui-utils.ts`
- `components/admin/student-practical-history-dialog.tsx`
- `app/api/admin/students/[id]/practical-lessons/route.ts`

### Limitations (this batch)

- Add-only (no edit/delete of manual history).
- No bulk import/CSV/JSON endpoints (strategy and contracts only — see import/export strategy doc).
- No INSTRUCTOR read access to history API.
- No advanced cancellation/rescheduling rules.
- Duplicate prevention is not hardened with a partial unique index (race window possible under concurrent POST).

## Student record invitation linking

**Goal:** School Admin sends an invite from an existing operational `Student` ficha so the learner creates a `User` account that links to that record — without duplicating the ficha.

### Roles

| Actor               | Responsibility                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| **School Admin**    | Owns the operational ficha; sends invite; data stays on `Student`             |
| **Invited learner** | Creates login only (name/password on accept); does not fill operational ficha |

### Data model

- `UserInvitation.studentId` (`String?`) — optional link to existing `Student`.
- Migration: `prisma/migrations/20260529160000_user_invitation_student_id` (additive; no backfill).
- Index: `@@index([organizationId, studentId])`.
- Existing invitations without `studentId` behave unchanged.

### Endpoint

| Method | Path                              | Purpose                                    |
| ------ | --------------------------------- | ------------------------------------------ |
| `POST` | `/api/admin/students/[id]/invite` | Invite from existing manual student record |

**Auth:** `SUPER_ADMIN` only, tenant-scoped. Demo org uses existing `user_management` mutation guard.

**Body:** `{ email?: string }`

- Email from body if provided; otherwise `Student.email`.
- Normalized lowercase/trim.
- `400` (`missing_email`) when no email available.
- Blocks when `Student.userId` is set, `appAccessMode = APP_USER`, user exists with email, or pending invitation exists for that email in the org.

**On success:**

- Creates `UserInvitation` with `role: STUDENT`, `studentId` set.
- Updates `Student.email` (if needed) and `appAccessMode = INVITED`.
- Does **not** create `User` or a new `Student`.
- Response: `{ success: true, data: { invitation, inviteLink, emailDelivery } }` (compatible invitation DTO + copy-link fallback).

### Accept behaviour

When `invitation.studentId` is set:

1. Validate `Student` belongs to invitation `organizationId`.
2. Validate `Student.userId` is still `null` — else `409` (`student_already_linked`).
3. Create `User` (email verified via invite, as today).
4. Link: `Student.userId = user.id`, `appAccessMode = APP_USER`, `Student.email = user.email`.
5. Preserve operational `firstName`/`lastName` when already set; fill from accept form only when empty.
6. **Do not** call `student.create`.

When `studentId` is null: previous accept flow (creates new `Student` row).

### UI

`/admin/users` → **Alunos** section:

| `appAccessMode` + `userId` | UI                                 |
| -------------------------- | ---------------------------------- |
| `MANUAL_ONLY`, no `userId` | **Enviar convite** button + dialog |
| `INVITED`                  | Badge **Convite enviado**          |
| `APP_USER`                 | Badge **Com acesso à app**         |

Dialog: shows/edits invite email, calls `POST /api/admin/students/[id]/invite`, shows `emailDelivery` and copy-link fallback.

### Modules

- `lib/students/student-record-invite-service.ts`
- `lib/students/student-record-invite-validation.ts`
- `app/api/admin/students/[id]/invite/route.ts`
- `components/admin/student-record-invite-dialog.tsx`
- `lib/invitations/invitation-accept-service.ts` (linked-student accept path)

### Limitations (this batch)

- No bulk invite.
- No import/export endpoints (strategy documented separately).
- No advanced invite editing or re-send UX beyond generic invitations list.
- No change to Postmark provider, RLS, or generic invitation refactor.

## Next batches

1. ~~`manual-student-records-api`~~ (done)
2. ~~`manual-student-records-ui`~~ (done)
3. ~~`student-record-invitation-linking`~~ (done)
4. ~~`lessons-student-record-selection`~~ (done)
5. ~~`practical-lesson-counter-foundation`~~ (done)
6. ~~`practical-lessons-manual-history`~~ (done)
7. ~~`import-export-strategy`~~ (done — docs + contracts; see [client-data-import-export-strategy.md](./client-data-import-export-strategy.md))
8. ~~`export-student-records`~~ (done — `GET /api/admin/students/export`)
9. ~~`import-student-records-dry-run`~~ (done — `POST /api/admin/students/import/dry-run`)
10. Import/export remaining (student apply; practical lesson export/import)

## References

- Migration: `prisma/migrations/20260529130000_student_operational_foundation`
- Migration: `prisma/migrations/20260529140000_practical_lesson_number`
- Migration: `prisma/migrations/20260529150000_lesson_source`
- Migration: `prisma/migrations/20260529160000_user_invitation_student_id`
- Helpers: `lib/students/student-school-id.ts`, `lib/students/student-display.ts`, `lib/lessons/practical-lesson-counter.ts`, `lib/lessons/manual-practical-lesson-service.ts`, `lib/students/student-record-invite-service.ts`
- Import/export: [client-data-import-export-strategy.md](./client-data-import-export-strategy.md), `lib/import-export/import-export-contracts.ts`, `lib/import-export/student-record-export.ts`, `lib/import-export/student-record-import-dry-run.ts`, `app/api/admin/students/export/route.ts`, `app/api/admin/students/import/dry-run/route.ts`, `docs/examples/import-export/`
- Lesson selects: `lib/students/student-lesson-select.ts`
