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
