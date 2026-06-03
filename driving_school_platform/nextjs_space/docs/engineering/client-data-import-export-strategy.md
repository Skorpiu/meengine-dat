# Client data import/export strategy (DAT_3.6)

## A. Objective

Support **migration of driving-school clients** moving from legacy software into DAT, starting with **A Conquistadora** as the first real-world case.

This document defines the **technical strategy and contracts** for phased import/export. **Implemented (API + selected UI slices):** student records export/import (dry-run + apply UI on Fichas registadas); practical lessons export + import dry-run UI on `/admin/lessons`; practical lessons import apply **API** only. **Deferred:** per-student history import/export UI. **Practical lessons import apply UI:** done (`import-export-ui-practical-lessons-import-apply-v1`). **Demo guard on apply routes:** done (`import-apply-demo-guard-v1`). See sections below marked **Implemented:**.

Scope for the first implementation waves:

| Entity (phase 1–2)                             | Priority |
| ---------------------------------------------- | -------- |
| Students (operational fichas)                  | First    |
| Practical lesson history                       | Second   |
| Instructors, vehicles, theory, exams, payments | Later    |

The design must stay **generic enough** for other organizations, but avoid overengineering for entities not yet in scope.

**Related foundation:** [client-student-records-foundation.md](./client-student-records-foundation.md) — operational `Student` model, `schoolStudentId`, manual history, invitation linking.

**Contracts:** `lib/import-export/import-export-contracts.ts`

**Export helpers:** `lib/import-export/student-record-export.ts`

**Templates & examples:** `docs/examples/import-export/`

---

## B. Principles

| Principle                                  | Detail                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dry-run before write**                   | Every import path must support a read-only validation pass that produces a per-row report before any database mutation.                      |
| **Per-row reporting**                      | Errors and warnings reference `rowNumber`, `field`, stable `code`, and optional `rawValue`. One bad row must not abort dry-run for the rest. |
| **Idempotency**                            | Natural keys (see [G. Idempotency](#g-idempotency)) detect duplicates; apply mode blocks duplicates by default.                              |
| **No automatic User creation**             | Import creates/updates operational `Student` rows only. `User` / login accounts are created only via the existing invite flow.               |
| **Student is the primary entity**          | All student-facing migration targets the operational ficha (`Student`), not `User`.                                                          |
| **User/login only by invite**              | Imported students default to `appAccessMode = MANUAL_ONLY`. School Admin sends invites separately when app access is needed.                 |
| **Import must not send emails**            | No Postmark, invitation, or verification emails during import.                                                                               |
| **No silent overwrites**                   | Import must not alter existing rows without an explicit future **update/merge** mode. Initial apply mode is **create-only**.                 |
| **Never trust `organizationId` from file** | Files must not carry tenant identifiers. All operations are scoped to `session.user.organizationId` (authenticated context).                 |
| **Tenant-scoped always**                   | Same guard pattern as manual student APIs: `SUPER_ADMIN` + `assertUserTenantHost`.                                                           |
| **Destructive ops out of scope**           | No bulk delete, truncate, or rollback-via-import in early phases.                                                                            |

---

## C. Recommended migration order

Import entities in dependency order:

1. **Students** — foundation for all lesson/exam references.
2. **Instructors** (if not already in DAT) — required to resolve practical lesson instructor fields.
3. **Vehicles** (if needed for future scheduled lessons) — not required for manual practical history (`vehicleId = null`).
4. **Practical lesson history** — references existing `schoolStudentId` + instructor.
5. **Future lessons / schedules** — system-created lessons; separate from historical import.
6. **Exams** — theory/practical exam records.
7. **Payments / financial** — much later; out of early scope.

Within a single batch file, rows are independent unless noted (practical lessons depend on students existing in org or in the same import batch — see future batch design).

---

## D. Formats

| Format   | Audience                                            | Use                                                                             |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| **CSV**  | Non-technical staff, Excel                          | Primary export/import surface for students and practical lessons.               |
| **JSON** | Technical migrations, scripts, intermediate storage | Structured bulk payloads; may become internal format between dry-run and apply. |

**Phase 1 (shipped):** CSV/JSON **export** of students and practical lessons (API + admin UI).

**Phase 2–3 (shipped for students; partial for practical lessons):** CSV/JSON **import dry-run** and **apply** APIs; student import dry-run/apply **UI**; practical lessons import dry-run **UI**; practical lessons import apply **API** only.

**Phase 4 (deferred):** per-student practical history import/export UI. **Practical lessons import apply UI** and **demo guard on apply routes** shipped (`import-export-ui-practical-lessons-import-apply-v1`, `import-apply-demo-guard-v1`).

JSON schema versioning (`formatVersion`) will be introduced when parsers are implemented; examples use `formatVersion: 1` as a placeholder.

---

## E. Encoding and locale

| Topic             | Contract                                                                                                                                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File encoding** | UTF-8 (with BOM tolerated on read in future parser).                                                                                                                                                                                                                                                                 |
| **CSV delimiter** | **Semicolon (`;`) recommended** for Excel PT-PT / PT-BR regional settings, where comma is the decimal separator and Excel expects `;` as column separator. Comma (`,`) may be accepted as an alternate delimiter in a future parser if explicitly detected or configured; document both but ship templates with `;`. |
| **Dates**         | ISO `YYYY-MM-DD` in files (e.g. `2026-05-29`). No ambiguous `DD/MM/YYYY` in the base contract. Future UI may accept local formats and normalize before validation.                                                                                                                                                   |
| **Times**         | 24-hour `HH:mm` (e.g. `09:00`, `14:30`).                                                                                                                                                                                                                                                                             |
| **Decimals**      | Not used in current templates. If added later, prefer dot decimal in JSON; CSV numeric fields remain unquoted integers where possible.                                                                                                                                                                               |
| **Text**          | Names and notes may contain Unicode (e.g. `João`, `Silva`).                                                                                                                                                                                                                                                          |

---

## F. Security

| Control                  | Detail                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Role**                 | `SUPER_ADMIN` only for import/export endpoints (future).                                                                           |
| **Tenant scope**         | `organizationId` from authenticated session; ignore any tenant field in uploaded files.                                            |
| **File retention**       | Uploaded files must not persist indefinitely; process in memory or short-lived temp storage, then discard.                         |
| **Logging**              | Log counts, codes, and row numbers — not full PII payloads (avoid logging entire CSV rows with emails/phones at info level).       |
| **Size limits**          | Max **500 rows** and **2 MB** `content` string per apply request; dry-run uses same row cap when enforced via apply module limits. |
| **Preview before apply** | Apply requires a prior successful dry-run (or re-validation) with zero blocking errors.                                            |
| **Error responses**      | Generic messages to client; no raw stack traces.                                                                                   |
| **No emails on import**  | Reinforced: import pipeline must not trigger invitation, verification, or notification emails.                                     |

---

## G. Idempotency

Natural keys are scoped per **organization** (tenant).

### Students

| Key                          | `schoolStudentId` (canonical 5-digit ID, unique per org)                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Dry-run duplicate**        | Report `duplicate_school_student_id` (error) when ID already exists in org. |
| **Apply (initial)**          | **Block** create; do not update existing row.                               |
| **Future update/merge mode** | Explicit opt-in batch; out of scope for first apply implementation.         |

Imported students:

- `appAccessMode = MANUAL_ONLY`
- `userId = null`
- `schoolStudentIdSource = IMPORT` (future enum/value; reserved in docs)

### Practical lessons

| Key                   | `(schoolStudentId, practicalLessonNumber)` within org                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Dry-run duplicate** | Report `duplicate_practical_lesson_number` when a DRIVING lesson with same pair exists.        |
| **Apply**             | Block duplicate; align with manual history API (`409 practical_lesson_number_already_exists`). |

Imported practical lessons (future):

- `lessonType = DRIVING`
- `lessonSource = IMPORT`
- `status = COMPLETED` (historical records)
- `vehicleId = null` (same as manual history)

### Instructors (future)

Resolution TBD: prefer **`instructorEmail`** in import files (matches human-readable exports). Fallback to instructor license number if A Conquistadora requires it. Must resolve to an existing `User` with instructor role in the same org.

---

## H. Dry-run report structure

Conceptual response shape (future API). TypeScript mirror: `ImportDryRunReport` in `lib/import-export/import-export-contracts.ts`.

```json
{
  "totalRows": 120,
  "validRows": 115,
  "invalidRows": 5,
  "warnings": [
    {
      "rowNumber": 4,
      "field": "email",
      "code": "unsupported_value",
      "message": "Email is empty; student will be created without contact email.",
      "rawValue": null
    }
  ],
  "errors": [
    {
      "rowNumber": 7,
      "field": "schoolStudentId",
      "code": "duplicate_school_student_id",
      "message": "Student 26001 already exists in this organization.",
      "rawValue": "26001"
    }
  ],
  "preview": [
    {
      "rowNumber": 1,
      "normalized": {
        "schoolStudentId": "26001",
        "firstName": "João",
        "lastName": "Silva"
      }
    }
  ]
}
```

`preview` contains normalized rows that would be created on apply (subset or paginated in UI for large files).

---

## I. Error policy

| Rule                   | Detail                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Dry-run resilience** | Row-level errors do not stop processing of subsequent rows.                              |
| **Apply gate**         | Real import runs only when dry-run has **zero blocking errors** (`errors.length === 0`). |
| **Warnings**           | Non-blocking; surfaced in report and UI; apply may proceed if no errors.                 |
| **Stable codes**       | Machine-readable `code` values for UI and tests — see `IMPORT_ERROR_CODES` in contracts. |

### Initial error codes

| Code                                | Typical cause                                                        |
| ----------------------------------- | -------------------------------------------------------------------- |
| `missing_required_field`            | Required column empty                                                |
| `invalid_school_student_id`         | Not 5 digits, sequence 000, etc.                                     |
| `duplicate_school_student_id`       | ID already in org (or duplicate within file — future)                |
| `invalid_date`                      | Not parseable ISO date                                               |
| `invalid_time`                      | Not `HH:mm`                                                          |
| `invalid_duration`                  | `durationMinutes` out of allowed range                               |
| `unknown_student`                   | `schoolStudentId` not found in org                                   |
| `unknown_instructor`                | Email not found for org instructor                                   |
| `duplicate_practical_lesson_number` | Same student + lesson number exists                                  |
| `unsupported_value`                 | Enum/format not accepted; may be warning or error depending on field |

Additional codes (e.g. `student_not_found`, `file_too_large`) will be added during implementation.

---

## J. Export strategy

Export is **read-only**, tenant-scoped, `SUPER_ADMIN` only (future endpoints).

### General rules

- Export **normalized** values (canonical `schoolStudentId`, ISO dates, `HH:mm` times).
- **Exclude:** `passwordHash`, tokens, internal UUIDs unless needed for round-trip technical JSON (student export uses `schoolStudentId` as external key).
- **Exclude:** unnecessary internal fields (`createdAt`, `updatedAt`, Prisma ids) from CSV; optional in JSON technical export.

### Students export columns

| Column            | Source / notes                           |
| ----------------- | ---------------------------------------- |
| `schoolStudentId` | Canonical 5-digit ID                     |
| `yearSuffix`      | 2-digit year                             |
| `sequence`        | Integer 1–999                            |
| `firstName`       | Operational field                        |
| `lastName`        | Operational field                        |
| `phoneNumber`     | Optional                                 |
| `email`           | Optional                                 |
| `enrollmentDate`  | ISO date                                 |
| `appAccessMode`   | `MANUAL_ONLY` \| `INVITED` \| `APP_USER` |

### Practical lessons export columns

| Column                  | Source / notes                          |
| ----------------------- | --------------------------------------- |
| `schoolStudentId`       | Student reference                       |
| `practicalLessonNumber` | Integer (nullable in export when unset) |
| `lessonDate`            | ISO date                                |
| `startTime`             | `HH:mm`                                 |
| `durationMinutes`       | Derived from start/end or stored value  |
| `instructorEmail`       | From linked instructor User             |
| `instructorName`        | Instructor User first + last name       |
| `lessonSource`          | `SYSTEM` \| `MANUAL` \| `IMPORT`        |
| `status`                | Lesson status                           |
| `notes`                 | From `adminNotes` when present          |

Import templates may omit export-only fields (`endTime`, `status`, `lessonSource`) — those are set by the import pipeline.

---

## Implemented: student records export

**Batch:** `export-student-records` (read-only).

### Endpoint

| Method | Path                         | Auth          |
| ------ | ---------------------------- | ------------- |
| `GET`  | `/api/admin/students/export` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Query param `organizationId` is **ignored**.

### Query params

| Param           | Values                                      | Default |
| --------------- | ------------------------------------------- | ------- |
| `format`        | `csv` \| `json`                             | `csv`   |
| `search`        | Same semantics as `GET /api/admin/students` | —       |
| `appAccessMode` | `MANUAL_ONLY` \| `INVITED` \| `APP_USER`    | —       |

### CSV response

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="students-export-YYYY-MM-DD.csv"`
- Delimiter: **`;`** (semicolon)
- Headers: `STUDENT_EXPORT_CSV_HEADERS` — import columns plus `appAccessMode`
- UTF-8 without BOM (Excel PT generally opens correctly with semicolon CSV)
- Rows ordered by `schoolStudentId` asc nulls last, then `createdAt` desc, then `id` asc

### JSON response

```json
{
  "formatVersion": 1,
  "entity": "students",
  "exportedAt": "2026-05-29T10:00:00.000Z",
  "rows": [{ "...": "..." }]
}
```

### Exported fields (per row)

`schoolStudentId`, `yearSuffix`, `sequence`, `firstName`, `lastName`, `phoneNumber`, `email`, `enrollmentDate` (ISO date), `appAccessMode`.

**Excluded:** `passwordHash`, tokens, `organizationId`, internal UUIDs, `User` relation, `studentNumber`, `studentIdNumber`, timestamps.

### Modules

- `app/api/admin/students/export/route.ts`
- `lib/import-export/student-record-export.ts`
- `lib/students/student-record-queries.ts` — `listStudentRecordsForExport`, `STUDENT_RECORD_EXPORT_SELECT`

### Limitations (export batch)

- No import apply.
- No practical lesson export.
- No dedicated admin UI (call API directly or via future UI batch).
- No update/merge — export is read-only snapshot.
- No pagination on export (full org result set for current filters).

---

## Implemented: student records import dry-run

**Batch:** `import-student-records-dry-run` (validate only — **no DB writes**).

### Endpoint

| Method | Path                                 | Auth          |
| ------ | ------------------------------------ | ------------- |
| `POST` | `/api/admin/students/import/dry-run` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Body field `organizationId` is **ignored**.

### Request body

```json
{
  "format": "csv",
  "content": "schoolStudentId;yearSuffix;...\n26001;26;1;João;..."
}
```

```json
{
  "format": "json",
  "rows": [
    {
      "schoolStudentId": "26001",
      "yearSuffix": "26",
      "sequence": 1,
      "firstName": "João"
    }
  ]
}
```

JSON also accepts `content` as a string (`{ "rows": [...] }` or a bare array).

**Not supported in this batch:** multipart file upload.

### CSV rules

- Delimiter: **`;`**
- First non-empty line: header (must match `STUDENT_IMPORT_CSV_HEADERS` exactly)
- Data rows: `rowNumber` = physical line number (header = line 1)
- Completely empty lines skipped
- Basic quoted fields supported (semicolons/newlines inside quotes)

### Validations

| Rule                                                               | Code (examples)               |
| ------------------------------------------------------------------ | ----------------------------- |
| Required: `schoolStudentId`, `yearSuffix`, `sequence`, `firstName` | `missing_required_field`      |
| Canonical 5-digit `schoolStudentId`                                | `invalid_school_student_id`   |
| `yearSuffix` + `sequence` must match `schoolStudentId`             | `invalid_school_student_id`   |
| `sequence` 1–999                                                   | `invalid_school_student_id`   |
| Optional `enrollmentDate` as `YYYY-MM-DD`                          | `invalid_date`                |
| Optional `email` format                                            | `unsupported_value`           |
| Duplicate ID in file                                               | `duplicate_school_student_id` |
| ID already in org                                                  | `duplicate_school_student_id` |

Uses `parseCanonicalSchoolStudentId` and `buildSchoolStudentId` from `lib/students/student-school-id.ts`.

### Response

```json
{
  "success": true,
  "data": {
    "totalRows": 2,
    "validRows": 1,
    "invalidRows": 1,
    "warnings": [],
    "errors": [
      {
        "rowNumber": 3,
        "field": "...",
        "code": "...",
        "message": "...",
        "rawValue": "..."
      }
    ],
    "preview": [{ "rowNumber": 2, "normalized": { "...": "..." } }]
  }
}
```

Shape aligns with `ImportDryRunReport`. File-level parse errors (e.g. bad header) return `success: true` with errors on row 1 and `totalRows: 0`.

### Modules

- `app/api/admin/students/import/dry-run/route.ts`
- `lib/import-export/student-record-import-dry-run.ts`
- `lib/students/student-record-queries.ts` — `findExistingSchoolStudentIdsInOrg`

### Limitations (dry-run batch)

- No `Student` create/update.
- No `User` creation, invites, or emails.
- No import apply.
- No admin UI.
- No multipart upload.
- No update/merge for existing students.
- No practical lesson import/export.

---

## Implemented: student records import apply

**Batch:** `import-student-records-apply` (create-only; same validation as dry-run).

### Endpoint

| Method | Path                               | Auth          |
| ------ | ---------------------------------- | ------------- |
| `POST` | `/api/admin/students/import/apply` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Body field `organizationId` is **ignored**.

### Request body

Same shape as dry-run:

```json
{
  "format": "csv",
  "content": "schoolStudentId;yearSuffix;...\n26001;26;1;João;..."
}
```

```json
{
  "format": "json",
  "rows": [
    {
      "schoolStudentId": "26001",
      "yearSuffix": "26",
      "sequence": 1,
      "firstName": "João"
    }
  ]
}
```

Optional `"mode": "createOnly"` (only supported value; default behavior is create-only).

**Not supported in this batch:** multipart file upload, update/merge, UI.

### Apply rules

1. Parse payload (CSV or JSON).
2. Enforce limits: max **500 rows**, max **2 MB** `content` string length.
3. Run the **same validation** as dry-run (including duplicate lookup in org and within file).
4. If **any blocking error**: no DB writes; return `applied: false`.
5. If all rows valid: create `Student` rows in a single **`prisma.$transaction`** (all-or-nothing).

### Fields written (per row)

| Field                     | Value                                  |
| ------------------------- | -------------------------------------- |
| `organizationId`          | From session (never from file)         |
| `userId`                  | `null`                                 |
| `firstName`, `lastName`   | From file                              |
| `email`, `phoneNumber`    | From file (email lowercased)           |
| `schoolStudentId`         | Canonical 5-digit ID                   |
| `schoolStudentYearSuffix` | From file                              |
| `schoolStudentSequence`   | From file                              |
| `schoolStudentIdSource`   | `IMPORT`                               |
| `appAccessMode`           | `MANUAL_ONLY`                          |
| `enrollmentDate`          | From file if present; otherwise `null` |

**Not set:** `studentIdNumber`, `studentNumber` (DB autoincrement), `User`, invitations, emails.

### Response

Success with apply result:

```json
{
  "success": true,
  "data": {
    "applied": true,
    "createdCount": 3,
    "skippedCount": 0,
    "report": { "...": "ImportDryRunReport shape" }
  }
}
```

When validation blocks apply:

```json
{
  "success": true,
  "data": {
    "applied": false,
    "createdCount": 0,
    "skippedCount": 0,
    "report": { "...": "errors populated" }
  }
}
```

P2002 on `(organizationId, schoolStudentId)` is surfaced as `duplicate_school_student_id` with `applied: false` (race after pre-check).

### Modules

- `app/api/admin/students/import/apply/route.ts`
- `lib/import-export/student-record-import-apply.ts`
- Reuses `lib/import-export/student-record-import-dry-run.ts` for parse/validate

### Limitations (apply batch)

- **Demo guard:** apply route uses `rejectDemoUserManagementMutation` (`user_management`); blocked in demo orgs with 403 before parse/apply (`import-apply-demo-guard-v1`).
- Create-only; no update/merge of existing students.
- Admin apply UI shipped in `import-export-ui-students-import-apply-v1` (this API batch originally had no UI).
- No multipart upload.
- No `User` creation, invites, or emails.
- No practical lesson import.
- No partial import (one bad row blocks all writes).

---

## Implemented: practical lessons export

**Batch:** `export-practical-lessons` (read-only).

### Endpoint

| Method | Path                                  | Auth          |
| ------ | ------------------------------------- | ------------- |
| `GET`  | `/api/admin/practical-lessons/export` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Query param `organizationId` is **ignored**.

### Query params

| Param             | Values                           | Default |
| ----------------- | -------------------------------- | ------- |
| `format`          | `csv` \| `json`                  | `csv`   |
| `studentId`       | Operational `Student.id` (org)   | —       |
| `schoolStudentId` | Canonical 5-digit ID (org)       | —       |
| `source`          | `SYSTEM` \| `MANUAL` \| `IMPORT` | —       |
| `from`            | ISO date `YYYY-MM-DD`            | —       |
| `to`              | ISO date `YYYY-MM-DD`            | —       |

Only **`lessonType = DRIVING`** lessons are exported (`SYSTEM`, `MANUAL`, and future `IMPORT` sources).

### CSV response

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="practical-lessons-export-YYYY-MM-DD.csv"`
- Delimiter: **`;`**
- Headers: `PRACTICAL_LESSON_EXPORT_CSV_HEADERS`

### JSON response

```json
{
  "formatVersion": 1,
  "entity": "practicalLessons",
  "exportedAt": "2026-05-29T10:00:00.000Z",
  "rows": [{ "...": "..." }]
}
```

### Exported fields (per row)

`schoolStudentId`, `practicalLessonNumber`, `lessonDate` (ISO), `startTime` (`HH:mm`), `durationMinutes`, `instructorEmail`, `instructorName`, `lessonSource`, `status`, `notes` (from `adminNotes` when present).

`durationMinutes` is derived from `startTime`/`endTime` when `endTime` exists; otherwise uses stored `durationMinutes`.

**Excluded:** `passwordHash`, tokens, `organizationId`, internal UUIDs (`Lesson.id`, `Student.id`, `User.id`), `studentNumber`, timestamps.

### Modules

- `app/api/admin/practical-lessons/export/route.ts`
- `lib/import-export/practical-lesson-export.ts`
- `lib/lessons/practical-lesson-export-queries.ts`

### Limitations (export batch)

- Export only; no practical lesson import apply.
- No admin UI.
- No theory/exam/payment export.
- No update/merge.
- No pagination (full filtered result set).

---

## Implemented: practical lessons import dry-run

**Batch:** `import-practical-lessons-dry-run` (validate only — **no DB writes**).

### Endpoint

| Method | Path                                          | Auth          |
| ------ | --------------------------------------------- | ------------- |
| `POST` | `/api/admin/practical-lessons/import/dry-run` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Body field `organizationId` is **ignored**.

### Request body

```json
{
  "format": "csv",
  "content": "schoolStudentId;practicalLessonNumber;...\n26001;1;2026-05-29;09:00;60;instrutor@example.com;"
}
```

```json
{
  "format": "json",
  "rows": [
    {
      "schoolStudentId": "26001",
      "practicalLessonNumber": 1,
      "lessonDate": "2026-05-29",
      "startTime": "09:00",
      "instructorEmail": "instrutor@example.com"
    }
  ]
}
```

JSON also accepts `content` as a string (`{ "rows": [...] }` or a bare array).

**Not supported in this batch:** multipart file upload, apply, UI.

### CSV rules

- Delimiter: **`;`**
- Header: `PRACTICAL_LESSON_IMPORT_CSV_HEADERS` (see practical lesson import contract below)
- Empty lines skipped

### Validations

| Rule                                                                                               | Code (examples)                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Required: `schoolStudentId`, `practicalLessonNumber`, `lessonDate`, `startTime`, `instructorEmail` | `missing_required_field`            |
| Canonical 5-digit `schoolStudentId`                                                                | `invalid_school_student_id`         |
| Student exists in org                                                                              | `unknown_student`                   |
| `practicalLessonNumber` 1–999                                                                      | `unsupported_value`                 |
| `lessonDate` as `YYYY-MM-DD`                                                                       | `invalid_date`                      |
| `startTime` as `HH:mm`                                                                             | `invalid_time`                      |
| `durationMinutes` optional; default **60** in preview; if present 1–600                            | `invalid_duration`                  |
| `instructorEmail` format                                                                           | `unsupported_value`                 |
| Instructor User exists in org                                                                      | `unknown_instructor`                |
| Duplicate `(schoolStudentId, practicalLessonNumber)` in file                                       | `duplicate_practical_lesson_number` |
| Existing DRIVING lesson same student + number in org                                               | `duplicate_practical_lesson_number` |

### Response

`ImportDryRunReport` shape via `successResponse`. Preview `normalized` rows include resolved `studentId` and `instructorId` (User id) for future apply.

Does **not** create `Student`, `Instructor`, `User`, or `Lesson`.

### Modules

- `app/api/admin/practical-lessons/import/dry-run/route.ts`
- `lib/import-export/practical-lesson-import-dry-run.ts`
- `lib/lessons/practical-lesson-import-queries.ts`

### Limitations (dry-run batch)

- No apply, UI, or multipart upload.
- Does not create Students or Instructors.
- Does not auto-fix duplicates.
- Does not update lesson counters.

---

## Implemented: practical lessons import apply

**Batch:** `import-practical-lessons-apply` (create-only; same validation as dry-run).

### Endpoint

| Method | Path                                        | Auth          |
| ------ | ------------------------------------------- | ------------- |
| `POST` | `/api/admin/practical-lessons/import/apply` | `SUPER_ADMIN` |

Tenant-scoped via session `organizationId` + `assertUserTenantHost`. Body field `organizationId` is **ignored**.

### Request body

Same shape as dry-run:

```json
{
  "format": "csv",
  "content": "schoolStudentId;practicalLessonNumber;...\n26001;1;2026-05-29;09:00;60;instrutor@example.com;"
}
```

```json
{
  "format": "json",
  "rows": [
    {
      "schoolStudentId": "26001",
      "practicalLessonNumber": 1,
      "lessonDate": "2026-05-29",
      "startTime": "09:00",
      "instructorEmail": "instrutor@example.com"
    }
  ]
}
```

Optional `"mode": "createOnly"` (only supported value; default behavior is create-only).

**Not supported in this batch:** multipart file upload, update/merge, UI.

### Apply rules

1. Parse payload (CSV or JSON).
2. Enforce limits: max **500 rows**, max **2 MB** `content` string length.
3. Run the **same validation** as dry-run (including duplicate lookup in org and within file).
4. If **any blocking error**: no DB writes; return `applied: false`.
5. If all rows valid: create `Lesson` rows in a single **`prisma.$transaction`** (all-or-nothing).

### Fields written (per row)

| Field                   | Value                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `organizationId`        | From session (never from file)                                                                                                    |
| `lessonType`            | `DRIVING`                                                                                                                         |
| `status`                | `COMPLETED`                                                                                                                       |
| `lessonSource`          | `IMPORT`                                                                                                                          |
| `studentId`             | Resolved from `schoolStudentId` (must exist)                                                                                      |
| `instructorId`          | **Instructor row id** (`Instructor.id` FK) — resolved from `instructorEmail` via User lookup, same as manual POST / lesson create |
| `practicalLessonNumber` | From file (does **not** call `getNextPracticalLessonNumber`)                                                                      |
| `lessonDate`            | From file                                                                                                                         |
| `startTime` / `endTime` | From file; `endTime = startTime + durationMinutes`                                                                                |
| `durationMinutes`       | From file; default **60** when absent                                                                                             |
| `adminNotes`            | From file `notes` (export round-trip via `adminNotes` → `notes`)                                                                  |
| `categoryId`            | First qualified category of instructor, else category **B** fallback                                                              |
| `vehicleId`             | `null`                                                                                                                            |
| `completedAt`           | Same calendar date as `lessonDate`                                                                                                |

**Not set / not created:** `User`, `Student`, `Instructor`, invitations, emails, lesson counter updates.

**Instructor identifier contract:** import preview / dry-run `normalized.instructorId` is the instructor **User.id** (resolved from email). The persisted `Lesson.instructorId` is the **Instructor row id** (`Instructor.id`), matching manual practical history (`POST /api/admin/students/[id]/practical-lessons`) and `/api/admin/lessons` create. API payloads use User.id; Prisma FK stores Instructor.id.

### Response

Success with apply result:

```json
{
  "success": true,
  "data": {
    "applied": true,
    "createdCount": 3,
    "skippedCount": 0,
    "report": { "...": "ImportDryRunReport shape" }
  }
}
```

When validation blocks apply:

```json
{
  "success": true,
  "data": {
    "applied": false,
    "createdCount": 0,
    "skippedCount": 0,
    "report": { "...": "errors populated" }
  }
}
```

P2002 on `practicalLessonNumber` (if a unique constraint exists) is surfaced as `duplicate_practical_lesson_number` with `applied: false` (race after pre-check).

### Modules

- `app/api/admin/practical-lessons/import/apply/route.ts`
- `lib/import-export/practical-lesson-import-apply.ts`
- Reuses `lib/import-export/practical-lesson-import-dry-run.ts` for parse/validate
- Reuses `lib/lessons/practical-lesson-import-queries.ts` for tenant lookups

### Limitations (apply batch)

- **Demo guard:** apply route uses `decideDemoRouteMutation` with `lesson_management`; blocked in demo orgs with 403 before parse/apply (`import-apply-demo-guard-v1`). Does not use controlled demo write sandbox for bulk import apply.
- Create-only; no update/merge of existing lessons.
- Admin apply UI shipped in `import-export-ui-practical-lessons-import-apply-v1` (this API batch originally had no UI).
- No multipart upload.
- No `Student`, `Instructor`, or `User` creation; no invites or emails.
- No edit/delete of imported history.
- No lesson counter recalculation.
- No partial import (one bad row blocks all writes).
- No advanced duplicate/concurrency hardening beyond pre-check + transaction rollback.

---

## K. Future phases (implementation batches)

| Batch slug                                             | Status   | Deliverable                                                                |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| `export-student-records`                               | **Done** | `GET /api/admin/students/export`; CSV + JSON                               |
| `import-student-records-dry-run`                       | **Done** | `POST /api/admin/students/import/dry-run`; no writes                       |
| `import-student-records-apply`                         | **Done** | `POST /api/admin/students/import/apply`; create-only; transaction          |
| `export-practical-lessons`                             | **Done** | `GET /api/admin/practical-lessons/export`; CSV + JSON                      |
| `import-practical-lessons-dry-run`                     | **Done** | `POST /api/admin/practical-lessons/import/dry-run`; no writes              |
| `import-practical-lessons-apply`                       | **Done** | `POST /api/admin/practical-lessons/import/apply`; create-only; transaction |
| `import-export-ui-students-export-v1`                  | **Done** | Student export UI on Fichas registadas                                     |
| `import-export-ui-students-import-dry-run-v1`          | **Done** | Student import dry-run UI                                                  |
| `import-export-ui-students-import-apply-v1`            | **Done** | Student import apply UI                                                    |
| `import-export-ui-practical-lessons-export-v1`         | **Done** | Practical lessons export UI on `/admin/lessons`                            |
| `import-export-ui-practical-lessons-import-dry-run-v1` | **Done** | Practical lessons import dry-run UI                                        |
| `import-apply-demo-guard-v1`                           | **Done** | Demo mutation guard on student + practical-lessons import apply routes     |
| `import-export-ui-practical-lessons-import-apply-v1`   | **Done** | Practical lessons import apply UI on `/admin/lessons`                      |

**Historical note:** parser/normalizer modules under `lib/import-export/` and integration tests were delivered in earlier API batches; UI slices followed per `docs/architecture/roadmap-todo.md`.

---

## Student import row contract (CSV / JSON)

### CSV headers (semicolon-separated)

```
schoolStudentId;yearSuffix;sequence;firstName;lastName;phoneNumber;email;enrollmentDate
```

| Field             | Required | Validation                                                          |
| ----------------- | -------- | ------------------------------------------------------------------- |
| `schoolStudentId` | yes      | Canonical 5-digit; must match `yearSuffix` + zero-padded `sequence` |
| `yearSuffix`      | yes      | 2 digits                                                            |
| `sequence`        | yes      | Integer 1–999                                                       |
| `firstName`       | yes      | Non-empty                                                           |
| `lastName`        | no       |                                                                     |
| `phoneNumber`     | no       |                                                                     |
| `email`           | no       | Valid email if present                                              |
| `enrollmentDate`  | no       | ISO date; `null` on apply when absent                               |

**Not in import file:** `organizationId`, `userId`, `appAccessMode` (forced server-side).

---

## Practical lesson import row contract (CSV / JSON)

### CSV headers

```
schoolStudentId;practicalLessonNumber;lessonDate;startTime;durationMinutes;instructorEmail;notes
```

| Field                   | Required | Validation                              |
| ----------------------- | -------- | --------------------------------------- |
| `schoolStudentId`       | yes      | Must resolve to existing student in org |
| `practicalLessonNumber` | yes      | Integer 1–999                           |
| `lessonDate`            | yes      | ISO date                                |
| `startTime`             | yes      | `HH:mm`                                 |
| `durationMinutes`       | no       | Default 60                              |
| `instructorEmail`       | yes      | Must resolve to instructor User in org  |
| `notes`                 | no       | Maps to `adminNotes`                    |

---

## Limitations (strategy + current implementation)

**Strategy batch (docs/contracts):**

- Instructor/vehicle/theory/exam/payment import undefined beyond migration order.
- Update/merge import mode not specified in detail.
- Within-file duplicate detection for students — to be added in dry-run implementation.

**Export batch (`export-student-records`):**

- Export only; no import apply.
- No practical lesson export.
- No UTF-8 BOM prefix on CSV.

**Dry-run batch (`import-student-records-dry-run`):**

- Validate only; no apply, UI, or multipart upload.
- No update/merge for existing students.

---

## References

- [client-student-records-foundation.md](./client-student-records-foundation.md)
- `lib/students/student-school-id.ts` — canonical ID rules
- `lib/students/student-record-validation.ts` — manual create validation
- `lib/lessons/manual-practical-lesson-validation.ts` — manual history validation
- `lib/import-export/student-record-export.ts` — export helpers
- `lib/import-export/student-record-import-dry-run.ts` — import dry-run parse/validate
- `lib/import-export/student-record-import-apply.ts` — import apply (create-only)
- `lib/import-export/practical-lesson-export.ts` — practical lesson export helpers
- `lib/import-export/practical-lesson-import-dry-run.ts` — practical lesson import dry-run
- `lib/import-export/practical-lesson-import-apply.ts` — practical lesson import apply (create-only)
- `app/api/admin/students/export/route.ts` — export endpoint
- `app/api/admin/students/import/dry-run/route.ts` — import dry-run endpoint
- `app/api/admin/students/import/apply/route.ts` — import apply endpoint
- `app/api/admin/practical-lessons/export/route.ts` — practical lessons export endpoint
- `app/api/admin/practical-lessons/import/dry-run/route.ts` — practical lessons import dry-run endpoint
- `app/api/admin/practical-lessons/import/apply/route.ts` — practical lessons import apply endpoint
- `docs/examples/import-export/` — templates and sample payloads
