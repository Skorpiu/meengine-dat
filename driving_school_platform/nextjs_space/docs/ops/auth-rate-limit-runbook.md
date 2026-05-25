# Auth rate limit — operator runbook

Operational guidance for DAT_3.5 auth/email distributed rate limiting.

**Scope:** `POST /api/auth/login`, `POST /api/auth/password-reset/request`, `POST /api/auth/email-verification/request`, `GET` / `POST /api/invitations/accept`, and `POST /api/signup`.

**Storage model:** DB-backed fixed-window buckets in `rate_limit_buckets` via Prisma/Postgres. No Redis/Upstash in this phase.

Do **not** paste full invite/reset/verification links, raw emails, raw IPs, tokens, or copied production query output into tickets, chat, screenshots, or PR comments. Use placeholders when documenting incidents.

**Related:** [auth-rate-limit-foundation.md](../engineering/auth-rate-limit-foundation.md), [auth-email-security-review.md](../engineering/auth-email-security-review.md), [supabase-prisma-migrations.md](./supabase-prisma-migrations.md).

---

## What operators should expect

- Buckets are written to `rate_limit_buckets`.
- Each row is keyed by `action` + `keyHash` + `windowStart`.
- The same `action` can appear multiple times in SQL because different clients/emails/tokens produce different `keyHash` values.
- Raw email/IP/token material is **not** stored; only SHA-256 hex hashes and counters are persisted.
- Current algorithm is **fixed window**. Short bursts near a window boundary are possible by design.

---

## Confirm recent buckets

Use a read-only query first:

```sql
select
  "action",
  "count",
  "windowStart",
  "createdAt",
  "updatedAt",
  left("keyHash", 12) as "keyHashPrefix"
from "rate_limit_buckets"
where "updatedAt" >= now() - interval '2 hours'
order by "updatedAt" desc
limit 100;
```

Notes:

- `keyHashPrefix` is only for quick visual grouping; it is still hashed material.
- Repeated `action` values are normal when multiple hashed keys hit the same endpoint policy.
- For password reset, seeing `auth.password-reset.request.email` increment to `5` and then observing `429` on the next request matches current policy.

To aggregate by action:

```sql
select
  "action",
  count(*) as "bucketRows",
  max("count") as "maxBucketCount",
  max("updatedAt") as "lastSeenAt"
from "rate_limit_buckets"
where "updatedAt" >= now() - interval '24 hours'
group by "action"
order by "lastSeenAt" desc;
```

---

## Confirm no raw email, IP, or token material is stored

Expected properties:

- `keyHash` should be a 64-character lowercase hex digest.
- It should not contain `@`, dots from raw IP notation, or readable token fragments.

Sanity-check query:

```sql
select
  "action",
  "keyHash"
from "rate_limit_buckets"
where "keyHash" !~ '^[0-9a-f]{64}$'
   or position('@' in "keyHash") > 0
   or position('token=' in "keyHash") > 0
limit 20;
```

Expected result: **zero rows**.

This is only a sanity check, not a proof of absence for every possible bad write. If this query returns rows, stop and investigate before deleting data.

---

## Interpreting 429 responses

Blocked requests return:

```json
{
  "error": "Too many requests. Please try again later.",
  "code": "rate_limited"
}
```

Operators should interpret `429` as:

- the request matched a configured rate-limit policy,
- the relevant fixed-window bucket count exceeded the allowed threshold,
- the route intentionally hid internal keying details,
- the client may also receive `Retry-After` with seconds until the current window ends.

For password reset and email verification request routes, `429` does **not** reveal whether an account exists. Anti-enumeration remains intact.

---

## When not to clean buckets

Do **not** manually delete buckets when:

- a `429` is expected during a smoke test and the window will expire naturally soon,
- you are investigating suspected abuse and want to preserve recent evidence,
- a single tester hit the expected limit and can simply retry after the window,
- you are unsure which rows correspond to the incident.

Manual cleanup should be the exception, not the default recovery path.

---

## Emergency cleanup of old buckets

If the table needs immediate reduction and you are deleting **old** data only:

```sql
delete from "rate_limit_buckets"
where "windowStart" < now() - interval '7 days';
```

Safer pattern:

1. Run the equivalent `select count(*)`.
2. Confirm the time boundary.
3. Delete.
4. Re-run the recent-buckets query to confirm current traffic is still visible.

Prefer age-based cleanup over broad deletes.

---

## Targeted cleanup for test buckets

To inspect likely test buckets before deleting them:

```sql
select
  "action",
  "count",
  "windowStart",
  "updatedAt",
  left("keyHash", 12) as "keyHashPrefix"
from "rate_limit_buckets"
where "updatedAt" >= now() - interval '2 hours'
  and "action" in (
    'auth.login.ip',
    'auth.login.email',
    'auth.password-reset.request.ip',
    'auth.password-reset.request.email',
    'auth.email-verification.request.ip',
    'auth.email-verification.request.email',
    'auth.invitation.accept.ip',
    'auth.invitation.accept.token',
    'auth.signup.ip'
  )
order by "updatedAt" desc;
```

To delete a specific test window without wiping all history, scope by `action` and recent `windowStart`:

```sql
delete from "rate_limit_buckets"
where "action" = 'auth.password-reset.request.email'
  and "windowStart" >= date_trunc('hour', now());
```

To delete one specific hashed bucket after inspection:

```sql
delete from "rate_limit_buckets"
where "action" = 'auth.password-reset.request.email'
  and "keyHash" = '<known-hash-from-select>'
  and "windowStart" = '<exact-window-start-utc>';
```

Use the narrowest delete that solves the operational problem. Do **not** run `delete from "rate_limit_buckets";` unless you are intentionally clearing every current limiter state and understand the abuse implications.

---

## Fixed-window limitations

Current known limitations:

- Requests near the end of one window and start of the next can create a small boundary burst.
- Counters live in Postgres, so very high-volume abuse may eventually justify a dedicated distributed limiter.
- Cleanup is manual/operational today; no automatic cron has been wired yet.
- There is no CAPTCHA/Turnstile in front of these routes in this batch.

These are known trade-offs for the current DAT_3.5 implementation and do not indicate a malfunction by themselves.

---

## Future operational follow-ups

Still pending:

- scheduled cleanup cron/job for old buckets,
- dashboards / alerts for elevated `429` rates or unusual bucket growth,
- CAPTCHA / Turnstile if abuse patterns justify it,
- re-evaluation of dedicated distributed infrastructure if scale or latency demands it.
