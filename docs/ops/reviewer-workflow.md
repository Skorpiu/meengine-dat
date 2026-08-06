# DAT Reviewer Workflow

How **Cursor**, the **reviewer/architect**, and the **user** collaborate on DAT batches: scope, safety, validation, and merge readiness.

---

## Roles

| Role | Responsibility |
| ---- | -------------- |
| **Cursor** | Executor in repo — inspect, implement small diffs, run check, report |
| **Reviewer / architect** | Validates architecture, safety, scope, merge readiness |
| **User** | Runs commands, pastes outputs, performs manual QA |

---

## Architecture-first protocol

Before Cursor implements **non-trivial** changes, the executor must **plan first** (reviewer validates the same discipline):

1. Read project memory: [system-design.md](../architecture/system-design.md), [current-state.md](../architecture/current-state.md), [roadmap-todo.md](../architecture/roadmap-todo.md), relevant ops runbooks.
2. Restate **goal and scope**.
3. **Classify the batch:** docs-only, UI-only, API/runtime, migration/schema, security/auth/billing/demo, import/export, tenant/authorization.
4. **Identify risks** before editing: tenant isolation, data loss, schema/runtime mismatch, auth regression, demo/public behavior, email/invitation, import/apply destructiveness, tests/manual QA.
5. List **likely files**, **tests**, and **manual QA**.
6. Implement the **smallest safe** change only after the above.

**Rules:** Plan first, code second. Stop and report before editing if data loss or auth/tenant/security/billing/demo impact is possible. Stop if scope expands. No broad drive-by refactors.

---

## Sensitive batch reviewer expectations

For batches classified as **sensitive** (see [cursor-operating-model.md](./cursor-operating-model.md) — Sensitive Batch Gate), the reviewer must verify:

- **Classification** — sensitive batch classification is correct for the diff and stated scope.
- **Approval gate** — Cursor stopped after the plan when required; implementation began only after explicit approval: `APPROVED TO IMPLEMENT: <batch-name>`.
- **Validation depth** — extra validation matches the risk category (Validation Matrix), not only the generic `check`.
- **Memory updates** — proposed or applied memory changes are not too broad, premature, or misleading (Memory Update Protocol).

**Reject merge readiness** if a sensitive batch skipped the approval gate or implemented without the explicit approval phrase.

## Delegated technical lead reviewer expectations

When Cursor acted as **delegated technical lead** (analysis, prioritization, “what should we do next?” — see [cursor-operating-model.md](./cursor-operating-model.md) — Delegated Technical Lead Protocol), the reviewer must verify:

- **Evidence and alignment** — the recommended next batch is **evidence-based** and aligned with [current-state.md](../architecture/current-state.md) and [roadmap-todo.md](../architecture/roadmap-todo.md) (or the conflict is explicitly reported).
- **Alternatives** — at least **two realistic alternatives** were considered and **rejected with reasons** (not a vague or single-option non-recommendation).
- **Safe slice** — the recommendation uses a **smallest safe slice** name, not a broad parent batch, when a smaller slice exists.
- **Scope fences** — in scope, out of scope, and escalation triggers are present for the recommended slice.
- **Recommendation vs authorization** — Cursor did **not** imply the recommendation is already approved; the **exact approval phrase** is stated when implementation requires it.
- **Priority hierarchy** — P0/P1/P2/P3 classification matches the stated risk and product context.
- **Memory hygiene** — no speculative updates to `roadmap-todo.md` or `current-state.md`; memory proposals follow Memory Update Protocol.

**Reject** the recommendation (ask Cursor to redo analysis) when:

- The answer is **broad, vague, or unranked** without justification (e.g. “several things we could do”).
- A **broad batch** is recommended where a **safe slice** was available.
- The recommendation **pretends to be authorization** (“we will implement X” without user approval phrase).
- **Weak evidence** is presented as confirmed backlog or P0/P1 fact.

## Communication, language, and user suggestion reviewer expectations

When Cursor discussed work with Rui or processed **user-suggested improvements** (see [cursor-operating-model.md](./cursor-operating-model.md) — Communication and Project Language Protocol, User Suggestion Intake Protocol), the reviewer must verify:

- **No untriaged implementation** — Cursor did **not** implement a user suggestion without triage, classification, and explicit approval when required.
- **Roadmap hygiene** — updates to `roadmap-todo.md` from user suggestions include **evidence**, **priority**, and **exact proposed wording**; no speculative bullets without triage.
- **Memory protocol** — `current-state.md` / `roadmap-todo.md` were not edited prematurely; Memory Update Protocol was followed.
- **Recommendation vs authorization** — “good idea” was not treated as “approved to implement now.”
- **Engineering language** — code, identifiers, branches, commits, APIs, and technical docs remain **English**.
- **Product UI baseline** — new UI copy defaults to **English**; aligns with future i18n, not scattered Portuguese literals.
- **Chat vs artifacts** — Portuguese chat with Rui does not justify Portuguese identifiers, API field names, or hardcoded Portuguese UI labels.
- **i18n path** — prefer translation resources over component literals when localization is needed.

**Reject** when:

- A user suggestion appears in the diff without a triage record or approved scope.
- Roadmap gained vague items (“improve UX”) without category, priority, or slice name.
- **New hardcoded Portuguese UI labels** appear unless explicitly approved for the batch or delivered via an **i18n translation resource**.
- UI language changes **conflict with the English product baseline** without documented exception or i18n plan.

## Decision recommendation reviewer expectations

For plan-first or analysis-heavy batches where Cursor provided a recommendation (see [cursor-operating-model.md](./cursor-operating-model.md) — Decision Recommendation Protocol), the reviewer must verify:

- **Recommendation vs authorization separation** — Cursor clearly separated “recommended decision” from “approved decision”.
- **Decision level correctness** — the chosen decision level (D0/D1/D2/D3/D4) matches the actual risk category and scope.
- **D3 calibration** — reject a **D3** classification when the batch touches **admin runtime UI** or **sensitive-adjacent surfaces** (people/users/invitations, auth, billing, demo, import/apply, destructive data, operational history) unless the reason is explicitly justified and harmless (rare; default is not D3).
- **D2 vs D3 vs gate** — verify **D2** is used only for internal choices inside an already approved scope; verify **D3** is not used to bypass the **Sensitive Batch Gate** or skip explicit approval on runtime admin UI.
- **D4 enforcement** — reject merge readiness if Cursor implemented a **D4** decision without explicit approval.
- **Low-confidence handling** — treat **Low** confidence recommendations as requiring more analysis or a smaller spike (do not accept implementation based on low-confidence recommendations).

## Smallest Safe Slice Protocol reviewer expectations

For broad, ambiguous, or cross-cutting proposed work, the reviewer must verify Cursor applied the **Smallest Safe Slice Protocol** (see [cursor-operating-model.md](./cursor-operating-model.md) — Smallest Safe Slice Protocol) **before implementation**:

- **Broad batch detection** — Cursor explicitly stated whether a broad batch was detected (yes/no).
- **Safe-slice naming** — Cursor proposed a smallest-safe v1 slice name and did not “implement the broad batch as originally named” when a safe slice existed.
- **Scope fences** — Cursor listed:
  - in-scope items
  - explicitly out-of-scope items
  - deferred follow-ups
- **Escalation triggers** — Cursor listed triggers that would push the slice into **D4 / Sensitive Gate** (auth, billing, demo behavior, Prisma/migrations, RLS/grants, tenant isolation, destructive actions, import/apply, invitations, operational history).
- **Decision level correctness** — the decision level for the slice matches the actual risk category and touched areas.

**Reject merge readiness** when:

- A broad batch was implemented without a safe-slice plan.
- Out-of-scope fences were violated (scope drift) without explicit reviewer/user approval.
- An escalation trigger occurred but the batch did not stop/reclassify (D4 / Sensitive Gate) and follow the gate requirements.

## Cursor Automations reviewer expectations

When reviewing **Cursor Automations** proposals, configuration, or outputs (see [cursor-operating-model.md](./cursor-operating-model.md) — **Cursor Automations Operating Model**), the reviewer must verify:

- **Unsafe autonomy** — reject automations that can **merge**, **deploy to production**, **run migrations**, or automatically change **auth**, **billing**, **RLS/grants**, **demo**, **import/apply**, or **delete** behavior without human gates.
- **Read-only default** — daily automations are **read-only** unless explicitly approved as **PR-only** for a named, fenced batch.
- **Recommendation vs authorization** — automation output does not imply `APPROVED TO IMPLEMENT` or merge readiness; approval phrases come from the human only.
- **Memory hygiene** — automations do not edit `roadmap-todo.md` or `current-state.md` without Memory Update Protocol and explicit approval.
- **Sensitive areas** — drift reviews and health summaries that touch sensitive topics stop at analysis unless the exact approval phrase is present.
- **PR-only future** — if an automation opens a PR, the PR must include **Final Evidence Pack** and **Implementation Conformance Matrix**.
- **Plan and budget** — proposals do not assume paid features, plan upgrades, overages, or extra budget without **explicit user approval**; verify a **manual daily Super-Agent fallback** exists when Automations are unavailable (see **Plan and Budget Gate** in operating model).

**Reject** automation designs or runs when:

- They assume **paid** Cursor features, plan upgrades, usage-based automation charges, or add-ons **without explicit budget approval**.
- They bypass **Sensitive Batch Gate**, **Delegated Technical Lead Protocol**, or **Memory Update Protocol**.
- They perform writes (commits, memory edits, schema/runtime changes) outside an explicitly approved PR-only scope.
- They conflate “recommended next batch” with “authorized to implement.”
- No **manual fallback** is documented when Automations are not available on the current plan.

## Improvement discovery reviewer expectations

When Cursor reports discoveries during a batch (see [cursor-operating-model.md](./cursor-operating-model.md) — Improvement Discovery and Backlog Triage Protocol), the reviewer must verify:

- **Scope discipline** — Cursor did **not** improperly expand the approved batch scope to fix discovered improvements (check diff vs stated scope).
- **Deferred recommendations** — out-of-scope findings are listed under **Deferred recommendations** with category, priority, and evidence — not hidden as drive-by fixes.
- **Evidence and priority** — proposed To-Dos or roadmap items have **concrete evidence** and a justified **P0–P3** priority; reject vague or speculative backlog entries.
- **Roadmap/current-state hygiene** — reject memory updates based on weak or unconfirmed observations; memory changes must follow Memory Update Protocol.
- **Safe slices** — accepted improvements are proposed as **smallest safe slices**, not broad refactors, unless explicitly approved.

**Reject merge readiness** when:

- The diff fixes improvement discoveries that were **not** in approved scope without explicit user/reviewer approval.
- `roadmap-todo.md` or `current-state.md` gained speculative items without evidence or approval.

### Final evidence and critical claims

**Reject merge readiness** when:

- The **Final Evidence Pack** is missing (see [cursor-operating-model.md](./cursor-operating-model.md) — Final Evidence Pack).
- The provided patch is **empty**, **stale**, or does not match `git status --short` (including untracked `??` files not shown by plain `git diff`).
- **Staged vs unstaged** outputs disagree and the report does not explain both.
- A **critical claim** lacks direct evidence (grep, diff hunk, test name) per Critical Claim Evidence Protocol.

For **destructive / data-sensitive** batches, verify the stated mitigation (e.g. row lock, cascade guard, tenant scope) appears in the **diff** and is covered by **tests** — not only in the narrative.

Do not approve merge readiness based on prose summary alone.

## Git Bash command discipline reviewer expectations

When Cursor provides command batteries or runs terminal steps (see [cursor-operating-model.md](./cursor-operating-model.md) — **Git Bash Command Discipline Protocol** and [command-batteries.md](./command-batteries.md) — **Shell convention**), the reviewer must verify:

- **Assumed shell line** — every command battery states `Assumed shell: Git Bash` immediately before the fenced block.
- **No mixed syntax** — batteries do not mix PowerShell, CMD, and Git Bash in the same block.
- **Close/merge copy-paste safety** — close/merge batteries are copy-paste-safe for **Git Bash** (simple blocks; prefer single-line Conventional Commit messages).
- **ZIP / archive** — use `SHA=$(git rev-parse --short HEAD)` (bash command substitution), not PowerShell variables (e.g. `$sha = git rev-parse --short HEAD` or `"DAT-$sha.zip"`).
- **Delete commands** — use `rm -f` (e.g. `rm -f DAT-*.zip`), not `Remove-Item`.
- **Multi-line `git add`** — use bash backslash line continuations (`\` at end of line), not PowerShell backtick continuations.
- **Bash fences** — executable blocks use `bash` syntax from [command-batteries.md](./command-batteries.md); no PowerShell/cmd unless explicitly labeled exception.
- **No doc-path commands** — nothing tries to “run” `docs/...`, `@docs/...`, or markdown file paths as shell commands.
- **ZIP naming** — no `DAT-.zip`; confirm non-empty `SHA` before `git archive`; do not commit `DAT-*.zip`.
- **Agent execution** — if Cursor ran shell commands, they were bash-compatible or explicitly wrapped for bash; migration/ZIP/git-archive steps were not silently run with PowerShell-only syntax.

**Reject merge readiness** when:

- Command batteries **mix PowerShell, CMD, and Git Bash** syntax.
- A battery is **missing** `Assumed shell: Git Bash`.
- Close/merge commands are **not** copy-paste-safe for Git Bash (heredocs, mixed shells, or complex PowerShell-only constructs without justification).
- ZIP/archive uses **PowerShell variable syntax** instead of `SHA=$(git rev-parse --short HEAD)`.
- Delete steps use **`Remove-Item`** instead of `rm -f`.
- Multi-line `git add` uses **PowerShell backticks** instead of bash `\` continuations.
- Prose or documentation paths appear inside executable shell blocks without `#` comment prefixes.
- The manual battery contradicts [command-batteries.md](./command-batteries.md) or the operating model Git Bash protocol.

## Human-controlled merge reviewer expectations

When Cursor closes a batch (see [cursor-operating-model.md](./cursor-operating-model.md) — **Human-Controlled Merge Protocol**), the reviewer must verify:

- **Manual battery provided** — reject merge readiness if Cursor does **not** provide a **complete** manual close/merge command battery for Rui to run (all steps in [command-batteries.md](./command-batteries.md) — Human-controlled close/merge battery).
- **Prepare next recommended branch** — reject if the final report is **missing** the section titled **Prepare next recommended branch** with `git pull --ff-only`, `git switch -c <branch>`, and `git status --short`; reject if the branch name contradicts `current-state.md` / `roadmap-todo.md` without explanation.
- **No autonomous merge/push** — verify Cursor did **not** run `git commit`, `git switch main`, `git pull`, `git merge`, `git push`, `git branch -d`, or `git archive` unless Rui **explicitly requested** Cursor to run those commands in the local repo.
- **Battery accuracy** — verify the command battery matches the **actual changed files** and the **correct branch name** (not stale paths or a wrong branch).
- **Conventional Commits** — verify the proposed commit message is **single-line** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) — no multiline heredocs.
- **Shell** — batteries state **`Assumed shell: Git Bash`** and use Bash syntax only.
- **Merge readiness criteria** — verify scope, validation, Final Evidence Pack, Implementation Conformance Matrix (when applicable), **Memory Consistency Gate**, memory-docs answer, and forbidden-area confirmations before treating the batch as merge-ready.

**Reject merge readiness** when:

- Cursor executed merge/push without explicit user request.
- The manual battery is **missing or incomplete** (e.g. no pre-staging status, no staged diff stat, no `pnpm check`, no ZIP + final status, no **Prepare next recommended branch**).
- The manual battery uses blind `git add -A` without justification when only specific paths changed.
- The battery references files or a branch that do not match the evidence pack.
- The battery violates **Git Bash command discipline** (PowerShell syntax, doc paths as commands, multiline commit heredocs, or invalid ZIP steps) — see Git Bash command discipline reviewer expectations above.

## Daily Branch Housekeeping reviewer expectations

When Cursor reports branch hygiene (see [cursor-operating-model.md](./cursor-operating-model.md) — **Daily Branch Housekeeping Protocol**), the reviewer must verify:

- **List-only default** — on `main`, includes `git pull --ff-only`, `git fetch --prune`, merged/unmerged **local** branch lists, and final `git status --short`; no automatic deletes.
- **Unmerged safety** — reject advice that deletes or force-deletes **unmerged** local branches by default.
- **Remote safety** — reject advice that deletes **remote** branches unless Rui explicitly requested remote cleanup.

**Reject** branch housekeeping output when:

- Cursor proposes `git branch -D`, bulk remote deletion, or `git push origin --delete` without explicit user request.
- Cursor deletes branches autonomously instead of listing/suggesting.

## Memory Consistency Gate reviewer expectations

For **every** batch final report (see [cursor-operating-model.md](./cursor-operating-model.md) — **Memory Consistency Gate**), the reviewer must verify:

- All eight gate rows are present with **yes** / **no** / **why not** (not skipped).
- **Done vs Pending/Deferred** — if “both Done and Pending” is **yes**, reject merge readiness until memory docs or rules are reconciled (or the contradiction is explicitly approved and scoped).
- **alwaysApply drift** — if `architect-mode.mdc` (or other always-on rules) still list a **completed** batch as “current recommended next”, reject until synced or explained.

**Reject merge readiness** when:

- The **Memory Consistency Gate** section is missing from the final report.
- Memory contradictions are reported **yes** but not fixed or explicitly deferred with approval in the same batch.

### Plan-to-implementation conformance (Implementation Conformance Matrix)

For **runtime / API / UI / sensitive** batches, the reviewer must verify the **Implementation Conformance Matrix** exists (see [cursor-operating-model.md](./cursor-operating-model.md) — Implementation Conformance Matrix) and that it is supported by evidence.

**Reject merge readiness** when:

- Approved requirements are missing from the matrix.
- The matrix claims **DONE** but there is no supporting diff/grep/test evidence.
- The matrix reports **CHANGED FROM PLAN** but the report does not state whether the deviation needs explicit user/reviewer approval.
- A **sensitive** batch includes deviations that were not explicitly approved.

---

## External advice review protocol (ACCEPT / ADAPT / DEFER / REJECT)

Any recommendation coming from AI (ChatGPT/Cursor), audits, tools, or external sources must be reviewed against the **actual repository state** and classified point-by-point:

- **ACCEPT**: correct and safe to apply now.
- **ADAPT**: useful but must be changed to fit DAT (contracts, constraints, conventions).
- **DEFER**: valid, but belongs to a future batch (or needs prerequisites).
- **REJECT**: wrong, stale, unsafe, or not worth doing.

Applies to:

- external advice
- audits
- Cursor suggestions
- broad refactor proposals
- AI-generated recommendations

If a recommendation is good practice but not appropriate right now, explicitly state:

> “This is good practice, but not for this batch.”

---

## Memory maintenance policy

Update operational memory when state changes **durably** (closed batch, migration, domain/product/security decision, command or QA workflow change, new P1–P3 To-Do, clarified contract, recurring risk).

Do **not** update for trivial chat or duplicate notes.

| Target | Use for |
| ------ | ------- |
| `current-state.md` | Closed work, validated QA |
| `system-design.md` | Durable domain/architecture rules |
| `roadmap-todo.md` | Backlog |
| `command-batteries.md` | Commands |
| `git-tags-and-recovery-runbook.md` | Tag categories, recovery commands, backup boundaries |
| `preview-qa-runbook.md` | Preview/demo/QA |
| `reviewer-workflow.md` | This workflow |
| `architect-mode.mdc` | Agent rules |

Every Cursor **final report** must include: **“Memory docs update needed: yes/no”** and which files, if any. If the batch itself changes architecture/workflow/state, update memory in the **same docs-only batch** or schedule an explicit follow-up before merge.

---

## Batch workflow

1. Define **batch goal**.
2. Confirm **scope**.
3. Cursor **inspects** codebase.
4. Cursor **proposes or implements** small change.
5. Cursor runs **canonical check**.
6. Cursor **reports:**
   - files changed
   - migrations
   - dependencies
   - tests
   - runtime behavior
   - limitations
   - manual test recommendations
   - **memory docs update needed (yes/no)** and which files
   - **Final Evidence Pack** (git status + staged/unstaged diffs) for runtime/API/UI/sensitive batches
   - **Critical Claim Evidence** for security, tenancy, deletion, import/apply, or mitigation claims
7. User **pastes output**.
8. **Reviewer validates**.
9. If needed, reviewer asks for **ZIP / diff / manual tests**.
10. **Only then** merge.

---

## Strict rules

- **No merge** if check fails.
- **No push** if check fails after merge.
- **No hidden broad refactor.**
- **No opportunistic cleanup** in unrelated areas.
- **No production migration** without explicit command.
- **No secrets** in outputs.
- **No changing** demo / auth / email / billing / security policies inside unrelated product batches.
- If **ambiguity** appears, **stop and report**.

---

## How to ask Cursor for major changes

Start prompts with:

> Read @docs/architecture/system-design.md, @docs/architecture/current-state.md and @docs/architecture/roadmap-todo.md first. Use Plan Mode. Before editing, identify the scope, risks, files likely to change, tests needed and manual QA needed. Do not implement until the plan is clear.

For Preview QA or deploy: also reference @docs/ops/command-batteries.md and @docs/ops/preview-qa-runbook.md.

---

## What good Cursor reports include

- **Root cause**, not only summary.
- **Files changed.**
- **Why** the change is minimal.
- **What was intentionally not changed.**
- **Commands run.**
- **Exact result** of `pnpm -C driving_school_platform/nextjs_space check`.
- **Manual test checklist** when UI/API behavior changed.
- **Final Evidence Pack** (`git status --short`, unstaged and staged diff stats/names) when the batch touches runtime/API/UI or sensitive areas.
- **Critical Claim Evidence** (claim + paths/grep/diff/test) for locks, tenancy, dry-run/apply semantics, and “unchanged” security/schema/demo assertions.

---

## When to create ZIP

Create a `DAT-<sha>.zip` ([command-batteries.md](./command-batteries.md)) when:

- Reviewer **asks**.
- **Runtime code** changed substantially.
- **Migrations** changed.
- **Security / auth / billing / tenant / demo** behavior changed.
- **Manual code inspection** is needed before merge.

ZIP must **not** be committed. Do not merge before review if reviewer requested ZIP.

---

## Before reviewing code (reading order)

1. [system-design.md](../architecture/system-design.md)
2. [current-state.md](../architecture/current-state.md)
3. [roadmap-todo.md](../architecture/roadmap-todo.md)

---

## Batch intake checklist

| Question | Pass criteria |
| -------- | ------------- |
| **Goal** | One sentence matches PR / batch description |
| **Scope** | No unrelated refactors, renames, formatting sweeps |
| **Files** | No surprise `.env`, Vercel, migration files |
| **Tenancy** | No `organizationId` from body/query/file |
| **Auth** | No casual weakening of signup, rate limits, RLS, tokens |
| **Demo** | Unchanged unless batch owns it |
| **Migrations** | Only if requested; SQL reviewed |
| **Secrets** | None in diff or docs |
| **Check** | `pnpm -C driving_school_platform/nextjs_space check` green |
| **Shell discipline** | Every battery has `Assumed shell: Git Bash`; no mixed PowerShell/CMD/bash; `rm -f` not `Remove-Item`; `SHA=$(...)` not PowerShell `$sha`; `\` not backticks for `git add`; close/merge copy-paste-safe |

---

## Domain red flags (block or escalate)

- Client-supplied **tenant ID** for writes.
- **Lesson.studentId** or invitation accept uses **User.id** instead of **Student.id**.
- **Lesson.instructorId** stores **User.id**.
- **Student import** creates User or sends email.
- Exposes **passwordHash**, **tokenHash**, raw tokens, raw provider errors.
- **Cleanup/mutation on GET** lesson lists.
- **Import apply** on public demo without sandbox controls.
- **DAT_3.7 UX** batch with undeclared auth/billing/demo changes.
- **Destructive** Prisma/SQL without operator approval.

---

## Student / lesson / import review points

- Manual students: optional `userId`; import default `MANUAL_ONLY`.
- Practical numbers: **DRIVING** only; counter respects **MANUAL** / **IMPORT**.
- Dry-run = **zero-write**; apply = **all-or-nothing**, create-only (baseline).
- Export: `;` CSV, `YYYY-MM-DD` dates, no sensitive fields.
- Invitation from ficha links existing Student; accept → no duplicate Student.

---

## Approve when

- Check and required **Preview QA** passed.
- Scope matches roadmap or explicit request.
- Behavior change documented (before/after for operators).
- Migrations: **migrate status** noted for target env.
- No open P0 security/tenancy issues.

---

## Request changes when

- Missing tests for non-trivial tenancy/import logic.
- Undocumented auth/demo/import contract changes.
- UX batch secretly changes API shapes.
- Public contract changed but docs not updated.

---

## Agent-specific rules

- **Docs-only batches:** no runtime, schema, dependencies, or tests (unless formatting only).
- No drive-by refactors.
- Uncertain host/DB target → **stop and report**.
- Align with `.cursor/rules/architect-mode.mdc` and `01-dat-workflow.mdc`.

---

## Related

- [preview-qa-runbook.md](./preview-qa-runbook.md)
- [command-batteries.md](./command-batteries.md)
- `.cursor/rules/architect-mode.mdc`
- `.cursor/rules/02-dat-guardrails.mdc`
- `driving_school_platform/nextjs_space/docs/engineering/engineering-excellence-audit.md`

<!-- engineering-quality-review-reviewer-expectations-v1 -->
## Engineering Quality Review reviewer expectations

Before accepting completion or merge readiness, the reviewer must verify that the Engineering Quality Review Protocol in `cursor-operating-model.md` was applied proportionally to the actual slice.

Verify:

- applicable dimensions are explicitly reviewed;
- `NOT_APPLICABLE` entries contain scope-based reasons;
- evidence supports each `PASS`, `RISK`, or `NEEDS_CONFIRMATION` result;
- signals such as file size, hook counts, or keyword matches were not presented as findings without context;
- correctness, security, tenant isolation, data integrity, and approved critical requirements have no unresolved applicable risk;
- UI work considered accessibility, usability, responsiveness, performance, maintainability, and testability where relevant;
- API/data work considered contracts, authorization, integrity, concurrency, reliability, observability, and rollback where relevant;
- out-of-scope findings were reported as Deferred recommendations instead of drive-by fixes;
- reversibility and the safe recovery path are stated for consequential changes.

Reject merge readiness when:

- a materially applicable dimension was silently omitted;
- `NOT_APPLICABLE` is used without a credible scope reason;
- a critical result is `RISK` or `NEEDS_CONFIRMATION` without explicit resolution or approved deferral;
- a finding relies only on a proxy metric or generic best practice;
- quality findings caused unapproved scope expansion;
- the stated rollback or recovery path is unsupported for a consequential change.
