# DAT System Design

## Purpose

This file is the **primary architectural memory** of the Driving Academy Tool (DAT). Read it before structural changes: tenancy, auth, student/instructor models, lessons, import/export, email, demo/preview policy, or cross-cutting refactors.

It complements (does not replace) deeper runbooks under `driving_school_platform/nextjs_space/docs/`.

---

## Architecture-first protocol

Before implementing **non-trivial** changes:

1. **Read the project memory:**
   - `docs/architecture/system-design.md`
   - `docs/architecture/current-state.md`
   - `docs/architecture/roadmap-todo.md`
   - relevant ops runbooks (`docs/ops/`, and `driving_school_platform/nextjs_space/docs/` as needed)

2. **Restate the goal and scope.**

3. **Classify the batch:**
   - docs-only
   - UI-only
   - API/runtime
   - migration/schema
   - security/auth/billing/demo
   - import/export
   - tenant/authorization

4. **Identify risks before editing:**
   - tenant isolation
   - data loss
   - schema/runtime mismatch
   - auth/security regression
   - demo/public behavior
   - email/invitation behavior
   - import/apply destructive behavior
   - test coverage / manual QA needs

5. **Identify likely files to touch.**

6. **Identify tests and manual QA needed.**

7. **Only then** implement the smallest safe change.

**Rules:**

- Plan first, code second.
- If the change can destroy data or alter auth/tenant/security/billing/demo behavior, **stop and report** before editing.
- If scope expands, **stop and ask/report**.
- If there is ambiguity, choose the **smallest safe path** or pause for review.
- Never refactor broadly just because files are nearby.

See also [reviewer-workflow.md](../ops/reviewer-workflow.md) and `.cursor/rules/architect-mode.mdc`.

---

## Memory maintenance policy

The operational memory must be updated when project state changes in a **durable** way.

Update the relevant docs when any of these happen:

- a DAT batch is closed/validated;
- a migration is created or applied;
- a domain decision is made;
- a product/UX policy is decided;
- a security or tenant isolation rule changes;
- a command battery changes;
- a preview/demo/production runbook changes;
- a manual QA process changes;
- a new P1/P2/P3 To-Do is discovered;
- an architectural contract is clarified;
- a recurring bug/risk is identified.

Do **not** update memory for every trivial interaction. Avoid noisy, duplicate, or temporary notes.

**Preferred targets:**

| Change type | Document |
| ----------- | -------- |
| Closed work, current state | `docs/architecture/current-state.md` |
| Durable architecture/domain rules | `docs/architecture/system-design.md` (this file) |
| Backlog, future work | `docs/architecture/roadmap-todo.md` |
| Command changes | `docs/ops/command-batteries.md` |
| Preview/demo/QA process | `docs/ops/preview-qa-runbook.md` |
| Review/merge workflow | `docs/ops/reviewer-workflow.md` |
| Agent behavior rules | `.cursor/rules/architect-mode.mdc` |

**Rule:** If a Cursor batch discovers a durable decision or new operational rule, its **final report** must state whether memory docs need updating — and apply updates in the same docs-only batch or a named follow-up.

---

## Stack

| Layer | Choice |
| ----- | ------ |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma **6.19.0** |
| Database | Supabase Postgres |
| Auth | NextAuth (Credentials provider) |
| Deploy | Vercel |
| DNS | Cloudflare |
| Email | Postmark |
| Package manager | **pnpm** (never npm/yarn for this repo) |

**App path:** `driving_school_platform/nextjs_space`

**Prisma schema:** `driving_school_platform/nextjs_space/prisma/schema.prisma`

**Canonical validation command** (from repository root):

```bash
pnpm -C driving_school_platform/nextjs_space check
```

Runs lint, typecheck, test:run, and build (includes env-check and prisma generate via existing hooks).

---

## Infrastructure and hosts

| Host (conceptual) | Role |
| ----------------- | ---- |
| `www.meengine.io` | Tenant / school app production host |
| `platform.meengine.io` | Platform / operator admin host |
| `demo.meengine.io` | Public demo host |

- **Vercel Preview** deployments can be mapped to a QA tenant through `organization_domains` for controlled validation (host → organization resolution).
- **Do not store secrets** in documentation, commits, or chat logs.
- **Do not assume** preview and production use separate databases. Always verify which environment (`DATABASE_URL`, Vercel env scope, Supabase project) you are touching before migrations, imports, or destructive operations.

See also: `driving_school_platform/nextjs_space/docs/ops/production-host-split.md`, `vercel-deployment.md`.

---

## Tenancy model

- **Organization** is the tenant boundary.
- **Host resolution** maps the request host to an `Organization` via `organization_domains`.
- **Never trust `organizationId`** from request body, query string, or import files. Tenant scope must come from the authenticated session and/or host guard.
- **localhost / dev** exceptions must remain explicit and documented; do not widen them casually.
- **Platform and unmapped hosts** must stay guarded (no accidental tenant bleed).

---

## Authentication and users

- **User** = login / account / auth identity (NextAuth).
- **User is not** the same as an operational **Student** record.
- Roles include: `PLATFORM_ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT` (and related guards).
- **Public signup** remains **disabled by default** unless explicitly changed via env and product decision.
- **Invitation + copy-link** is the official onboarding path for app users.
- **Password reset**, **email verification**, and **auth rate limits** exist; do not weaken them in unrelated batches.

---

## Student operational model

- **Student** = operational / academic record (ficha).
- A Student **can exist without** a linked User.
- `Student.userId` is **optional**.
- School Admin can create **manual** student records.
- **App access states** (conceptual):
  - `MANUAL_ONLY` — record only, no app login
  - `INVITED` — invitation pending
  - `APP_USER` — linked User with app access
- Inviting from a Student record must **link** the future User to the **existing** Student.
- Accepting an invitation must **not** create a duplicate Student.
- **Student import** must **not** create Users, invitations, or send emails.

---

## School student ID policy

**Client-specific (A Conquistadora):** canonical `schoolStudentId` is **5 digits**: `YY` + `NNN`.

| Part | Meaning |
| ---- | ------- |
| `YY` | Enrollment year suffix (e.g. `26` for 2026) |
| `NNN` | Sequence within that year, zero-padded to 3 digits |

Examples:

- Year `26`, sequence `1` → `26001`
- Year `26`, sequence `78` → `26078`

**UI:** prefer separate inputs `yearSuffix` and `sequenceNumber`.

**Search normalization** (shortcuts):

- `261` → `26001`
- `2678` → `26078`
- `26078` → `26078`

Do **not** generalize this format to all future clients without an explicit product decision.

---

## Instructor model

- An instructor has both a **User** (login) and an **Instructor** record (operational).
- API/UI may accept `instructorUserId` or `instructorEmail`.
- **`Lesson.instructorId` stores `Instructor.id`**, not `User.id`.
- Before creating lessons, resolve User/email → Instructor record.
- Avoid ambiguous names like `instructorId` when the value is actually `User.id`.
- Future hygiene: prefer `instructorUserId` and `instructorRecordId` where both are needed.

---

## Lessons model

- **`Lesson.studentId` uses `Student.id`**, not `User.id`.
- Manual-only students **can** have lessons.
- **DRIVING** lessons may have `practicalLessonNumber`.
- Practical lesson counter is **per organization + student**, **DRIVING only**.
- Manual/imported history must be respected by the automatic counter (e.g. manual `#1` → next system driving lesson `#2`).
- **`LessonSource` values:** `SYSTEM`, `MANUAL`, `IMPORT`.

---

## Import/export contracts

- **Dry-run** endpoints: **zero writes**.
- **Apply/import** endpoints: **all-or-nothing** (transactional).
- Student import: **create-only** (no silent overwrites in baseline).
- Practical lesson import: **create-only**.
- Exports must **not** include `passwordHash`, `tokenHash`, raw tokens, `organizationId`, or internal UUIDs unless explicitly intended for that export type.
- **CSV:** semicolon (`;`) separator.
- **Dates:** `YYYY-MM-DD`.
- **Times:** `HH:mm` (parsers may normalize `9:00` → `09:00` where implemented).
- **Student records export UI** is implemented (`import-export-ui-students-export-v1`): CSV/JSON via `GET /api/admin/students/export` on Fichas registadas. **Import UI** and **practical lessons import/export UI** remain pending under **DAT_3.7** (`import-export-ui-actions`).

Deep contracts: `driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md`.

---

## Email and invitation rules

- **Postmark** is the transactional email provider.
- Email delivery errors must be **sanitized** for clients.
- **Copy-link fallback** must be preserved when send fails (unless explicitly changed by product).
- Invitation creation should **not** be blocked solely by email provider failure (admin can still copy link).
- **Never** expose raw provider errors to end users.
- **Never** expose raw invitation or reset tokens in list APIs, logs, or error JSON.

---

## Demo and preview policy

- **Public demo** (`demo.meengine.io`) is **not** for destructive testing or **import apply** unless a controlled sandbox (reset, quotas) is explicitly enabled and understood.
- **Preview QA tenant** (Vercel Preview + `organization_domains`) is preferred for operational validation of students, imports, and invitations.
- Public demo may show **seeded** manual students, practical counters, and history (read-mostly posture by default).
- **Import apply** stays out of public demo until sandbox/reset/quota policy is explicit.

See: `driving_school_platform/nextjs_space/docs/ops/public-demo-policy.md`, `client-demo-runbook.md`.

---

## Engineering principles

1. **Think first, implement second.**
2. **Small batches** — one concern per merge when possible.
3. **No broad refactors** inside feature batches.
4. **No hidden dependencies** — env, migrations, and demo flags must be visible in the PR.
5. **No migrations** without explicit request; **no production migrate** without explicit operator command.
6. **No security / auth / billing / demo** changes inside unrelated UI batches.
7. **Preserve** existing working behavior unless deliberately changing it.
8. **If in doubt**, stop and ask or report — do not guess tenancy or production impact.
