# Postmark email provider — operator runbook

Safe steps to enable **transactional invitation email** via Postmark on DAT (Driving Academy Tool) **before** placing real secrets in Vercel Production.

**Code path:** `POST /api/admin/invitations` → `attemptInvitationEmailDelivery()` → `buildInvitationEmail()` + `sendEmail()` → `lib/email/providers/postmark-provider.ts` (REST `POST /email`, no SDK).

Do **not** paste server tokens, full `inviteLink` URLs, or email bodies into tickets, chat, git, screenshots, or runbook edits. Use placeholders in examples.

**Related:** [auth-email-security-review.md](../engineering/auth-email-security-review.md), [environment-variables.md](./environment-variables.md#postmark-email), [email-provider-evaluation.md](../engineering/email-provider-evaluation.md), [invitation-copy-link-smoke.md](./invitation-copy-link-smoke.md), [release-checklist.md](./release-checklist.md).

---

## Objective

- Turn on **real outbound invitation email** in a controlled environment (Preview or Production) using Postmark.
- Keep **copy-link** as the mandatory fallback: every successful invite create still returns **`inviteLink`**; email failure must **not** block create (**HTTP 201**).
- Validate configuration and `emailDelivery` status **before** relying on inbox delivery for onboarding.

**Out of scope for step-by-step detail here:** password reset and email verification use the same `sendEmail()` / Postmark vars — see [auth-email-security-review.md](../engineering/auth-email-security-review.md) for cross-flow Preview test runbook. Resend/SMTP, webhooks/bounces, marketing mail remain out of scope.

---

## Variables (none required globally)

All email env vars are **optional** for local dev, CI, and `pnpm check`. They are **not** in `lib/env.ts` / `env-check`.

| Variable                  | Required when             | Purpose                                                                                                         |
| ------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`          | Using Postmark            | Set to `postmark`. Unset or `noop` → no real send (default).                                                    |
| `POSTMARK_SERVER_TOKEN`   | `EMAIL_PROVIDER=postmark` | Server API token (`X-Postmark-Server-Token`). **Secret.**                                                       |
| `POSTMARK_FROM_EMAIL`     | `EMAIL_PROVIDER=postmark` | Verified sender in Postmark (signature / domain).                                                               |
| `POSTMARK_MESSAGE_STREAM` | Optional                  | Default `outbound` if unset.                                                                                    |
| `POSTMARK_API_BASE_URL`   | Optional                  | Default `https://api.postmarkapp.com`. **Operators normally leave unset**; used in unit tests with a fake host. |

### `POSTMARK_API_TEST`

Postmark documents a **test server token** value `POSTMARK_API_TEST` that exercises the API **without delivering** to real inboxes. Use it in **Preview** or a staging project to confirm wiring before a production token.

You still need a plausible `POSTMARK_FROM_EMAIL` that Postmark accepts for the test token flow (use a verified sender in your Postmark account or their documented test patterns). If the API returns an error, check `emailDelivery.errorCode` in the create response — create must remain **201** with `inviteLink`.

---

## Recommended Vercel configuration

1. **Production (later, after validation)**

   - Project → **Settings** → **Environment Variables** → scope **Production** only when ready.
   - `EMAIL_PROVIDER` = `postmark`
   - `POSTMARK_SERVER_TOKEN` = production server token (from Postmark → Server → API tokens).
   - `POSTMARK_FROM_EMAIL` = verified sender (e.g. `Driving Academy <invites@yourdomain.com>`).
   - Optional: `POSTMARK_MESSAGE_STREAM` if not using default `outbound`.
   - **Do not set** `POSTMARK_API_BASE_URL` in Production unless you operate an explicit API proxy (unusual).

2. **Preview (recommended first)**

   - Same keys in **Preview** scope first.
   - Prefer `POSTMARK_API_TEST` + verified from address for initial API checks.
   - Redeploy Preview after changing env vars so serverless functions reload values.

3. **Local development**

   - Leave `EMAIL_PROVIDER` unset (noop) for day-to-day work, **or**
   - Use `.env.local` with `EMAIL_PROVIDER=postmark` and test token only when actively testing email (never commit `.env.local`).

4. **CI / `pnpm check`**
   - No Postmark vars required; tests mock `fetch` and use fake `POSTMARK_API_BASE_URL` where needed.

---

## Safe validation sequence

### a) Baseline — noop / local

1. Confirm app runs: `pnpm -C driving_school_platform/nextjs_space check`.
2. With **no** `EMAIL_PROVIDER` (or `EMAIL_PROVIDER=noop`), create an invitation as School Admin (`/admin/users` → Invitations, or `POST /api/admin/invitations`).
3. Expect **201**, `inviteLink` present, `emailDelivery` similar to:

   ```json
   { "attempted": true, "ok": true, "provider": "noop", "noop": true }
   ```

4. Copy and share `inviteLink` manually (copy-link smoke per [invitation-copy-link-smoke.md](./invitation-copy-link-smoke.md)).

### b) Preview — Postmark test token (optional)

1. In Vercel **Preview**, set `EMAIL_PROVIDER=postmark`, `POSTMARK_SERVER_TOKEN=POSTMARK_API_TEST`, and `POSTMARK_FROM_EMAIL` to a **verified** sender in your Postmark account.
2. Redeploy Preview.
3. Create one invitation to an address **you control** (or discard safely).
4. Inspect JSON response (browser devtools → Network, or API client):
   - `inviteLink` must still be present.
   - `emailDelivery.attempted` = `true`.
   - `ok` / `errorCode` / `provider` reflect Postmark outcome (misconfiguration → `PROVIDER_MISCONFIGURED`; auth → `PROVIDER_AUTH_FAILED`; rejection → `EMAIL_REJECTED`; etc.).
5. Do **not** log or screenshot the full `inviteLink` or response body in shared channels.

### c) Production token — only after domain/sender verified

1. In Postmark: verify domain (SPF/DKIM per [email-provider-evaluation.md](../engineering/email-provider-evaluation.md) deliverability checklist).
2. Create a **production** server token; store only in Vercel **Production** secrets.
3. Set `POSTMARK_FROM_EMAIL` to that verified sender.
4. Redeploy Production.

### d) Controlled invite create

1. Sign in as **SUPER_ADMIN** on the tenant host (not demo org if demo mutations are disabled).
2. Create invitation for a **single test mailbox** you own.
3. Confirm **201**, `inviteLink`, and `emailDelivery` (no `html` / `text` in API JSON).

### e) Confirm `emailDelivery`

| `emailDelivery` (indicative)                 | Meaning for operators                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ok: true`, `provider: "postmark"`, `id` set | Postmark accepted send (check inbox/spam).                                                |
| `ok: false`, `PROVIDER_MISCONFIGURED`        | Missing/invalid Postmark env — fix vars, redeploy; use copy-link.                         |
| `ok: false`, `PROVIDER_AUTH_FAILED`          | Token invalid — rotate token in Vercel, never commit.                                     |
| `ok: false`, `EMAIL_REJECTED`                | From/recipient/content rejected — fix sender or recipient in Postmark.                    |
| `ok: false`, `PROVIDER_RATE_LIMITED`         | Back off; copy-link still works.                                                          |
| `ok: false`, `EMAIL_DELIVERY_FAILED`         | Unexpected error in delivery layer — copy-link; investigate logs without pasting secrets. |

### f) Confirm copy-link fallback

- Admin UI still shows **Copy invite link** after create.
- If email never arrives, resend is **not** a product button yet — create a new invite or share the link from the **create response** (one-time alert in UI).
- **Delivered email ≠ accepted invite** — recipient must still complete `/invitations/accept`.

---

## Rollback

Fastest safe rollback (no code deploy required):

1. Set `EMAIL_PROVIDER` to `noop`, **or** remove `EMAIL_PROVIDER` from Vercel.
2. Optionally remove `POSTMARK_*` vars to avoid accidental reuse.
3. Redeploy.
4. New invitations behave as noop (`emailDelivery.noop: true`); existing pending invites unchanged.

Copy-link flow is unchanged in all cases.

---

## Operational cautions

- **Never** commit `POSTMARK_SERVER_TOKEN` or production `inviteLink` values to git.
- **Do not** enable `EMAIL_PROVIDER=postmark` in Production without a **verified** `POSTMARK_FROM_EMAIL` and domain DNS aligned with Postmark.
- **Do not** treat `emailDelivery.ok: true` as proof the user joined — only **accept** completes onboarding.
- **Do not** share invitation links in public channels; bearer token equivalent to a password.
- Application logs must not include full `inviteLink`, `html`, `text`, or Postmark tokens (boundary redaction; operators should avoid `console.log` of API responses).
- Demo orgs may block invitation create (`demo_mutation_disabled`) — test on a non-demo tenant.
- `POSTMARK_API_BASE_URL` is for **automated tests** and exceptional proxies — production should use the default Postmark API host.

---

## Troubleshooting (no secrets in tickets)

| Symptom                                 | Check                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Create 201 but `PROVIDER_MISCONFIGURED` | `POSTMARK_SERVER_TOKEN` and `POSTMARK_FROM_EMAIL` set for that Vercel environment; redeploy after change. |
| `PROVIDER_AUTH_FAILED`                  | Token typo, wrong server, or revoked token — regenerate in Postmark, update Vercel only.                  |
| `EMAIL_REJECTED`                        | From address not verified; recipient suppressed; content policy in Postmark activity.                     |
| No email, `ok: true`                    | Spam folder; Postmark activity stream; test token may not deliver to real inboxes.                        |
| 500 on create                           | Should not happen for email alone — file a bug; invitation create is designed to survive email failures.  |

---

## Related docs

- [environment-variables.md](./environment-variables.md#email-provider) — variable reference
- [email-provider-evaluation.md](../engineering/email-provider-evaluation.md) — architecture and batch status
- [api-response-contract-baseline.md](../engineering/api-response-contract-baseline.md) — `emailDelivery` on create
- [invitation-copy-link-smoke.md](./invitation-copy-link-smoke.md) — manual copy-link validation
