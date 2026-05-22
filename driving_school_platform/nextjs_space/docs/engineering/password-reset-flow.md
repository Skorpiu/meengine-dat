# Password reset flow

**Status:** Foundation + **hardening review** (DAT_3.5 `password-reset-flow-hardening-review`).  
**Related:** [email-provider-evaluation.md](./email-provider-evaluation.md), [environment-variables.md](../ops/environment-variables.md), [signup-hardening-plan.md](./signup-hardening-plan.md).

---

## Scope

| In scope                                        | Out of scope (this batch)                       |
| ----------------------------------------------- | ----------------------------------------------- |
| `POST /api/auth/password-reset/request`         | Distributed rate limiting (TODO)                |
| `POST /api/auth/password-reset/confirm`         | OAuth password reset                            |
| `PasswordResetToken` Prisma model + migration   | Removing legacy `User.passwordReset*` columns   |
| `/auth/forgot-password`, `/auth/reset-password` | Email verification flow                         |
| `buildPasswordResetEmail()` + `sendEmail()`     | Session invalidation after reset                |
| Login link “Forgot password?”                   | CAPTCHA / abuse automation                      |
| Atomic token consume on confirm                 | Advanced multi-tenant domain resolver for links |

---

## Security properties

### Anti-enumeration (request)

- **Same HTTP 200 + message** whether the email exists, has no password, or mail send fails:
  - `"If an account exists, reset instructions have been sent."`
- Response never includes `resetLink`, raw `token`, `tokenHash`, `html`, or `text`.
- Only users with a stored **`passwordHash`** (credentials accounts) receive a token/email.
- Unexpected errors in the request route still return the generic success body (no leak).

### Token storage

- Raw token: 32-byte `base64url` (URL-safe), sent **only** in email link and confirm POST body.
- Database: **`tokenHash`** = SHA-256 hex (same pattern as invitations).
- **Expiry:** 1 hour default (`DEFAULT_PASSWORD_RESET_EXPIRY_HOURS`).
- **`usedAt`:** set on successful confirm; token cannot be reused.
- Previous active tokens for the same user are invalidated on new request and on confirm.

### Atomic token consumption (confirm)

Confirm runs in a **single Prisma transaction**:

1. **`updateMany`** with `where: { tokenHash, usedAt: null, expiresAt: { gt: now } }` and `data: { usedAt: now }`.
2. If `count === 0`, re-read the row and return `invalid_token`, `token_already_used`, or `token_expired` (handles parallel double-submit / race).
3. Only after a successful consume: `bcrypt` hash + `user.passwordHash` update + invalidate other pending tokens for that user.

This prevents two parallel confirm requests from both updating the password when only one consume succeeds.

### Confirm endpoint (public errors)

- **POST only** — no GET consumption of token.
- Errors are explicit for the holder of the link (`invalid_token`, `token_expired`, `token_already_used`, `weak_password`) — acceptable because possession of the token is required.
- Never returns `tokenHash`, `userId`, internal email, or stack traces.
- Password rules: `commonSchemas.password` (aligned with signup / invite accept).

### Logging

- Do not log raw tokens, `resetLink`, passwords, email `html`/`text`, or provider error bodies.
- Request route catch-all still returns generic success (no leak on unexpected errors).
- Confirm route catch-all returns generic `"Internal server error"` (500) without exception details.

### Reset link host (`baseUrl`)

- Built via `getPasswordResetRequestBaseUrl(request)` → `new URL(request.url).origin` (same pattern as admin invitations).
- **Risk:** behind a misconfigured reverse proxy, `Host` / `X-Forwarded-*` can yield a wrong origin in the email link. No custom domain resolver in this batch; ops should ensure the app sees the public tenant origin on password-reset POSTs.

---

## Existing sessions after reset

NextAuth **Credentials** sessions are not centrally revoked when `passwordHash` changes. A session that was already issued may remain valid until it expires or the user signs out, depending on JWT/session strategy and deployment settings.

**TODO (future):** optional session invalidation / “sign out all devices” after password change when session store supports it.

---

## Legacy columns (cleanup later)

`User.passwordResetToken` and `User.passwordResetExpiresAt` remain in the schema from an earlier design. **This flow does not use them** — only `PasswordResetToken` rows.

**TODO (future migration):** drop unused columns after confirming no external dependency.

---

## Email delivery

- Uses existing **`sendEmail()`** boundary (`noop` default, `postmark` when configured).
- Template: `lib/email/templates/password-reset-email.ts`, tags `["password-reset"]`.
- **Postmark not required** — noop succeeds without inbox delivery.
- Send failures on request are **swallowed**; client still gets generic success.

---

## API contracts

### `POST /api/auth/password-reset/request`

```json
{ "email": "user@example.com" }
```

**200:**

```json
{
  "success": true,
  "message": "If an account exists, reset instructions have been sent."
}
```

### `POST /api/auth/password-reset/confirm`

```json
{
  "token": "<from email link query>",
  "newPassword": "SecurePass1!"
}
```

**200:** `{ "success": true, "message": "..." }`  
**400:** `{ "error": "...", "code": "invalid_token" | "token_expired" | "token_already_used" | "weak_password" }`

---

## UI

| Route                            | Purpose                               |
| -------------------------------- | ------------------------------------- |
| `/auth/forgot-password`          | Email → request API → generic message |
| `/auth/reset-password?token=...` | New password + confirm → confirm API  |
| `/auth/login`                    | Link “Forgot password?”               |

---

## Code map

```
prisma/schema.prisma              # PasswordResetToken model
lib/auth/password-reset-token-service.ts
lib/password-reset/password-reset-service.ts
lib/password-reset/password-reset-validation.ts
lib/password-reset/request-base-url.ts
lib/email/templates/password-reset-email.ts
app/api/auth/password-reset/request/route.ts
app/api/auth/password-reset/confirm/route.ts
app/auth/forgot-password/page.tsx
app/auth/reset-password/page.tsx
```

---

## Pending / TODO

- [ ] **Distributed rate limit** on request + confirm (per IP and per email hash) — see [signup-hardening-plan.md](./signup-hardening-plan.md).
- [ ] Optional: invalidate other sessions after password change.
- [ ] Drop legacy `User.passwordResetToken` / `passwordResetExpiresAt` columns.
- [ ] Production Postmark for reset mail when ops enables `EMAIL_PROVIDER=postmark` on Production (Preview validation already documented).

---

## Related batches

| Batch                                      | Status              |
| ------------------------------------------ | ------------------- |
| `email-provider-boundary`                  | Done                |
| `invitation-email-template`                | Done                |
| `invitation-email-send-on-create`          | Done                |
| `email-provider-postmark`                  | Done                |
| `password-reset-flow-foundation`           | Done                |
| **`password-reset-flow-hardening-review`** | **Done (this doc)** |
| `email-verification-flow`                  | Pending             |
