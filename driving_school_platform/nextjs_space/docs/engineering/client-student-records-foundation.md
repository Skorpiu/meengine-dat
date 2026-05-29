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
- A `Student` **may later** be linked to a `User` via invitation (future batch).
- We **keep** the Prisma model name `Student` and table `students` (no `StudentRecord` table in this batch).

## `appAccessMode`

| Value         | Meaning                                             |
| ------------- | --------------------------------------------------- |
| `MANUAL_ONLY` | School-managed record; no app access                |
| `INVITED`     | Invite sent / pending link to `User` (future flows) |
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

## Invitation policy (future)

- **School Admin** completes the operational `Student` record.
- **Invited learner** only manages login/account details.
- Invite accept should link an existing `Student` to a new or existing `User` without duplicating the ficha.

## Future practical lesson data

Planned on manual/history batches:

- time, date, instructor, lesson number (counter)

Not in DAT_3.6.

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

### Limitations (this batch)

- No UI.
- No autonumbering when `sequenceNumber` is omitted (still required on create).
- No invitation / User linking.
- No practical lesson counter or manual lesson history.
- POST/PATCH use existing demo `user_management` mutation guard.

## Next batches

1. ~~`manual-student-records-api`~~ (done)
2. `manual-student-records-ui`
3. `student-record-invitation-linking`
4. `lessons-student-record-selection`
5. `practical-lesson-counter-foundation`
6. `practical-lessons-manual-history`
7. `import-export-strategy`
8. Import/export implementation

## References

- Migration: `prisma/migrations/20260529130000_student_operational_foundation`
- Helpers: `lib/students/student-school-id.ts`, `lib/students/student-display.ts`
- Lesson selects: `lib/students/student-lesson-select.ts`
