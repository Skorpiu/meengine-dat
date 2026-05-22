# API Response Contract Baseline

## Scope

This document captures the **current** JSON response shapes for principal DAT API routes in `driving_school_platform/nextjs_space`. It is a **read-only baseline** for reviews, client wiring, and regression tests—not a mandate to normalize every endpoint immediately.

- **In scope:** Success and error body families, per-route inventory, known intentional inconsistencies, and principles for future endpoints.
- **Out of scope for this batch:** Changing handler behavior, Prisma schema, billing PSP integration, demo policy changes, auth/i18n refactors, and platform product expansion.

Related audits: [route-handler-consistency-audit.md](./route-handler-consistency-audit.md), [engineering-excellence-audit.md](./engineering-excellence-audit.md), [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md).

**Tests:** Co-located `*.integration.unit.test.ts` files and `lib/billing/webhook-http.unit.test.ts` lock the highest-risk shapes; see [Contract tests](#contract-tests).

---

## Current response families

### 1. `successResponse` envelope (`lib/api-utils.ts`)

```json
{ "success": true, "data": <T> }
```

Used by routes that call `successResponse(data)`. Optional extra response headers (e.g. calendar `Cache-Control` is **not** used on envelope routes).

**Typical `data` payloads:** lesson dashboard slices, single lesson detail, admin lesson POST (`message` + `lesson` / `lessons`), cleanup result, auth login user DTO.

### 2. Direct resource / list (flat JSON)

No `success` flag. Top-level keys name the resource:

| Pattern                                         | Example routes                            |
| ----------------------------------------------- | ----------------------------------------- |
| `{ lessons }`                                   | Admin / instructor / student calendar GET |
| `{ vehicles }`                                  | Admin vehicles GET                        |
| `{ users }`                                     | Admin users GET                           |
| `{ settings, total }`                           | Admin settings GET                        |
| `{ flags, total }`                              | Admin feature-flags GET                   |
| `{ preferences }`                               | User preferences GET                      |
| `{ features, userId, … }`                       | Config features GET                       |
| `{ settings, organizationId, host, timestamp }` | Config public GET                         |
| `{ organizations }`                             | Platform organizations GET                |

### 3. Mutation success (mixed)

| Style                                                           | Example                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `successResponse` + `data`                                      | Admin lesson create, `[id]` PUT/DELETE                                            |
| Flat `{ success: true, message, user? }`                        | `POST /api/users/create`                                                          |
| Flat `{ message, userId, requiresApproval? }`                   | `POST /api/signup` (201)                                                          |
| Contract-typed flat body                                        | License activate/features POST (`lib/platform/contracts/license-entitlements.ts`) |
| Billing webhook `{ ok: true, billingEventId(s)?, processing? }` | Webhook success / 202 deferred                                                    |

### 4. Feature / upgrade errors (vehicles, lesson POST with `vehicleId`)

```json
{
  "error": "Vehicles feature not enabled",
  "message": "<human-readable upgrade hint>",
  "requiresUpgrade": true
}
```

No stable `code` field today (UI keys off `requiresUpgrade` + `error`).

### 5. Error shapes

| Family                             | Body                                                                              | Typical status | Routes                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| **`errorResponse`**                | `{ error, details?, statusCode }`                                                 | 4xx/5xx        | `verifyAuth` + `withErrorHandling` routes (unauthorized, validation via `validateRequest`, not found) |
| **Flat `{ error }`**               | `{ error: string }`                                                               | 4xx/5xx        | Many `getServerSession` handlers                                                                      |
| **Policy `{ error, code }`**       | Stable machine `code` + message                                                   | 400/403        | Demo sandbox, signup demo block, calendar range, demo route mutation                                  |
| **Billing webhook**                | `{ error, code }` only (generic message; no `detail`)                             | 4xx/5xx        | `lib/billing/webhook-http.ts`                                                                         |
| **Validation (`validateRequest`)** | `{ error: "Validation failed", details: Record<string,string>, statusCode: 400 }` | 400            | Zod-backed routes using `api-utils`                                                                   |
| **Zod on config admin**            | Often `{ error }` from catch / manual JSON                                        | 400/500        | Settings, feature-flags (ZodError paths vary)                                                         |

**Demo guard codes (representative):** `demo_restricted_action`, `demo_write_quota_exceeded`, `demo_signup_disabled`.

**Calendar guard codes:** `invalid_calendar_range`, `calendar_range_too_large`.

**Billing webhook codes:** `billing_webhook_parse_failed`, `billing_webhook_unsupported_provider`, `billing_webhook_no_events`, `billing_webhook_processing_failed`.

### 6. Health / smoke

```json
{ "ok": true, "service": "driving-academy-tool", "status": "healthy" }
```

---

## Route contract inventory

| Route                                | Methods                | Success shape                                                                                                         | Error shape                                                                     | Uses `successResponse`?                | Notes                                                                               | Future normalization priority                         |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/api/health`                        | GET                    | `{ ok, service, status }`                                                                                             | —                                                                               | No                                     | Public smoke; `Cache-Control: no-store`                                             | Low                                                   |
| `/api/admin/lessons` (dashboard)     | GET                    | `{ success, data: { recent, current, upcoming } }`                                                                    | `errorResponse` / tenant                                                        | **Yes**                                | `?view=`; no `from`/`to`                                                            | **P1** — unify with calendar only if clients migrated |
| `/api/admin/lessons` (calendar)      | GET                    | `{ lessons }`                                                                                                         | `{ error, code }` (range) or `errorResponse`                                    | No                                     | `?from=&to=`; max 90 days; `Cache-Control: no-store`                                | **P1**                                                |
| `/api/admin/lessons`                 | POST                   | `{ success, data: { message, lesson \| lessons } }`                                                                   | `errorResponse`, `{ error, code }` (demo), feature 403, validation              | **Yes**                                | Exam multi-create returns `lessons` array in `data`                                 | P2                                                    |
| `/api/admin/lessons/[id]`            | GET, PUT, DELETE       | `{ success, data: lesson \| { message } }`                                                                            | `errorResponse`; demo `{ error, code }` on PUT/DELETE                           | **Yes**                                | GET returns full lesson graph in `data`                                             | P2                                                    |
| `/api/instructor/lessons`            | GET                    | `{ lessons }`                                                                                                         | `errorResponse`; calendar `{ error, code }`                                     | No                                     | Requires `from`/`to`                                                                | P3                                                    |
| `/api/student/lessons`               | GET                    | `{ lessons }`                                                                                                         | Same as instructor                                                              | No                                     | Student-scoped calendar                                                             | P3                                                    |
| `/api/admin/vehicles`                | GET                    | `{ vehicles }`                                                                                                        | `{ error }`; feature `{ error, message, requiresUpgrade }`                      | No                                     | Session auth; status derived server-side                                            | **P2**                                                |
| `/api/admin/vehicles`                | POST, PUT, DELETE      | `{ vehicle }` / `{ message }` (per handler)                                                                           | `{ error }`; demo `{ error, code }`                                             | No                                     | Sandbox on POST                                                                     | P2                                                    |
| `/api/admin/users`                   | GET                    | `{ users }`                                                                                                           | `{ error }`                                                                     | No                                     | `USER_LIST_SELECT` (no secrets)                                                     | P3                                                    |
| `/api/users/create`                  | POST                   | `{ success, message, user [, tempPassword] }`                                                                         | `{ error }`; demo `{ error, code }`                                             | Partial (`success` flat, not envelope) | `tempPassword` only non-production                                                  | P3                                                    |
| `/api/users/update`                  | PUT                    | Manual JSON (success message / updated fields)                                                                        | `{ error }`; demo guard                                                         | No                                     | See route tests                                                                     | P3                                                    |
| `/api/users/delete`                  | DELETE                 | Manual JSON                                                                                                           | `{ error }`; demo guard                                                         | No                                     | Blocks self-delete                                                                  | P3                                                    |
| `/api/signup`                        | POST                   | `{ message, userId, requiresApproval? }`                                                                              | `{ error }` / `{ error, code }` (demo)                                          | No                                     | No `withErrorHandling`; no rate limit in route                                      | P2 (contract only)                                    |
| `/api/invitations/accept`            | GET                    | `{ invitation: { email, role, organizationName, expiresAt } }`                                                        | `{ error, code }` — `missing_invitation_token`, `invalid_token`, `invitation_*` | No                                     | Public; no auth; never returns `tokenHash`                                          | P2                                                    |
| `/api/invitations/accept`            | POST                   | `{ success: true, user, organizationId, organizationName }` (201)                                                     | `{ error, code }`; Zod via `validateRequest` on body                            | No                                     | Body: `token`, `firstName`, `lastName`, `password` only; org/role/email from invite | P2                                                    |
| `/api/admin/invitations`             | GET                    | `{ invitations: [...] }`                                                                                              | `{ error }`; tenant guard                                                       | No                                     | No `tokenHash` in list                                                              | P3                                                    |
| `/api/admin/invitations`             | POST                   | `{ invitation, inviteLink, emailDelivery }` (201) — `emailDelivery`: `{ attempted, ok, provider, noop?, errorCode? }` | `{ error, code }` e.g. `pending_invitation_exists`, `user_already_exists` (409) | No                                     | `inviteLink` only on create; no `html`/`text`; no link on 409 conflicts             | P3                                                    |
| `/api/admin/invitations/[id]/revoke` | POST                   | `{ invitation }`                                                                                                      | `{ error, code }`                                                               | No                                     | Demo guard on POST                                                                  | P3                                                    |
| `/api/admin/settings`                | GET, POST, PUT, DELETE | `{ settings, total }` / mutation-specific                                                                             | `{ error }`                                                                     | No                                     | Large handler; demo on writes                                                       | P2                                                    |
| `/api/admin/feature-flags`           | GET, POST, PUT, DELETE | `{ flags, total }` / flag record                                                                                      | `{ error }`                                                                     | No                                     | Zod on writes                                                                       | P2                                                    |
| `/api/admin/license/features`        | GET, POST              | GET: contract DTO flat; POST: `{ success, message }`                                                                  | `{ error }`; demo on POST                                                       | POST only                              | Typed in `license-entitlements.ts`                                                  | P2                                                    |
| `/api/admin/license/activate`        | POST                   | `{ success, message, features }`                                                                                      | `{ error }`; demo `{ error, code }`                                             | No (flat `success`)                    | Contract type documents shape                                                       | P2                                                    |
| `/api/billing/webhooks/[provider]`   | POST                   | `{ ok: true, billingEventId(s)? }` or 202 deferred                                                                    | `{ error, code }` (sanitized)                                                   | No                                     | No `detail`; logs internal only                                                     | P1 security follow-ups (signatures)                   |
| `/api/platform/organizations`        | GET, POST              | GET: `{ organizations }`; POST: platform contract                                                                     | `{ error }`                                                                     | No                                     | Platform host gate                                                                  | P2 (document only)                                    |
| `/api/user/preferences`              | GET, PUT               | `{ preferences }`                                                                                                     | `{ error }`                                                                     | No                                     | Zod on PUT                                                                          | P3                                                    |
| `/api/config/public`                 | GET                    | `{ settings, organizationId, host, timestamp }`                                                                       | `{ error }`                                                                     | No                                     | Public; host resolution                                                             | P3                                                    |
| `/api/config/features`               | GET                    | `{ features, userId, userRole, organizationId, timestamp }` or empty features if anonymous                            | `{ error }`                                                                     | No                                     | Unauthenticated → empty features (by design)                                        | P3                                                    |

---

## Known intentional inconsistencies

1. **Admin lessons — same route, two success shapes:** Dashboard GET uses `successResponse`; calendar GET (`from` + `to`) returns `{ lessons }`. The admin UI unwraps dashboard via `parseAdminDashboardLessonsPayload` (`lib/lessons/admin-dashboard-lessons-response.ts`).
2. **Vehicles vs lessons:** Vehicle list uses flat `{ vehicles }` and `getServerSession`; lesson admin collection uses `verifyAuth` + mixed shapes.
3. **Demo denials:** Sandbox/quota/signup use `{ error, code }`. Routes using `decideDemoRouteMutation` + `errorResponse` may expose only `{ error }` without `code` (e.g. some cleanup paths).
4. **User create vs API envelope:** `POST /api/users/create` uses top-level `success: true` without a `data` wrapper—differs from `successResponse`.
5. **Billing:** Success uses `{ ok: true }` (not `success`). Errors never include provider parse details in the HTTP body.
6. **Feature gating:** Vehicle/lesson vehicleId paths return `requiresUpgrade` without a stable `code`.

---

## Future normalization principles (not applied in this batch)

1. **New endpoints** should prefer a single stable success envelope (`successResponse` or a documented platform DTO) unless a legacy client requires a flat key.
2. **Policy errors** should include a stable `code` when the client must branch (demo, calendar, signup, billing).
3. **Never expose** raw stack traces, Prisma errors, or provider parse messages on HTTP responses.
4. **DTOs** must omit secrets (`passwordHash`, license keys in list endpoints, webhook raw bodies).
5. **Changing existing contracts** requires client migration, this baseline update, and test updates in the same PR.

Suggested merge order when normalizing later: (1) calendar `{ lessons }` family across admin/instructor/student, (2) admin config/settings family, (3) vehicles to optional envelope without breaking gating fields.

---

## Contract tests

| Contract                                                     | Test location                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard `{ success, data: { recent, current, upcoming } }` | `app/api/admin/lessons/route.integration.unit.test.ts`                                                                                                                                                                       |
| Calendar `{ lessons }`                                       | Same file                                                                                                                                                                                                                    |
| **Lesson DTO (UI fields + no nested `passwordHash`)**        | `lib/lessons/lesson-response-contract.ts`, `lesson-response-contract.unit.test.ts`, admin/instructor/student lessons + `[id]` integration tests — see [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md) |
| Calendar / demo `{ error, code }`                            | Admin lessons, instructor/student lessons, vehicles, signup integration tests                                                                                                                                                |
| Vehicles GET `{ vehicles }`                                  | `app/api/admin/vehicles/route.integration.unit.test.ts`                                                                                                                                                                      |
| Signup `demo_signup_disabled`                                | `app/api/signup/route.integration.unit.test.ts`                                                                                                                                                                              |
| Billing error `{ error, code }`, no `detail`                 | `app/api/billing/webhooks/webhooks.route.integration.unit.test.ts`, `lib/billing/webhook-http.unit.test.ts`                                                                                                                  |
| Invitation accept GET/POST (no `tokenHash` / `passwordHash`) | `app/api/invitations/accept/route.integration.unit.test.ts`, `lib/invitations/invitation-accept-service.unit.test.ts`                                                                                                        |

---

## Related documents

- [route-handler-consistency-audit.md](./route-handler-consistency-audit.md) — handler patterns and RHC findings
- [engineering-excellence-audit.md](./engineering-excellence-audit.md) — broader engineering audit
- [lesson-dto-minimization-audit.md](./lesson-dto-minimization-audit.md) — field-level DTO trimming
- [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md) — ops prioritization
