# Production Postmark enablement plan

**Status:** DAT_3.5 `production-postmark-enable-preview-to-prod-plan` (documentation only).  
**Audience:** engineering + ops.  
**Current decision:** **Executed and validated**. Production Postmark is enabled for controlled Production sends; see [production-postmark-validation-record.md](./production-postmark-validation-record.md).  
**Related:** [production-postmark-validation-record.md](./production-postmark-validation-record.md), [auth-email-production-readiness-checklist.md](./auth-email-production-readiness-checklist.md), [email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md), [auth-email-security-review.md](../engineering/auth-email-security-review.md), [release-checklist.md](./release-checklist.md).

This document defines the **controlled cutover plan** that was used for enabling **real Postmark delivery in Production**. The actual execution record now lives in [production-postmark-validation-record.md](./production-postmark-validation-record.md). This document itself still does **not** change runtime behavior, does **not** modify secrets or environment variables, and does **not** reopen public signup.

---

## Objective

- Define the operational steps used to enable **real Postmark delivery** in Production in a controlled way.
- Preserve a reusable rollback-ready reference for future audits, reviews, and follow-up validation.
- Preserve invite-only onboarding, copy-link fallback, controlled password reset behavior, email verification behavior, and existing rate-limit posture during and after enablement.

---

## Explicit non-goals

This plan does **not**:

- enable `EMAIL_PROVIDER=postmark` in Production;
- modify runtime code;
- create or apply migrations;
- add dependencies;
- change Vercel configuration structure;
- rotate or reveal real secrets;
- reopen public signup;
- unblock demo signup;
- change the Postmark provider implementation.

---

## Current state

- Invite-only flow is functional.
- Invitation email flow is functional.
- Postmark provider is implemented.
- Real Postmark delivery has been validated in Preview.
- Password reset foundation + hardening are implemented.
- Password reset real end-to-end has been validated in Preview.
- Email verification flow is implemented.
- Email verification real end-to-end has been validated in Preview.
- Auth rate-limit foundation is implemented.
- Rate limiting has been operationally validated.
- Rate-limit cleanup cron is implemented.
- Production readiness checklist already exists.
- Postmark runbook already exists.
- Auth/email security review already exists.
- Preview should return to `noop` by default after controlled email tests.
- Production Postmark has been enabled and validated for controlled sends to `admin@meengine.io`.
- External Gmail delivery may still be constrained while the Postmark account remains under review.
- Public signup remains disabled by default.
- Demo signup remains blocked.

---

## Mandatory pre-conditions

All items below must be true before any Production cutover window is approved:

- Postmark account is approved or otherwise free of blocking restrictions for transactional sending.
- Real Postmark **Server API Token** exists and is stored **only** in Vercel Production secrets.
- DKIM is verified.
- Return-Path is verified.
- Sender signature or sending domain is validated for the chosen sender address.
- `admin@meengine.io` is operational if used as the sender or operational mailbox.
- Production `DATABASE_URL` is present and non-empty.
- Production `DIRECT_URL` is present and non-empty.
- Required migrations are already applied for:
  - `password_reset_tokens`
  - `email_verification_tokens`
  - `rate_limit_buckets`
- `pnpm exec prisma migrate status` reports `Database schema is up to date`.
- Preview has been returned to **unset** or **`noop`** for `EMAIL_PROVIDER` after validation windows.
- Controlled operator-owned test inboxes are available.
- A cutover owner, rollback owner, and monitoring window are assigned.

---

## Production env target state

When the cutover is eventually approved, Production should end in this env state:

- `EMAIL_PROVIDER=postmark`
- `POSTMARK_SERVER_TOKEN=<real token>`
- `POSTMARK_FROM_EMAIL=admin@meengine.io` or `POSTMARK_FROM_EMAIL=no-reply@meengine.io`
- `POSTMARK_MESSAGE_STREAM=outbound`
- `POSTMARK_API_BASE_URL` **must not** be defined in Production

Unchanged by this plan:

- Public signup remains disabled by default.
- Demo signup remains blocked.
- No Vercel project structure changes are required.

---

## Step-by-step enablement plan

Use this only during an explicitly approved Production cutover window.

### 1. Confirm current Production posture

- Confirm Production currently does **not** rely on real Postmark sends.
- Confirm current Production env values without exposing secrets in chat, tickets, screenshots, or git.
- Confirm `DATABASE_URL` and `DIRECT_URL` are non-empty in Production.
- Confirm `PUBLIC_SIGNUP_ENABLED` remains unset or `false`.
- Confirm the target test mailboxes are controlled by the operators.

### 2. Confirm database and migration posture

- Run `pnpm exec prisma migrate status` from `driving_school_platform/nextjs_space` against the Production database.
- Confirm the result includes `Database schema is up to date`.
- Confirm the auth/email tables for `password_reset_tokens`, `email_verification_tokens`, and `rate_limit_buckets` exist on the target database.
- Do **not** create new migrations as part of this cutover.

### 3. Confirm Postmark readiness

- Confirm the Production Postmark account has no remaining approval or sandbox restriction blocking real transactional sends.
- Confirm DKIM is verified.
- Confirm Return-Path is verified.
- Confirm the chosen sender/domain matches the Production `POSTMARK_FROM_EMAIL`.
- Confirm `admin@meengine.io` is operational if selected for sender or operator monitoring.
- Confirm the correct Production **Server API Token** is available and will be stored only in Vercel Production.

### 4. Apply Production env changes

- Add or confirm `EMAIL_PROVIDER=postmark` in Vercel **Production**.
- Add or confirm `POSTMARK_SERVER_TOKEN=<real token>` in Vercel **Production**.
- Add or confirm `POSTMARK_FROM_EMAIL=admin@meengine.io` or `no-reply@meengine.io` in Vercel **Production**.
- Add or confirm `POSTMARK_MESSAGE_STREAM=outbound` in Vercel **Production**.
- Confirm `POSTMARK_API_BASE_URL` is **not** set in Vercel Production.
- Do **not** change Preview defaults during this Production step.
- Do **not** change public signup settings.

### 5. Controlled Production redeploy

- Trigger a controlled Production redeploy so runtime picks up the env change.
- Keep the cutover window small and monitored.
- Avoid bundling unrelated runtime changes, dependency changes, or migrations with this redeploy.

### 6. Execute Production-safe smoke tests

- Run only low-volume checks with operator-controlled accounts and inboxes.
- Keep copy-link fallback available throughout the test window.
- Stop and rollback if real-user mail could be affected or if rejection/misconfiguration appears.

### 7. Record go / no-go outcome

- Record smoke-test results.
- Record whether Production remains on Postmark or is rolled back to `noop`.
- Record any Postmark Activity observations, delivery issues, or restrictions encountered.

---

## Production-safe smoke tests

Run only after the controlled redeploy:

1. Normal login with a controlled user succeeds.
2. Create one invitation for a controlled mailbox.
3. Confirm `inviteLink` is still present in the response or UI flow.
4. Confirm the real invitation email is received by the controlled mailbox.
5. Accept the invitation if the mailbox belongs to a test user and the scenario is appropriate.
6. Run password reset for a controlled user.
7. Confirm login works with the new password.
8. Run resend verification / verify-email for a controlled unverified user, if applicable.
9. Perform a minimal rate-limit sanity check without abusive traffic.
10. Verify corresponding events in Postmark Activity.

Rules for Production-safe execution:

- Use only controlled inboxes and operator-owned accounts.
- Do **not** use broad or repeated rate-limit abuse tests in Production.
- Do **not** target real customer mailboxes.
- Do **not** share raw invite, reset, or verification links outside the controlled operator workflow.

---

## Go / no-go criteria

### Go

Proceed only if all of the following are true:

- Every mandatory pre-condition is complete.
- Production env matches the target state.
- `POSTMARK_API_BASE_URL` is absent in Production.
- Controlled smoke tests pass.
- Postmark Activity shows expected accepted messages for the controlled tests.
- No real-user impact is observed or expected.
- Rollback owner is available immediately if needed.

### No-go

Do **not** proceed, or rollback immediately, if any of the following are true:

- Postmark account approval or restrictions are still unclear.
- DKIM, Return-Path, sender validation, or sender choice is incorrect.
- Required auth/email migrations are not applied.
- `prisma migrate status` is not up to date.
- `DATABASE_URL` or `DIRECT_URL` is missing or empty.
- Production-safe smoke tests fail.
- Messages are rejected, blocked, or misrouted.
- Tests would send mail to non-controlled real users.

**Recorded decision after cutover:** **Go / executed and validated** for controlled Production sends. See [production-postmark-validation-record.md](./production-postmark-validation-record.md) for the factual validation record and current external-recipient limitation notes.

---

## Rollback plan

If the first Production sends are not acceptable:

1. Change `EMAIL_PROVIDER` to `noop` in Vercel Production, or remove `EMAIL_PROVIDER`.
2. Redeploy Production.
3. Confirm invitation create still returns `inviteLink`, so copy-link remains the fallback path.
4. Confirm password reset and email verification endpoints still return their controlled responses, understanding that real emails will stop sending while `noop` is active.
5. Do **not** revert migrations as part of the simple rollback path.
6. Monitor application logs and Postmark Activity after the rollback.

Rollback expectations:

- Invite create continues to work with copy-link fallback.
- Password reset and email verification endpoints continue to respond safely, but do not deliver real email while `noop` is active.
- Existing schema remains in place.

---

## Known risks and mitigations

### Postmark account restrictions

Risk:

- New or recently approved Postmark accounts may still have sending limits or review restrictions.

Mitigation:

- Confirm approval status and initial limits before the cutover window.
- Start with low-volume controlled sends only.

### Wrong sender / from address

Risk:

- A wrong `POSTMARK_FROM_EMAIL`, sender signature, or domain can cause rejection.

Mitigation:

- Verify sender/domain before cutover.
- Keep sender choice restricted to validated addresses such as `admin@meengine.io` or `no-reply@meengine.io`.

### Real Production mail reaching real users

Risk:

- Poorly chosen smoke tests can send real email to actual users.

Mitigation:

- Use only operator-controlled inboxes and test users.
- Confirm recipients before every send.

### Existing sessions after password reset

Risk:

- Existing sessions may remain valid until normal expiry even after a password reset.

Mitigation:

- Treat this as a known current auth policy.
- Keep rollout low-risk and operator-controlled.

### Basic rate-limit observability

Risk:

- Cleanup cron exists, but dashboards and alerting remain basic.

Mitigation:

- Use minimal sanity checks only.
- Monitor logs and `rate_limit_buckets` behavior conservatively.

### Missing CAPTCHA / Turnstile

Risk:

- CAPTCHA / Turnstile is not implemented yet for broader abuse resistance.

Mitigation:

- Keep public signup disabled.
- Keep Production testing controlled and low volume.

### Public signup pressure

Risk:

- Email enablement could be confused with opening self-serve signup.

Mitigation:

- Keep public signup explicitly disabled.
- Keep demo signup blocked.
- Treat signup enablement as a separate future decision and batch.

---

## Post-activation tasks

If Production enablement succeeds and remains enabled:

- Record final go-live decision, owners, and timestamp.
- Record which sender address was used in Production.
- Record smoke-test results without exposing secrets or raw auth/email links.
- Monitor Postmark Activity for rejects, suppressions, bounce-like issues, and accepted sends during the first window.
- Review application logs for unexpected auth/email failures.
- Confirm Preview remains on **unset** or **`noop`** by default after any future test window.
- Keep public signup disabled unless separately approved in a future batch.
- Consider follow-up improvements for dashboards/alerts, session invalidation posture, and CAPTCHA/Turnstile.

---

## Decision statement

This document remains the **operational enablement plan** used for the Production cutover.

- It **documents** the Production cutover procedure.
- It does **not** change Production runtime behavior.
- It does **not** modify real secrets.
- The actual cutover execution evidence is recorded in [production-postmark-validation-record.md](./production-postmark-validation-record.md).
- Production Postmark is **enabled**, but not because this document itself performed the change.
