# Client data import/export strategy (DAT_3.6)

## A. Objective

Support **migration of driving-school clients** moving from legacy software into DAT, starting with **A Conquistadora** as the first real-world case.

This document defines the **technical strategy and contracts** for phased import/export. Student **export** is implemented (see [Implemented: student records export](#implemented-student-records-export)); import, parsers, and UI remain future work.

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

**Phase 1 (future):** CSV/JSON **export** of students and practical lessons.

**Phase 2–4 (future):** CSV/JSON **import dry-run** and **apply** for students, then practical lessons.

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

| Control                  | Detail                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Role**                 | `SUPER_ADMIN` only for import/export endpoints (future).                                                                     |
| **Tenant scope**         | `organizationId` from authenticated session; ignore any tenant field in uploaded files.                                      |
| **File retention**       | Uploaded files must not persist indefinitely; process in memory or short-lived temp storage, then discard.                   |
| **Logging**              | Log counts, codes, and row numbers — not full PII payloads (avoid logging entire CSV rows with emails/phones at info level). |
| **Size limits**          | Max file size and max row count per import (exact limits TBD in implementation; suggest starting around 5 MB / 5 000 rows).  |
| **Preview before apply** | Apply requires a prior successful dry-run (or re-validation) with zero blocking errors.                                      |
| **Error responses**      | Generic messages to client; no raw stack traces.                                                                             |
| **No emails on import**  | Reinforced: import pipeline must not trigger invitation, verification, or notification emails.                               |

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

| Column                  | Source / notes                   |
| ----------------------- | -------------------------------- |
| `schoolStudentId`       | Student reference                |
| `practicalLessonNumber` | Integer                          |
| `lessonDate`            | ISO date                         |
| `startTime`             | `HH:mm`                          |
| `endTime`               | Derived or stored                |
| `durationMinutes`       | Optional                         |
| `instructorEmail`       | From linked instructor User      |
| `instructorId`          | Optional in JSON only            |
| `lessonSource`          | `SYSTEM` \| `MANUAL` \| `IMPORT` |
| `status`                | Lesson status                    |
| `notes`                 | From `adminNotes` when present   |

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

- No import, dry-run, or apply.
- No practical lesson export.
- No dedicated admin UI (call API directly or via future UI batch).
- No update/merge — export is read-only snapshot.
- No pagination on export (full org result set for current filters).

---

## K. Future phases (implementation batches)

| Batch slug                         | Status   | Deliverable                                           |
| ---------------------------------- | -------- | ----------------------------------------------------- |
| `export-student-records`           | **Done** | `GET /api/admin/students/export`; CSV + JSON          |
| `import-student-records-dry-run`   | Planned  | Upload + validate; `ImportDryRunReport`; no writes    |
| `import-student-records-apply`     | Planned  | Apply after clean dry-run; create-only; `MANUAL_ONLY` |
| `export-practical-lessons`         | Planned  | Export DRIVING history per org                        |
| `import-practical-lessons-dry-run` | Planned  | Validate history rows against students + instructors  |
| `import-practical-lessons-apply`   | Planned  | Create `Lesson` rows with `lessonSource = IMPORT`     |

Each batch should:

1. Reuse `lib/import-export/import-export-contracts.ts` (extend if needed).
2. Add parser/normalizer modules under `lib/import-export/` (future).
3. Add integration tests with fixture files from `docs/examples/import-export/`.
4. Add minimal admin UI (separate batch) after API stabilizes.

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
| `enrollmentDate`  | no       | ISO date; default to import date on apply (future)                  |

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

- Export only; no import, dry-run, apply, or UI.
- No practical lesson export.
- No UTF-8 BOM prefix on CSV.

---

## References

- [client-student-records-foundation.md](./client-student-records-foundation.md)
- `lib/students/student-school-id.ts` — canonical ID rules
- `lib/students/student-record-validation.ts` — manual create validation
- `lib/lessons/manual-practical-lesson-validation.ts` — manual history validation
- `lib/import-export/student-record-export.ts` — export helpers
- `app/api/admin/students/export/route.ts` — export endpoint
- `docs/examples/import-export/` — templates and sample payloads
