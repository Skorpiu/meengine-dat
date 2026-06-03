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
  - Cursor may implement directly only when the user **explicitly asks for implementation** and the batch is **docs-only**, **copy-only outside sensitive/admin runtime surfaces**, or **low-risk test-only**.
  - Still requires validation and evidence pack where applicable.
  - **D3 must not be used for** admin runtime UI, tenant-critical surfaces, auth-adjacent screens, invitations/app-access screens, billing, demo, import/apply, data deletion, or operational-history surfaces.
  - Admin UI copy/layout changes may still be low risk, but they are **not automatically D3** when they sit near sensitive workflows.
  - For **approved runtime UI batches**, Cursor may implement after explicit approval, but must still use **Final Evidence Pack** and **Implementation Conformance Matrix**. Internal low-risk implementation choices inside that approved scope may be **D2**.

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
- Do **not** classify runtime **admin** UI (including copy/layout on people/users/invitations-adjacent screens) as **D3** just because the diff looks small — require explicit approval and the evidence pack; use **D2** only for internal choices inside an already approved scope.

## Smallest Safe Slice Protocol

When a recommended batch is **broad**, **ambiguous**, **cross-cutting**, or likely to touch **sensitive areas**, Cursor must propose the **smallest safe v1 slice** before implementation. Cursor must not implement the broad batch as originally named if a smaller safe slice is available.

### Broad-batch examples (non-exhaustive)

- people-management-ux-unification
- engineering excellence audit
- import-export-ui-actions
- demo sandbox
- billing hardening
- auth/security hardening
- RLS/Data API policy work
- performance/INP work
- dependency modernization

### Required output when a broad batch is detected

- **Broad batch detected:** yes/no
- **Original batch name:**
- **Recommended safe slice name:**
- **Why this slice:**
- **In scope:**
- **Explicitly out of scope:**
- **Deferred follow-ups:**
- **Escalation triggers:**
- **Decision level for the slice:** D0 / D1 / D2 / D3 / D4
- **Approval required:** yes/no (and the exact approval phrase if gated)
- **Evidence/validation expected:**

### Rules

- Prefer v1 slices that avoid: **Prisma schema**, **migrations**, **RLS/grants**, **auth**, **billing**, **demo policy**, and **destructive data changes**.
- If the safe slice touches sensitive behavior, apply the **Sensitive Batch Gate** (stop after plan; require `APPROVED TO IMPLEMENT: <batch-name>`).
- If the safe slice is **UI/IA only**, state explicitly that **behavior and data contracts must remain unchanged**.
- If the work cannot be safely sliced, recommend a **spike/discovery** batch instead of implementation.
- Cursor must explicitly fence scope with:
  - out-of-scope items that are tempting/adjacent, and
  - escalation triggers that would push the batch into **D4 / Sensitive Gate**.

### Example

Original batch:
- **people-management-ux-unification**

Recommended safe slice:
- **people-management-information-architecture-v1**

In scope:
- labels
- grouping
- page hierarchy
- section ordering

Out of scope:
- invitation semantics
- auth
- permissions
- Prisma
- API contracts
- route split
- import/export UI

Escalation triggers:
- Any change to invitation behavior
- Any change to app access rules
- Any change to guards/authorization checks
- Any change to API payload shapes/contracts
- Any new/removed routes (including route splits/renames)

Decision levels (calibration example — `people-management-information-architecture-v1`):
- **Analysis:** D1 (recommendation only; no implementation without approval).
- **Implementation:** requires explicit approval (`APPROVED TO IMPLEMENT: people-management-information-architecture-v1`).
- **Internal choices** inside approved scope (exact helper text, component naming): D2.
- **Not D3** autonomous — touches admin people/users/invitations-adjacent surfaces even when changes are copy/layout-only.
- **D4 / Sensitive Gate** if the slice changes invitation behavior, routes, guards, API payloads, auth, import/export, or permissions.

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

## Git Bash Command Discipline Protocol

DAT terminal **command batteries** for **Rui** and Cursor **copy-paste blocks** default to **Git Bash** on Windows (plain **bash** on macOS/Linux). This prevents mixed-shell failures (PowerShell interpreting bash blocks, doc paths executed as commands, empty `SHA` producing invalid `DAT-.zip` archives).

Canonical templates: [command-batteries.md](./command-batteries.md). Cursor rules: `.cursor/rules/architect-mode.mdc`, `.cursor/rules/01-dat-workflow.mdc`.

### Rules

- **Default shell:** all DAT terminal command batteries for Rui use **Git Bash** syntax.
- **Battery header (required):** every command battery Cursor provides must include this line immediately before the fenced block:

  `Assumed shell: Git Bash`

- **No PowerShell unless asked:** do not use PowerShell syntax unless Rui **explicitly** asks for PowerShell for that step (label any exception clearly).
- **No mixed syntax:** do not mix shell syntaxes in the same command battery (no PowerShell + bash in one block).
- **If unsure:** if Cursor is unsure which shell Rui is using, **ask** — or **default to Git Bash** for DAT.
- **Copy-paste safety:** prefer simple, copy-paste-safe command blocks; use `bash` fences only for executable steps.
- **Commits:** commit messages should usually be **single-line Conventional Commits** (e.g. `git commit -m "docs: enforce Git Bash command discipline"`). Avoid complex inline heredocs, nested command substitutions, or multi-line commit constructs unless necessary.
- **Multi-line commands:** if a multi-line command is needed, **explain it briefly** outside the block and keep the block **shell-specific** (Git Bash only). Use backslash `\` line continuations in bash when splitting lines — not PowerShell backticks.

### Do not use (PowerShell)

Unless Rui explicitly requests PowerShell:

- `Remove-Item` (use `rm -f`)
- `$sha = ...` or other PowerShell variable assignment (use `SHA=$(git rev-parse --short HEAD)`)
- Backtick `` ` `` line continuations (use `\` at end of line in Git Bash)
- `$env:VAR`, `Set-Location`, `Get-ChildItem`, and other PowerShell-only cmdlets in DAT batteries

### Use instead (Git Bash)

| Need | Git Bash |
| ---- | -------- |
| Remove old ZIPs | `rm -f DAT-*.zip` |
| Short SHA for archive | `SHA=$(git rev-parse --short HEAD)` |
| Split long command across lines | trailing `\` then newline |
| Commit | `git commit -m "type: single-line message"` |

### Cursor agent behavior

- Prefer batteries from [command-batteries.md](./command-batteries.md) over ad-hoc shell.
- Emit **Git Bash** syntax in docs and chat even when Cursor’s integrated terminal may be PowerShell on Windows.
- When bash semantics matter (`source`, `unset`, `export`, `SHA=$(...)`, `git archive`), run in **Git Bash** or a single `bash -lc '…'` wrapper — do not silently run migration/ZIP/git-archive batteries with PowerShell-only syntax.

### Forbidden / high-risk patterns

- **Executing documentation paths** as shell commands (e.g. `docs/ops/command-batteries.md`, `@docs/...` on their own line).
- **Prose inside shell blocks** without `#` comment prefix.
- **Invalid ZIP names** — never `DAT-.zip`; set `SHA=$(git rev-parse --short HEAD)`, confirm non-empty, then archive.
- **Blind `git add -A`** when only specific paths changed (see Human-Controlled Merge Protocol).
- **Committing** generated `DAT-*.zip` or `.diff` review artifacts.

### ZIP archive discipline (Git Bash)

Every ZIP battery must start with `Assumed shell: Git Bash`, then:

```bash
rm -f DAT-*.zip
SHA=$(git rev-parse --short HEAD)
test -n "$SHA" && git archive --format=zip --output "DAT-${SHA}.zip" HEAD || echo "SHA missing — fix before archive"
```

Reject merge-readiness instructions that omit `SHA=$(...)` or use PowerShell string expansion.

### Reviewer and merge batteries

When providing the **Human-controlled close/merge battery**, Cursor must:

- Include **`Assumed shell: Git Bash`** before the block.
- Fill placeholders from the actual diff (paths, branch, **single-line** Conventional Commit message).
- Keep the block **Git Bash only** (no mixed syntax).
- Point Rui to Git Bash on Windows for execution.

See [reviewer-workflow.md](./reviewer-workflow.md) — Git Bash command discipline reviewer expectations.

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
- Did I report out-of-scope discoveries under **Deferred recommendations** without expanding scope?
- Did I complete the **Memory Consistency Gate** (all yes/no/why-not rows)?
- Did I provide a **complete** close/merge battery and **Prepare next recommended branch** section (Git Bash, single-line commit)?

## Human-Controlled Merge Protocol

Merge and push remain **human-controlled actions**. Cursor prepares merge-readiness analysis; Rui executes close/merge commands.

### Rules

- Cursor must **not** run merge or push commands by default.
- Cursor may prepare **merge-readiness analysis**.
- Cursor may say whether a batch **appears merge-ready**.
- Cursor must provide the **exact close/merge command battery** for Rui to run manually (see [command-batteries.md](./command-batteries.md) — Human-controlled close/merge battery).
- Cursor must **not** execute the following unless Rui **explicitly asks** Cursor to run those commands in the local repo:
  - `git commit`
  - `git switch main`
  - `git pull`
  - `git merge`
  - `git push`
  - `git branch -d`
  - `git archive`
- Even when explicitly asked, Cursor must **first restate the command plan** and **confirm the working tree state**.
- For the DAT default workflow, **prefer Rui running close/merge commands manually**.

### Required close/merge battery output

When a batch appears merge-ready, Cursor must provide Rui with a **complete** manual battery — not a shorthand summary. Incomplete batteries are **not merge-ready**.

The battery must use the template in [command-batteries.md](./command-batteries.md) — **Human-controlled close/merge battery** — and include **every** step below (filled from the actual batch):

- **`Assumed shell: Git Bash`** immediately before the fenced block;
- `git status --short` (pre-staging);
- `git --no-pager diff --stat` (unstaged);
- `git add` with **specific paths** (not blind `git add -A` unless justified);
- `git status --short` + `git --no-pager diff --cached --stat` (post-staging);
- `git commit -m "<type>: <message>"` — **single-line** Conventional Commits only (no multiline heredocs);
- `git switch main`;
- `git pull --ff-only`;
- `git merge --no-ff <branch-name> -m "Merge branch '<branch-name>'"`;
- `pnpm -C driving_school_platform/nextjs_space check`;
- `git push`;
- `git branch -d <branch-name>`;
- ZIP: `rm -f DAT-*.zip`, `SHA=$(git rev-parse --short HEAD)`, non-empty `SHA` check, `git archive` → `DAT-${SHA}.zip` (Git Bash only);
- final `git status --short`.

Cursor must **not** omit steps “because Rui knows the flow.” Reviewers reject incomplete batteries.

### Prepare next recommended branch

After the close/merge battery, Cursor must provide a separate section titled **`Prepare next recommended branch`** (same template tail in [command-batteries.md](./command-batteries.md)).

That section must include:

- `git pull --ff-only` (on `main`, after merge);
- `git switch -c <new-recommended-branch>`;
- `git status --short`.

**Branch naming:**

- When Cursor has a **concrete** next slice from [current-state.md](../architecture/current-state.md) / [roadmap-todo.md](../architecture/roadmap-todo.md), use that **exact** slice name as `<new-recommended-branch>` (e.g. `import-apply-demo-guard-v1`).
- When no concrete next slice exists, use a descriptive placeholder and state **needs confirmation** — do not invent scope.

Preparing the next branch is **recommendation only** — not authorization to implement. Rui still needs `APPROVED TO IMPLEMENT: <batch-name>` for gated slices.

### Merge readiness criteria

A batch is **not merge-ready** unless:

- scope matches the approved plan;
- validation passed (`pnpm -C driving_school_platform/nextjs_space check`);
- **Final Evidence Pack** is complete (when applicable);
- **Implementation Conformance Matrix** is complete (when applicable);
- **Memory Consistency Gate** is complete (see [Memory Consistency Gate](#memory-consistency-gate));
- **memory docs update needed: yes/no** is answered;
- forbidden areas are confirmed **untouched** or **explicitly approved**;
- **complete** close/merge battery **and** **Prepare next recommended branch** sections are provided.

See also [reviewer-workflow.md](./reviewer-workflow.md) — Human-controlled merge reviewer expectations.

## Daily Branch Housekeeping Protocol

**Purpose:** keep local branch hygiene visible without destructive automation.

### When to run

- **Daily Manual Super-Agent Check** (see [cursor-automations-prompts.md](./cursor-automations-prompts.md)) — list-only by default.
- After merge close, when reporting branch state alongside the close/merge battery.
- When the user asks for branch cleanup guidance.

### Rules

- On `main`: `git pull --ff-only`, then `git fetch --prune` (see [command-batteries.md](./command-batteries.md) — Daily branch housekeeping battery).
- List **merged** local branches (`git branch --merged main` or equivalent).
- List **unmerged** local branches (`git branch --no-merged main` or equivalent).
- End with `git status --short`.
- Cursor **may suggest** deleting **merged** local branches (with explicit `git branch -d` commands for Rui to run).
- Cursor must **not** delete **unmerged** local branches.
- Cursor must **not** delete **remote** branches unless Rui **explicitly** asks.
- **Default action is dry-run/list only** — no `git branch -D`, no `git push origin --delete`, no bulk cleanup scripts unless explicitly requested.

Use the list-only template in [command-batteries.md](./command-batteries.md) — **Daily branch housekeeping battery**.

## Memory Consistency Gate

After **every** batch (docs-only, runtime, sensitive), Cursor must include a **Memory Consistency Gate** block in the final report. This is separate from **memory docs update needed: yes/no** — it audits whether operational memory stayed aligned.

Report each line explicitly:

| Check | Required answer |
| ----- | ---------------- |
| `current-state.md` updated? | **yes** / **no** / **why not** |
| `roadmap-todo.md` updated? | **yes** / **no** / **why not** |
| `architect-mode.mdc` updated? | **yes** / **no** / **why not** |
| `system-design.md` updated? | **yes** / **no** / **why not** |
| `docs/ops` updated? | **yes** / **no** / **why not** |
| Next recommended batch changed? | **yes** / **no** |
| Any item appears both **Done** and **Pending/Deferred**? | **yes** / **no** (if yes, list paths) |
| Any `alwaysApply` rule points to a **completed** batch as current next? | **yes** / **no** (if yes, list rule + stale text) |

**Rules:**

- **yes/no/why not** must be answered for every row — no skipped rows.
- If the batch closed durable work, memory updates should be **yes** on the relevant files or **why not** must cite explicit batch scope (e.g. “runtime-only; memory update deferred to docs follow-up”).
- Contradictions (**yes** on “both Done and Pending”) block merge readiness until resolved or explicitly deferred with approval.

See [reviewer-workflow.md](./reviewer-workflow.md) — Memory Consistency Gate reviewer expectations.

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

## Improvement Discovery and Backlog Triage Protocol

Cursor may suggest improvements when it discovers **real** risks, bugs, UX gaps, technical debt, performance concerns, documentation gaps, or workflow issues during inspection, planning, or implementation.

Cursor must **not**:

- implement discovered improvements unless explicitly approved;
- expand the current batch scope to fix them;
- update `roadmap-todo.md` or `current-state.md` with speculative ideas;
- treat every observation as a To-Do.

### Categories (required)

| Category | Use for |
| -------- | ------- |
| **BUG** | Incorrect behavior vs stated contract or obvious defect |
| **RISK** | Latent failure, operational hazard, or likely future incident |
| **TECH_DEBT** | Maintainability, duplication, brittle patterns, missing tests |
| **UX** | Operator/student/instructor confusion, IA, copy, workflow friction |
| **PERF** | Latency, INP, query/load concerns with evidence |
| **DX_CI** | Developer experience, CI, tooling, local workflow |
| **DOCS** | Missing, stale, or misleading documentation |
| **SECURITY** | Auth, tenancy, secrets, exposure, abuse surface |
| **DATA_INTEGRITY** | Wrong persistence, ID boundaries, import/export semantics |

### Priorities (required)

| Priority | Definition |
| -------- | ---------- |
| **P0** | Critical security, data-loss, cross-tenant, auth, or billing risk |
| **P1** | User/client/demo blocker or high-value product gap |
| **P2** | Important hardening or quality improvement |
| **P3** | Polish or nice-to-have |

### Required output format

For each improvement, Cursor must use this structure:

- **Improvement found:**
- **Category:** BUG / RISK / TECH_DEBT / UX / PERF / DX_CI / DOCS / SECURITY / DATA_INTEGRITY
- **Priority:** P0 / P1 / P2 / P3 (or **needs confirmation** if evidence is weak)
- **Evidence:** file path(s), grep, diff, test, or reproducible observation — not speculation alone
- **Why it matters:**
- **Recommended action:**
- **Recommended batch name:**
- **Smallest safe slice:** (apply [Smallest Safe Slice Protocol](#smallest-safe-slice-protocol) before naming the batch)
- **In scope:**
- **Out of scope:**
- **Decision level:** D0 / D1 / D2 / D3 / D4
- **Approval required:** Yes / No (and exact approval phrase if gated)
- **Memory update proposed:** yes/no
- **Exact wording proposed, if any:**

If evidence is weak, mark the item **needs confirmation** instead of adding it to roadmap or treating it as accepted backlog.

### Rules

- Improvements discovered **during** a batch must be reported under **Deferred recommendations** unless they are in the **approved scope** of that batch.
- **P0 / P1** risks may interrupt the batch only when they affect **safety**, **data integrity**, **tenant isolation**, **auth**, **billing**, or **production/demo correctness** — and only after stopping to report; do not silently fix out of scope.
- **P2 / P3** items should usually be proposed as follow-ups for `roadmap-todo.md`, not implemented in the current batch.
- Before proposing a batch for an improvement, apply the **Smallest Safe Slice Protocol**.
- When recommending priority or order among improvements, use the **Decision Recommendation Protocol**.
- Before editing `current-state.md` or `roadmap-todo.md`, follow the **Memory Update Protocol** — propose structured wording; do not apply speculative updates.

### Where to report

- **In-batch final reports:** include a **Deferred recommendations** subsection listing out-of-scope improvements using the required output format above.
- **Analysis-only or plan-first work:** list improvements separately from the current scope; do not mix them into “what I implemented.”

## Delegated Technical Lead Protocol

### Purpose

When the user asks for **analysis**, **opinion**, **next steps**, **prioritization**, or **“what should we do next?”**, Cursor acts as a **delegated technical lead** for DAT.

Cursor should:

- Inspect [current-state.md](../architecture/current-state.md), [roadmap-todo.md](../architecture/roadmap-todo.md), [system-design.md](../architecture/system-design.md), and relevant code context in the repo.
- Identify **realistic** options (not every imaginable idea).
- **Recommend one** best next action for the project (not an unranked laundry list unless evidence is insufficient).
- Justify the recommendation in terms of **product value**, **engineering quality**, **risk**, **sequencing**, and **cost of delay**.
- **Reject weaker alternatives** clearly with reasons.
- Propose the **smallest safe batch** (see [Smallest Safe Slice Protocol](#smallest-safe-slice-protocol)).
- Provide the **exact approval phrase** needed to implement the recommended slice.
- State what must remain **out of scope**.
- Propose whether **memory docs** should be updated (see [Memory Update Protocol](#memory-update-protocol)) — do not apply speculative roadmap/current-state edits.
- **Stop before implementation** unless the user provides explicit approval (see [Sensitive Batch Gate](#sensitive-batch-gate) and approval phrase below).

This protocol **extends** the [Decision Recommendation Protocol](#decision-recommendation-protocol); use both. For discovered issues during inspection, also apply the [Improvement Discovery and Backlog Triage Protocol](#improvement-discovery-and-backlog-triage-protocol).

### Decision hierarchy

When ranking options, apply this order:

1. **P0 first** — security, data loss, cross-tenant leaks, auth, billing, production correctness.
2. **P1 next** — client/demo blockers, operational workflows, high-value product gaps.
3. **P2 next** — important hardening, maintainability, performance, DX/CI, architecture debt.
4. **P3 last** — polish, wording, cleanup, nice-to-have improvements.

If memory and repo evidence conflict, **stop and report the conflict** before recommending implementation.

### Required output format

When acting as delegated technical lead, Cursor must use this structure:

- **Situation:**
- **Options considered:**
- **Recommended decision:**
- **Why this is best for the project:**
- **Why not the alternatives:**
- **Priority:** P0 / P1 / P2 / P3 (or **needs confirmation**)
- **Category:** BUG / RISK / TECH_DEBT / UX / PERF / DX_CI / DOCS / SECURITY / DATA_INTEGRITY
- **Smallest safe batch:**
- **In scope:**
- **Out of scope:**
- **Risks:**
- **Escalation triggers:**
- **Decision level:** D0 / D1 / D2 / D3 / D4
- **Approval required:** Yes / No
- **Exact approval phrase:** (when Yes — full line the user must paste, e.g. `APPROVED TO IMPLEMENT: <batch-name>`)
- **Memory update needed:** yes / no
- **Next action:**

When useful, also include the compact **Decision I would make** block from the [Decision Recommendation Protocol](#decision-recommendation-protocol) (confidence, reversibility, rejected options).

### Rules

- Cursor may make a **strong, opinionated** recommendation, but must distinguish **recommendation** from **authorization**.
- Cursor must **not implement** unless the user gives the **exact approval phrase** for the recommended safe slice (sensitive batches: `APPROVED TO IMPLEMENT: <batch-name>`).
- Do **not** treat vague approval (“go ahead”, “looks good”, “proceed”) as implementation permission on sensitive or runtime batches.
- Cursor must **not** recommend broad parent batches when a **smaller safe slice** exists.
- Apply the [Smallest Safe Slice Protocol](#smallest-safe-slice-protocol) **before** recommending implementation.
- Apply the [Improvement Discovery and Backlog Triage Protocol](#improvement-discovery-and-backlog-triage-protocol) when new issues are found; list them separately — do not expand the recommended batch scope.
- Apply the [Sensitive Batch Gate](#sensitive-batch-gate) for auth, billing, RLS, demo, imports/apply, data deletion, tenant isolation, invitations, migrations, Prisma, or destructive actions.
- Do **not** update `roadmap-todo.md` or `current-state.md` based only on speculative ideas.
- When durable memory updates are needed, **propose exact wording** per the [Memory Update Protocol](#memory-update-protocol); do not apply prematurely.
- Be **evidence-based** (paths, grep, memory docs, tests) — mark weak evidence as **needs confirmation**.
- Do **not** classify runtime **admin** UI or sensitive-adjacent work as **D3** autonomous execution (see D3 calibration under [Decision Recommendation Protocol](#decision-recommendation-protocol)).

### Example

**User asks:** “What should we do next?”

Cursor must **not** answer vaguely (e.g. “we could do import export or people management”).

Cursor should compare realistic candidates aligned with memory, for example:

- `import-export-ui-students-export-v1`
- `people-management-invitations-on-student-record-v1`
- `supabase-rls-data-api-policy-matrix-docs-v1`

Then **recommend one**, explain why (product value, risk, sequencing), reject alternatives with reasons, fence scope, and end with the exact phrase, for example:

```text
APPROVED TO IMPLEMENT: import-export-ui-students-export-v1
```

(Use the actual recommended slice name — not a placeholder unless the slice is genuinely undecided and more inspection is required.)

## Communication and Project Language Protocol

### Purpose

Keep **conversation with Rui** in Portuguese (Portugal) while keeping **engineering artifacts** and the **product UI baseline** in English for consistency, reviewability, and future **i18n**.

### Rules

- **Conversation with Rui** (product owner) should be in **Portuguese (Portugal)** by default.
- **Engineering artifacts** remain in **English**: code, identifiers, branches, commits, tests, APIs, DTOs, technical docs, architecture docs, runbooks, and internal comments.
- **Product UI baseline** is **English by default** (admin, student, instructor, and public product surfaces).
- **Future localization** (including Portuguese) should go through **i18n / a language selector**, not ad-hoc literals scattered in components.
- **Avoid hardcoded Portuguese UI labels** in components unless explicitly approved as a **temporary exception**.
- **User-facing Portuguese** belongs in **translation resources** once i18n exists — not as the default pattern of component literals today.
- Cursor must **not** translate code identifiers, route names, API fields, or schema names into Portuguese.
- Cursor **may** explain English technical terms in Portuguese when talking to Rui.
- If Rui requests Portuguese UI, **recommend i18n/localization** rather than new hardcoded Portuguese strings, unless the batch explicitly approves a temporary exception.

### Examples

| Context | Language | Example |
| ------- | -------- | ------- |
| User-facing chat with Rui | Portuguese (Portugal) | “Recomendo começar por exportação de alunos (slice v1).” |
| Branch name | English | `import-export-ui-students-export-v1` |
| Commit message | English | `feat: add student export buttons` |
| Architecture / ops docs | English | `docs/architecture/current-state.md` |
| Internal variable | English | `appAccounts` — **not** `contasDaApp` |
| Product UI baseline label | English | `App accounts` — not hardcoded `Contas da app` in components |
| Portuguese translation (later, via i18n) | Resource file | `Contas da app` in a locale/translation resource, not a JSX literal by default |
| API field / Prisma column | English | `schoolStudentId`, `practicalLessonNumber` |

### Exceptions

- PRs or specs may quote **planned** locale strings when documenting future i18n work.
- **Temporary** hardcoded Portuguese UI copy is allowed only when the user explicitly approves it for a named batch (document the exception and prefer migrating to i18n).
- If Rui explicitly asks for **English chat** for a thread, follow that request for the thread.

## User Suggestion Intake Protocol

### Purpose

When **Rui** (or the product owner) **suggests an improvement**, Cursor must **not** automatically implement it or blindly add it to the roadmap. Cursor triages the suggestion like a **delegated technical lead**: analyze, classify, prioritize, propose backlog wording, and avoid scope creep.

This protocol **extends** the [Improvement Discovery and Backlog Triage Protocol](#improvement-discovery-and-backlog-triage-protocol) and [Delegated Technical Lead Protocol](#delegated-technical-lead-protocol). Apply [Memory Update Protocol](#memory-update-protocol) before editing `roadmap-todo.md` or `current-state.md`.

### Required output format

When processing a user suggestion, Cursor must use this structure:

- **User suggestion:** (quote or paraphrase faithfully)
- **Interpretation:** (what the user likely wants — assumptions explicit)
- **Category:** BUG / RISK / TECH_DEBT / UX / PERF / DX_CI / DOCS / SECURITY / DATA_INTEGRITY
- **Priority:** P0 / P1 / P2 / P3 (or **needs confirmation**)
- **Evidence:** paths, memory docs, grep, tests — not speculation alone
- **Product value:**
- **Engineering impact:**
- **Risk:**
- **Recommended decision:** ACCEPT now / ADAPT / DEFER to backlog / REJECT (with reason)
- **Add to To-Do:** yes / no
- **Proposed roadmap wording:** (exact bullet for `roadmap-todo.md` if yes — do not apply without approval unless batch authorizes memory updates)
- **Recommended batch name:**
- **Smallest safe slice:**
- **In scope:**
- **Out of scope:**
- **Decision level:** D0 / D1 / D2 / D3 / D4
- **Approval required:** Yes / No (and exact approval phrase if implementing now)
- **Next action:**

### Rules

- User suggestions are **valuable product input**, but still require **triage**.
- Apply the [Improvement Discovery and Backlog Triage Protocol](#improvement-discovery-and-backlog-triage-protocol) **before** proposing a To-Do.
- If the suggestion is **urgent** and maps to **P0/P1**, Cursor must explain **why it should interrupt** current sequencing (or why it should not).
- If it is **P2/P3**, Cursor should usually propose adding it to `roadmap-todo.md` as a **deferred** item — not implementing in the current batch.
- If **evidence is weak**, mark **needs confirmation** and state what to inspect next.
- Use the [Memory Update Protocol](#memory-update-protocol) before editing memory docs; **propose exact wording** unless the **current batch explicitly authorizes** memory updates.
- Cursor must distinguish **“recommended To-Do”** from **“implemented now”**.
- Cursor must **not** expand an approved batch scope to satisfy a new suggestion without explicit approval.
- Cursor may be **opinionated** about what is best for the project; separate **recommendation** from **authorization**.
- For suggestions that imply implementation, provide the **exact approval phrase** when gated: `APPROVED TO IMPLEMENT: <batch-name>`.

### Example

**User suggests:** “Devíamos ter importação de alunos diretamente no ecrã de fichas.”

Cursor must **not** immediately edit UI or roadmap. Cursor triages: APIs already exist (`import-export-ui-actions` backend done); gap is UI; recommend slice `import-export-ui-students-import-dry-run-v1` **after** export v1; **Add to To-Do:** only if not already covered; **Proposed roadmap wording** only if a new bullet is needed.

## Cursor Automations Operating Model

Cursor Automations may be used for DAT **only** under the **Super-Agent** operating model: scheduled or event-triggered agents are **owned, configured, and periodically reviewed** by the Cursor Super-Agent (not ad-hoc personal automations that bypass DAT gates).

When Automations are unavailable or not included in the current plan at no extra cost, use the **manual daily Super-Agent fallback** below — same outputs, same gates.

### Plan and Budget Gate

**Rules:**

- Use Cursor Automations **only** if they are available in the **current Cursor plan at no additional cost** (included in Cursor Pro or otherwise free — not paid add-ons, overages, or usage-based automation charges).
- Do **not** recommend upgrading plans, enabling paid overages, usage-based automation, or paid add-ons **unless the user explicitly asks**.
- Before configuring Automations, Cursor must ask the user to **confirm availability** in the current plan, or **inspect Cursor UI/settings** if possible in context.
- If Automations are **not** available, use the **manual daily Super-Agent prompt** (see **Manual fallback** below) — do not block operational guidance on paid features.
- This operating model remains the **target/future plan** for when Automations are free and available; it must **not** create cost pressure or imply a budget for plan upgrades.

**Manual fallback:**

- Run a **daily manual Super-Agent check** in Cursor (same cadence intent as scheduled automations).
- Use the same scope and [Automation output format](#automation-output-format) as the read-only automations below.
- Required coverage in each run:
  - project health (`current-state.md`, `roadmap-todo.md`, recent git history when available);
  - stale `current-state` / `roadmap-todo` vs recently completed work;
  - security-sensitive drift (auth, billing, RLS, demo, import/apply, data deletion, tenant isolation, Prisma/migrations);
  - next recommended batch ([Delegated Technical Lead Protocol](#delegated-technical-lead-protocol));
  - exact approval phrase when implementation is recommended;
  - **no implementation** unless the user provides explicit approval (including `APPROVED TO IMPLEMENT: <batch-name>` when gated).

Label manual runs in the output (e.g. **Automation name:** `Manual daily Super-Agent check`).

### Initial automation posture

Progression must be deliberate:

1. **Start read-only** — analysis and reports only; no repo writes.
2. **Then PR-only** (future) — open pull requests when explicitly approved; still no direct merge.
3. **Never automatic:**
   - merge;
   - production deploy;
   - migrations (`prisma migrate deploy`, `migrate dev`, `migrate reset`);
   - auth, billing, RLS/grants, demo policy, import/apply, or data-deletion behavior changes;
   - writes to `roadmap-todo.md` or `current-state.md` without [Memory Update Protocol](#memory-update-protocol) and explicit approval.

All automation outputs must **distinguish recommendation from authorization** (same bar as [Delegated Technical Lead Protocol](#delegated-technical-lead-protocol) and [Sensitive Batch Gate](#sensitive-batch-gate)).

### Recommended initial cadence

- **Daily** — DAT is worked on daily and there is urgency toward **Production v1** (client target around **August**). Daily read-only **Automations** (when [Plan and Budget Gate](#plan-and-budget-gate) allows) or the **manual Super-Agent fallback** support operational guidance without expanding autonomous write scope.

### Initial safe automations (read-only v1)

| # | Automation | Behavior |
| - | ---------- | -------- |
| 1 | **Daily DAT Project Health Summary** | Reads `current-state.md`, `roadmap-todo.md`, and recent git history when available; reports stale docs, failed assumptions, top risks, and next recommended batch. **No file edits.** |
| 2 | **Daily Next Batch Recommendation** | Applies [Delegated Technical Lead Protocol](#delegated-technical-lead-protocol); compares top **3** options; recommends **one** smallest safe slice; provides exact approval phrase. **No implementation.** |
| 3 | **Daily Security-Sensitive Drift Review** | Checks whether new TODOs, roadmap items, or diffs mention auth, billing, RLS, demo, import/apply, data deletion, tenant isolation, Prisma/migrations; reports risk classification. **No code changes.** |
| 4 | **Daily Roadmap/Memory Freshness Check** | Compares `current-state.md` and `roadmap-todo.md` against recently completed batches; proposes **exact wording only** for memory updates. **No edits without approval.** |
| 5 | **Weekly Automation Rules Review** | Reviews the automations themselves (prompts, triggers, scope) and proposes updates if project workflow changed. **No automatic changes.** |

Later (only after read-only mode proves reliable): evaluate **PR-only** automations for approved, fenced batches — still subject to [Final Evidence Pack](#final-evidence-pack) and [Implementation Conformance Matrix](#implementation-conformance-matrix).

### Automation output format

Every automation run must use this structure:

- **Automation name:**
- **Trigger/cadence:**
- **Inputs inspected:**
- **Findings:**
- **Risks:**
- **Recommended next action:**
- **Approval phrase, if implementation is recommended:** (e.g. `APPROVED TO IMPLEMENT: <batch-name>` — never implied as already granted)
- **Memory update proposed:** yes/no
- **Exact memory wording, if any:** (propose only; do not apply without approval)
- **Files changed:** `none`, unless explicitly **PR-only** and approved for that run
- **Confidence:** High / Medium / Low
- **Limitations:**

### Rules

- Automations may **recommend strongly** but must **not authorize themselves** (no “approved to implement” unless the human pasted the phrase).
- If an automation opens a PR in the future, the PR description must include **Final Evidence Pack** and **Implementation Conformance Matrix** per this document.
- Any automation touching **sensitive areas** (see [Sensitive Batch Gate](#sensitive-batch-gate)) must **stop at analysis** unless the exact approval phrase is provided in the same thread/run context.
- Automations are **managed by the Super-Agent** and reviewed on the **weekly** rules-review cadence (automation #5 above).
- If **high-load** or **model-switch interruptions** are known to affect reliability, report them in the automation output under **Limitations**.
- Automation prompts and runbooks live in [cursor-automations-prompts.md](./cursor-automations-prompts.md) (v1 templates) — not scattered in unreviewed personal settings.

### Relationship to existing protocols

| Protocol | Automation use |
| -------- | -------------- |
| [Delegated Technical Lead Protocol](#delegated-technical-lead-protocol) | Required for daily next-batch recommendation (#2). |
| [Memory Update Protocol](#memory-update-protocol) | Required before any memory doc edit; automations propose wording only (#4). |
| [Sensitive Batch Gate](#sensitive-batch-gate) | Blocks autonomous implementation on sensitive topics (#3). |
| [Final Evidence Pack](#final-evidence-pack) / [Implementation Conformance Matrix](#implementation-conformance-matrix) | Required for any future PR-only automation output. |
| [Improvement Discovery and Backlog Triage Protocol](#improvement-discovery-and-backlog-triage-protocol) | Use when automations surface new risks; do not auto-add to roadmap. |
| [Git Bash Command Discipline Protocol](#git-bash-command-discipline-protocol) | Git Bash default; every battery states `Assumed shell: Git Bash`; no mixed PowerShell/bash. |
| [Human-Controlled Merge Protocol](#human-controlled-merge-protocol) | Automations must not merge/push; manual batteries only. |
| [Daily Branch Housekeeping Protocol](#daily-branch-housekeeping-protocol) | List-only default in daily checks; no autonomous branch deletes. |
| [Memory Consistency Gate](#memory-consistency-gate) | Required in batch close reports; automations flag drift, do not auto-edit memory. |

## Operational memory policy

Durable decisions, workflow changes, migrations, runbooks, client-specific product decisions, and future To-Dos must be reflected in the appropriate docs under `docs/` (architecture and ops), following the [Memory Update Protocol](#memory-update-protocol).

