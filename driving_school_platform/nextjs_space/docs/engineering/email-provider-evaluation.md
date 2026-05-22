# Email Provider Evaluation

**Status:** Evaluation only — **no email sending implemented** in DAT at this time.  
**Branch context:** `email-provider-evaluation`.  
**Related:** [invite-only-foundation-plan.md](./invite-only-foundation-plan.md), [signup-hardening-plan.md](./signup-hardening-plan.md), [dat-production-readiness-gaps.md](../ops/dat-production-readiness-gaps.md), [release-checklist.md](../ops/release-checklist.md).

---

## Scope

This document evaluates **transactional email provider strategy** for DAT (Driving Academy Tool) before any production integration. It covers:

- **Invite-only** invitation delivery (future automation alongside copy-link).
- **Password reset** (not implemented today).
- **Email verification** (not implemented today; `isEmailVerified` is a placeholder).
- **Future** operational or billing-adjacent notifications (out of scope for first integration).

It does **not** implement sending, add required env vars, or change application behavior. The goal is a decision-ready technical baseline for the next implementation batches.

---

## Current state

| Area                           | State                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invite-only onboarding**     | **Operational in copy-link mode** — School Admin creates invitation on `/admin/users`, copies `inviteLink` once, shares privately. Accept at `/invitations/accept`.       |
| **Automatic invitation email** | **Not implemented** — no provider, no templates, no send on create. Users who expect an inbox message will not receive one; **this is expected** until batch integration. |
| **Admin invitation API/UI**    | Implemented — `POST /api/admin/invitations` returns `inviteLink` on create; list never exposes token/hash.                                                                |
| **Accept flow**                | Implemented — public GET/POST `/api/invitations/accept`; defense in depth for existing users.                                                                             |
| **Password reset**             | **Does not exist** — no forgot-password flow, tokens, or reset emails.                                                                                                    |
| **Email verification**         | **Does not exist** — accounts created with `isEmailVerified: true` as a placeholder (signup and invite accept). No verification tokens or login gate.                     |
| **Public signup**              | **Disabled by default** — `PUBLIC_SIGNUP_ENABLED` must be explicitly `true` for non-demo orgs.                                                                            |
| **Marketing / newsletters**    | Out of scope — not planned in this evaluation.                                                                                                                            |

---

## Email use cases

### Priority 1 (first integrations)

| Use case               | Trigger                               | Content                                        | Notes                                                                                                          |
| ---------------------- | ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Invitation email**   | Admin creates `UserInvitation`        | Org name, role, expiry, single-use accept link | Must not break copy-link if send fails; link is bearer token.                                                  |
| **Password reset**     | User requests reset (future)          | Time-limited reset link, no password in email  | High deliverability expectation; generic responses to avoid enumeration.                                       |
| **Email verification** | Signup or post-invite policy (future) | Verification link or code                      | Depends on product decision on login gate; aligns with [signup-hardening-plan.md](./signup-hardening-plan.md). |

### Priority 2 (later)

| Use case                            | Notes                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Billing / license notifications** | Payment receipts, trial ending — depends on real PSP integration; separate from invite batch.                                       |
| **Operational alerts**              | Cron failures, demo sandbox reset errors, admin audit — optional; may use same provider or separate ops channel (PagerDuty, Slack). |

### Explicitly out of scope here

- Marketing campaigns, drip sequences, newsletters.
- In-app notification center (full product surface).
- SMS / push.

---

## Requirements

### Functional

- **Transactional only** — one recipient, one purpose per message; no bulk marketing APIs required initially.
- **Simple templates** — HTML + plain text; school/org branding minimal at first (logo/name in body).
- **Clear HTTP/API** — server-side send from Next.js route handlers or services; no browser-side API keys.
- **Custom domain** — ability to send from e.g. `noreply@meengine.io` or `invites@meengine.io` after DNS verification.
- **Dev/staging safety** — noop or sink mode so local/preview never emails real users by accident.

### Reliability and product

- **Good deliverability** — especially for auth-adjacent mail (invite, reset, verify).
- **Copy-link must keep working** — invitation create succeeds even if email send fails; admin still gets `inviteLink` in UI; optional retry/resend later.
- **Failure handling** — log send result without token/password in logs; HTTP responses must not echo invite/reset tokens on provider errors.

### Security and compliance

- **No tokens in production logs** — invite links, reset tokens, verification tokens are secrets.
- **No secrets in git** — API keys only via env (documented later, not added in this batch).
- **Rate limits (future)** — per-IP and per-email on reset/verify/resend endpoints.
- **DKIM / SPF / DMARC** — operator checklist before production send (see [Deliverability checklist](#deliverability-domain-checklist-future-ops)).

### Operational

- **Vendor lock-in** — prefer thin boundary so provider can change without rewriting business logic.
- **EU/GDPR awareness** — data processing agreement, subprocessors, retention — verify with legal/ops before production (not legal advice in this doc).

---

## Candidate providers

Qualitative comparison only. **Verify pricing, quotas, and EU data residency on the vendor site before any decision** — numbers change and are not verified here.

### Resend

| Dimension       | Assessment                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Pros**        | Strong developer experience; simple REST API; good Next.js/Vercel story; React Email-friendly; fast to prototype invitation template. |
| **Cons**        | Younger than Postmark for pure deliverability reputation; fewer enterprise features; marketing features may distract scope.           |
| **Complexity**  | **Low** — single API key, domain verify, send endpoint.                                                                               |
| **Cost / risk** | Typically competitive for low volume; **verify before decision**. Risk: quota spikes on abuse if rate limits lag.                     |
| **DAT fit**     | **Good** for first invitation send + small transactional volume on B2B tenants.                                                       |
| **Lock-in**     | **Low–medium** — standard send payload; templates in-repo, not vendor UI-only.                                                        |

### Postmark

| Dimension       | Assessment                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pros**        | Excellent reputation for **transactional** mail; strong bounce/spam tooling; clear separation from marketing; widely used for password reset. |
| **Cons**        | Slightly more setup than minimal APIs; template hosting less “React-native” than Resend (still fine with in-repo HTML).                       |
| **Complexity**  | **Low–medium** — server token, message streams, domain signatures.                                                                            |
| **Cost / risk** | Pay-per-email; **verify before decision**. Risk: cost at scale if notification volume grows.                                                  |
| **DAT fit**     | **Very good** for password reset and verification where inbox placement matters.                                                              |
| **Lock-in**     | **Low** — thin API wrapper possible.                                                                                                          |

### Brevo (formerly Sendinblue)

| Dimension       | Assessment                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pros**        | EU-friendly vendor narrative; combined CRM/marketing if product ever wants it; SMTP + API.                                                         |
| **Cons**        | Broader platform than DAT needs; easier to accidentally use marketing features; transactional reputation mixed vs dedicated transactional vendors. |
| **Complexity**  | **Medium** — more product surface, more config paths.                                                                                              |
| **Cost / risk** | Free tier may exist; **verify before decision**. Risk: scope creep into campaigns.                                                                 |
| **DAT fit**     | **Moderate** — acceptable if EU entity and single vendor preferred, but not the leanest for auth-only mail.                                        |
| **Lock-in**     | **Medium** — more vendor-specific concepts (contacts, lists).                                                                                      |

### SMTP generic (provider-neutral)

| Dimension       | Assessment                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pros**        | **Maximum portability** — nodemailer (or similar) + any relay (Amazon SES, Google Workspace SMTP, Mailgun SMTP, etc.); ops can swap relay without app rewrite if boundary is clean. |
| **Cons**        | Operators must manage SMTP credentials, throttling, bounces, and DNS separately; more moving parts on Vercel/serverless (connection pooling, timeouts).                             |
| **Complexity**  | **Medium–high** for production-grade auth email (DKIM, bounce webhooks, suppression lists).                                                                                         |
| **Cost / risk** | SES often cheapest at scale; **verify before decision**. Risk: misconfigured SPF/DKIM hurts all mail.                                                                               |
| **DAT fit**     | **Good** if long-term standard is AWS SES or existing corporate SMTP; heavier upfront for a small team.                                                                             |
| **Lock-in**     | **Lowest** at application layer if `EmailProvider` interface is stable.                                                                                                             |

### Comparison summary

| Provider     | DX      | Deliverability focus | DAT first invite | DAT auth mail (reset/verify) | Lock-in |
| ------------ | ------- | -------------------- | ---------------- | ---------------------------- | ------- |
| Resend       | High    | Good                 | Strong           | Good                         | Low–med |
| Postmark     | Medium  | Very strong          | Strong           | Strongest                    | Low     |
| Brevo        | Medium  | Mixed                | OK               | OK                           | Medium  |
| SMTP + relay | Low–med | Depends on relay     | OK               | OK with SES/Postmark relay   | Lowest  |

---

## Recommendation

### Phased approach (required)

1. **`email-provider-boundary`** — Introduce `lib/email/*` with `sendEmail({ to, subject, html, text })` and provider selection via env (default **noop**).
2. **`noop` / dev logger** — Log “would send” with redacted bodies in dev; optional test inbox only in staging with explicit flag.
3. **Production provider** — Choose vendor after domain DNS trial send to Gmail/Outlook test accounts.
4. **Invitation email first** — Send on create when `EMAIL_SEND_INVITATIONS=true` (or similar); **always** retain copy-link in admin UI.
5. **Password reset foundation** — Token table or signed URL strategy + reset email (no flow in this batch).
6. **Email verification** — Align with [signup-hardening-plan.md](./signup-hardening-plan.md); gate login only when product approves.

### Preferred provider (provisional)

**Primary suggestion for DAT v1:** **Postmark** or **Resend**, with a slight edge to **Postmark** if password reset and verification ship in the same year as invitations (deliverability for auth mail).

**Alternative:** **SMTP + Amazon SES** (or similar) if operations already standardize on AWS and want lowest per-message cost at scale — implement via the same `EmailProvider` interface.

**Final decision depends on:** domain verification effort for `meengine.io`, EU/DPA requirements, verified pricing, staging send tests to major inbox providers, and who operates DNS (Cloudflare/Vercel).

**Not recommended as first choice:** Brevo unless there is an explicit product need for CRM/marketing on the same vendor.

---

## Proposed architecture

No code in this batch — target layout for implementation:

```
lib/email/
  email-provider.ts      # interface + factory (noop | resend | postmark | smtp)
  email-service.ts       # sendEmail(), redaction, metrics hooks
  templates/
    invitation-email.ts  # buildSubject/Html/Text(invitation context)
    password-reset-email.ts   # future
    verification-email.ts     # future
```

### Interface (conceptual)

```typescript
type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[]; // provider-specific metadata, no PII in tags
};

interface EmailProvider {
  send(input: SendEmailInput): Promise<{ id?: string; ok: boolean }>;
}
```

### Provider implementations

| Implementation                     | When                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| **`noop`**                         | Default — no network; optional structured log without secrets.          |
| **`dev-log`**                      | Local only — log recipient + subject; never log full invite/reset URLs. |
| **`resend` / `postmark` / `smtp`** | Production — selected by `EMAIL_PROVIDER`.                              |

### Integration points (future)

| Call site                            | Behavior                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `createInvitation` (after DB create) | Build template → `emailService.send` → on failure: log + return success with `inviteLink` (emailSent: false). |
| Password reset route (future)        | Always generic HTTP response; send async or await with timeout.                                               |
| Signup / verify resend (future)      | Strict rate limit; generic “if account exists, email sent”.                                                   |

---

## Env vars (future — not added in this batch)

Document for planning only; **none are required today**.

| Variable                 | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`         | `noop` \| `resend` \| `postmark` \| `smtp` (default `noop`)               |
| `EMAIL_FROM`             | e.g. `Driving Academy <invites@meengine.io>`                              |
| `EMAIL_REPLY_TO`         | Optional support inbox                                                    |
| `EMAIL_API_KEY`          | Provider secret (or separate keys per provider)                           |
| `APP_PUBLIC_URL`         | Base URL for links in templates (may reuse existing app URL config)       |
| `EMAIL_SEND_INVITATIONS` | Feature flag: send on invite create (default off until staging validated) |

See [environment-variables.md](../ops/environment-variables.md) when vars are introduced in a future batch.

---

## Implementation batches

Aligned with [invite-only-foundation-plan.md](./invite-only-foundation-plan.md) batch 6 and [signup-hardening-plan.md](./signup-hardening-plan.md).

| Batch                                    | Objective                                            | Acceptance (summary)                                                                  |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **1. `email-provider-boundary`**         | Interface, noop provider, `email-service` unit tests | App runs with zero email env; no outbound network by default.                         |
| **2. `invitation-email-template`**       | HTML/text template, i18n deferred (EN first)         | Template tests snapshot subject/body structure; no raw token in test fixtures logged. |
| **3. `invitation-email-send-on-create`** | Wire send after create behind flag                   | Create still returns `inviteLink`; send failure non-fatal; admin toast optional.      |
| **4. `password-reset-flow-foundation`**  | Reset token + API + email                            | No enumeration; rate limit spec; email via same provider.                             |
| **5. `email-verification-flow`**         | Tokens, verify endpoint, login gate policy           | `isEmailVerified` semantics fixed; resend limited.                                    |
| **6. `deliverability-domain-checklist`** | Ops doc + release checklist                          | SPF/DKIM/DMARC verified; test sends to Gmail/Outlook/Yahoo.                           |

Batch 7 in invite-only plan (`invitation-rate-limit-audit`) remains separate — distributed limits on accept/create, not provider selection.

---

## Security notes

- **Invite links are bearer tokens** — equivalent to a password for account creation; treat email body as sensitive channel.
- **Never log** full invite URLs, reset tokens, or verification tokens in application or Vercel logs.
- **Provider errors** — return generic admin message (“Invitation created; email could not be sent — copy link manually”); do not attach provider response body to HTTP JSON.
- **Resend controls** — admin may copy link again only from create response (current UX); future “resend email” must not expose token in list API.
- **Rate limits (future)** — invitation create, accept POST, password reset request, verification resend — per IP and per email hash.
- **Staging** — use provider sandbox or `+tag` test addresses; block sends to `@example.com` in production provider config if supported.

---

## Deliverability domain checklist (future ops)

Before enabling `EMAIL_SEND_INVITATIONS` or auth mail in production:

- [ ] Subdomain or root domain chosen (e.g. `meengine.io` or `mail.meengine.io`).
- [ ] SPF record includes provider include/mechanism.
- [ ] DKIM keys published (provider-generated).
- [ ] DMARC policy at least `p=none` monitoring, tighten to `quarantine`/`reject` when confident.
- [ ] `EMAIL_FROM` aligned with verified domain; avoid no-reply without support path if product requires replies.
- [ ] Test messages to Gmail, Microsoft 365, and one regional provider inbox.
- [ ] Bounce/complaint webhooks configured (provider dashboard).
- [ ] Document rotation process for `EMAIL_API_KEY` in secret store.

---

## Non-goals

- Marketing emails, newsletters, drip campaigns.
- Billing provider integration or invoice PDF email.
- Full in-app notification center.
- Prisma schema changes in the evaluation batch.
- Changing signup behavior, demo policy, lessons, vehicles, i18n, or platform expansion.
- Mandatory email env vars before provider code ships.

---

## Related documents

| Doc                                                                      | Role                                    |
| ------------------------------------------------------------------------ | --------------------------------------- |
| [invite-only-foundation-plan.md](./invite-only-foundation-plan.md)       | Invite model, batch 6 email integration |
| [signup-hardening-plan.md](./signup-hardening-plan.md)                   | Verification and reset dependencies     |
| [invitation-copy-link-smoke.md](../ops/invitation-copy-link-smoke.md)    | Manual validation without email         |
| [api-response-contract-baseline.md](./api-response-contract-baseline.md) | API shapes when email fields are added  |
| [environment-variables.md](../ops/environment-variables.md)              | Future env documentation home           |
