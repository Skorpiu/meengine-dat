# Lesson DTO Minimization Audit

**Branch:** `lesson-dto-minimization-audit`  
**Status:** Audit only — **no API, Prisma, or UI behavior changes** in this batch.  
**Related:** [lessons-route-refactor-plan.md](./lessons-route-refactor-plan.md) (batch 6), [route-handler-consistency-audit.md](./route-handler-consistency-audit.md) (RHC-013), [engineering-excellence-audit.md](./engineering-excellence-audit.md) (EEA-002)

---

## Scope

This document inventories **current lesson list/calendar HTTP payloads**, **Prisma includes**, and **real UI field usage** so a future batch can shrink nested graphs safely.

**In scope**

- `GET` list/calendar endpoints that return lessons with `LESSON_LIST_INCLUDE`
- `GET` / `PUT` / `DELETE` on `app/api/admin/lessons/[id]`
- UI surfaces that render or mutate lessons from those APIs (or SSR equivalents)

**Out of scope (this audit batch)**

- Changing response JSON, mappers, queries, or pages
- Prisma schema migrations
- Demo, billing, users, vehicles, signup, i18n, platform routes
- Pagination / `take` inside the 90-day calendar window (tracked separately under EEA-002)

**Current mapper posture:** `lib/lessons/lesson-mappers.ts` is intentionally **pass-through** (`mapLessonListItem` returns the full Prisma payload). Minimization must be **contract-tested** before stripping fields.

---

## Current API response shapes

### Admin calendar — `GET /api/admin/lessons?from=&to=`

| Aspect         | Detail                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Auth**       | `SUPER_ADMIN`, tenant guard                                                                                                   |
| **Validation** | `validateLessonCalendarRange` (max 90 days)                                                                                   |
| **Body**       | Flat JSON (not `successResponse`): `{ lessons: LessonListItem[] }`                                                            |
| **Headers**    | `Cache-Control: no-store`                                                                                                     |
| **Item shape** | Full `Lesson` row + nested `student.user`, `instructor.user`, `vehicle`, `category` (see [Current include](#current-include)) |

### Admin dashboard (lesson management) — `GET /api/admin/lessons?view=DRIVING|CODE|EXAMS`

| Aspect     | Detail                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| **Body**   | `successResponse` envelope: `{ success: true, data: { recent, current, upcoming } }`                     |
| **Slices** | Each array uses the same `LessonListItem` graph as calendar mode                                         |
| **Query**  | `view` maps to `lessonType` (`DRIVING` → `DRIVING`, `CODE` → `THEORY`, `EXAMS` → `EXAM` + `THEORY_EXAM`) |

### Instructor calendar — `GET /api/instructor/lessons?from=&to=`

| Aspect    | Detail                                                      |
| --------- | ----------------------------------------------------------- |
| **Body**  | `{ lessons: LessonListItem[] }` + `Cache-Control: no-store` |
| **Scope** | `organizationId` + resolved `instructorId`                  |

### Student calendar — `GET /api/student/lessons?from=&to=`

| Aspect    | Detail                                  |
| --------- | --------------------------------------- |
| **Body**  | Same as instructor calendar             |
| **Scope** | `organizationId` + resolved `studentId` |

### Admin lesson by id — `GET /api/admin/lessons/[id]`

| Aspect      | Detail                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| **Body**    | `successResponse(lesson)` → `{ success: true, data: <full lesson> }`              |
| **Include** | Inline duplicate of list include (not `LESSON_LIST_INCLUDE` constant, same graph) |
| **Roles**   | `SUPER_ADMIN`, `INSTRUCTOR` (ownership check)                                     |

### Admin lesson mutations — `PUT` / `DELETE /api/admin/lessons/[id]`

| Method     | Success body                                                      |
| ---------- | ----------------------------------------------------------------- |
| **PUT**    | `successResponse(updatedLesson)` — full lesson graph after update |
| **DELETE** | `successResponse({ message })` — no lesson payload                |

### Admin lesson create — `POST /api/admin/lessons`

| Aspect   | Detail                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| **Body** | `successResponse({ message, lesson })` or `{ message, lessons }` for multi-student exam creates                 |
| **Item** | Created row(s) from service — not necessarily the same include as list GET (audit focus is list/calendar reads) |

### SSR initial props (not HTTP, but same domain)

Admin / instructor / student **dashboard** pages load the first 30 days via **server-side** `prisma.lesson.findMany` and **manually project** a `ScheduleMap` `Lesson` shape (subset of fields). `ScheduleMap` then **re-fetches** via role calendar APIs when the view/date changes.

**SSR nested user sanitization (`lesson-ssr-user-select-sanitization`):** dashboard `findMany` calls use `LESSON_LIST_INCLUDE` (admin/instructor) or `LESSON_NESTED_USER_RELATION` on `instructor` only (student). No `user: true` on lesson reads; unused `user` / `preferredInstructor` includes removed from student profile SSR query.

---

## Current include

Defined in `lib/lessons/lesson-queries.ts`:

```ts
export const LESSON_LIST_INCLUDE = {
  student: LESSON_NESTED_USER_RELATION,
  instructor: LESSON_NESTED_USER_RELATION,
  vehicle: true,
  category: true,
} satisfies Prisma.LessonInclude;
```

### What Prisma returns today (per list item)

| Relation            | Loaded fields                                                                                                                                             | Notes                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Lesson (root)**   | All scalar columns on `lessons` (~30+ fields: `durationMinutes`, `paymentStatus`, `lessonPrice`, `skillsPracticed`, `adminNotes`, mileage, ratings, etc.) | Most are **unused** by calendar/list UI                                                                          |
| **student**         | Full `Student` row                                                                                                                                        | UI uses nested `user` only; student PII fields (emergency contacts, medical URLs, etc.) are dead weight on reads |
| **student.user**    | **`LESSON_NESTED_USER_SELECT`:** `id`, `firstName`, `lastName` only (`lesson-user-select-sanitization`)                                                   | No `passwordHash` or auth tokens loaded                                                                          |
| **instructor**      | Full `Instructor` row                                                                                                                                     | UI uses nested `user` only; license numbers, rates, JSON working hours unused on calendar                        |
| **instructor.user** | **`LESSON_NESTED_USER_SELECT`** (same as student.user)                                                                                                    | No `passwordHash` or auth tokens loaded                                                                          |
| **vehicle**         | Full `Vehicle` row                                                                                                                                        | UI uses `registrationNumber`, `make`, `model` only                                                               |
| **category**        | Full `Category` row                                                                                                                                       | UI uses `name` only                                                                                              |

`app/api/admin/lessons/[id]/route.ts` GET uses the same nested graph via inline `include` (should stay in sync with `LESSON_LIST_INCLUDE` when minimizing).

---

## UI usage inventory

| UI file / component                                               | API / data source                                        | Top-level fields read                                                                       | Nested fields read                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/schedule/schedule-map.tsx`                            | `GET /api/{admin\|instructor\|student}/lessons?from&to`  | `lessons[]` (also tolerates `data.lessons` — unused today)                                  | **Lesson:** `id`, `lessonDate`, `startTime`, `endTime`, `lessonType`, `status`. **student.user:** `id`, `firstName`, `lastName`. **instructor.user:** `id`, `firstName`, `lastName`. **vehicle:** `registrationNumber`, `make`, `model`. **category:** `name`          | Spreads `...lesson` from API into state — extra API fields are retained in memory but not rendered. Admin filter matches `instructor.user.id` to `/api/admin/instructors/all` `id` (user id). Edit/delete uses `lesson.id` only. |
| `app/admin/page.tsx` + `admin-dashboard-client.tsx`               | SSR `findMany` → props; calendar refetch via ScheduleMap | Same as ScheduleMap                                                                         | Same subset (explicit map in page)                                                                                                                                                                                                                                     | Initial 30-day window only on server                                                                                                                                                                                             |
| `app/instructor/page.tsx` + `instructor-dashboard-client.tsx`     | SSR + ScheduleMap                                        | Same                                                                                        | Same                                                                                                                                                                                                                                                                   | Instructor-scoped SSR query                                                                                                                                                                                                      |
| `app/student/page.tsx`                                            | SSR + ScheduleMap                                        | Same (no `student` in collapsed chips)                                                      | Student view still receives full graph from API on refetch; SSR omits `student` nested object                                                                                                                                                                          | Student calendar chips show instructor name only                                                                                                                                                                                 |
| `components/admin/lessons-management-client.tsx`                  | `GET /api/admin/lessons?view=`                           | `recent`, `current`, `upcoming` via `parseAdminDashboardLessonsPayload` (`data.*` envelope) | **Lesson:** `id`, `lessonDate`, `startTime`, `status`, `lessonType`, `pickupLocation`/`dropoffLocation`. **student/instructor.user:** names. **vehicle**, **category** as other tabs. EXAMS tab uses `lib/lessons/lesson-display.ts` helpers (no `Exam` model fields). | LD-002 **addressed**; LD-003 **addressed** (`lesson-exams-view-alignment`).                                                                                                                                                      |
| `app/admin/lessons/edit/[id]/EditLessonClient.tsx` + `LessonForm` | `GET /api/admin/lessons/[id]`                            | Unwraps `data` or raw lesson                                                                | **Edit form:** `lessonType`, `instructor.user.id`, `student.user.id`, `vehicleId`, `lessonDate`, `startTime`, `endTime`, `status`. Instructor ownership: `instructor.user.id`                                                                                          | Form loads instructors/students/vehicles from **other** APIs (`/api/admin/users`, etc.), not from nested lesson graph                                                                                                            |
| `components/admin/book-lesson-dialog.tsx`                         | `POST /api/admin/lessons`                                | Response message only                                                                       | —                                                                                                                                                                                                                                                                      | Create path; out of list DTO scope                                                                                                                                                                                               |
| `components/admin/book-exam-dialog.tsx`                           | `POST /api/admin/lessons`                                | Response message only                                                                       | —                                                                                                                                                                                                                                                                      | Same                                                                                                                                                                                                                             |
| `components/instructor/book-*-dialog-*.tsx`                       | `POST /api/admin/lessons`                                | Response message only                                                                       | —                                                                                                                                                                                                                                                                      | Same                                                                                                                                                                                                                             |

**ScheduleMap `Lesson` interface** (`components/schedule/schedule-map.tsx`) documents the **intended** calendar contract — use this as the baseline for a shared `CalendarLessonDto`.

---

## Candidate minimal DTO (proposed — not implemented)

### `CalendarLessonDto` (admin / instructor / student calendar GET)

```ts
type CalendarLessonDto = {
  id: string;
  lessonDate: string; // ISO date serialisation (current JSON behaviour)
  startTime: string;
  endTime: string;
  lessonType: string;
  status: string;
  student?: {
    user: { id: string; firstName: string; lastName: string };
  };
  instructor?: {
    user: { id: string; firstName: string; lastName: string };
  };
  vehicle?: {
    registrationNumber: string | null;
    make: string;
    model: string;
  } | null;
  category?: { name: string };
};
```

**Role variants (optional further trim):**

| Role           | Could omit                               |
| -------------- | ---------------------------------------- |
| **Student**    | `student` nested object (always self)    |
| **Instructor** | `instructor` nested object (always self) |
| **Admin**      | None of the above without UI changes     |

### `DashboardLessonDto` (admin `view=` management lists)

Extends calendar display fields; align with `lessons-management-client` after fixing envelope parsing:

```ts
type DashboardLessonDto = CalendarLessonDto & {
  // EXAMS tab: requires separate Exam API or mapping from Exam model — not Lesson scalars
};
```

### `LessonDetailDto` (GET/PUT `[id]`)

```ts
type LessonDetailDto = {
  id: string;
  lessonType: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status: string;
  vehicleId: number | null;
  studentId: string | null;
  instructorId: string;
  categoryId: number;
  instructor?: {
    id: string;
    user: { id: string; firstName: string; lastName: string };
  };
  student?: {
    id: string;
    user: { id: string; firstName: string; lastName: string };
  };
  vehicle?: { id: number; registrationNumber: string } | null;
  category?: { id: number; name: string };
};
```

**Never expose on any lesson DTO:** `passwordHash`, reset/verification tokens, `email` (unless a future screen requires it — none do today).

### Prisma include target (future)

```ts
const LESSON_CALENDAR_SELECT = {
  id: true,
  lessonDate: true,
  startTime: true,
  endTime: true,
  lessonType: true,
  status: true,
  student: {
    select: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
  instructor: {
    select: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
  vehicle: { select: { registrationNumber: true, make: true, model: true } },
  category: { select: { name: true } },
};
```

Use `select` instead of `include: { user: true }` to guarantee `passwordHash` is not loaded.

---

## Risk assessment

| Risk                                   | Severity       | Detail                                                                                                                                                                                                 |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`passwordHash` on lesson reads**     | **High**       | `user: true` on list/calendar/detail includes returns the full `User` model. Aligns with user-list hardening (`USER_LIST_SELECT`) but lessons were missed.                                             |
| **Dashboard envelope mismatch**        | **Addressed**  | `lessons-management-client` uses `parseAdminDashboardLessonsPayload` (`lib/lessons/admin-dashboard-lessons-response.ts`) for `data.{recent,current,upcoming}` with legacy root fallback.               |
| **EXAMS view field mismatch**          | **Addressed**  | Admin EXAMS tab renders `Lesson` fields via `lesson-display.ts`; dashboard query filters `EXAM` + `THEORY_EXAM` (`lesson-exams-view-alignment`). Separate `Exam` model remains unused on this surface. |
| **ScheduleMap spread retains bloat**   | **Low–Medium** | Even if API trims, client `...lesson` merge keeps unknown keys until mapper guarantees shape.                                                                                                          |
| **Admin vs instructor/student parity** | **Medium**     | Calendar DTO can be shared; dashboard and detail DTOs are admin-heavy.                                                                                                                                 |
| **Edit form id semantics**             | **Medium**     | Form uses `student.user.id` / `instructor.user.id` (User ids) in places; POST body expects profile ids in some paths — minimization must not change id semantics without form audit.                   |
| **PUT/POST responses**                 | **Low**        | Mutation responses return full graphs; can be trimmed in a later sub-batch.                                                                                                                            |
| **External clients**                   | **Unknown**    | No documented third-party consumers; treat calendar `{ lessons }` and dashboard envelope as contracts to snapshot in tests.                                                                            |

---

## Proposed implementation plan

Execute as **small PRs** after this audit; each step keeps `pnpm check` green.

| Step | Batch                    | Work                                                                                                                                              |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **typed-mappers**        | Add explicit TypeScript DTO types + mapper functions; keep pass-through output identical (golden/fixture tests).                                  |
| 2    | **contract-tests**       | Snapshot or fixture tests per endpoint for allowed keys; assert no `passwordHash` in JSON.                                                        |
| 3    | **security-select**      | Switch `LESSON_LIST_INCLUDE` to `select`-based graph (no full `User`).                                                                            |
| 4    | **calendar-dto**         | Apply `CalendarLessonDto` on admin / instructor / student calendar GETs.                                                                          |
| 5    | **dashboard-dto**        | Envelope parsing **done** (`lesson-dashboard-response-contract`). Remaining: `DashboardLessonDto` field trim; resolve EXAMS data source (LD-003). |
| 6    | **detail-dto**           | Apply `LessonDetailDto` on `GET`/`PUT` `[id]`; strip nested secrets.                                                                              |
| 7    | **remove-dead-includes** | Drop unused root scalars from list queries once tests prove UI parity.                                                                            |

Optional parallel track: row `take`/cursor inside 90-day window (EEA-002) — independent of field minimization.

---

## Findings

| ID     | Priority | Finding                                                                                                                                                                                                   | Evidence                                                                                       | Recommended next step                                       |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| LD-001 | **P1**   | **Addressed** (`lesson-user-select-sanitization`): nested `student.user` / `instructor.user` use `LESSON_NESTED_USER_SELECT` (`lib/users/user-public-select.ts`) on list/calendar/detail/update includes. | `LESSON_LIST_INCLUDE`, `LESSON_DETAIL_INCLUDE`, `lesson-include-safety` tests                  | —                                                           |
| LD-002 | **P1**   | **Addressed** (`lesson-dashboard-response-contract`): client reads `data.{recent,current,upcoming}` via `parseAdminDashboardLessonsPayload`; legacy root fallback retained. API unchanged.                | `lib/lessons/admin-dashboard-lessons-response.ts`, `lessons-management-client.tsx`             | —                                                           |
| LD-003 | **P2**   | **Addressed** (`lesson-exams-view-alignment`): EXAMS tab uses **Lesson** shape (`lessonType`, `lessonDate`, `student`/`instructor`, `pickupLocation`); query includes `EXAM` + `THEORY_EXAM`.             | `lessons-management-client.tsx`, `lib/lessons/lesson-display.ts`, `getAdminDashboardLessons`   | —                                                           |
| LD-004 | **P2**   | Calendar/list payloads carry **~30+ unused Lesson scalars** per row (payment, mileage, feedback arrays, etc.).                                                                                            | Prisma `Lesson` model vs ScheduleMap usage                                                     | Remove in step 7 after contract tests.                      |
| LD-005 | **P2**   | **Student** and **Instructor** full profile rows shipped on every lesson item.                                                                                                                            | `LESSON_LIST_INCLUDE`                                                                          | Replace with nested `user` select (step 3–4).               |
| LD-006 | **P2**   | **Vehicle** and **Category** full rows shipped; UI needs 3–4 fields.                                                                                                                                      | ScheduleMap, lessons-management-client                                                         | Select-only in Prisma (step 3).                             |
| LD-007 | **P3**   | SSR dashboards project a **minimal ScheduleMap shape**; nested `user` on lesson SSR reads **sanitized** (`lesson-ssr-user-select-sanitization`). API calendar responses still larger than SSR seed data.  | `app/admin/page.tsx`, `app/instructor/page.tsx`, `app/student/page.tsx`, `LESSON_LIST_INCLUDE` | Align API calendar DTO with SSR projection for consistency. |
| LD-008 | **P3**   | `ScheduleMap` uses `...lesson` spread — hidden dependency on unknown API keys.                                                                                                                            | `schedule-map.tsx` L209–216                                                                    | Narrow type after calendar-dto batch.                       |
| LD-009 | **P3**   | `[id]` GET uses duplicate inline `include` instead of shared constant.                                                                                                                                    | `app/api/admin/lessons/[id]/route.ts`                                                          | Consolidate when implementing detail DTO.                   |

---

## Acceptance (this audit batch)

- [x] Document created with API shapes, include inventory, UI field usage, proposed DTOs, risks, and findings.
- [x] No functional code, API responses, or Prisma schema changes.
- [x] Cross-docs updated to point at this audit and batch 6 status.
