# Lessons Route Refactor Plan

**Status:** Batches 1–5 **done**. Batch 6 — **audit created** ([lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md)); implementation pending.  
**Branch context:** `lessons-route-alignment-planning` (plan); batches 1–4 on feature branches (`lessons-query-module` … `lessons-update-delete-service`)  
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

| Aspect             | Detail                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Methods**        | `GET` only                                                                                                                     |
| **Auth**           | `verifyAuth(INSTRUCTOR)` + `withErrorHandling`                                                                                 |
| **Tenant scoping** | `guardTenantAuthenticatedRoute`; `organizationId` + `instructorId` from profile lookup (`instructor.findFirst` by `userId`).   |
| **Demo behavior**  | None on read (acceptable for portfolio demo calendars).                                                                        |
| **Validation**     | `validateLessonCalendarRange` (90-day cap, stable `invalid_calendar_range` / `calendar_range_too_large`) — aligned with admin. |
| **Query patterns** | Single `findMany` with same heavy `include` as admin calendar.                                                                 |
| **Response shape** | `{ lessons }` + `Cache-Control: no-store`.                                                                                     |
| **Known risks**    | Duplicated date parsing vs admin/student; unbounded range if client sends wide `from`/`to`.                                    |

### `app/api/student/lessons/route.ts` (~76 lines)

| Aspect             | Detail                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Methods**        | `GET` only                                                                           |
| **Auth**           | `verifyAuth(STUDENT)` + `withErrorHandling`                                          |
| **Tenant scoping** | `guardTenantAuthenticatedRoute`; `organizationId` + `studentId` from profile lookup. |
| **Demo behavior**  | None on read.                                                                        |
| **Validation**     | `validateLessonCalendarRange` (same as admin/instructor).                            |
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

### Batch 2: `lessons-dto-mappers` — **Done**

|                |                                                                                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Centralize response-body mapping for GET lesson lists without changing public JSON.                                                                                                                                                           |
| **Shipped**    | `lib/lessons/lesson-mappers.ts` (`mapLessonListItem`, `mapLessonCalendarResponse`, `mapAdminDashboardLessonsResponse`, role aliases). Admin/instructor/student GET routes call mappers; `LESSON_LIST_INCLUDE` remains in `lesson-queries.ts`. |
| **Risks**      | Accidental field drop/add visible to UI; ScheduleMap depends on calendar payload shape.                                                                                                                                                       |
| **Tests**      | `lib/lessons/lesson-mappers.unit.test.ts`; existing admin lessons route integration tests.                                                                                                                                                    |
| **Acceptance** | Response JSON unchanged; `pnpm check` green. Field minimization deferred to a later batch.                                                                                                                                                    |

### Batch 3: `lessons-create-service` — **Done**

|                |                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Move POST Prisma orchestration out of the admin lessons route.                                                                                                        |
| **Shipped**    | `lib/lessons/lesson-create-service.ts` (`createAdminLesson`). Route keeps auth, tenant, sandbox, Zod validation, vehicle **feature** gate, `successResponse` mapping. |
| **Risks**      | Sandbox `pendingCreates` counting; instructor ID override; partial failure on `Promise.all` exam creates.                                                             |
| **Tests**      | `route.integration.unit.test.ts` POST cases; `lesson-create-service.unit.test.ts` (exam cap, duration).                                                               |
| **Acceptance** | POST status codes and bodies unchanged; demo sandbox tests still pass.                                                                                                |

### Batch 4: `lessons-update-delete-service` — **Done**

|                |                                                                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Extract PUT/DELETE from `[id]/route.ts` into services; share access policies.                                                                                                                                                            |
| **Shipped**    | `lib/lessons/lesson-update-delete-service.ts`, `lib/lessons/lesson-access.ts`; `[id]/route.integration.unit.test.ts`. Route keeps auth/tenant/demo/vehicle feature gate. GET unchanged (uses `lesson-access` for instructor check only). |
| **Risks**      | `update` vs `updateMany` org scoping; vehicle feature check ordering.                                                                                                                                                                    |
| **Tests**      | `[id]/route.integration.unit.test.ts`; `lesson-update-delete-service.unit.test.ts`.                                                                                                                                                      |
| **Acceptance** | Behavior match manual matrix; demo 403 unchanged.                                                                                                                                                                                        |

### Batch 5: `calendar-range-shared-reads` — **Done**

|                |                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Share `validateLessonCalendarRange` on instructor/student GET with admin parity (90-day cap, stable error codes).                                                                                          |
| **Shipped**    | `app/api/instructor/lessons/route.ts`, `app/api/student/lessons/route.ts`; integration tests for valid/invalid/too-large ranges.                                                                           |
| **Risks**      | Clients requesting **>90-day** windows now receive **400** `calendar_range_too_large` (previously unbounded). Missing/invalid dates use `invalid_calendar_range` (not legacy “Missing query params” text). |
| **Tests**      | `instructor/lessons/route.integration.unit.test.ts`, `student/lessons/route.integration.unit.test.ts`.                                                                                                     |
| **Acceptance** | Parity with admin calendar validation rules; valid requests preserve `{ lessons }` shape.                                                                                                                  |

### Batch 6 (optional): `lessons-pagination-dto-minimization` — **Audit created / implementation pending**

|                  |                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Objective**    | Trim nested payloads after UI field audit; optional `take`/cursor inside 90-day window.                                       |
| **Audit**        | [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md) — UI inventory, proposed DTOs, findings LD-001–LD-009. |
| **Likely files** | `lesson-queries.ts`, `lesson-mappers.ts`, contract tests; possible `lessons-management-client` envelope fix (LD-002).         |
| **Risks**        | `passwordHash` exposure today (LD-001); EXAMS view / Lesson model mismatch (LD-003); ScheduleMap contract.                    |
| **Tests**        | Contract/snapshot tests per endpoint; assert no secrets in JSON; load tests if pagination added.                              |
| **Acceptance**   | Documented DTOs; calendar GET payloads match UI needs; no `passwordHash` in lesson list responses.                            |

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
