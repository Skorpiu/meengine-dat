# Auth & email — operational security review

**Status:** DAT_3.5 `auth-email-security-operational-review` (documentation only).  
**Audience:** engineering + ops.  
**Detail elsewhere:** [password-reset-flow.md](./password-reset-flow.md), [email-verification-flow.md](./email-verification-flow.md), [email-provider-evaluation.md](./email-provider-evaluation.md), [email-provider-postmark-runbook.md](../ops/email-provider-postmark-runbook.md), [auth-email-production-readiness-checklist.md](../ops/auth-email-production-readiness-checklist.md), [production-postmark-enablement-plan.md](../ops/production-postmark-enablement-plan.md).

This document consolidates **current state**, **Preview validation**, **environment policy**, **security properties**, **prioritized backlog**, and a **short test runbook**. It does not replace flow-specific docs.

---

## Executive summary

| Area                | State                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding          | **Invite-only** (copy-link + optional automatic invitation email)                                                                      |
| Transactional email | **`sendEmail()`** boundary — `noop` default, **Postmark** when configured                                                              |
| Password reset      | **Implemented** — hash-only tokens, atomic consume, anti-enumeration                                                                   |
| Email verification  | **Implemented** — same security model; invite accept marks email verified                                                              |
| Auth rate limit     | **Implemented + operationally validated** — DB-backed fixed windows, hashed keys only                                                  |
| Public signup       | **Disabled by default** (`PUBLIC_SIGNUP_ENABLED`); demo orgs blocked                                                                   |
| Production Postmark | **Not enabled** — Preview used for real-delivery validation; Production cutover is documented in the readiness checklist, not executed |

**Distributed rate limit (DB-backed)** is implemented and operationally validated in `auth-rate-limit-foundation`, and old bucket cleanup is now handled by a protected daily cron using the shared `CRON_SECRET` pattern — see [auth-rate-limit-foundation.md](./auth-rate-limit-foundation.md) and [auth-rate-limit-runbook.md](../ops/auth-rate-limit-runbook.md). CAPTCHA and production mail cutover remain out of scope.

---

## Current state by flow

### Invite-only onboarding

- School Admin creates `UserInvitation` on `/admin/users`; API returns **`inviteLink` once** (bearer token).
- **Copy-link is mandatory fallback:** create succeeds even if email send fails (**HTTP 201**).
- Accept: `/invitations/accept` + `POST /api/invitations/accept`.
- New users from invite get **`isEmailVerified: true`** and **`emailVerified`** — accepting the invite sent to that inbox is treated as proof of email control (no separate verification email).

See [invite-only-foundation-plan.md](./invite-only-foundation-plan.md).

### Invitation email (automatic)

- On create: `buildInvitationEmail()` + `sendEmail()`, tags `["invitation"]`.
- Admin UI/API exposes **`emailDelivery`** status; never returns raw token/hash in list endpoints.
- Provider: noop or Postmark per `EMAIL_PROVIDER`.

### Postmark provider

- Implementation: `lib/email/providers/postmark-provider.ts` (REST, no new SDK).
- Optional env: `EMAIL_PROVIDER`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, etc. (see [environment-variables.md](../ops/environment-variables.md)).
- **Not required** for app correctness — noop succeeds without inbox delivery.

### Password reset

- `POST /api/auth/password-reset/request` / `confirm`
- `PasswordResetToken` table — **SHA-256 `tokenHash` only**; 1h expiry; atomic `updateMany` consume
- UI: `/auth/forgot-password`, `/auth/reset-password`
- Only users with **`passwordHash`** receive reset mail (OAuth-only accounts get generic success, no token)

Details: [password-reset-flow.md](./password-reset-flow.md).

### Email verification

- `POST /api/auth/email-verification/request` / `confirm`
- `EmailVerificationToken` table — same hash/expiry/consume pattern; **24h** expiry
- UI: `/auth/verify-email`, `/auth/resend-verification`
- **Credentials login** already checks `isEmailVerified` in `lib/auth.ts` (existing policy; not tightened in DAT_3.5)

Details: [email-verification-flow.md](./email-verification-flow.md).

### Public signup & demo

- **`PUBLIC_SIGNUP_ENABLED`** must be `true` explicitly for non-demo public signup.
- Demo organizations: signup blocked (`demo_signup_disabled`).
- Signup path still sets **`isEmailVerified: true` placeholder** when enabled — verification email on signup is **not** wired (follow-up).

---

## Validated in Preview (DAT_3.5)

The following were exercised on **Preview** with **temporary** `EMAIL_PROVIDER=postmark` (real or test token per runbook), then Preview was returned to **noop**:

| Flow                       | What was validated                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **Postmark real delivery** | Invitation (and provider wiring) — message accepted / received in controlled mailbox |
| **Password reset E2E**     | Request → email link → confirm → login with new password                             |
| **Email verification E2E** | Request → email link → confirm → verified flags / login behavior                     |

**Operator rule:** after each test window, set Preview `EMAIL_PROVIDER` back to **unset** or **`noop`** and redeploy Preview so routine previews do not send real mail.

Production has **not** been enabled for Postmark on auth/invite flows in this phase. The enablement path is now documented in [auth-email-production-readiness-checklist.md](../ops/auth-email-production-readiness-checklist.md) and [production-postmark-enablement-plan.md](../ops/production-postmark-enablement-plan.md), and remains **documented but not executed** in DAT_3.5.

---

## Operational validation after rollout

The DB-backed auth/email limiter was also validated operationally after migration apply:

| Check                                                      | Result                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Login normal flow                                          | OK                                                           |
| Password reset request normal flow (`EMAIL_PROVIDER=noop`) | OK                                                           |
| Email verification request normal flow                     | OK                                                           |
| Password reset request throttle                            | **429 on 6th attempt** for the same email-window combination |
| `rate_limit_buckets` contents                              | Expected auth/email actions observed                         |

This matches the current configured email policy for password reset requests: **5 per 60 minutes** for `auth.password-reset.request.email`, then stable `429 rate_limited`.

---

## Environments

| Environment               | Recommended `EMAIL_PROVIDER` | Notes                                                                                                          |
| ------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Local / CI**            | unset or `noop`              | `pnpm check` needs no Postmark vars                                                                            |
| **Preview (default)**     | **noop**                     | Safe default; no accidental mail to real users                                                                 |
| **Preview (test window)** | `postmark` temporarily       | Real or `POSTMARK_API_TEST` per [runbook](../ops/email-provider-postmark-runbook.md); **revert to noop** after |
| **Production**            | **not enabled yet**          | Enable only after checklist below + domain/sender verified                                                     |

Do not change Postmark secrets or production env in this review batch — follow [email-provider-postmark-runbook.md](../ops/email-provider-postmark-runbook.md) when cutting over.

---

## Security properties (cross-cutting)

| Property                   | Invite                          | Password reset             | Email verification    |
| -------------------------- | ------------------------------- | -------------------------- | --------------------- |
| Token in DB                | `tokenHash` (SHA-256)           | Same                       | Same                  |
| Raw token exposure         | Email/link + one-time UI only   | Same                       | Same                  |
| Atomic consume             | N/A (single-use invite row)     | `updateMany` + transaction | Same                  |
| Anti-enumeration (request) | N/A (admin-only create)         | Generic 200 message        | Generic 200 message   |
| Email failure vs UX        | Create **not** blocked          | Generic success            | Generic success       |
| Logging                    | No token/link/html/text in logs | Same                       | Same                  |
| Copy-link fallback         | **Yes** (primary ops path)      | N/A                        | Resend page available |

**Link host risk (reset + verification):** links use `new URL(request.url).origin`. Misconfigured reverse proxy `Host` / `X-Forwarded-*` can produce wrong origins — ops must ensure the app sees the public tenant host on POSTs.

**Legacy columns (not removed):** `User.passwordResetToken`, `User.passwordResetExpiresAt`, `User.emailVerificationToken`, `User.emailVerificationExpiresAt` — unused by current flows; cleanup deferred.

---

## Prioritized backlog

Priority is **P0 = before production mail / abuse exposure**, **P1 = soon after**, **P2 = later**.

| Pri    | Item                                         | Rationale                                                                                                                                                |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | **Production Postmark enablement checklist** | Domain/sender verified, secrets in Production scope only, smoke invite + reset + verify, monitor `emailDelivery` / bounces                               |
| **P0** | **Preview default noop**                     | Prevent accidental sends on every PR preview                                                                                                             |
| **P1** | ~~**Distributed rate limit**~~               | **Done** — [auth-rate-limit-foundation.md](./auth-rate-limit-foundation.md): login, reset/verify request, invitation accept, signup IP; hashed keys only |
| **P1** | ~~**Rate-limit cleanup cron**~~              | **Done** — protected daily cron cleans buckets older than 7 days; same `CRON_SECRET` pattern as existing project cron                                    |
| **P1** | **Session policy after password reset**      | Credentials sessions may remain valid after `passwordHash` change until expiry — optional invalidation / “sign out all devices”                          |
| **P2** | **Turnstile / CAPTCHA**                      | On forgot-password, resend-verification, and/or public signup when enabled                                                                               |
| **P2** | **Dashboards / alerts**                      | Add monitoring for unusual `429` rates, bucket growth, and repeated auth/email abuse patterns                                                            |
| **P2** | **Unverified-user policy**                   | Today: NextAuth blocks login if `!isEmailVerified`; future: block sensitive actions for admin-created users with `isEmailVerified: false`                |
| **P2** | **Public signup + verification**             | When `PUBLIC_SIGNUP_ENABLED=true`, create unverified users + send verification email (remove placeholder)                                                |
| **P2** | **Legacy column cleanup**                    | Migration to drop unused `User.*Reset*` / `User.*Verification*` columns after dependency audit                                                           |
| **P2** | **Resend/SMTP adapters**                     | Only if Postmark strategy changes — see [email-provider-evaluation.md](./email-provider-evaluation.md)                                                   |

---

## Production enablement checklist (summary)

This section documents the cutover requirements; it does **not** indicate that Production enablement has happened.

Full steps: [auth-email-production-readiness-checklist.md](../ops/auth-email-production-readiness-checklist.md), [email-provider-postmark-runbook.md](../ops/email-provider-postmark-runbook.md), [release-checklist.md](../ops/release-checklist.md).

1. Postmark domain + sender verified (SPF/DKIM).
2. Production server token only in Vercel **Production** (never in repo).
3. Set `EMAIL_PROVIDER=postmark`, `POSTMARK_FROM_EMAIL`, redeploy Production.
4. Smoke: one invitation (copy-link + inbox), one password reset, one verification (if test user exists unverified).
5. Confirm API responses never include tokens/hash/html; confirm logs redact sensitive URLs.
6. Rollback plan: set `EMAIL_PROVIDER=noop`, redeploy — copy-link and auth APIs keep working.

---

## Short runbook: future Preview tests with real Postmark

Use this for the next invite / reset / verification delivery test. Do **not** leave Preview on Postmark between test windows.

### 1. Map Preview host

- Identify the **tenant Preview URL** (e.g. `https://<branch>-<project>.vercel.app` or custom preview domain).
- Confirm `OrganizationDomain` / tenant routing resolves to the org under test (same as invitation smoke).
- Note the **origin** used in email links — it must match what users click (proxy/Host correctness).

### 2. Enable Postmark temporarily (Preview scope only)

In Vercel → Project → Environment Variables → **Preview**:

- `EMAIL_PROVIDER` = `postmark`
- `POSTMARK_SERVER_TOKEN` = production-like token **or** `POSTMARK_API_TEST` for API-only checks
- `POSTMARK_FROM_EMAIL` = verified sender in Postmark
- Redeploy Preview

### 3. Run controlled tests

| Test   | Action                                         | Success criteria                                                  |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| Invite | Create one invitation to a mailbox you control | **201**, `inviteLink`, `emailDelivery.ok`; inbox optional         |
| Reset  | `POST` forgot-password / use link              | Generic request response; confirm works; **no** token in API JSON |
| Verify | `POST` resend-verification / use link          | Same anti-enumeration; confirm sets verified flags                |

Do not paste `inviteLink`, reset/verify URLs, tokens, or email bodies into tickets or chat.

### 4. Revert Preview to noop

- Remove `EMAIL_PROVIDER` or set `EMAIL_PROVIDER=noop` in **Preview** scope.
- Remove temporary Postmark vars if they were Preview-only test secrets.
- Redeploy Preview.
- Spot-check: new invitation shows `emailDelivery.provider: "noop"` (or equivalent).

### 5. Remove temporary Postmark sender/recipient artifacts (if any)

- In Postmark: remove **temporary** sandbox recipients or test suppressions only if your process added them.
- In DNS/Postmark: do **not** remove production domain verification — only test-specific allowlist entries.

---

## Related DAT_3.5 batches

| Batch                                        | Outcome                        |
| -------------------------------------------- | ------------------------------ |
| `email-provider-boundary`                    | `sendEmail()`, noop, redaction |
| `email-provider-postmark`                    | Postmark adapter               |
| `password-reset-flow-foundation` + hardening | Reset APIs + atomic consume    |
| `email-verification-flow`                    | Verification APIs + UI         |
| **`auth-email-security-operational-review`** | **This document**              |
| **`auth-rate-limit-foundation`**             | DB-backed fixed-window limits  |

---

## Document maintenance

When a flow or environment policy changes, update the **flow doc** first, then adjust the **summary tables** in this file only — avoid duplicating API contracts or code maps here.
