# Email verification flow

**Status:** Foundation (DAT_3.5 `email-verification-flow`).  
**Related:** [password-reset-flow.md](./password-reset-flow.md), [email-provider-evaluation.md](./email-provider-evaluation.md), [invite-only-foundation-plan.md](./invite-only-foundation-plan.md).

---

## Scope (this batch)

| In scope                                             | Out of scope                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `EmailVerificationToken` model + migration           | Distributed rate limiting (documented below)                       |
| Request / confirm APIs + `sendEmail()`               | Re-enabling public signup                                          |
| Token hash, expiry, atomic consume                   | New email providers                                                |
| UI `/auth/verify-email`, `/auth/resend-verification` | Mandatory Postmark                                                 |
| Invite accept marks email verified                   | Login gate for unverified users (future)                           |
| Unit + route integration tests                       | Public signup wiring when `PUBLIC_SIGNUP_ENABLED=true` (follow-up) |

---

## User fields

`User` already has:

- `emailVerified` (`DateTime?`) — NextAuth-aligned timestamp when verified.
- `isEmailVerified` (`Boolean`) — used by Credentials login in `lib/auth.ts`.

On successful confirm (or invite accept), both are set. Legacy `User.emailVerificationToken` / `emailVerificationExpiresAt` are **not** used by this flow.

---

## Token storage

| Property  | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Raw token | 32 bytes, `base64url`, sent only in email link                |
| Persisted | SHA-256 hex in `EmailVerificationToken.tokenHash` (unique)    |
| Lifetime  | 24 hours (`DEFAULT_EMAIL_VERIFICATION_EXPIRY_HOURS`)          |
| Reuse     | `usedAt` set on consume; invalid/expired/used tokens rejected |

Atomic consume matches password reset: `updateMany` with `tokenHash`, `usedAt: null`, `expiresAt > now()`. On success: mark user verified, invalidate other active tokens for the same user.

---

## Anti-enumeration

`POST /api/auth/email-verification/request` always returns the same public message whether the email is unknown, already verified, or a verification email was sent. Email send failures are swallowed; response unchanged.

No `verificationLink`, raw token, `tokenHash`, or `userId` in API responses.

---

## Email delivery

Uses `sendEmail()` and `buildEmailVerificationEmail()` (tags `["email-verification"]`). Provider is `noop` or Postmark per `EMAIL_PROVIDER` — Postmark is not required.

---

## Invite accept as proof of email control

When a user accepts an invitation via the link sent to their email, `acceptInvitation` sets `isEmailVerified: true` and `emailVerified: now()` without a separate verification email. Rationale: accepting the invite demonstrates control of that inbox.

---

## Endpoints

### `POST /api/auth/email-verification/request`

Body: `{ "email": "..." }`  
Response: `{ "success": true, "message": "..." }` (generic)

### `POST /api/auth/email-verification/confirm`

Body: `{ "token": "..." }`  
Success: `{ "success": true, "message": "..." }`  
Errors: `{ "error": "...", "code": "invalid_token" | "token_expired" | "token_already_used" }`

---

## UI

| Route                          | Behavior                                                          |
| ------------------------------ | ----------------------------------------------------------------- |
| `/auth/verify-email?token=...` | Calls confirm API once; shows success/error (token not displayed) |
| `/auth/resend-verification`    | Form → request API; generic success message                       |

---

## Security notes

- Do not log token, `verificationLink`, email HTML/text, or raw provider errors.
- Request handler catches unexpected errors and still returns generic success.
- Confirm handler returns controlled errors only.

---

## Pending / follow-up

1. **Distributed rate limit** on request (same class as password reset).
2. **Public signup** — when `PUBLIC_SIGNUP_ENABLED=true`, create user with `isEmailVerified: false` and send verification email (today signup still sets verified placeholder).
3. **Login / action policy** — optionally block sensitive actions until verified (Credentials already checks `isEmailVerified` in NextAuth).
4. **Production Postmark** — real delivery validation (ops); foundation works with noop.

---

## Key files

```
prisma/schema.prisma                          # EmailVerificationToken
prisma/migrations/20260524120000_add_email_verification_tokens/
lib/auth/email-verification-token-service.ts
lib/email-verification/email-verification-service.ts
lib/email-verification/email-verification-validation.ts
lib/email-verification/request-base-url.ts
lib/email/templates/email-verification-email.ts
app/api/auth/email-verification/request/route.ts
app/api/auth/email-verification/confirm/route.ts
app/auth/verify-email/page.tsx
app/auth/resend-verification/page.tsx
lib/invitations/invitation-accept-service.ts  # emailVerified on accept
```
