# DAT Preview QA Runbook

## Purpose

Controlled **Preview QA** for DAT features **without touching real client data**.

Use this runbook to validate batches before production merge, exercise tenancy/students/lessons/import/export, and record evidence for [current-state.md](../architecture/current-state.md) when closing a phase.

**Do not use** `demo.meengine.io` for import **apply** unless sandbox reset and quotas are explicitly enabled and understood.

---

## Preferred approach

- Use **Vercel Preview**.
- Map Preview host to a **dedicated QA organization**.
- **Preferred QA org name:** `DAT QA Migration Sandbox`
- Use data prefix: **`DATQA`** (names, IDs, notes — easy to spot test data)
- Do **not** run import/apply tests against the **`DAT Production Smoke`** tenant unless doing an explicit, limited smoke test. The future real client **`A Conquistadora`** must use a dedicated org — never smoke fixtures.
- Do **not** run import/apply tests in **public demo**.

Verify which database the Preview deployment uses (Vercel Preview env vars). **Do not assume** preview and production DBs are separate.

---

## Setup pattern

### Deploy preview

```bash
pnpm dlx vercel deploy --target=preview --logs
```

Store host **without** `https://`:

```bash
export PREVIEW_HOST="<preview-host>.vercel.app"
```

See also [command-batteries.md](./command-batteries.md).

### QA organization bootstrap

Create/map the QA organization through a **temporary script or SQL**.

- Temporary scripts must be **deleted** and **not committed**.
- Create:
  - **Organization** (e.g. `DAT QA Migration Sandbox`)
  - **`organization_domains`** mapping (`PREVIEW_HOST` → that org)
  - **SUPER_ADMIN** user
  - **INSTRUCTOR** user
  - **Instructor** record (linked to instructor User)
  - Category **B** qualification (as required by product)
- Use schema-valid **`subscriptionTier`**, e.g. `ENTERPRISE` if required by enum.

Confirm **platform** hostnames are **not** registered as tenant domains ([production-host-split.md](../../driving_school_platform/nextjs_space/docs/ops/production-host-split.md)).

### Preconditions

1. Branch builds locally: `pnpm -C driving_school_platform/nextjs_space check`.
2. Migrations on target DB (if schema batch): `pnpm -C driving_school_platform/nextjs_space exec prisma migrate status` — apply intentionally if needed.
3. Credentials from your **secret process** only — never commit passwords.

---

## Verification

- Confirm **`organization_domains`** maps `PREVIEW_HOST` to the QA org.
- **Expected:**
  - Organization name = **`DAT QA Migration Sandbox`**
  - `isDemo = false`
  - `isPrimary = true` (or another deliberate value documented for the session)
- Login as QA **SUPER_ADMIN**.
- Open **`/admin/users`** — page loads without 500.
- Optional minimal smoke: `GET /api/health` on Preview base URL → `200`, `ok: true`.

Wrong org or host mapping → **stop** and fix before functional QA.

---

## DAT_3.6 QA checklist

Execute on Preview QA tenant. Record pass/fail; attach notes to PR or phase-close doc.

1. Create **manual** student.
2. Create **manual practical lesson** history.
3. Create **normal driving** lesson and confirm **practical counter** continues (e.g. manual `#1` → next system lesson `#2`).
4. **Export** students CSV/JSON.
5. **Dry-run** student import.
6. **Apply** student import.
7. **Export** practical lessons CSV/JSON.
8. **Dry-run** practical lesson import.
9. **Apply** practical lesson import.
10. **Send invitation** from existing Student.
11. **Accept invitation** and confirm **no duplicate** Student.

### Auth / email (if batch touches them)

- [ ] Copy-link invitation works if email send disabled or fails.
- [ ] No raw tokens in list APIs or network tab for list endpoints.
- [ ] Password reset / verification only if in scope (test inboxes).

Samples: `driving_school_platform/nextjs_space/docs/examples/import-export/`. Contracts: [client-data-import-export-strategy.md](../../driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md).

---

## Expected outcomes

| Check | Expected |
| ----- | -------- |
| Manual student | Appears as **`MANUAL_ONLY`** |
| Manual practical lesson | `lessonSource = **MANUAL**` |
| Normal app-created driving lesson | `lessonSource = **SYSTEM**` |
| Imported practical lesson | `lessonSource = **IMPORT**` |
| Practical counter | Respects manual/imported lessons |
| Duplicate imports | Stable, documented errors (no silent overwrite) |
| Exports | No `passwordHash`, `tokenHash`, raw tokens, or unintended internal/secrets fields |
| Invitation from existing Student | **`APP_USER`**, same Student — **no duplicate** Student |

---

## Production smoke policy

- After **Preview validation**, Production should only receive **limited smoke tests**.
- Do **not** run **mass import** in Production without an explicit client data plan.
- Use clearly marked **`DATQA`** / Smoke records if needed.
- If no delete/cleanup exists yet, be **extra conservative**.

---

## Public demo policy

- Do **not** expose **import apply** in public demo.
- Public demo may later show:
  - seeded students
  - practical counters
  - manual history examples
  - export read-only maybe
- A **controlled migration demo sandbox** may be created later (post DAT_3.7 UI polish).

Detail: [public-demo-policy.md](../../driving_school_platform/nextjs_space/docs/ops/public-demo-policy.md), [client-demo-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/client-demo-runbook.md).

---

## Post-QA

- **Pass:** note in PR / [current-state.md](../architecture/current-state.md).
- **Fail:** do not merge; file defects (host, role, endpoint, expected vs actual).
- Leave Preview DB in a known state; optional cleanup of `DATQA` fichas per team policy.
- Do not remove **active QA Preview** deployments until milestone validation is done; clean **old** manual previews afterward ([command-batteries.md](./command-batteries.md)).

---

## Related

- [command-batteries.md](./command-batteries.md)
- [reviewer-workflow.md](./reviewer-workflow.md)
- [system-design.md](../architecture/system-design.md)
