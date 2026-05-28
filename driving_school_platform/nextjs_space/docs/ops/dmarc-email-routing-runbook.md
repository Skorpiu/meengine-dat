# DMARC report routing (Cloudflare Email Routing) — operator runbook

**Status:** DAT_3.5 `email-ops-dmarc-routing-cleanup` (documentation only).  
**Audience:** ops + engineering.  
**Scope:** operational guidance only — **no runtime changes**, **no provider changes**, **no secrets changes**.

This runbook documents the **operational separation** between:

- **`admin@meengine.io`** — primary operational mailbox for DAT app ops and Postmark sender validation.
- **`dmarc@meengine.io`** — dedicated mailbox/alias to receive **DMARC aggregate reports** (ZIP/XML) from mailbox providers (e.g. Google).

---

## Objective

- Keep **operational email** (`admin@meengine.io`) usable for app ops, Postmark validation, and human workflows.
- Route DMARC aggregate reports (expected, often high volume) to **`dmarc@meengine.io`** to avoid inbox noise.
- Make it explicit that DMARC reports are **expected** telemetry, not “phishing by default”.

---

## Why separate DMARC from `admin@meengine.io`

- **Operational focus:** `admin@meengine.io` is used for production checks (invites/password reset) and ongoing ops; DMARC reports can quickly overwhelm that inbox.
- **Different handling:** DMARC reports are machine-generated **ZIP/XML** payloads that are better handled in a dedicated mailbox and (ideally) a DMARC analysis tool.
- **Risk reduction:** treating unsolicited ZIP attachments as normal email in a primary inbox increases accidental-execution / risky-analysis habits.

---

## Expected DMARC report format (Google and others)

- Reports are commonly sent as:
  - **ZIP** attachment (often containing one or more **XML** files), or
  - **XML** attachment directly
- Contents typically include aggregate counts and authentication evaluation (SPF/DKIM alignment, policy applied, etc.).

These are normal when DMARC is configured with `rua=mailto:<address>`.

---

## Operator guidance (safe handling)

- **Do not treat DMARC reports as phishing by default**, but treat the attachments as **untrusted files**.
- **Recommendation:** avoid opening/extracting DMARC ZIPs manually on your main workstation.
  - Prefer using a dedicated analysis workflow (isolated VM, sandbox environment, or a DMARC analysis service).
- If you must inspect a report:
  - Prefer **uploading** to a reputable DMARC analysis tool/service rather than opening locally.
  - Do not forward the attachment into high-trust channels (tickets/chat) unless your process explicitly supports it.

---

## Implementation (Cloudflare Email Routing + DMARC `rua`)

### 1) Create a Cloudflare Email Routing alias

In Cloudflare (domain `meengine.io`) → Email → Email Routing:

- Create destination: `rukahh@gmail.com`
- Create custom address (alias):
  - `dmarc@meengine.io` → `rukahh@gmail.com`

Goal: DMARC report mail lands in the destination mailbox without polluting `admin@meengine.io`.

### 2) Update the DMARC DNS record `rua`

Update the DMARC record for `meengine.io` to send aggregate reports to `dmarc@meengine.io`:

- Set `rua=mailto:dmarc@meengine.io`

Notes:

- This is a **DNS-only** operational change (no app/runtime changes).
- `admin@meengine.io` remains the intended mailbox for Postmark sender and operational app testing.

---

## Rollback

If report routing causes operational issues (missing reports, mailbox misrouting, etc.), revert the DMARC `rua` target:

- Change back to `rua=mailto:admin@meengine.io`

Rollback does not require code changes, migrations, dependency changes, or secrets changes.

---

## Future improvements (optional)

Consider a DMARC analysis tool/service to:

- Parse ZIP/XML automatically
- Provide dashboards for SPF/DKIM alignment and source IPs
- Alert on anomalies (sudden auth failures, new sending sources)

This is intentionally out of scope for the current documentation-only batch.
