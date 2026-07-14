# DAT Command Batteries

Copy-paste command sets for branch workflow, validation, migrations, Vercel Preview, and local development.

**Never paste real secrets** (`DATABASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, Postmark keys, persona passwords) into docs, tickets, or chat.

On **Windows**, run every block in **Git Bash** (recommended) or **WSL bash**. Adjust `cd` paths if your clone is not under `~/Downloads/Projects/driving-academy-tool`.

See [cursor-operating-model.md](./cursor-operating-model.md) — **Git Bash Command Discipline Protocol**.

---

## Shell convention

- DAT command batteries assume **Git Bash**.
- Use **Bash syntax only**.
- Do **not** provide PowerShell syntax unless explicitly requested.
- All command batteries should start with:

  `Assumed shell: Git Bash`

- Use simple, **copy-paste-safe** command blocks (single-line commits where possible; see operating model).

### Git Bash examples

Assumed shell: Git Bash

```bash
git add \
  file1 \
  file2
```

Assumed shell: Git Bash

```bash
rm -f DAT-*.zip

SHA=$(git rev-parse --short HEAD)
git archive --format=zip --output "DAT-${SHA}.zip" HEAD
```

### Do not use in Git Bash

- PowerShell backtick line continuations
- `Remove-Item`
- `$sha = git rev-parse --short HEAD`
- `git archive --format=zip --output "DAT-$sha.zip" HEAD`

Additional rules (all batteries in this doc):

| Rule | Detail |
| ---- | ------ |
| **Fence language** | ` ```bash ` only (not `powershell`). |
| **No doc paths as commands** | Never paste `docs/...` or `@docs/...` as shell commands. |
| **ZIP guard** | Confirm `SHA` is non-empty before archive; never commit `DAT-.zip` or `DAT-*.zip`. |

**PowerShell is out of scope** unless a separate runbook explicitly labels a Windows-only exception (for example some paths in `driving_school_platform/nextjs_space/docs/ops/`).

---

## Canonical check

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space check
```

Runs lint, typecheck, test:run, and build. Use before commit, ZIP, merge, push, and Preview deploy. Same expectation as GitLab CI.

**Sensitive batches:** classify risk and stop after the plan; do not implement until the user approves with `APPROVED TO IMPLEMENT: <batch-name>`. See [cursor-operating-model.md](./cursor-operating-model.md).

**Plan-first / analysis-only batches:** when providing a “what I would do” recommendation, use the **Decision Recommendation Protocol** (decision levels D0–D4) in [cursor-operating-model.md](./cursor-operating-model.md). **D3** is not for admin runtime UI or sensitive-adjacent surfaces — see D3 calibration in that doc.

**Choosing or justifying the next DAT batch:** when asking Cursor to pick or defend the **best next batch**, use the **Delegated Technical Lead Protocol** in [cursor-operating-model.md](./cursor-operating-model.md) — one clear recommendation, rejected alternatives, smallest safe slice, and the exact `APPROVED TO IMPLEMENT: <batch-name>` phrase when gated.

**Discussing work with Rui / processing suggested improvements:** use **Communication and Project Language Protocol** (Portuguese chat with Rui; English engineering artifacts and **English product UI baseline** until i18n) and **User Suggestion Intake Protocol** (triage before roadmap or implementation) in [cursor-operating-model.md](./cursor-operating-model.md).

**Broad plan-first batches:** when the recommended batch is broad/ambiguous/cross-cutting, apply the **Smallest Safe Slice Protocol** (propose the smallest safe v1 slice) before implementation. See [cursor-operating-model.md](./cursor-operating-model.md).

**Discoveries during a batch:** when Cursor finds new issues or improvement opportunities while implementing or reviewing, use the **Improvement Discovery and Backlog Triage Protocol** in [cursor-operating-model.md](./cursor-operating-model.md) — report under **Deferred recommendations**; do not expand scope or update memory prematurely.

**Cursor Automations / scheduled agents:** read **Cursor Automations Operating Model** in [cursor-operating-model.md](./cursor-operating-model.md) — confirm **Plan and Budget Gate** (no extra cost on current plan); if unavailable, use **manual daily Super-Agent** fallback; start read-only, Super-Agent managed, no auto-merge/deploy/migrations/sensitive writes. **Copy-paste prompts:** [cursor-automations-prompts.md](./cursor-automations-prompts.md) (v1 templates).

---

## Evidence Pack commands

Run before a **final report** on runtime/API/UI/data-sensitive batches (paste outputs into the report):

Assumed shell: Git Bash

```bash
git status --short
git --no-pager diff --stat
git --no-pager diff --cached --stat
git --no-pager diff --name-only
git --no-pager diff --cached --name-only
```

**Notes:**

- Use `git diff --cached` for **staged** patches; use `git diff` for **unstaged** patches.
- When in doubt, provide **both**.
- Untracked files (`??`) are not listed by plain `git diff` — list them from `git status --short` explicitly.
- Do **not** commit generated `.diff` or `.zip` artifacts (e.g. `DAT-*.zip`).

See [cursor-operating-model.md](./cursor-operating-model.md) (Final Evidence Pack, Critical Claim Evidence Protocol).

**Note:** For runtime/API/UI/sensitive batches, the final report should include **both**:

- the Final Evidence Pack outputs above, and
- the **Implementation Conformance Matrix** (see [cursor-operating-model.md](./cursor-operating-model.md)).

---

## Start branch

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git switch main
git pull --ff-only
git status --short

git switch -c <branch-name>
```

**Branch naming:**

- Do not include `dat` or version numbers in branch names.
- Use purpose-based names, for example:
  - `student-record-delete-policy`
  - `import-export-ui-actions`
  - `people-management-ux-unification`
  - `operational-memory-foundation`

---

## Commit + ZIP for validation

Assumed shell: Git Bash

```bash
git status --short

pnpm -C driving_school_platform/nextjs_space check

git add -A
git commit -m "<commit message>"

rm -f DAT-*.zip

SHA=$(git rev-parse --short HEAD)
test -n "$SHA" && git archive --format=zip --output "DAT-${SHA}.zip" HEAD || echo "SHA missing — fix before archive"

git status --short
```

**Notes:**

- If `SHA` is empty, stop — do not create `DAT-.zip`.
- Commit messages follow **Conventional Commits**:
  - `feat:`
  - `fix:`
  - `docs:`
  - `refactor:`
  - `test:`
  - `chore:`
  - `ci:`
  - `build:`

Examples:

- `docs: add cursor operating model`
- `feat: add safe student record delete action`
- `fix: prevent duplicate practical lesson numbers`
- `refactor: clarify instructor id boundaries`
- `test: cover student import duplicate handling`

- Use ZIP when reviewer asks for code validation.
- ZIP must **not** be committed.
- Do not merge before review if reviewer requested ZIP.

---

## Amend after micro-fix + ZIP

Assumed shell: Git Bash

```bash
git status --short

pnpm -C driving_school_platform/nextjs_space check

git add -A
git commit --amend --no-edit

rm -f DAT-*.zip

SHA=$(git rev-parse --short HEAD)
test -n "$SHA" && git archive --format=zip --output "DAT-${SHA}.zip" HEAD || echo "SHA missing — fix before archive"

git status --short
```

---

## Human-controlled close/merge battery

**Default DAT workflow:** Rui runs this battery manually after Cursor validates the batch and provides a **filled-in, complete** version (paths, branch name, commit message). Cursor must **not** execute these commands by default. See [cursor-operating-model.md](./cursor-operating-model.md) — Human-Controlled Merge Protocol.

Template (replace `<paths>`, `<type>`, `<message>`, `<branch-name>`, and `<new-recommended-branch>`):

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git status --short
git --no-pager diff --stat

git add <paths>

git status --short
git --no-pager diff --cached --stat

git commit -m "<type>: <message>"

git switch main
git pull --ff-only
git merge --no-ff <branch-name> -m "Merge branch '<branch-name>'"

pnpm -C driving_school_platform/nextjs_space check

git push
git branch -d <branch-name>

rm -f DAT-*.zip
SHA=$(git rev-parse --short HEAD)
test -n "$SHA" && git archive --format=zip --output "DAT-${SHA}.zip" HEAD || echo "SHA missing — fix before archive"

git status --short
```

**Rules:**

- Cursor fills in `<paths>` from the actual batch diff — prefer specific paths over blind `git add -A`.
- Commit messages follow **Conventional Commits** — **single-line** only, e.g. `git commit -m "docs: …"` (no multiline heredocs).
- Every step in the block must appear in Cursor’s final report battery — omissions are incomplete.
- If check fails after merge, do not push (or revert before push if already merged locally).
- If `git pull` fails, resolve auth/sync first; paste error to reviewer.
- ZIP must **not** be committed.
- If Rui explicitly asks Cursor to run this battery, Cursor must restate risks, command plan, and working tree state first.

---

## Prepare next recommended branch

Run on **`main`** after the close/merge battery above (merge and push succeeded). Use the **concrete** next slice name from `current-state.md` / `roadmap-todo.md` when known.

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git pull --ff-only
git switch -c <new-recommended-branch>
git status --short
```

**Rules:**

- Branch name = smallest safe **next** slice (e.g. `import-export-ui-practical-lessons-import-apply-v1`), not a broad parent batch.
- Creating the branch is **not** approval to implement — gated slices still need `APPROVED TO IMPLEMENT: <batch-name>`.

---

## Daily branch housekeeping battery

**Default: list only** — no deletes unless Rui explicitly asks. See [cursor-operating-model.md](./cursor-operating-model.md) — Daily Branch Housekeeping Protocol.

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git switch main
git pull --ff-only
git fetch --prune

echo "--- Merged into main (local) ---"
git branch --merged main

echo "--- Not merged into main (local) ---"
git branch --no-merged main

git status --short
```

**Rules:**

- **Default: list only / dry-run** — no branch deletes unless Rui explicitly asks.
- Cursor may **suggest** `git branch -d <name>` only for branches listed under **merged**.
- Do **not** suggest `-D`, remote deletes, or deleting **unmerged** branches by default.
- Do **not** run delete commands unless Rui explicitly requests execution.

---

## Merge approved batch

Legacy shorthand (prefer **Human-controlled close/merge battery** above for full staging/evidence/ZIP flow):

Assumed shell: Git Bash

```bash
git status --short

rm -f DAT-*.zip

git switch main
git pull --ff-only

git merge --no-ff <branch-name> -m "Merge branch '<branch-name>'"

pnpm -C driving_school_platform/nextjs_space check

git push

git branch -d <branch-name>
```

**Rules:**

- If check fails, do not push.
- If `git pull` fails, resolve auth/sync first.
- Paste error to reviewer.
- **Rui runs merge/push by default** — see Human-controlled close/merge battery.

---

## Migration battery

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git switch main
git pull --ff-only
git status --short

unset DATABASE_URL
unset DIRECT_URL

set -a
source driving_school_platform/nextjs_space/.env
set +a

test -n "$DATABASE_URL" && echo "DATABASE_URL ok" || echo "DATABASE_URL missing"
test -n "$DIRECT_URL" && echo "DIRECT_URL ok" || echo "DIRECT_URL missing"
```

Then:

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space exec prisma migrate status
pnpm -C driving_school_platform/nextjs_space exec prisma migrate deploy
pnpm -C driving_school_platform/nextjs_space exec prisma migrate status
```

**Rules:**

- If `DATABASE_URL` or `DIRECT_URL` is missing, stop.
- If `migrate deploy` fails, do not push.
- Do not run migrations during docs-only/UI-only batches unless explicitly required.
- Confirm the env file points at the **intended** database before deploy (preview vs production are not assumed separate).

Local dev often uses `.env.local`; for this battery, ensure `DATABASE_URL` / `DIRECT_URL` are loaded from the file you intend (`.env` as above, or `source` the correct file). See [supabase-prisma-migrations.md](../../driving_school_platform/nextjs_space/docs/ops/supabase-prisma-migrations.md).

**Never** run `prisma migrate dev` or `migrate reset` against production.

---

## Vercel Preview deploy

Assumed shell: Git Bash

```bash
cd ~/Downloads/Projects/driving-academy-tool

git switch main
git pull --ff-only
git status --short

pnpm -C driving_school_platform/nextjs_space check

pnpm dlx vercel deploy --target=preview --logs
```

Save host without `https://`:

Assumed shell: Git Bash

```bash
export PREVIEW_HOST="<preview-host>.vercel.app"
```

Map `PREVIEW_HOST` to the QA tenant via `organization_domains` before broad validation. See [preview-qa-runbook.md](./preview-qa-runbook.md).

---

## List preview deployments

Assumed shell: Git Bash

```bash
pnpm dlx vercel list --environment preview
```

---

## Remove preview deployment later

Assumed shell: Git Bash

```bash
pnpm dlx vercel remove <DEPLOYMENT_URL>
```

---

## Guidance

- Do not clean active QA Preview.
- Clean old manual previews after milestone validation.
- Do not run destructive/import-apply tests against production client tenants unless explicitly approved.
- Prefer Preview + QA tenant for broad validation.
- Production should only receive limited smoke tests after Preview is validated.

---

## Supplementary: install and env

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space install
```

Local secrets: copy `.env.example` → `.env.local` in `driving_school_platform/nextjs_space` (not committed).

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space env:check
```

---

## Supplementary: fast pre-push loop

When a full build is not required yet:

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space lint
pnpm -C driving_school_platform/nextjs_space typecheck
pnpm -C driving_school_platform/nextjs_space test:run
```

Add `build` or full `check` before merge when touching routing, env, Prisma, or build config.

---

## Supplementary: dev server and format

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space dev
```

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space fix
```

Use `fix` in dedicated formatting batches only.

---

## Supplementary: health smoke

Assumed shell: Git Bash

```bash
cd driving_school_platform/nextjs_space
pnpm smoke:health -- --url https://<your-deployment-host>
```

Expect `GET /api/health` → `200`, JSON `ok: true`.

---

## Supplementary: demo scripts (operator)

Run from `driving_school_platform/nextjs_space`. See [client-demo-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/client-demo-runbook.md).

| Command | Purpose |
| ------- | ------- |
| `pnpm demo:readiness` | Read-only demo preflight |
| `pnpm demo:features:check` | Feature showcase check |
| `pnpm demo:client-ready` | Controlled client/recruiter readiness |
| `pnpm demo:org:bootstrap` | Bootstrap demo org / domain rows |
| `pnpm demo:orgs:list` | List demo organizations |
| `pnpm demo:personas:configure` | Configure private demo personas |
| `pnpm demo:personas:check` | Verify personas |
| `pnpm demo:personas:cleanup` | Remove obsolete demo accounts |
| `pnpm demo:practical:configure` | Practical lesson demo prep |
| `pnpm demo:showcase:configure` | Full Showcase license flags |
| `pnpm demo:sandbox:reset` | Reset demo sandbox (destructive — demo org only) |
| `pnpm demo:reset:dry-run` | Validate org for reset without applying |

Assumed shell: Git Bash

```bash
pnpm -C driving_school_platform/nextjs_space test:e2e
pnpm -C driving_school_platform/nextjs_space test:e2e:demo
```

---

## Supplementary: import/export (Preview QA)

Use **School Admin** on **Preview QA tenant** — not public demo for apply.

- Templates: `driving_school_platform/nextjs_space/docs/examples/import-export/`
- Contracts: `driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md`

Flow: export → edit → dry-run → review errors → apply (all-or-nothing).

---

## Related docs

| Topic | Path |
| ----- | ---- |
| Preview QA | [preview-qa-runbook.md](./preview-qa-runbook.md) |
| Git tags and recovery | [git-tags-and-recovery-runbook.md](./git-tags-and-recovery-runbook.md) |
| Reviewer workflow | [reviewer-workflow.md](./reviewer-workflow.md) |
| Release checklist | `driving_school_platform/nextjs_space/docs/ops/release-checklist.md` |
| Architecture memory | [../architecture/system-design.md](../architecture/system-design.md) |
| Current state | [../architecture/current-state.md](../architecture/current-state.md) |
