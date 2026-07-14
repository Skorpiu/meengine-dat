# Git Tags and Recovery Runbook

**Status:** Active operator runbook.
**Batch:** `dat-v1-commercial-platform-cutline-plan-v1`
**Related:** [decision-log.md](../architecture/decision-log.md) (DEC-055–DEC-057), [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md)

---

## Purpose

Define how DAT uses **annotated Git tags** as **code recovery and release anchors**. Tags are **not** database, infrastructure, or secret backups.

**Assumed shell:** Git Bash (all commands below).

---

## Tag categories

| Category | Pattern | Example | When to use |
| -------- | ------- | ------- | ----------- |
| **Safety baseline** | `dat-v1-core-baseline-<short-sha>` | `dat-v1-core-baseline-95b833e` | Stable operational core before a major commercial/platform phase; recovery/comparison anchor — **not** final product release |
| **Release candidate** | `dat-v1.0.0-rc.N` | `dat-v1.0.0-rc.1` | Pre-final validation; increment `N` for later RCs |
| **Final release** | `dat-v1.0.0` | `dat-v1.0.0` | Immutable shipped DAT v1.0 commercial release |
| **Hotfix release** | `dat-v1.0.N` | `dat-v1.0.1`, `dat-v1.0.2` | Post-release corrective releases |
| **Exceptional pre-migration / pre-extraction baseline** | Descriptive, dated | Only when structural or production-risk event justifies | Major schema extraction, provider cutover, or incident recovery prep |

**Do not** tag every feature slice. Tags mark **durable anchors**, not routine merges.

---

## Tag governance rules

1. Use **annotated tags** only: `git tag -a`.
2. **Explicitly push** the tag: `git push origin <tag>`.
3. **Verify** local and remote refs after publication.
4. **Published tags are immutable** by project convention — never move or retag.
5. A corrected release receives a **new tag** (e.g. next RC or hotfix), not a force-updated old tag.
6. Tag creation, deletion, and publication remain **human-controlled** — agents do not create, push, or delete tags unless explicitly instructed.
7. **Never** reset or force-push `main` to a tag as a routine recovery method.
8. Tags **do not replace** database or infrastructure backups.

---

## List local tags

```bash
git tag --list --sort=-creatordate
```

---

## Verify a local annotated tag

```bash
git show --no-patch --decorate <tag>
```

---

## Verify a remote tag

```bash
git ls-remote --tags origin "refs/tags/<tag>"
```

---

## Compare a tag with main

```bash
git diff <tag>..main --stat
git log --oneline --decorate <tag>..main
```

---

## Create an archive directly from a tag

```bash
git archive \
  --format=zip \
  --output "<archive-name>.zip" \
  <tag>
```

For DAT project ZIP convention (commit-based naming on branches), see [command-batteries.md](./command-batteries.md). Tag archives use the tag name in the output filename by operator choice.

---

## Inspect a tag without disturbing the active branch

Prefer an isolated detached worktree:

```bash
git worktree add --detach \
  ../DAT-tag-inspection \
  <tag>
```

Removal:

```bash
git worktree remove \
  ../DAT-tag-inspection
```

---

## Create a recovery branch

Only from a **clean working tree**:

```bash
git switch -c recovery/<descriptive-name> <tag>
```

---

## Restore one file from a tag

```bash
git restore --source=<tag> -- path/to/file
```

---

## Prohibited routine recovery

**Do not** use these on `main` without an explicit incident plan and human approval:

```bash
git reset --hard <tag>
git push --force
```

These are incident-only actions. Prefer comparison, archive, isolated worktree, or a recovery branch.

---

## Backup boundary

Git tags **do not** back up:

- Databases
- Production data
- Migrations already deployed to an environment
- Supabase state (RLS, grants, extensions)
- Vercel configuration
- Environment variables
- Secrets
- DNS
- External provider configuration (Postmark, PSP, etc.)

Code recovery from a tag does **not** restore tenant data, billing state, or deployed schema unless the operator also runs the correct migration and data procedures for that environment.

---

## Current safety baseline (verified 2026-07-14)

| Field | Value |
| ----- | ----- |
| Tag | `dat-v1-core-baseline-95b833e` |
| Commit | `95b833e` |
| Meaning | Stable DAT v1 operational core **before** commercial Platform completion and smoke-identity/School Admin slice |
| Not | Final `DAT v1.0.0`; DB/deployment/secret backup |

Publication was **human-controlled** (created and pushed to `origin` by operator). Super-Agent batches record verified refs; they do not publish tags.

---

## Related documents

| Document | Role |
| -------- | ---- |
| [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md) | RC/final release strategy and implementation order |
| [command-batteries.md](./command-batteries.md) | Deploy, check, and ZIP batteries |
| [reviewer-workflow.md](./reviewer-workflow.md) | Merge readiness and evidence expectations |
| [current-state.md](../architecture/current-state.md) | Current vs target DAT v1 |
