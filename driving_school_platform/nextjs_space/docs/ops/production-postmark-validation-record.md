# Production Postmark validation record

**Status:** DAT_3.5 `production-postmark-validation-record` (documentation only).  
**Audience:** engineering + ops.  
**Validation date:** `2026-05-26`.  
**Environment:** **Production**.  
**Related:** [production-postmark-enablement-plan.md](./production-postmark-enablement-plan.md), [auth-email-production-readiness-checklist.md](./auth-email-production-readiness-checklist.md), [email-provider-postmark-runbook.md](./email-provider-postmark-runbook.md), [auth-email-security-review.md](../engineering/auth-email-security-review.md).

This document records the **real Production validation** of the Postmark cutover. It is a factual operations record only. It does **not** change runtime code, migrations, dependencies, secrets, or environment variables by itself.

---

## Validation summary

- Production Postmark cutover was executed.
- Production was redeployed after the env change.
- Production Postmark is **enabled and validated** for controlled sends to `admin@meengine.io`.
- `inviteLink` fallback remained present after invitation create.
- Password reset remained operational, and login with the new password succeeded.
- Postmark Activity showed **Processed** / **Delivered** for both `invitation` and `password-reset`.
- External Gmail delivery is still constrained while the Postmark account remains under review.
- Public signup remains disabled.

---

## Production env configuration confirmed

Configured in Vercel **Production** without exposing secret values:

- `EMAIL_PROVIDER=postmark`
- `POSTMARK_SERVER_TOKEN=<configured in Production>`
- `POSTMARK_FROM_EMAIL=admin@meengine.io`
- `POSTMARK_MESSAGE_STREAM=outbound`

Confirmed absent in Production:

- `POSTMARK_API_BASE_URL`

Also confirmed present in Production:

- `DATABASE_URL`
- `DIRECT_URL`

---

## Pre-conditions confirmed

- DKIM verified.
- Return-Path verified.
- `admin@meengine.io` sender validated.
- `DATABASE_URL` present and non-empty in Production.
- `DIRECT_URL` present and non-empty in Production.
- `POSTMARK_API_BASE_URL` absent in Production.

---

## Smoke tests executed

Controlled Production validation performed:

1. Normal login with a controlled user: **OK**.
2. Invitation create targeting `admin@meengine.io`: **OK**.
3. Invitation email received at `admin@meengine.io`: **OK**.
4. `inviteLink` still present after create: **OK**.
5. Password reset targeting `admin@meengine.io`: **OK**.
6. Login with the new password after reset: **OK**.

Observed edge cases during validation:

- Invitation to `rukahh@gmail.com` was **not delivered** because the Postmark account is still under review / externally limited.
- `skorpiu.gaming@gmail.com` already exists as a global `PLATFORM_ADMIN` with `organizationId=null`, so tenant invitation remained correctly blocked as an existing account.

---

## Result

Validated outcome for the Production cutover:

- Invitation email delivered to `admin@meengine.io`.
- Password reset email delivered to `admin@meengine.io`.
- Login after password reset succeeded.
- `inviteLink` fallback remained present.
- Production Postmark is considered **enabled and operationally validated** for controlled internal mailbox tests.

---

## Postmark Activity evidence

Observed in Postmark Activity during the validation window:

- `invitation`: **Processed** / **Delivered**
- `password-reset`: **Processed** / **Delivered**

Operators should continue reviewing Activity for the next controlled sends while account review is still in progress.

---

## Current limitations

- The Postmark account is still under review, so external recipient delivery may remain constrained.
- Delivery to `rukahh@gmail.com` was not observed during this validation window.
- Gmail and other external recipients may remain limited until Postmark account approval/review is fully cleared.
- Activity should continue to be monitored for the next Production sends.

---

## Rollback

If rollback is needed:

1. Set `EMAIL_PROVIDER=noop` in Vercel **Production**, or remove `EMAIL_PROVIDER`.
2. Redeploy Production.

Expected rollback behavior:

- Invitation create keeps returning `inviteLink`.
- Password reset and other auth/email endpoints keep returning controlled responses.
- Real outbound email stops while `noop` is active.
- No migration rollback is required for the simple email-provider rollback path.

---

## Follow-ups

- DMARC report routing: move aggregate DMARC reports off `admin@meengine.io` and into `dmarc@meengine.io` (documented; pending execution). See [dmarc-email-routing-runbook.md](./dmarc-email-routing-runbook.md).
- Await and confirm full Postmark account approval / review clearance.
- Evaluate UX for the existing global `PLATFORM_ADMIN` case when that user is invited into a tenant.
- Consider additional password policy polish in a future auth batch.

---

## Decision note

Production Postmark is **enabled and validated** for controlled sends to `admin@meengine.io`.

This record does **not** imply that:

- public signup is enabled;
- external Gmail delivery is fully unrestricted yet;
- runtime code or secrets were changed by this documentation batch.
