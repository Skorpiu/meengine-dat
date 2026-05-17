# Lessons Route Refactor Plan

**Status:** Refactor line **substantially complete** (batches 1–7 + DTO/security/UI alignment batches).  
**Branch context:** `lesson-refactor-status-consolidation` (docs); implementation landed across `lessons-query-module` … `lesson-detail-dto-minimization` and related batches.  
**Related audits:** [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md), [route-handler-consistency-audit.md](./route-handler-consistency-audit.md) (RHC-001, RHC-006, RHC-008, RHC-013), [engineering-excellence-audit.md](./engineering-excellence-audit.md) (EEA-002)

---

## Current status

### Completed

| Area                            | Batches / notes                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Query module**                | `lessons-query-module` — `lib/lessons/lesson-queries.ts` (admin calendar/dashboard, instructor/student calendar, shared selects).                                                                        |
| **DTO mappers**                 | `lessons-dto-mappers` — `lib/lessons/lesson-mappers.ts`.                                                                                                                                                 |
| **Create service**              | `lessons-create-service` — `lib/lessons/lesson-create-service.ts`.                                                                                                                                       |
| **Update/delete service**       | `lessons-update-delete-service` — `lesson-update-delete-service.ts`, `lesson-access.ts`; `[id]` integration tests.                                                                                       |
| **Shared calendar range**       | `calendar-range-shared-reads` — admin/instructor/student GET parity (90-day cap, stable codes).                                                                                                          |
| **Nested user sanitization**    | `lesson-user-select-sanitization`, `lesson-ssr-user-select-sanitization` — `LESSON_NESTED_USER_SELECT` on list/detail/SSR seeds (LD-001).                                                                |
| **Dashboard response contract** | `lesson-dashboard-response-contract` — client parses `data.{recent,current,upcoming}` (LD-002).                                                                                                          |
| **EXAMS view alignment**        | `lesson-exams-view-alignment` — dashboard query + UI use Lesson shape for `EXAM` / `THEORY_EXAM` (LD-003).                                                                                               |
| **DTO contract tests**          | `lesson-dto-contract-tests` — `lib/lessons/lesson-response-contract.ts` + route/mapper tests.                                                                                                            |
| **List DTO minimization**       | `lesson-list-dto-minimization` — `LESSON_LIST_SELECT` (LD-004/005/006 for list/calendar/dashboard).                                                                                                      |
| **Detail DTO minimization**     | `lesson-detail-dto-minimization` — `LESSON_DETAIL_SELECT` / `LESSON_DETAIL_ACCESS_SELECT` (LD-004/005/006 for `[id]`).                                                                                   |
| **Schedule Map refresh/layout** | `schedule-map-refresh-and-layout-fix` — day-view refetch (`from` === `to`), compact chips, type colors (ops-validated; see [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md)). |

### Pending (optional / scale-driven)

- **Deeper service extraction** — only if a route grows again or new lesson modes add complexity; current handlers are thin over `lib/lessons/*`.
- **Broader response normalization** — optional API unification of calendar `{ lessons }` vs dashboard `successResponse` (RHC-001); client alignment for dashboard is done; server envelope change is a dedicated migration batch.
- **E2E coverage** — Playwright exists but is outside `pnpm check`; add CI/staging matrix for lesson booking + Schedule Map if product requires regression beyond integration tests.
- **Pagination beyond 90-day guardrail** — row `take`/cursor inside the validated window if calendar payloads grow (EEA-002 follow-up).
- **Future DTO trims** — any further field removal must update `lesson-response-contract` and co-located route tests in the same PR.

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

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Methods**        | `GET`, `POST`                                                                                                                                                                                                                                                                                                                                                                |
| **Auth**           | `verifyAuth` + `withErrorHandling`                                                                                                                                                                                                                                                                                                                                           |
| **Roles**          | GET: `SUPER_ADMIN` only. POST: `SUPER_ADMIN`, `INSTRUCTOR` (instructor forced to own `instructorId`).                                                                                                                                                                                                                                                                        |
| **Tenant scoping** | `guardTenantAuthenticatedRoute(request, orgId)`; all queries use `organizationId: orgId`.                                                                                                                                                                                                                                                                                    |
| **Demo behavior**  | GET: read-only (no cleanup on read; no demo block). POST: `decideDemoLessonCreate` from `lib/demo/demo-write-sandbox-route-guard` (sandbox quotas / `DEMO_WRITE_SANDBOX_ENABLED`, not full demo lockout).                                                                                                                                                                    |
| **Validation**     | POST: `validateRequest(lessonCreationSchema)` (`lib/validation`). GET calendar: `validateLessonCalendarRange` (`lib/lessons/calendar-range.ts`, max 90 days). GET dashboard: `view` query (`DRIVING` \| `CODE` \| `EXAMS`), `getTimeRanges()`.                                                                                                                               |
| **Query patterns** | **Calendar mode** (`from` + `to`): single `findMany` with date range + heavy `include` (student/instructor/user, vehicle, category). **Dashboard mode**: three parallel `findMany` (recent / current / upcoming) with `take: 50` on recent/upcoming; EXAMS view uses `lessonType` in `EXAM`, `THEORY_EXAM` (`lesson-exams-view-alignment`; client uses `lesson-display.ts`). |
| **Response shape** | Calendar: flat `{ lessons }` + `Cache-Control: no-store`. Dashboard: `successResponse({ recent, current, upcoming })` → `{ success: true, data: { ... } }`. POST: `successResponse` with `message` + `lesson` or `lessons`. Demo/sandbox denial: `{ error, code }` via `NextResponse.json`.                                                                                  |
| **Known risks**    | Two success shapes in one file (RHC-001). Business logic (category resolution, multi-student exams, vehicle feature gate) inline in POST. Heavy Prisma `include` repeated ~6× in GET. Calendar has no row-level `take` inside 90-day window (EEA-002 follow-up).                                                                                                             |

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

> **Note:** Items 1–6 and 8–9 were **addressed** in batches 1–7 and alignment work (see [Current status](#current-status)). Items 3, 7, and 10 remain as **optional** follow-ups.

1. **Oversized admin collection handler** — **addressed** — GET dashboard + GET calendar + POST create in one file (~540 lines); high cognitive load and merge conflict risk (RHC-006).
2. **Queries and DTOs in route handlers** — **addressed** (`lesson-queries`, `lesson-mappers`, `LESSON_*_SELECT`).
3. **Inconsistent response shapes** — **partially addressed** (client dashboard unwrap; server envelopes unchanged — optional RHC-001 batch).
4. **POST create complexity in handler** — **addressed** (`lesson-create-service`).
5. **Authorization and domain mixed** — **addressed** (`lesson-access`, route-level auth/demo gates).
6. **Duplication across role calendar GETs** — **addressed** (shared queries, mappers, `validateLessonCalendarRange`).
7. **Pagination / scale** — dashboard uses `take: 50`; calendar mode within 90 days has no row `take` (**optional** EEA-002 follow-up).
8. **Heavy test setup** — mitigated by service unit tests; route integration mocks remain (**ongoing** maintenance, not blocking).
9. **Missing co-located tests** — **addressed** (`[id]/route.integration.unit.test.ts`, instructor/student calendar tests).
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

### Batch 6: `lessons-list-dto-minimization` (phase 1) — **Done**

|                |                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Trim list/calendar/dashboard lesson payloads to UI-used fields; keep contract tests green.                                |
| **Shipped**    | `LESSON_LIST_SELECT` in `lesson-queries.ts`; list/calendar query functions + SSR schedule seeds.                          |
| **Audit**      | [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md) — LD-004/005/006 **addressed** for list responses. |
| **Risks**      | Clients depending on removed scalars on calendar GET (none known); ScheduleMap contract tests gate regressions.           |
| **Tests**      | `lesson-response-contract.*`, route integration tests, `lesson-queries.unit.test.ts`.                                     |
| **Acceptance** | List/calendar JSON retains UI fields; no `passwordHash`; smaller Prisma reads; `pnpm check` green.                        |

### Batch 7: `lessons-detail-dto-minimization` (phase 2) — **Done**

|                |                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**  | Trim `GET`/`PUT` `/api/admin/lessons/[id]` payloads to edit-form fields; keep contract tests green.                                   |
| **Shipped**    | `LESSON_DETAIL_SELECT`, `LESSON_DETAIL_ACCESS_SELECT`; route + `lesson-update-delete-service`; `expectAdminLessonDetailEditContract`. |
| **Tests**      | `app/api/admin/lessons/[id]/route.integration.unit.test.ts`, `lesson-queries.unit.test.ts`.                                           |
| **Acceptance** | Edit form fields present; no nested `passwordHash`; no heavy scalars in detail JSON; `pnpm check` green.                              |

**Follow-up:** optional pagination inside 90-day calendar window; role-specific calendar DTO trims (LD-007+).

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
