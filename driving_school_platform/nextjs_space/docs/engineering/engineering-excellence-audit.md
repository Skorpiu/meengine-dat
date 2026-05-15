# Engineering Excellence Audit

## Scope

This document is an **initial engineering audit** of the Driving Academy Tool (DAT) application in `driving_school_platform/nextjs_space`. It records **architecture, code quality, data-access, security boundaries, test posture, and operations** as observed from the codebase and ops docs at the time of writing.

It is **not** a refactor plan and does **not** change runtime behavior. Follow-up work should be tracked as separate batches (see [Recommended roadmap](#recommended-roadmap)). Production and demo posture remain aligned with [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md) and linked ops runbooks.

---

## Current strengths

| Area                                              | Observation                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CI and local gate**                             | Root GitLab pipeline runs **`pnpm -C driving_school_platform/nextjs_space check`** (same script as local: `lint` + `typecheck` + `test:run` + `build`). `env:check` and `prisma generate` run via existing package hooks where applicable—no duplicate CI steps.                                     |
| **TypeScript + Prisma 6**                         | Strong typing end-to-end; Prisma schema carries organization scoping and indexes on high-churn keys (e.g. `users.organizationId`, `lessons` relations—see `prisma/schema.prisma`).                                                                                                                   |
| **API utilities**                                 | `lib/api-utils.ts` centralizes `verifyAuth`, Zod validation with optional sanitization, `successResponse` / `errorResponse`, structured logging, performance hooks, and optional **rate limiting** via `withErrorHandling`.                                                                          |
| **Tenant vs platform split**                      | `lib/tenant.ts` resolves org from host, blocks platform hosts on tenant-authenticated routes, and enforces org/host match. `app/api/platform/organizations/route.ts` uses `decidePlatformSurfaceAccess` so **platform APIs refuse tenant-mapped hosts**—explicit defense in depth.                   |
| **Licensing / entitlements / billing foundation** | Domain logic lives under `lib/licensing/`, `lib/services/license-service.ts`, and `lib/billing/` (processor, event store, provider registry, skeleton + Sibs adapters) with **Vitest coverage** on core paths. Webhook route documents skeleton behavior (parse → persist idempotently → lifecycle). |
| **Demo guards**                                   | `lib/demo/demo-route-guard.ts`, `lib/demo/demo-policy.ts`, and tier profiles (`lib/demo/demo-tier-profiles.ts`) support controlled demos; ops docs describe `demo:readiness`, `demo:features:check`, and dry-run reset.                                                                              |
| **Feature gating**                                | `lib/middleware/feature-check.ts` ties entitlements/features to requests (used e.g. on vehicle routes).                                                                                                                                                                                              |
| **Route-level integration tests**                 | Co-located `*.integration.unit.test.ts` files under `app/api/**` assert **organization scoping** and auth gates for several admin, config, platform, signup, billing webhook, and health routes—uncommon depth for a Next.js app of this size.                                                       |
| **Supabase / Postgres posture**                   | App path is Prisma-first; ops docs describe RLS on internal tables and Data API policy—reduces blast radius if PostgREST exposure grows.                                                                                                                                                             |
| **DX scripts**                                    | `package.json`: `env:check` on critical hooks, `prisma generate` on `pretypecheck` / `prebuild` / `postinstall`, smoke and demo scripts, Husky + lint-staged.                                                                                                                                        |
| **Editor normalization**                          | Repository `.editorconfig` enforces UTF-8, LF, final newline, trim whitespace (with sensible exceptions for Windows scripts and markdown).                                                                                                                                                           |

---

## Architecture review

### App routes vs `lib` / domain boundaries

- **Pattern A (majority of newer/sensitive routes):** Handlers delegate to `verifyAuth`, `guardTenantAuthenticatedRoute`, `checkFeatureAccess`, `decideDemoRouteMutation`, and Prisma via `@/lib/db`, keeping HTTP thin.
- **Pattern B (legacy-style):** Some handlers (notably parts of `app/api/admin/vehicles/route.ts`) use `getServerSession` directly and ad-hoc `NextResponse.json` shapes instead of `lib/api-utils`—same security ideas, **inconsistent** observability and error contracts.
- **Domain modules:** Billing, licensing, platform onboarding/listing, demo policy, tenant resolution, and validation are **extracted**; lesson scheduling logic still mixes **orchestration** (multiple Prisma calls) inside `app/api/admin/lessons/route.ts`.

### Tenant boundary

- Resolved via `OrganizationDomain` lookup (`resolveOrganizationIdFromHost`, `guardTenantAuthenticatedRoute`). Tenant admin APIs generally require `organizationId` on the session and tenant-host rules—**good** for cross-tenant leaks via host confusion.
- **Residual risk:** Any route that trusts `organizationId` from the **body** without reconciling to session + tenant guard needs periodic audit (not fully enumerated here → **needs inspection** for new routes).

### Platform boundary

- `decidePlatformSurfaceAccess` + host checks on `/api/platform/organizations` are a **clear positive**: platform listing/onboarding cannot be casually invoked from a school vanity domain.
- Onboarding (`lib/platform/onboard-organization.ts`) is high privilege; ops docs already flag operator-only discipline—**process + host**, not only code.

### Auth / authorization boundaries

- NextAuth credentials + role on `session.user`; `verifyAuth` supports single or multiple roles.
- **Authorization duplication:** mix of `verifyAuth` vs raw `getServerSession` + string role checks increases the chance a new route forgets tenant guard or feature check.

### Billing boundary

- Webhook entrypoint is intentionally a **skeleton**: comments in `app/api/billing/webhooks/[provider]/route.ts` state no provider signature verification in this baseline—appropriate for scaffolding, **not** for untrusted internet exposure without middleware secrets and crypto verification.

### Licensing / entitlements boundary

- Effective entitlements and license service are test-covered; admin license routes use Prisma `include` where needed. Separation from UI is reasonable.

### Demo / ops boundary

- Demo org flag + mutation guards align with ops runbooks. Lesson **cleanup** is **explicit** via `POST /api/admin/cleanup` (`cleanupOldLessons`); **`GET /api/admin/lessons` is read-only** (no automatic deletes on read).

---

## Query and Big O review

| Topic                        | Assessment                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N+1**                      | Typical lesson list handlers use Prisma `include` for student/instructor/user in **one** query per list—**not** classic N+1. `admin/vehicles` runs **one** `vehicle.findMany` plus **two** scoped queries (lessons + exams) for “in use” IDs—**O(1)** extra queries per request, not per vehicle.                                           |
| **Pagination**               | `admin/config-history` uses `take` / `skip` from query—**good**. `admin/lessons` dashboard slices use `take: 50` on time-window lists—**bounded**. **Calendar mode** (`from` + `to`) enforces a **90-day max window** via `lib/lessons/calendar-range.ts` before `findMany`; row-level pagination remains a future option if payloads grow. |
| **Unbounded lists**          | `admin/vehicles` GET returns all vehicles for org matching filters—**no cursor/limit** (evidence: `app/api/admin/vehicles/route.ts`). Acceptable for small fleets; **needs inspection** for scale.                                                                                                                                          |
| **Bulk delete / cleanup**    | `cleanupOldLessons` uses `deleteMany` on `lesson` scoped by `organizationId` and date—**single statement**, efficient; relies on DB cascades / FK rules for related rows (**needs inspection** against full `Lesson` relation graph in schema if orphans matter).                                                                           |
| **Automatic cleanup on GET** | **Addressed:** `GET /api/admin/lessons` performs **reads only**; old-lesson deletion is **POST** `/api/admin/cleanup` (and cron when operators add it), not the lessons list endpoint.                                                                                                                                                      |
| **Repeated counts**          | No systematic duplicate `count()` anti-pattern spotted in sampled routes; **needs inspection** on reporting/analytics paths if added later.                                                                                                                                                                                                 |
| **Broad `include`**          | Lesson routes pull full nested `user` for student and instructor—convenient for UI, may over-fetch PII fields vs a DTO—**product/perf tradeoff**, not a correctness bug.                                                                                                                                                                    |
| **Transactions**             | Billing processor and event paths use structured persistence (see `lib/billing/` tests). Simple CRUD routes often use single mutations—**needs inspection** for multi-entity updates that must succeed or roll back together.                                                                                                               |
| **Indexes**                  | Schema includes multiple `@@index` declarations on `users`, `students`, etc.—**positive**; any new high-cardinality filter should be checked against explain plans in Supabase.                                                                                                                                                             |

---

## Code duplication and modularity

- **Handlers:** Repeated sequences of auth → org check → tenant guard → demo decision appear across admin routes; vehicles route diverges (session + JSON errors).
- **Responses:** Mix of `{ success, data }` (`api-utils`) and raw `{ vehicles }` / `{ error }` shapes—clients and tests must handle multiple shapes.
- **DTOs:** No shared OpenAPI schema; TypeScript types per route. **Acceptable** at current scale; duplication grows with new resources.
- **Existing services:** Billing processor, license service, platform list/onboard, demo guard, feature check—**good** nuclei. **Gaps:** a single “admin lesson query” service could shrink `admin/lessons` route surface and centralize calendar vs dashboard modes.

---

## Security and authorization

| Control                | Status                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant isolation**   | Host-based org resolution + `guardTenantAuthenticatedRoute` on key tenant admin APIs.                                                                                                                                                                                                                                                                                                   |
| **Platform isolation** | Host + `decidePlatformSurfaceAccess` on platform API.                                                                                                                                                                                                                                                                                                                                   |
| **Demo guards**        | `decideDemoRouteMutation` on cleanup and other mutations; policy docs describe read-mostly demo.                                                                                                                                                                                                                                                                                        |
| **Role checks**        | `verifyAuth` and explicit role checks; risk is **inconsistency** on routes that bypass helpers.                                                                                                                                                                                                                                                                                         |
| **Secrets**            | Ops docs stress no credentials in git; `env:check` supports fail-fast local setup.                                                                                                                                                                                                                                                                                                      |
| **Supabase RLS**       | Documented for internal tables; app uses Prisma with service DB URL—**defense in depth** when Data API is locked down.                                                                                                                                                                                                                                                                  |
| **Billing webhooks**   | No signature verification in skeleton—**must** be added before exposing to real PSP URLs.                                                                                                                                                                                                                                                                                               |
| **Public signup**      | **`POST /api/signup`** blocks **`Organization.isDemo`** tenants with **403** / `demo_signup_disabled`. **Not** wired to in-memory `RATE_LIMITS` in this batch—**edge rate limiting**, **captcha**, and **real email verification** remain **P1** before broad public self-serve signup on serverless (see gaps doc). `isEmailVerified` is still a placeholder until verification ships. |

---

## Testability and coverage

| Layer                            | Observation                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit tests**                   | Extensive under `lib/**` for billing, licensing, platform admins, demo, tenant, validation, config.                                                                                                                |
| **Route integration unit tests** | Strong coverage for authz + scoping on a subset of APIs (admin users/settings/feature-flags/config-history/license, platform orgs, signup, health, webhooks, cleanup, lessons).                                    |
| **Playwright**                   | `@playwright/test` present with `playwright.config.ts` and specs under `tests/` (e.g. vehicles gating, theory exam). **Not** part of `pnpm check` or GitLab CI—E2E is **optional / manual** unless CI is extended. |
| **Gaps**                         | Routes without co-located integration tests (e.g. some instructor/student lesson paths, vehicles beyond gating E2E) → **needs inspection** before claiming full API regression coverage.                           |
| **Factories**                    | Tests rely on mocks; no shared Prisma test DB factory in tree—fine for speed; limits integration realism.                                                                                                          |

---

## DX / CI / Operations

| Topic               | Notes                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Scripts**         | `check` is the developer gold standard; `smoke:health`, demo scripts, and reset dry-run support ops.                                     |
| **Env / Prisma**    | `env:check` + `prisma generate` wired into dev/build/typecheck—reduces “works on my machine” drift.                                      |
| **CI vs local**     | `.gitlab-ci.yml` **`check`** job runs the same `pnpm … check` gate as developers; lint, typecheck, tests, and build surface match local. |
| **Migrations**      | Documented in ops; not altered in this audit batch.                                                                                      |
| **Release / smoke** | `docs/ops/` includes release checklist, smoke baseline, host split—**good** continuity from code to operations.                          |
| **Line endings**    | `.editorconfig` sets LF globally—aligns with cross-platform collaboration.                                                               |

---

## Findings

| ID      | Priority | Area             | Finding                                                                                                                                                                                                                                                                                                               | Evidence                                                                       | Recommended next step                                                                                               |
| ------- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| EEA-001 | P2       | CI               | **Addressed:** pipeline runs the full **`pnpm -C driving_school_platform/nextjs_space check`** gate (lint + typecheck + `test:run` + `build`).                                                                                                                                                                        | `.gitlab-ci.yml` `check` job                                                   | —                                                                                                                   |
| EEA-002 | P2       | Data / API       | **Partially addressed:** calendar `from`/`to` rejects invalid ranges and spans **> 90 days** (`invalid_calendar_range`, `calendar_range_too_large`). **Still open:** optional row `take` / cursor pagination for very dense orgs within the allowed window.                                                           | `lib/lessons/calendar-range.ts`, `app/api/admin/lessons/route.ts`              | Add pagination only if load tests show need inside the 90-day cap.                                                  |
| EEA-003 | P3       | Data / API       | Admin vehicles list is unpaginated; fine for small fleets, risky at scale.                                                                                                                                                                                                                                            | `app/api/admin/vehicles/route.ts` `findMany` without `take`                    | Add cursor/limit or server-side cap when product needs larger fleets.                                               |
| EEA-004 | P3       | Architecture     | **Addressed:** `GET /api/admin/lessons` no longer triggers `cleanupOldLessons`; cleanup remains **POST** `/api/admin/cleanup` only.                                                                                                                                                                                   | `app/api/admin/lessons/route.ts`, `app/api/admin/cleanup/route.ts`             | —                                                                                                                   |
| EEA-005 | P2       | Modularity       | Vehicles (and similar) use `getServerSession` + bespoke JSON instead of `verifyAuth` / `withErrorHandling`.                                                                                                                                                                                                           | `app/api/admin/vehicles/route.ts`                                              | Gradually align with `lib/api-utils` for consistent auth, logging, and errors (separate refactor batch).            |
| EEA-006 | P1       | Security         | Billing webhook route is a **skeleton**: no provider signature / IP allowlist documented in handler.                                                                                                                                                                                                                  | `app/api/billing/webhooks/[provider]/route.ts` header comment + implementation | Before production PSP: verify signatures, raw body handling, idempotent 2xx semantics, and secret rotation runbook. |
| EEA-007 | P2       | Security / abuse | **Partially addressed:** demo orgs cannot use public signup (**403** / `demo_signup_disabled`). **Still P1** for broad public signup: **edge rate limiting** (avoid misleading in-memory limits on serverless), **captcha** or **invite-only**, **real email verification**; `isEmailVerified` remains a placeholder. | `app/api/signup/route.ts`                                                      | Ship verification + abuse controls when self-serve signup is in scope.                                              |
| EEA-008 | P3       | Testing          | Playwright specs exist but are outside `pnpm check` and GitLab CI.                                                                                                                                                                                                                                                    | `playwright.config.ts`, `tests/*.spec.ts`, `.gitlab-ci.yml`                    | Add optional CI job or document when operators run E2E (staging).                                                   |
| EEA-009 | P3       | Cleanup          | `cleanupOldLessons` uses `deleteMany` only on `lesson`; confirm FK/cascade behavior for attached entities meets data retention policy.                                                                                                                                                                                | `lib/cleanup.ts`, Prisma `Lesson` relations                                    | Schema review + operator confirmation; extend cleanup if orphans possible.                                          |
| EEA-010 | P2       | Authorization    | Mixed auth patterns increase risk a new route omits tenant or demo guard.                                                                                                                                                                                                                                             | Compare `lib/api-utils` usage vs `vehicles` route                              | Add a route checklist or lint rule (future); prioritize high-risk mutators in manual review.                        |

**Note:** No **P0** items are listed: no single undisputed production security break was identified in this pass; remaining items are **proportionate** (P1 = before real PSP webhooks / broad public signup abuse surface; P2/P3 = quality and scale).

---

## Recommended roadmap

### Immediate hardening

- **CI parity** — **addressed:** GitLab runs **`pnpm -C driving_school_platform/nextjs_space check`** (same gate as local).
- Review **billing webhook** exposure on Vercel (URL secrecy, no public staging without signatures).
- **Signup / public forms:** demo-tenant **public signup is blocked** in API (`demo_signup_disabled`). **Still open:** edge **rate limits**, **captcha** / invite-only, and **email verification** before marketing broad self-serve registration (see [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md)).

### Product readiness

- Calendar **row pagination** inside the 90-day cap if needed; vehicle **list scalability** (caps, pagination).
- Optional **E2E in CI** for smoke-critical flows (login + one role matrix path)—see ops smoke docs.

### Engineering excellence

- Converge route handlers on **shared auth + error + logging** primitives.
- Extract **lesson query** orchestration from `admin/lessons` route into a service module; keep **GET** strictly read-only.

### Long-term architecture

- Consider **BFF DTOs** (select only fields UI needs) for GDPR/minimization and payload size.
- If reporting grows: dedicated read models or cached aggregates to avoid repeated heavy `include` trees.

---

## Related documents

- [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md)
- [deployment-readiness.md](../ops/deployment-readiness.md)
- [production-host-split.md](../ops/production-host-split.md)
- [supabase-data-api-policy.md](../ops/supabase-data-api-policy.md)
- [public-demo-policy.md](../ops/public-demo-policy.md)
- [release-checklist.md](../ops/release-checklist.md)
