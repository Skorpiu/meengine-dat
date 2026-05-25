# Auth + email production readiness checklist

**Status:** DAT_3.5 `production-readiness-auth-email-checklist` (documentation only).  
**Audience:** engineering + ops.  
**Current decision:** **No-Go / not enabled yet** for real Postmark in Production.  
**Related:** [auth-email-security-review.md](../engineering/auth-email-security-review.md), [email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md), [environment-variables.md](./environment-variables.md#postmark-email), [supabase-prisma-migrations.md](./supabase-prisma-migrations.md), [auth-rate-limit-runbook.md](./auth-rate-limit-runbook.md).

This checklist consolidates the **minimum production-readiness gates** for auth/email before enabling **real Postmark delivery in Production** and before broader external exposure. It documents the cutover decision; it does **not** change runtime, migrations, dependencies, or live environment variables by itself.

---

## Objective

- Make Production enablement for auth/email explicit, reviewable, and reversible.
- Keep the current safe defaults until a human makes an intentional cutover decision.
- Ensure invite, password reset, email verification, and rate-limit behavior are operationally understood before real Production mail is enabled.

---

## Current validated state

- [x] Invite-only flow is functional.
- [x] Invitation email flow is functional.
- [x] Postmark provider is implemented.
- [x] Real Postmark delivery was validated in Preview.
- [x] Password reset foundation + hardening are implemented.
- [x] Password reset real end-to-end was validated in Preview.
- [x] Email verification flow is implemented.
- [x] Email verification real end-to-end was validated in Preview.
- [x] Auth rate-limit foundation is implemented.
- [x] `rate_limit_buckets` migration/table path was applied and operationally validated.
- [x] Runbooks exist for auth/email/rate-limit operations.
- [x] Preview should stay `noop` by default outside controlled test windows.
- [ ] Real Postmark is enabled in Production.
- [x] Public signup remains disabled by default.
- [x] Demo signup remains blocked.

**Important current state:** Production Postmark enablement is **not executed** in this batch. Preview validation is complete, but Production must remain on the current safe posture until the checklist below is explicitly signed off.

---

## Checklist before Production

- [ ] Cutover owner, rollback owner, and monitoring window are assigned.
- [ ] Controlled test inboxes are available for invitation, password reset, and email verification smoke tests.
- [ ] Tests will be run on a **non-demo** tenant/org with operator-controlled accounts only.
- [ ] Preview has already completed the relevant auth/email validations and has been returned to **unset** or **`noop`** for `EMAIL_PROVIDER`.
- [ ] No unrelated runtime changes, migrations, or dependency changes are bundled with the Production enablement decision.
- [ ] Public signup remains disabled unless separately approved in a future batch.
- [ ] Demo signup remains blocked.
- [ ] Operators understand that invite copy-link remains the fallback even if email delivery fails.

---

## Production env vars checklist

- [ ] `EMAIL_PROVIDER` stays unset or `noop` until the enablement decision is explicit; switch to `postmark` only during the approved cutover window.
- [ ] `POSTMARK_SERVER_TOKEN` is configured in **Vercel Production** and is valid for the intended Postmark server.
- [ ] `POSTMARK_FROM_EMAIL` is set to **`admin@meengine.io`** or **`no-reply@meengine.io`**, and the selected sender/domain is verified in Postmark.
- [ ] `POSTMARK_MESSAGE_STREAM` is set to **`outbound`**.
- [ ] `POSTMARK_API_BASE_URL` is **not** defined in Production.
- [ ] `DATABASE_URL` is present and non-empty in Production.
- [ ] `DIRECT_URL` is present and non-empty in Production.
- [ ] No Production Postmark secret is stored in git, docs, chat, screenshots, or tickets.

---

## Postmark Production checklist

- [ ] Postmark account is approved or otherwise free of blocking restrictions for transactional delivery.
- [ ] Correct **Server API Token** was chosen for the Production server.
- [ ] DKIM is verified.
- [ ] Return-Path is verified.
- [ ] Sender signature or sending domain is validated for the chosen `POSTMARK_FROM_EMAIL`.
- [ ] Operators understand the account's sending limits, review requirements, suppressions, and any remaining restrictions.
- [ ] Activity view will be monitored during the first controlled sends after enablement.
- [ ] Operators know how to distinguish accepted-by-Postmark from actually delivered/opened mail.

---

## Supabase and migrations checklist

- [ ] The database schema for `password_reset_tokens` is applied on the Production database.
- [ ] The database schema for `email_verification_tokens` is applied on the Production database.
- [ ] The database schema for `rate_limit_buckets` is applied on the Production database.
- [ ] `pnpm exec prisma migrate status` from `driving_school_platform/nextjs_space` reports the target database is up to date.
- [ ] Operators have confirmed the target tables exist before cutover.
- [ ] Backups, PITR, or equivalent rollback posture are operationally understood before the cutover window.
- [ ] Simple rollback does **not** include deleting migrations or dropping auth/email tables.

Optional existence query:

```sql
select
  to_regclass('public.password_reset_tokens') as password_reset_tokens,
  to_regclass('public.email_verification_tokens') as email_verification_tokens,
  to_regclass('public.rate_limit_buckets') as rate_limit_buckets;
```

---

## Vercel checklist

- [ ] Postmark variables are scoped only where intended, with Production values reviewed before use.
- [ ] Preview remains on the safe default (`EMAIL_PROVIDER` unset or `noop`) outside explicit test windows.
- [ ] Production redeploy is planned immediately after the enablement change so serverless functions reload env values.
- [ ] Operators know how to inspect logs and deployment health without pasting secrets or full auth/email links into shared channels.
- [ ] Rollback redeploy path is prepared before the first Production send.

---

## Smoke tests

Run only **Production-safe**, **controlled**, **low-volume** checks after enablement:

- [ ] Normal credentials login works for a known good user.
- [ ] Invitation create still returns `inviteLink` even when email delivery is attempted.
- [ ] Invitation email sends successfully to a controlled mailbox.
- [ ] Password reset request works for a controlled mailbox.
- [ ] Password reset confirm succeeds and login works with the new password.
- [ ] Email verification resend/confirm works for a controlled unverified user.
- [ ] Rate-limit sanity is checked in a **minimal, non-abusive** way: confirm expected `rate_limit_buckets` activity appears, or run a very small controlled test only.

**Do not** run aggressive abuse simulations in Production just to validate rate limiting.

---

## Rollback plan

If initial Production email delivery is not acceptable:

1. Set `EMAIL_PROVIDER=noop` in **Vercel Production**.
2. Redeploy Production.
3. Confirm invitation create still returns `inviteLink` so copy-link continues as the fallback path.
4. Confirm password reset and email verification endpoints still respond in their controlled way, understanding that they will stop sending emails while `noop` is active.
5. Do **not** delete or revert migrations as part of the simple rollback path.
6. Keep Production Postmark tokens out of logs, tickets, and git while investigating.

---

## Known risks

- Cleanup cron/job for `rate_limit_buckets` is still pending; cleanup remains operational/manual for now.
- Existing sessions may remain valid after password reset until normal session expiry.
- Public signup remains disabled by default; broader self-serve exposure is still intentionally blocked.
- Future policy for users who are created but not verified still needs a clearer long-term decision.
- CAPTCHA / Turnstile is not implemented yet.
- Initial Production Postmark rollout requires close monitoring for deliverability, rejections, suppressions, and account-level restrictions.

---

## Go / no-go decision

Use this rule for release sign-off:

- **Go** only if every mandatory checklist item above is complete, Production-safe smoke tests pass, and a monitoring owner is assigned for the first send window.
- **No-Go** if any env, Postmark, migration, or smoke-test gate is incomplete or if the team is not prepared to rollback immediately.

**Recorded decision for DAT_3.5 at document creation:** **No-Go / not enabled yet**. Real Postmark delivery in Production remains **disabled** until a future explicit cutover.

### Sign-off

- Decision: `GO` / `NO-GO`
- Decision owner: `__________`
- Date: `__________`
- Notes: `__________`
