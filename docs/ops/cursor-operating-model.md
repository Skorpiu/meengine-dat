# DAT Cursor Operating Model

This document versions **how we operate** when using Cursor in the DAT repository.

## Roles

- **User / Product Owner**
  - Owns product direction and priorities.
  - Makes final decisions.
  - Gives explicit approvals at decision gates (schema, migrations, RLS/grants, etc.).
  - Merges when the batch is ready.

- **ChatGPT (architect / reviewer / QA lead)**
  - Validates scope, architecture, risks, and merge readiness.
  - Challenges ambiguous or unsafe plans.
  - Defines required validation depth (tests and manual QA) for the batch.

- **Cursor (executor in repo)**
  - Inspects the actual repository state before changing anything.
  - Plans first; implements **minimal diffs**.
  - Runs required validation and reports results.
  - Does not “drive-by refactor” inside feature batches.

## Operating principles

- **Plan first.**
- **Code second.**
- **Validate before merge.**
- Prefer **small, reviewable batches**.
- **No broad refactors** inside feature batches.
- Do not mix **feature + refactor + docs + migration** unless explicitly justified and approved as a deliberate multi-batch effort.

## External advice protocol (ACCEPT / ADAPT / DEFER / REJECT)

Any recommendation coming from ChatGPT, Cursor, audits, tools, or other external sources must be compared against the **actual DAT repo state** and classified point-by-point:

- **ACCEPT**: correct and safe to apply now, in this repo, in this batch.
- **ADAPT**: useful, but must be changed to fit DAT constraints, contracts, or conventions.
- **DEFER**: valid, but belongs to a future batch (or requires prerequisites).
- **REJECT**: wrong, stale, unsafe, or not worth doing.

Include the phrase when applicable:

> “This is good practice, but not for this batch.”

## Decision gates (stop-before-proceeding)

- **Prisma schema changes** require explicit user approval.
- **Migrations** require explicit user approval.
- **RLS/grants changes** require explicit architectural justification and explicit approval.
- **Auth/security/billing/demo/rate-limit changes** must not happen outside explicit scope.
- **Failed validation means the batch is not complete.**

## Sensitive Batch Gate

A **sensitive batch** is any batch touching or potentially affecting:

- Prisma schema
- migrations
- RLS
- grants
- auth
- billing
- demo behavior
- rate-limit
- tenant isolation
- data deletion / destructive actions
- import/apply flows
- password reset
- email verification
- invitations
- payments
- operational history

### Required behavior

- Cursor must **classify batch risk** before implementation.
- For sensitive batches, Cursor must **stop after the plan**.
- Cursor must **not** create, edit, delete, stage, commit, or run implementation changes until explicit approval is given.
- The explicit approval phrase must be:

  `APPROVED TO IMPLEMENT: <batch-name>`

- Without that approval phrase, Cursor may only **analyze, inspect, plan, and report**.
- If the user asks to “go ahead” ambiguously on a sensitive batch, Cursor must ask for explicit approval using the approval phrase above.

## Validation Matrix

The canonical `check` remains mandatory before merge. In addition, validation must match the **risk category** of the batch (see [Validation policy](#validation-policy)).

### A. Data deletion / destructive actions

- Inspect Prisma relations and `onDelete` behavior.
- Identify cascade risks.
- Test safe deletion path.
- Test blocked deletion when linked User exists.
- Test blocked deletion when invitations exist.
- Test blocked deletion when lessons/history exist.
- Test tenant isolation.
- Test role authorization.
- Check demo behavior if the route can run in demo.

### B. Import/apply flows

- Dry-run must remain **zero-write**.
- Apply must be **all-or-nothing** unless explicitly documented otherwise.
- Test duplicate handling.
- Test tenant isolation.
- Test invalid payloads.
- Test limits and rollback behavior.

### C. Auth / security / rate-limit

- Test unauthorized/forbidden paths.
- Test anti-enumeration where relevant.
- Test rate-limit behavior where relevant.
- Avoid leaking raw provider/internal errors.

### D. RLS / grants

- Never change without explicit approval.
- Document exact SQL/grant/policy implications.
- Validate with `information_schema` / Supabase advisor when applicable.

### E. Billing / payments

- Preserve idempotency.
- Avoid exposing provider raw errors.
- Test webhook/event-store behavior where relevant.

### F. Demo behavior

- Verify demo mutation guards.
- Document whether the action is allowed, blocked, or quota-limited in demo.

## Validation policy

- Run relevant tests for affected areas when applicable.
- Always run the canonical command:

```bash
pnpm -C driving_school_platform/nextjs_space check
```

If the check fails, do not declare the batch complete. Report the failing command and a concise output summary.

## Memory Update Protocol

Rules:

- Cursor must **not** update operational memory broadly or prematurely.
- When memory updates are **not** explicitly part of the batch scope, Cursor must **propose** them in structured form before applying.

Required structure:

- **Memory update needed:** yes/no
- **Decision:**
- **Reason:**
- **Scope:**
- **Out of scope:**
- **Files to update:**
- **Exact wording proposed:**

Additional rules:

- Do not turn temporary implementation details into permanent rules.
- Do not use absolute language unless the decision is truly permanent.
- Do not add roadmap items unless they were accepted, discovered as a real risk, or explicitly requested.
- Separate clearly:
  - decisions already made;
  - future To-Dos;
  - known limitations;
  - deferred ideas.

## Operational memory policy

Durable decisions, workflow changes, migrations, runbooks, client-specific product decisions, and future To-Dos must be reflected in the appropriate docs under `docs/` (architecture and ops), following the [Memory Update Protocol](#memory-update-protocol).

