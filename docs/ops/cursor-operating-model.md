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

## Validation policy

- Run relevant tests for affected areas when applicable.
- Always run the canonical command:

```bash
pnpm -C driving_school_platform/nextjs_space check
```

If the check fails, do not declare the batch complete. Report the failing command and a concise output summary.

## Operational memory policy

Durable decisions, workflow changes, migrations, runbooks, client-specific product decisions, and future To-Dos must be reflected in the appropriate docs under `docs/` (architecture and ops).

