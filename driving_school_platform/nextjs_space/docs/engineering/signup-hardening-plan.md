# Signup Hardening Plan

**Status:** Phased plan — phase-1 signup controls **implemented**; invite / verification / rate limit / captcha **pending**.  
**Branch context:** `auth-surface-doc-status` (documentation consolidation).  
**Invite-only design:** [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) — **planned** (documentation only; implementation pending).  
**Related audits:** [engineering-excellence-audit.md](./engineering-excellence-audit.md) (EEA-007), [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md), [release-checklist.md](../ops/release-checklist.md).

---

## Current implementation status

Snapshot of the **auth / public signup surface** as implemented in code (not aspirational).

| Control                               | Status          | Notes                                                                                                                                                                                                  |
| ------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Demo signup disabled**              | **Implemented** | `Organization.isDemo` → **403** `demo_signup_disabled` on `POST /api/signup` (always, even if public signup env is on).                                                                                |
| **Public signup disabled by default** | **Implemented** | Non-demo orgs blocked unless env opt-in; **403** `public_signup_disabled`.                                                                                                                             |
| **Env explicit opt-in**               | **Implemented** | `PUBLIC_SIGNUP_ENABLED` — only trimmed case-insensitive `"true"` enables; see [`lib/signup/signup-policy.ts`](../../lib/signup/signup-policy.ts).                                                      |
| **Email verification**                | **Pending**     | `isEmailVerified` still set `true` on create; no provider, tokens, or login gate.                                                                                                                      |
| **Distributed rate limit**            | **Pending**     | Signup not throttled; in-memory `lib/rate-limit.ts` must not be used as production signup defense on serverless.                                                                                       |
| **Invite-only foundation**            | **Partial**     | Schema: `UserInvitation` + migration ([invite-only-foundation-plan.md](./invite-only-foundation-plan.md) batch 1). **No APIs/UI/tokens yet.** Today: School Admin `/api/users/create`; no invite flow. |
| **Captcha / Turnstile**               | **Pending**     | Not on `/auth/register` or signup API.                                                                                                                                                                 |

### Production and product guidance

- **Production should keep `PUBLIC_SIGNUP_ENABLED` unset or `false`** until there is an explicit, documented decision to allow self-serve registration (marketing, pilot school, etc.). See [release-checklist.md](../ops/release-checklist.md) and [environment-variables.md](../ops/environment-variables.md#public-signup-enabled).
- If **`PUBLIC_SIGNUP_ENABLED=true`**, treat it as a **rollout decision**: review invite-only policy, **email verification**, and **distributed rate limiting** before broad exposure—not as a default production posture.
- For **B2B driving schools**, **invite-only** (or admin-provisioned accounts only) remains the **recommended next implementation step** even when the env flag is off—closes the gap where `/auth/register` is still reachable but API rejects signups. See [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) for the proposed model, flows, and implementation batches.

### Auth surface (login vs signup)

| Surface         | State                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**       | NextAuth credentials — [`app/api/auth/[...nextauth]/route.ts`](../../app/api/auth/[...nextauth]/route.ts); `POST /api/auth/login` may use in-memory rate limit via `withErrorHandling` (not a substitute for signup hardening). |
| **Register UI** | [`app/auth/register/page.tsx`](../../app/auth/register/page.tsx) — still rendered; shows policy messages for `demo_signup_disabled` and `public_signup_disabled`.                                                               |
| **Signup API**  | [`app/api/signup/route.ts`](../../app/api/signup/route.ts) — tenant-scoped; no session created on success (user must log in).                                                                                                   |

---

## Scope

This document defines a **technical and operational strategy** to harden **public self-serve signup** on DAT before broad public exposure (marketing landing, open registration links, or unauthenticated tenant onboarding at scale).

It covers:

- **Rate limiting** (distributed, not in-memory on serverless)
- **Invite-only** vs **public signup**
- **Email verification** (foundation only — no email provider in early batches)
- **Captcha** (e.g. Cloudflare Turnstile) as a future layer for public forms

**In scope for follow-up implementation batches:** env/config gates, API and UI behavior for the above, observability, and tests.

**Out of scope for all batches listed here:** Prisma schema changes unless a dedicated batch explicitly requires them; billing, demo sandbox policy, user/vehicle/lesson route refactors, i18n expansion, platform onboarding redesign, and full NextAuth rewrite.

This plan **does not change application behavior** by itself.

---

## Current state

### Public signup API and UI

| Item                  | State                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint**          | `POST /api/signup` — [`app/api/signup/route.ts`](../../app/api/signup/route.ts)                                                           |
| **UI**                | [`app/auth/register/page.tsx`](../../app/auth/register/page.tsx) posts to the signup API                                                  |
| **Roles allowed**     | `STUDENT`, `INSTRUCTOR` (public); `SUPER_ADMIN` rejected with **403**                                                                     |
| **Tenant binding**    | `resolveTenantOrganizationId(request)` — org from mapped host; localhost may pass `organizationId` in body                                |
| **Cross-org guard**   | If host maps to org A, body cannot request org B (**403**)                                                                                |
| **Instructor fields** | License number + expiry required for `INSTRUCTOR`                                                                                         |
| **Approval**          | `isApproved: true` for students; instructors created with `isApproved: false` (`requiresApproval` in response)                            |
| **Integration tests** | [`app/api/signup/route.integration.unit.test.ts`](../../app/api/signup/route.integration.unit.test.ts) — scoping, demo block, role guards |

### Demo organizations

- Organizations with **`Organization.isDemo: true`** receive **403** with `code: demo_signup_disabled` and message _"Public signup is disabled for demo organizations."_
- Controlled demos use **private personas** and operator scripts — not open registration ([public-demo-policy.md](../ops/public-demo-policy.md), [client-demo-runbook.md](../ops/client-demo-runbook.md)).

### Production (non-demo) tenants

- **Public signup is disabled by default** for non-demo orgs unless **`PUBLIC_SIGNUP_ENABLED=true`** (trimmed, case-insensitive) in the deployment environment.
- When disabled, `POST /api/signup` returns **403** with `code: public_signup_disabled` and message _"Public signup is currently disabled."_
- Policy helper: [`lib/signup/signup-policy.ts`](../../lib/signup/signup-policy.ts).

### Email verification

- User rows are created with **`isEmailVerified: true`** unconditionally — verification is **not implemented**.
- Inline comment in signup route: _"Email verification is not implemented yet; this is tracked as production hardening."_
- No verification tokens, resend flow, or email provider integration in the codebase.

### Rate limiting

- **`lib/rate-limit.ts`** provides **in-memory** `Map`-based limits (`RATE_LIMITS.AUTH`, `API`, `MUTATION`, etc.).
- **`withErrorHandling`** in **`lib/api-utils.ts`** can attach rate limits **per route** that opt in.
- **`POST /api/signup` does not use `withErrorHandling` or `checkRateLimit`** — signup is **unthrottled** at the application layer.
- In-memory limits are **unsuitable as the primary control on Vercel serverless** (per-instance counters, cold starts, no shared state). Existing `RATE_LIMITS` must **not** be wired to signup as a “production” fix without a distributed store.

### Invite-only / captcha

- **Invite-only:** not implemented (no tokens / closed-register flow beyond env gate).
- **Register page:** may still be linked or discovered; **`POST /api/signup`** enforces demo block and `PUBLIC_SIGNUP_ENABLED` before any user creation.
- **School Admin** can create users via admin APIs (`/api/users/create`, etc.) — the de facto **B2B provisioning** path today.
- **Captcha / Turnstile:** not present on register or signup API.

### Auth surface (context)

- Login uses NextAuth credentials ([`app/api/auth/[...nextauth]/route.ts`](../../app/api/auth/[...nextauth]/route.ts)); signup creates users with `passwordHash` (bcrypt cost 12) compatible with that flow.
- Signup is **separate** from NextAuth — successful registration does not automatically establish a session (client must log in).

---

## Risks

| Risk                                 | Description                                                                     | DAT impact                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spam accounts**                    | Automated POSTs create users, student/instructor profiles, and lesson counters. | DB growth, support noise, polluted org rosters.                                                                                                                  |
| **Email enumeration**                | Distinct responses for “user exists” vs success.                                | `POST /api/signup` returns **409** _"User with this email already exists"_ — reveals registered emails globally (unique email across tenants in current schema). |
| **Tenant signup abuse**              | Attacker targets a school’s vanity domain with bulk registrations.              | Reputation damage; instructor approval queue flooding.                                                                                                           |
| **Database load**                    | Each signup runs a transaction (user + profile + optional `lessonCounter`).     | Connection pool pressure under attack; Supabase costs.                                                                                                           |
| **Unverified accounts**              | Users log in immediately with `isEmailVerified: true` without owning the inbox. | Wrong contact data, account takeover if password is weak, compliance gaps.                                                                                       |
| **No distributed throttling**        | Serverless has no shared in-process limiter.                                    | Bursts bypass any future per-route memory limiter; need edge or Redis-class store.                                                                               |
| **Credential stuffing adjacency**    | Register + login on same host.                                                  | Abuse of weak passwords on new accounts; complements need for verification and limits.                                                                           |
| **SUPER_ADMIN / platform confusion** | Public signup blocked for `SUPER_ADMIN`; platform onboarding is separate.       | Lower risk on signup route; platform host discipline remains operator-only ([production-host-split.md](../ops/production-host-split.md)).                        |

---

## Options

### A) Invite-only signup

**Model:** Schools provision students and instructors via **School Admin** (existing user APIs) or an explicit **invite token** flow (future). Public `/auth/register` hidden or returns a static “contact your school” message.

| Pros                                                                         | Cons                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| Best fit for **B2B driving schools** (known roster, admin-driven onboarding) | No self-serve growth without later batch             |
| Shrinks abuse surface immediately                                            | Schools must operationalize admin workflows          |
| Aligns with current demo posture (personas, no public signup on demo)        | Product/marketing must not promise open registration |

**DAT fit:** Strong for **short-term production** and portfolio demos where access is already private.

---

### B) Public signup with email verification

**Model:** Keep `POST /api/signup` but set `isEmailVerified: false` until the user completes a time-limited token link (or OTP). Block or limit session/login until verified.

| Pros                                                 | Cons                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Enables self-serve while reducing throwaway accounts | Requires **email provider** (Resend, SendGrid, SES, etc.), templates, bounce handling |
| Industry-standard expectation for SaaS               | Resend limits, token storage, expiry, and “already verified” UX                       |
| Can combine with rate limit + captcha                | **Not in first implementation batch** per product constraint                          |

**DAT fit:** **Medium-term** after provider choice and ops runbook (secrets in Vercel, no PII in logs).

---

### C) Public signup with managed rate limit

**Model:** Enforce limits at **edge** (Vercel Firewall / WAF), **Upstash Redis**, **Vercel KV**, or **DB-backed** counters — keyed by IP + optional fingerprint + `organizationId` / host.

| Pros                                             | Cons                                                       |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Works on serverless; shared state                | Extra service cost and configuration                       |
| Can tier limits (signup stricter than read APIs) | IP shared NAT (schools, mobile) — need sensible thresholds |
| Complements verification and captcha             | Does not stop targeted low-volume abuse alone              |

**DAT fit:** **Medium-term** mandatory layer if public signup stays on; **do not** ship signup-only protection as in-memory `lib/rate-limit.ts` on Vercel.

**Candidates (evaluation in implementation batch):**

| Store                     | Notes                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| **Upstash Redis**         | Common with Vercel; sliding window / token bucket libraries available |
| **Vercel KV**             | Same ecosystem; confirm region and pricing                            |
| **Postgres counters**     | No new vendor; higher write load and cleanup job for windows          |
| **Edge / CDN rate limit** | First line of defense; coarse (IP/host)                               |

---

### D) Captcha / Cloudflare Turnstile

**Model:** Client widget on register page; server verifies token on `POST /api/signup` before any DB work.

| Pros                                                  | Cons                                                      |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Strong against bots on public forms                   | UX friction; accessibility considerations                 |
| Turnstile is privacy-friendlier than legacy reCAPTCHA | Site keys in env; server secret verification              |
| Works with rate limits (defense in depth)             | Does not replace email verification for account ownership |

**DAT fit:** **Future** batch if public signup remains after invite-only is relaxed.

---

## Recommendation

Adopt a **phased** path aligned with DAT’s B2B tenant model and serverless hosting:

| Phase               | Timeframe                                      | Action                                                                                                                                                                               |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Short term**  | Before broad public marketing                  | **Shipped:** public signup off by default via **`PUBLIC_SIGNUP_ENABLED`** (only `"true"` enables). Demo block unchanged. Operator path: admin user creation + private demo personas. |
| **2 — Medium term** | When self-serve is a product requirement       | **Email verification foundation** — provider integration, `isEmailVerified` semantics, login gate, resend with its own rate limit.                                                   |
| **3 — Medium term** | Same release train as (2) or immediately after | **Distributed rate limit** on `POST /api/signup` (and optionally `/api/auth/login`) — never rely on in-memory `rateLimitMap` alone in production.                                    |
| **4 — Future**      | If public register stays high-traffic          | **Turnstile** (or equivalent) on register + server-side verification.                                                                                                                |

**Default recommendation for production:** keep **`PUBLIC_SIGNUP_ENABLED=false`** (unset counts as off). Operationally treat onboarding as **invite-only / admin-provisioned** until phase 2–3 ship, even though `/auth/register` may still exist in the app shell.

**Next recommended batch for B2B:** implementation batches in [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) (`invitation-schema-foundation` → … → `invitation-rate-limit-audit`), then email verification and distributed rate limit before any broad public marketing of self-serve signup.

---

## Proposed implementation batches

Each batch is a **separate PR** with `pnpm check` green. Batches are ordered; later batches may depend on earlier ones.

---

### Batch: `signup-disable-public-by-default` — **implemented**

**Objective:** Add a **configuration gate** so operators can disable public signup on production without code deploy semantics beyond env change.

| Area                    | Detail                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Config**              | **`PUBLIC_SIGNUP_ENABLED`** — only `"true"` (trim/case-insensitive) enables; default disabled ([environment-variables.md](../ops/environment-variables.md))                                                         |
| **API**                 | `decideSignupAvailability` in [`lib/signup/signup-policy.ts`](../../lib/signup/signup-policy.ts); **403** + `public_signup_disabled` after demo check on [`app/api/signup/route.ts`](../../app/api/signup/route.ts) |
| **UI**                  | `/auth/register` shows message when API returns `public_signup_disabled` (form remains visible)                                                                                                                     |
| **Tests**               | `lib/signup/signup-policy.unit.test.ts`; extended `app/api/signup/route.integration.unit.test.ts`                                                                                                                   |
| **Acceptance criteria** | Met — production defaults to disabled; demo block unchanged; no Prisma migration                                                                                                                                    |

**Next batches (pending):** [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) implementation batches, `email-verification-foundation`, `distributed-rate-limit-foundation`, `captcha-turnstile-evaluation`.

---

### Batch: `signup-invite-only-foundation` — **superseded by invite-only plan**

**Objective:** Formalize **invite-only** provisioning with hashed single-use invite tokens and admin UX.

**Status:** Design completed in **[invite-only-foundation-plan.md](./invite-only-foundation-plan.md)** (branch `invite-only-foundation-plan`). Implementation is split into seven ordered batches (`invitation-schema-foundation` through `invitation-rate-limit-audit`) — do not implement tokens in signup route without that plan.

| Area                    | Detail                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Design doc**          | [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) — `UserInvitation` model, flows, security, APIs, UI |
| **Interim ops**         | Phase-1 public signup remains off; School Admin uses `/api/users/create` until invitation APIs ship                    |
| **Acceptance criteria** | See invite-only plan per-batch criteria; production stays on admin create + env gate until batches land                |

---

### Batch: `email-verification-foundation`

**Objective:** Real verification lifecycle without claiming a specific vendor in this plan — implementation picks provider in batch PR.

| Area                    | Detail                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Data**                | Verification token table or signed JWT strategy; `isEmailVerified` set **false** on signup                                     |
| **Email**               | Send verification link; resend endpoint with strict rate limit                                                                 |
| **Auth**                | NextAuth credentials callback rejects or limits unverified users (policy decision documented)                                  |
| **Signup**              | Stop setting `isEmailVerified: true` in [`app/api/signup/route.ts`](../../app/api/signup/route.ts)                             |
| **Risks**               | Provider outages; email in logs; GDPR retention on tokens                                                                      |
| **Tests**               | Signup → unverified cannot fully use app; verify link → verified; expired token → 400                                          |
| **Acceptance criteria** | New users require verification before full access; secrets only in env; enumeration response reviewed (generic message option) |

---

### Batch: `distributed-rate-limit-foundation`

**Objective:** Shared rate limiting for **`POST /api/signup`** (and optionally login), using Upstash/KV/DB — **not** `lib/rate-limit.ts` Map as source of truth.

| Area                    | Detail                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Keys**                | `signup:{orgId or host}:{ip}` plus global IP cap                                                                                |
| **Limits**              | Stricter than `RATE_LIMITS.API` (e.g. 3–5 signups / hour / IP / org — tune with ops)                                            |
| **Response**            | **429** with `Retry-After`, stable `code: rate_limit_exceeded`                                                                  |
| **Fallback**            | If Redis unavailable: fail closed (503) vs fail open — **recommend fail closed** for signup                                     |
| **Risks**               | Shared IP false positives; cost at scale                                                                                        |
| **Tests**               | Mock limiter store; exceed threshold → 429; under threshold → pass through                                                      |
| **Acceptance criteria** | Limit survives across serverless instances in staging load test; signup route does not import in-memory limiter for enforcement |

---

### Batch: `captcha-turnstile-evaluation`

**Objective:** Evaluate and optionally integrate **Cloudflare Turnstile** on public register + server verify.

| Area                    | Detail                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Client**              | Turnstile widget on register page                                                              |
| **Server**              | Verify siteverify API before signup transaction                                                |
| **Config**              | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                                   |
| **Risks**               | False negatives; CSP/script allowances                                                         |
| **Tests**               | Missing/invalid token → 400; valid mock in integration tests                                   |
| **Acceptance criteria** | Documented decision: ship Turnstile or defer; if shipped, bot traffic drops in staging metrics |

---

## Non-goals

- **Billing** — checkout, PSP webhooks, portal ([release-checklist.md](../ops/release-checklist.md))
- **Platform expansion** — `/api/platform/organizations` onboarding flows
- **Full auth rewrite** — replacing NextAuth or credentials model
- **Prisma schema changes** in documentation-only batch; schema changes only when an implementation batch requires them (e.g. verification tokens)
- **Demo sandbox** — quotas, cron reset, `isDemo` policy (already handled separately)
- **User / vehicle / lesson route refactors** — see [lessons-route-refactor-plan.md](./lessons-route-refactor-plan.md)
- **i18n** — new copy batches deferred unless product requests
- **In-memory rate limit as production signup defense** — explicit anti-pattern for this plan
- **Implementing email provider or captcha in the plan-only batch** that created this document

---

## Operational checklist (before enabling broad public signup)

1. **Decision recorded:** invite-only vs public + verification + rate limit ([release-checklist.md](../ops/release-checklist.md)).
2. **`PUBLIC_SIGNUP_ENABLED`** reviewed for production Vercel env (unset/`false` unless self-serve is intentional).
3. **Demo orgs** remain `isDemo: true`; signup smoke confirms **403** `demo_signup_disabled`.
4. **Distributed rate limit** live in staging with realistic thresholds.
5. **Email verification** live if public signup enabled.
6. **Monitoring:** alert on signup 4xx/5xx rate, 429 rate, signup transaction duration.
7. **Enumeration policy:** consider generic error for duplicate email (product/legal review).
8. **No secrets** in git; provider keys in Vercel only ([environment-variables.md](../ops/environment-variables.md)).

---

## Related documents

- [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) — B2B invite model, schema proposal, flows, security, implementation batches (design only)
- [engineering-excellence-audit.md](./engineering-excellence-audit.md) — EEA-007 signup / abuse
- [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md) — P1 security / public forms
- [release-checklist.md](../ops/release-checklist.md) — pre-release signup decision
- [public-demo-policy.md](../ops/public-demo-policy.md) — demo signup disabled
- [production-host-split.md](../ops/production-host-split.md) — tenant vs platform hosts
- [environment-variables.md](../ops/environment-variables.md) — future signup flags and provider keys
