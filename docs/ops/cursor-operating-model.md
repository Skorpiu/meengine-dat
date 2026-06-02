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

## Decision Recommendation Protocol

Cursor may provide **structured decision recommendations** after analysis, but must **not bypass approval gates**. This protocol exists to let Cursor say “what I would do” while keeping **authorization** with the human.

### Decision levels

- **D0 — No decision**
  - Cursor only analyzes and does not recommend a decision.

- **D1 — Recommendation only**
  - Cursor may state the decision it would make, with rationale, risks, confidence, and approval needs.
  - **No implementation** without explicit approval.

- **D2 — Scoped decision**
  - Cursor may choose between **low-risk implementation details** inside an already approved scope.
  - Examples: helper names, small file organization, wording of non-critical messages, test naming.
  - Cursor must **report the decision** in the final report.

- **D3 — Low-risk autonomous execution**
  - Cursor may implement directly only when the user **explicitly asks for implementation** and the batch is **docs-only**, **copy-only**, or **low-risk test-only**.
  - Still requires validation and evidence pack where applicable.

- **D4 — Human approval required**
  - Cursor may recommend but must not decide or implement without explicit approval for:
    - Prisma schema
    - migrations
    - RLS/grants
    - auth
    - billing
    - demo behavior
    - rate-limit
    - tenant isolation
    - data deletion / destructive actions
    - import/apply flows
    - payments
    - operational history
    - provider integrations
    - environment/config changes

### Required format (Decision Recommendation)

When Cursor provides a recommendation, it must use this structure:

- **Decision I would make:**
- **Decision level:** D0 / D1 / D2 / D3 / D4
- **Confidence:** High / Medium / Low
- **Why:**
- **Alternatives considered:**
- **Rejected options:**
- **Risks:**
- **Reversibility:** Easy / Medium / Hard / Dangerous
- **Approval required:** Yes / No
- **Next action:**

### Rules

- Cursor must separate **recommended decision** from **approved decision**.
  - Recommendations answer: “what would I do?”
  - Approved decisions answer: “what am I authorized to do next?”
- Cursor must not phrase recommendations as if they are already authorized (avoid “I will” / “I’m going to implement” when approval is required).
- Cursor must explicitly say when **human approval is required**.
- For **sensitive batches**, Cursor remains **D1** unless the user provides the exact approval phrase required by the Sensitive Batch Gate:
  - `APPROVED TO IMPLEMENT: <batch-name>`
- If confidence is **Low**, Cursor must recommend more inspection or a smaller spike instead of implementation.

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

## Final Evidence Pack

For every **runtime / API / UI / data-sensitive** batch, Cursor final reports must include:

- `git status --short`
- `git --no-pager diff --stat`
- `git --no-pager diff --cached --stat`
- `git --no-pager diff --name-only`
- `git --no-pager diff --cached --name-only`
- exact validation command and result
- files changed grouped by:
  - runtime/API
  - UI
  - tests
  - docs/memory
  - config/rules
- explicit confirmation that forbidden areas were **not** touched:
  - Prisma schema
  - migrations
  - package.json
  - pnpm-lock.yaml
  - auth
  - billing
  - demo policy
  - RLS/grants
  - env files

**Staging vs working tree:**

- If changes are **unstaged**, use `git diff` (and `git diff --stat` / `git diff --name-only`).
- If changes are **staged**, use `git diff --cached` (and matching `--stat` / `--name-only`).
- If unsure, provide **both**.
- A patch/diff with **0 bytes** is not valid evidence.
- Do **not** claim implementation is complete unless the evidence pack reflects the **actual** working tree and staging state.

Untracked files (`??` in `git status --short`) do not appear in plain `git diff`; list them explicitly and include their paths in the files-changed summary.

## Critical Claim Evidence Protocol

For any **critical claim** in a final report, Cursor must provide **direct evidence** — not narrative alone.

Examples of critical claims:

- “row lock implemented”
- “tenant isolation enforced”
- “RLS/grants unchanged”
- “no Prisma schema changes”
- “demo guard reused”
- “dry-run is zero-write”
- “apply is all-or-nothing”
- “provider raw errors are sanitized”
- “rate-limit enforced”
- “no cross-tenant access”

Required structure for each critical claim:

- **Claim:**
- **Evidence:**
  - file path(s)
  - relevant grep/search command
  - relevant diff/test reference
- **Test coverage:**
- **Remaining limitation, if any:**

Example:

- **Claim:** row lock implemented.
- **Evidence:**
  - `git grep -nE "FOR UPDATE|queryRaw|lockStudentRowForUpdate" -- driving_school_platform/nextjs_space/lib/students/student-record-delete.ts`
  - unit test asserts `$queryRaw` runs before `findFirst` and `delete`
- **Test coverage:**
  - `student-record-delete.unit.test.ts`
- **Remaining limitation:**
  - test asserts call order; manual diff review confirms the SQL contains `FOR UPDATE`.

## Implementation Conformance Matrix

For every **runtime / API / UI / sensitive** batch, Cursor final reports must include an **Implementation Conformance Matrix** that maps the **approved plan** to the **actual implementation**.

### Required columns

- **Approved requirement**
- **Implemented in**
- **Tested in**
- **Evidence**
- **Status**

### Allowed status values

- **DONE**
- **PARTIAL**
- **DEFERRED**
- **NOT DONE**
- **CHANGED FROM PLAN**

### Rules

- Every explicit approved requirement must appear in the matrix.
- Any **PARTIAL / DEFERRED / NOT DONE / CHANGED FROM PLAN** item must include a short reason.
- If implementation changed from the approved plan, Cursor must say whether the deviation needs **explicit user/reviewer approval**.
- Cursor must **not** claim merge readiness if any approved **critical** requirement is **PARTIAL**, **NOT DONE**, or **CHANGED FROM PLAN** (unless explicitly approved and documented).

### Example (student record delete policy batch)

| Approved requirement | Implemented in | Tested in | Evidence | Status |
| --- | --- | --- | --- | --- |
| Block linked User | `driving_school_platform/nextjs_space/...` (student delete policy module) | `...student-delete...test...` | diff hunk showing `userId`/relation guard; test asserts blocked reason | DONE |
| Block invitations | `driving_school_platform/nextjs_space/...` (invitation existence check) | `...student-delete...test...` | grep hit + excerpt for invitation query; test asserts blocked reason | DONE |
| Block lessons/history | `driving_school_platform/nextjs_space/...` (lesson/practical history guard) | `...student-delete...test...` | diff hunk; test asserts blocked reason | DONE |
| Row lock before delete | `driving_school_platform/nextjs_space/...` (transaction + `FOR UPDATE`) | `...student-delete...test...` (if present) | grep/diff showing `SELECT ... FOR UPDATE` in the pre-delete path | DONE |
| Demo guard reused | `driving_school_platform/nextjs_space/...` (demo mutation guard utility) | `...` (if covered) | diff shows reuse of existing guard; CI check output | DONE |
| Memory docs updated | `docs/architecture/current-state.md` / `docs/architecture/roadmap-todo.md` | n/a | docs diff + rationale in final report | DONE |

Notes:

- This example is intentionally schematic. In real reports, “Implemented in”, “Tested in”, and “Evidence” must be concrete: real paths, test names, and a diff/grep reference.

## Pre-Final Self-Review

Before writing the final report, Cursor must answer the following **explicitly**:

- Did I implement only the approved scope?
- Did I avoid forbidden areas?
- Did I update all required tests?
- Did I provide evidence for critical claims?
- Did I list staged and unstaged changes correctly?
- Did I document deviations from the approved plan?
- Did I propose memory updates only when appropriate?

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

