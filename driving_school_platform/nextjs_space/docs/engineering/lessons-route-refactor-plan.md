# Lessons Route Refactor Plan

**Status:** Batch 1 (`lessons-query-module`) **done** on branch `lessons-query-module`. Batches 2–6 pending.  
**Branch context:** `lessons-route-alignment-planning` (plan); `lessons-query-module` (batch 1)  
**Related audits:** [route-handler-consistency-audit.md](./route-handler-consistency-audit.md) (RHC-001, RHC-006, RHC-008), [engineering-excellence-audit.md](./engineering-excellence-audit.md) (EEA-002)

---

## Scope

This document prepares **incremental, behavior-preserving** refactors of DAT lesson HTTP routes. Goals:

- Thin route handlers (HTTP, auth, validation, response mapping only).
- Move orchestration, Prisma access, and domain rules into `lib/lessons/*`.
- Preserve existing API contracts unless a dedicated batch explicitly changes them.
- Keep `pnpm check` green after every small PR.

**Out of scope for all planned implementation batches:** Prisma schema changes, UI/UX changes, role renames, i18n, billing, user/vehicle/signup/platform routes, and demo sandbox quota policy changes (only **reuse** existing guards).

---

## Current routes

### `app/api/admin/lessons/route.ts` (~540 lines)

| Aspect             | Detail                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Methods**        | `GET`, `POST`                                                                                                                                                                                                                                                                               |
| **Auth**           | `verifyAuth` + `withErrorHandling`                                                                                                                                                                                                                                                          |
| **Roles**          | GET: `SUPER_ADMIN` only. POST: `SUPER_ADMIN`, `INSTRUCTOR` (instructor forced to own `instructorId`).                                                                                                                                                                                       |
| **Tenant scoping** | `guardTenantAuthenticatedRoute(request, orgId)`; all queries use `organizationId: orgId`.                                                                                                                                                                                                   |
| **Demo behavior**  | GET: read-only (no cleanup on read; no demo block). POST: `decideDemoLessonCreate` from `lib/demo/demo-write-sandbox-route-guard` (sandbox quotas / `DEMO_WRITE_SANDBOX_ENABLED`, not full demo lockout).                                                                                   |
| **Validation**     | POST: `validateRequest(lessonCreationSchema)` (`lib/validation`). GET calendar: `validateLessonCalendarRange` (`lib/lessons/calendar-range.ts`, max 90 days). GET dashboard: `view` query (`DRIVING` \| `CODE` \| `EXAMS`), `getTimeRanges()`.                                              |
| **Query patterns** | **Calendar mode** (`from` + `to`): single `findMany` with date range + heavy `include` (student/instructor/user, vehicle, category). **Dashboard mode**: three parallel `findMany` (recent / current / upcoming) with `take: 50` on recent/upcoming; EXAMS view uses `lessonType: "EXAM"`.  |
| **Response shape** | Calendar: flat `{ lessons }` + `Cache-Control: no-store`. Dashboard: `successResponse({ recent, current, upcoming })` → `{ success: true, data: { ... } }`. POST: `successResponse` with `message` + `lesson` or `lessons`. Demo/sandbox denial: `{ error, code }` via `NextResponse.json`. |
| **Known risks**    | Two success shapes in one file (RHC-001). Business logic (category resolution, multi-student exams, vehicle feature gate) inline in POST. Heavy Prisma `include` repeated ~6× in GET. Calendar has no row-level `take` inside 90-day window (EEA-002 follow-up).                            |

### `app/api/admin/lessons/[id]/route.ts` (~300 lines)

| Aspect             | Detail                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Methods**        | `GET`, `PUT`, `DELETE`                                                                                                                                                                                                             |
| **Auth**           | `verifyAuth` + `withErrorHandling`                                                                                                                                                                                                 |
| **Roles**          | `SUPER_ADMIN`, `INSTRUCTOR`                                                                                                                                                                                                        |
| **Tenant scoping** | `findFirst` / `deleteMany` with `{ id, organizationId: orgId }`; instructor ownership via `assertInstructorOwnsLesson` (local helper).                                                                                             |
| **Demo behavior**  | PUT/DELETE: `decideDemoRouteMutation({ category: "lesson_management" })` → 403 `demo_restricted_action` on demo orgs. GET: no demo block.                                                                                          |
| **Validation**     | PUT: ad-hoc JSON (`lessonDate`, `startTime`, `endTime`, `status`, `vehicleId`); duration computed inline. No Zod schema.                                                                                                           |
| **Query patterns** | GET/PUT prefetch with `include` (student/instructor/user, vehicle, category). PUT uses `prisma.lesson.update({ where: { id } })` after org-scoped `findFirst` (defense relies on prior check). DELETE: `deleteMany` scoped by org. |
| **Response shape** | `successResponse` for success; demo errors `{ error, code }`; policy errors via `errorResponse`.                                                                                                                                   |
| **Known risks**    | Local helpers (`isPastLesson`, instructor ownership) not shared with POST. PUT update path not using `updateMany` with org in `where` (latent consistency risk). No integration test file co-located today.                        |

### `app/api/instructor/lessons/route.ts` (~76 lines)

| Aspect             | Detail                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Methods**        | `GET` only                                                                                                                                                                |
| **Auth**           | `verifyAuth(INSTRUCTOR)` + `withErrorHandling`                                                                                                                            |
| **Tenant scoping** | `guardTenantAuthenticatedRoute`; `organizationId` + `instructorId` from profile lookup (`instructor.findFirst` by `userId`).                                              |
| **Demo behavior**  | None on read (acceptable for portfolio demo calendars).                                                                                                                   |
| **Validation**     | Requires `from` and `to`; manual `startOfDay` / `addDays`; NaN check. **Does not** use `validateLessonCalendarRange` (no 90-day cap, different error messages) — RHC-008. |
| **Query patterns** | Single `findMany` with same heavy `include` as admin calendar.                                                                                                            |
| **Response shape** | `{ lessons }` + `Cache-Control: no-store`.                                                                                                                                |
| **Known risks**    | Duplicated date parsing vs admin/student; unbounded range if client sends wide `from`/`to`.                                                                               |

### `app/api/student/lessons/route.ts` (~76 lines)

| Aspect             | Detail                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Methods**        | `GET` only                                                                           |
| **Auth**           | `verifyAuth(STUDENT)` + `withErrorHandling`                                          |
| **Tenant scoping** | `guardTenantAuthenticatedRoute`; `organizationId` + `studentId` from profile lookup. |
| **Demo behavior**  | None on read.                                                                        |
| **Validation**     | Same manual date parsing as instructor route (RHC-008).                              |
| **Query patterns** | Same `include` tree as instructor calendar read.                                     |
| **Response shape** | `{ lessons }` + `Cache-Control: no-store`.                                           |
| **Known risks**    | Same duplication and range-cap gap as instructor route.                              |

---

## Current strengths

- **GET admin lessons is read-only** — no `cleanupOldLessons` on read; cleanup remains `POST /api/admin/cleanup` only.
- **Calendar range guardrail (admin)** — `validateLessonCalendarRange` enforces valid bounds and **90-day max** with stable codes (`invalid_calendar_range`, `calendar_range_too_large`).
- **Demo write sandbox (POST create)** — `decideDemoLessonCreate` limits destructive demo scheduling without blocking all demo reads.
- **Demo org mutations (PUT/DELETE)** — `lesson_management` category blocks edits/deletes on demo tenants.
- **Tenant scoping** — `organizationId` on session + `guardTenantAuthenticatedRoute` on all four routes.
- **Multi-role behavior** — instructor forced to own ID on create; instructor ownership checks on `[id]` routes; student/instructor calendars scoped to profile.
- **Tests** — `app/api/admin/lessons/route.integration.unit.test.ts` covers read-only GET, calendar validation, sandbox POST, exam multi-create, org scoping mocks; `lib/lessons/calendar-range.unit.test.ts` for pure date logic.
- **Auth baseline** — admin collection uses `verifyAuth` / `withErrorHandling` (closer to target pattern than legacy `getServerSession` routes).

---

## Problems to solve

1. **Oversized admin collection handler** — GET dashboard + GET calendar + POST create in one file (~540 lines); high cognitive load and merge conflict risk (RHC-006).
2. **Queries and DTOs in route handlers** — repeated Prisma `include` blocks; no shared mapper; raw Prisma entities returned to clients (RHC-013).
3. **Inconsistent response shapes** — calendar `{ lessons }` vs dashboard `{ success, data }` vs POST `successResponse` payloads (RHC-001).
4. **POST create complexity in handler** — lesson types (`DRIVING`, `THEORY`, `EXAM`, `THEORY_EXAM`), multi-student exams, category fallback, vehicle feature gate, duration calculation — all orchestration in route (RHC-006).
5. **Authorization and domain mixed** — instructor ownership, past-lesson rules, feature flags interleaved with HTTP parsing.
6. **Duplication across role calendar GETs** — instructor/student routes copy date math and `include` trees; admin calendar diverges only by validation helper (RHC-008).
7. **Pagination / scale** — dashboard uses `take: 50`; calendar mode within 90 days has no `take` (EEA-002); future cursor/limit needs a single query module.
8. **Heavy test setup** — admin integration test mocks many Prisma models; will grow unless services are pure and unit-tested separately.
9. **Missing co-located tests** — `[id]` route has no `*.integration.unit.test.ts` yet.
10. **Demo error shape inconsistency** — POST sandbox vs PUT/DELETE `decideDemoRouteMutation` vs `errorResponse` without `code` (RHC-010) — document, do not “fix” without explicit contract batch.

---

## Desired architecture

Target layering (under `lib/lessons/`):

```
app/api/**/lessons/**/route.ts   → HTTP only
lib/lessons/
  policies/                      → authorization + demo + calendar range wrappers
  queries/                       → Prisma read functions (scoped by org + role)
  mutations/                     → create / update / delete (transactions if needed)
  services/                      → orchestration (create lesson, dashboard slices)
  mappers/                       → DTOs stable for UI (calendar vs dashboard if needed)
  calendar-range.ts              → (existing) pure date validation
```

| Layer                       | Responsibility                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Route handler**           | Method dispatch, `verifyAuth`, tenant guard call, parse query/body, map service result → HTTP status + JSON.                                                    |
| **Policy**                  | `assertLessonTenantAccess`, `decideLessonDemoCreate`, `decideLessonDemoMutation`, `validateCalendarQuery`, `assertInstructorOwnsLesson`, `assertNotPastLesson`. |
| **Lesson query module**     | `findAdminCalendarLessons`, `findAdminDashboardSlices`, `findInstructorCalendarLessons`, `findStudentCalendarLessons`, `findLessonById`.                        |
| **Lesson mutations module** | `createLessons` (single + exam batch), `updateLesson`, `deleteLesson`.                                                                                          |
| **Lesson service**          | Compose policies + mutations (e.g. resolve category, validate vehicle, compute duration).                                                                       |
| **DTO mapper**              | Map Prisma results to response objects; **preserve** current field names/nesting per endpoint until a contract batch.                                           |

**Not implementing in planning batch** — only document the target.

---

## Refactor sequence

Small PRs; each must keep behavior unless noted and extend tests.

### Batch 1: `lessons-query-module` — **Done**

|                |                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Extract read-only Prisma queries (dashboard slices, admin calendar, instructor/student calendar) without changing JSON responses.                                                                                      |
| **Shipped**    | `lib/lessons/lesson-queries.ts` (`getAdminCalendarLessons`, `getAdminDashboardLessons`, `getInstructorCalendarLessons`, `getStudentCalendarLessons`, `LESSON_LIST_INCLUDE`). GET handlers call module; POST unchanged. |
| **Risks**      | Subtle `where` clause drift (EXAMS view, instructor/student filters, `take: 50`).                                                                                                                                      |
| **Tests**      | Existing `app/api/admin/lessons/route.integration.unit.test.ts` unchanged and passing.                                                                                                                                 |
| **Acceptance** | GET responses unchanged; `pnpm check` green.                                                                                                                                                                           |

### Batch 2: `lessons-dto-mappers`

|                  |                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Objective**    | Centralize Prisma `include` definition and optional field shaping (e.g. nested `user` exposure) in `lib/lessons/mappers/*`. |
| **Likely files** | `lib/lessons/queries/includes.ts`, `lib/lessons/mappers/lesson-list-item.ts`; routes call mapper after query.               |
| **Risks**        | Accidental field drop/add visible to UI; ScheduleMap depends on calendar payload shape.                                     |
| **Tests**        | Snapshot or explicit key assertions on mapped objects; one calendar + one dashboard test.                                   |
| **Acceptance**   | Response JSON unchanged for existing integration tests; includes defined in one place.                                      |

### Batch 3: `lessons-create-service`

|                  |                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**    | Move POST `/api/admin/lessons` orchestration to `lib/lessons/services/create-lesson.ts` (types, category resolution, multi-student exams, vehicle gate). |
| **Likely files** | `lib/lessons/services/create-lesson.ts`, `lib/lessons/mutations/create.ts`, `app/api/admin/lessons/route.ts` POST handler.                               |
| **Risks**        | Sandbox `pendingCreates` counting; instructor ID override; partial failure on `Promise.all` exam creates.                                                |
| **Tests**        | Preserve all POST cases in `route.integration.unit.test.ts`; add pure unit tests for category selection and exam limits.                                 |
| **Acceptance**   | POST status codes and bodies unchanged; demo sandbox tests still pass.                                                                                   |

### Batch 4: `lessons-update-delete-service`

|                  |                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**    | Extract PUT/DELETE from `[id]/route.ts` into services + mutations; share `isPastLesson` / instructor ownership policies.                     |
| **Likely files** | `lib/lessons/services/update-lesson.ts`, `delete-lesson.ts`, `lib/lessons/policies/lesson-access.ts`, `app/api/admin/lessons/[id]/route.ts`. |
| **Risks**        | `update` vs `updateMany` org scoping; vehicle feature check ordering.                                                                        |
| **Tests**        | **New** `app/api/admin/lessons/[id]/route.integration.unit.test.ts` (demo block, instructor forbidden, past lesson, happy path).             |
| **Acceptance**   | Behavior match manual matrix; demo 403 unchanged.                                                                                            |

### Batch 5: `instructor-student-lessons-read-alignment`

|                  |                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**    | Share `validateLessonCalendarRange` (or thin wrapper) on instructor/student GET; align error codes/messages with admin **only if product approves** — default: add 90-day cap with same codes as admin. |
| **Likely files** | `lib/lessons/policies/calendar-query.ts`, both role routes.                                                                                                                                             |
| **Risks**        | **Behavior change** if clients relied on >90-day ranges — document in PR, gate behind changelog.                                                                                                        |
| **Tests**        | New integration tests for invalid/too-large range; existing calendar clients smoke-tested.                                                                                                              |
| **Acceptance**   | Parity with admin calendar validation rules; shared query function used.                                                                                                                                |

### Batch 6 (optional): `lessons-pagination-dto-minimization`

|                  |                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Objective**    | Add `take`/cursor inside calendar window or trim nested `user` fields after UI field audit.  |
| **Likely files** | Query module + mapper + possible UI coordination (out of API-only batch if UI needs change). |
| **Risks**        | Breaking ScheduleMap or admin dashboard; needs load data.                                    |
| **Tests**        | Load/limit tests; contract documentation update.                                             |
| **Acceptance**   | Documented limits; no perf regression on default demo org.                                   |

---

## Testing strategy

- **Preserve** co-located `*.integration.unit.test.ts` on routes; update only when extracting modules (assert calls into `lib/lessons`, not only Prisma).
- **Add** pure unit tests for `calendar-range` (exists), policies, create orchestration, and mappers — no Next.js request needed.
- **Prisma mocks** — keep at route integration boundary initially; prefer testing services with injected `prisma` stub in later batches to shrink hoisted mocks.
- **Regression matrix** per batch: admin GET dashboard, admin GET calendar (valid/invalid/too large), POST DRIVING/THEORY/EXAM/sandbox denial, `[id]` PUT/DELETE rules, instructor/student GET.
- **CI** — every PR runs `pnpm -C driving_school_platform/nextjs_space check`.

---

## Non-goals

- No Prisma schema or migration changes in this refactor track.
- No UX / page component changes (`app/admin/lessons`, `LessonForm`, ScheduleMap) unless a batch explicitly requires it.
- No role renames (`SUPER_ADMIN` stays).
- No i18n of API error strings.
- No billing, user management, vehicles, signup, or platform route changes.
- No change to demo sandbox quotas, env flags, or `decideDemoLessonCreate` rules in these batches (reuse as-is).
- No mandatory migration of admin lessons to a single global response envelope (RHC-001) — that remains a separate **route-response-contract-baseline** batch.

---

## References

- Existing helpers: `lib/lessons/calendar-range.ts`, `lib/demo/demo-write-sandbox-route-guard.ts`, `lib/demo/demo-route-guard.ts`, `lib/validation` (`lessonCreationSchema`).
- Cleanup: `POST /api/admin/cleanup` + `lib/cleanup.ts` (not part of lessons routes).
- Audit backlog: [route-handler-consistency-audit.md](./route-handler-consistency-audit.md) — batches `lessons-route-service-extraction`, `calendar-range-shared-reads`.
