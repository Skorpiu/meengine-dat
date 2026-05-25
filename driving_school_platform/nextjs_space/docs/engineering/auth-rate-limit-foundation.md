# Auth & email — distributed rate limit foundation

**Status:** DAT_3.5 `auth-rate-limit-foundation` — **implemented**, migration applied, and **operationally validated** (DB-backed fixed windows).  
**Audience:** engineering + ops.

---

## Why DB-backed

Vercel/serverless runs multiple instances per environment. In-memory `Map` counters in `lib/rate-limit.ts` are **not** shared across instances and must not be the primary control for auth/email abuse.

This batch stores counters in **Supabase Postgres** via Prisma (`RateLimitBucket`), using atomic `upsert` + `increment` per fixed window. No Redis, Upstash, or new npm dependencies.

---

## Protected endpoints

| Endpoint                                    | Rate-limit dimensions                                                |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `POST /api/auth/login`                      | IP + normalized email (hashed keys)                                  |
| `POST /api/auth/password-reset/request`     | IP + email                                                           |
| `POST /api/auth/email-verification/request` | IP + email                                                           |
| `GET` / `POST /api/invitations/accept`      | IP + invitation token (SHA-256 hash of token, never raw token in DB) |
| `POST /api/signup`                          | IP only (signup remains disabled by default)                         |

**Not in scope:** admin/cron/demo internals, password-reset/verification **confirm**, NextAuth session routes.

---

## Actions & default limits

Configured in `lib/rate-limit/auth-rate-limit-policy.ts`:

| Action                                  | Limit | Window |
| --------------------------------------- | ----- | ------ |
| `auth.login.ip`                         | 20    | 15 min |
| `auth.login.email`                      | 10    | 15 min |
| `auth.password-reset.request.ip`        | 20    | 60 min |
| `auth.password-reset.request.email`     | 5     | 60 min |
| `auth.email-verification.request.ip`    | 20    | 60 min |
| `auth.email-verification.request.email` | 5     | 60 min |
| `auth.invitation.accept.ip`             | 30    | 15 min |
| `auth.invitation.accept.token`          | 10    | 15 min |
| `auth.signup.ip`                        | 10    | 60 min |

Tune limits in that file and update this table when changing production policy.

---

## Data stored

Table: `rate_limit_buckets` (`RateLimitBucket` model).

| Column        | Notes                                                                |
| ------------- | -------------------------------------------------------------------- |
| `action`      | Policy id (e.g. `auth.login.email`)                                  |
| `keyHash`     | SHA-256 hex of normalized key parts — **no** raw email, IP, or token |
| `windowStart` | Fixed-window bucket start (UTC)                                      |
| `count`       | Requests in window                                                   |

**Never stored:** raw email, raw IP, bearer/reset/verification/invite tokens, invite/reset/verification links, or unhashed token material.

Repeated rows for the same `action` in SQL are expected: the limiter buckets by `action` **and** `keyHash` **and** `windowStart`, so the same action can appear multiple times for different hashed emails, IPs, or tokens.

---

## Operational status

- Migration `20260524180000_add_rate_limit_buckets` was applied successfully.
- `prisma migrate status` confirmed the database schema is up to date.
- Operational smoke validation confirmed:
  - login normal OK
  - password reset request normal OK with `EMAIL_PROVIDER=noop`
  - email verification request normal OK
  - `POST /api/auth/password-reset/request` returned **429** on the 6th attempt for the same email-window combination
- `rate_limit_buckets` was populated with the expected auth/email actions during the smoke run.

The password reset result matches the current policy: `auth.password-reset.request.email` allows **5** requests per **60 minutes**, then blocks with the stable `rate_limited` response.

---

## Client behavior when blocked

- HTTP **429**
- Body: `{ "error": "Too many requests. Please try again later.", "code": "rate_limited" }`
- Optional **`Retry-After`** header (seconds until window end)

**Password reset / email verification request:** when rate limited, the API returns **429** (not the generic 200 anti-enumeration success). This avoids leaking whether an account exists while still throttling abuse. Under the limit, anti-enumeration unchanged (generic 200).

**Login / invitation accept:** 429 with the same stable body; no account/token internals.

---

## Algorithm

1. `windowStart = floor(now / windowSeconds)` (UTC epoch seconds).
2. `keyHash = SHA-256(normalized key parts)`.
3. `upsert` bucket with `count: { increment: 1 }`.
4. Block when `count > limit`; compute `retryAfterSeconds` until window end.

Fixed-window (not sliding). Minor burst at window boundaries is accepted for simplicity.

---

## Cleanup

`cleanupRateLimitBuckets({ olderThan })` in `lib/rate-limit/cleanup.ts` deletes buckets with `windowStart < olderThan`.

The cleanup helper has unit coverage, and the operational cron is now wired at `GET /api/cron/rate-limit-cleanup` using the existing Bearer `CRON_SECRET` pattern.

Current retention policy:

- daily Vercel Cron via `vercel.json`
- schedule `30 3 * * *` (03:30 UTC)
- `olderThan = now - 7 days`
- delete rule remains `windowStart < olderThan`

This keeps the current **fixed-window** model unchanged while removing stale buckets operationally.

---

## Limitations & follow-ups

| Item                                                              | Status                                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Fixed-window buckets                                              | Implemented                                                            |
| DB-backed distributed counters                                    | Implemented                                                            |
| In-memory `lib/rate-limit.ts` for legacy `withErrorHandling` opts | Still exists for non-auth routes; **login no longer uses it**          |
| CAPTCHA / Turnstile                                               | **Not implemented** — follow-up                                        |
| Dedicated Redis/Upstash store                                     | **Deferred** — revisit if Postgres write volume or latency requires it |
| Dashboards / alerts on 429 rate                                   | **Deferred**                                                           |
| Cleanup cron                                                      | **Implemented** — protected daily cron, 7-day retention                |

---

## Code map

- `lib/rate-limit/` — check, enforce helpers, policy, cleanup
- `prisma/schema.prisma` — `RateLimitBucket`
- Route wiring — `enforce*RateLimits` called before business logic

---

## Related docs

- [auth-email-security-review.md](./auth-email-security-review.md)
- [auth-rate-limit-runbook.md](../ops/auth-rate-limit-runbook.md)
- [signup-hardening-plan.md](./signup-hardening-plan.md)
