# Incident: remote legacy seed reset (2026-07-17)

**Status:** Contained / preventive controls implemented in repository
**Environment:** Remote Supabase technical smoke database
**Severity:** High operational (fail-open destructive command) — **no real customer data**

---

## Verified facts

| Fact | Detail |
| ---- | ------ |
| Date | 2026-07-17 |
| Trigger | Accidental execution of legacy `prisma db seed` (`scripts/seed.ts`) against the remote technical smoke database |
| Root operational cause | Destructive wipe was reachable via a copyable command path; legacy seed allowed remote `DATABASE_URL` targets (fail-open) |
| Scope | App tables globally wiped and fictitious test fixtures recreated by the legacy seed |
| Real customers | None — no real clients; real tenant **A Conquistadora** has not been created |
| Pre-incident data | Fictitious test/smoke data only |
| Platform access | Application Platform admin identity may need reconciliation (Auth/Storage not wiped by this seed) |
| Commercial seed | Did **not** execute |
| Commercial migration | Was **not** deployed |
| Supabase Auth / Storage | Untouched by the legacy seed |
| Paid restore | Not required / not pursued |
| Accepted recovery direction | Retain and reconcile the newly seeded technical smoke state after validation |

---

## What this is not

- Not a real-client data-loss incident
- Not a commercial catalogue / billing incident
- Not recoverable from a Git tag (tags are code anchors only; they do not store database rows)

---

## Preventive actions (this branch)

1. Legacy `scripts/seed.ts` is **local-only** and **fail-closed** on any non-local host (`lib/ops/destructive-seed-safety.ts`).
2. Local destructive execution requires exact confirmation: `ALLOW_DESTRUCTIVE_LOCAL_SEED=DELETE_LOCAL_DAT_APP_DATA`.
3. No remote bypass (`ALLOW_PROD_SEED` removed; no FORCE/remote override).
4. Commercial catalogue seed remains a dedicated non-destructive CLI with `--apply` (separate from `prisma db seed`).
5. Durable policy recorded as **DEC-062**.
6. Super Agent / operating-model rules: never paste destructive DB commands into routine multi-command batteries.

---

## Follow-up slice

`platform-admin-access-and-smoke-reconcile-v1` — human-approved read-only validation, Platform admin reconciliation, credential rotation, capture new smoke fixture IDs, then resume commercial read-services work.

---

## References

- DEC-062 (destructive database seed safety boundary)
- DEC-045 / DEC-053 (smoke tenant vs real client)
- `docs/ops/git-tags-and-recovery-runbook.md` (Git tags ≠ database backup)
