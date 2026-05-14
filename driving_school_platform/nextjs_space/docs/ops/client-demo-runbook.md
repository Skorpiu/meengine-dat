# Client Demo Runbook

Practical steps for operators preparing and running a **controlled** DAT demo for a **client or recruiter**: one repeatable flow, copy-paste commands, and clear safety rules. This is **not** a substitute for code-level access control; see [public-demo-policy.md](./public-demo-policy.md).

---

## Purpose

Use this runbook when you need to **prepare**, **validate**, and **execute** a live walkthrough of DAT on a dedicated demo hostname. The audience sees the **tenant app** only; operators keep infrastructure and secrets off-screen.

---

## Recommended initial demo model

- **Start with one Full Showcase demo** tenant: broadest **curator-controlled** surface for depth, aligned with [public-demo-feature-showcase.md](./public-demo-feature-showcase.md).
- **Basic / Premium / Full** tier variants remain **future** work (separate orgs or domains per tier, stronger isolation, scripted tours)—see [public-portfolio-access.md](./public-portfolio-access.md#recommended-future-demo-structure).
- **Demo users do not** manage licensing or feature rows; **operators** prepare `OrganizationFeature` (and related policy) via scripts—see [public-demo-feature-showcase.md](./public-demo-feature-showcase.md#configuring-full-showcase-features).
- Treat every client demo as **operator-prepared**: fictional data, private credentials, read-mostly posture with demo guards.

---

## Domains

| Host                       | Role                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`www.meengine.io`**      | Production **tenant app** host (schools and their users).                                                                                                                               |
| **`demo.meengine.io`**     | **Controlled demo** tenant app host for client/recruiter sessions. Map this hostname to the **demo organization** prepared as Full Showcase (DNS + Vercel + `OrganizationDomain.host`). |
| **`platform.meengine.io`** | **Platform / operator** host. **Never** part of a public client demo narrative; do not hand out links or credentials for this surface in a sales or portfolio session.                  |

---

## Demo organization naming

Recommended defaults for the first Full Showcase tenant:

| Item                  | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **Organization name** | `DAT Demo — Full Showcase` (exact string for `DEMO_ORGANIZATION_NAME`) |
| **Tenant host**       | `demo.meengine.io` (`DEMO_ORGANIZATION_DOMAIN`)                        |
| **Showcase profile**  | `full-showcase` (`DEMO_SHOWCASE_PROFILE`)                              |

Adjust names only if your DNS or tenant policy requires it; keep **one** canonical demo org per environment to avoid drift.

---

## Demo personas

Use these **labels** in briefings and UI wording—**do not** put real emails or passwords in git or this file:

| Persona               | Intent                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **Demo School Admin** | Tenant admin for **controlled** sessions; use “School Admin” wording in demos where possible. |
| **Demo Instructor**   | Fictional instructor for schedules and lessons.                                               |
| **Demo Student**      | Fictional student for booking and progress.                                                   |

**Credentials**

- **Never** document passwords, hashes, or magic links in the repository.
- Issue and rotate credentials through a **private** channel (vault, internal runbook, or agreed secret store).
- Internally the backing role for a tenant admin may still be a high-privilege tenant role; **demo language** should prefer “School Admin” and must **not** advertise **PLATFORM_ADMIN** or hand out platform credentials—see [public-demo-policy.md](./public-demo-policy.md).

---

## One-time setup checklist

Complete on an **operator** machine with `DATABASE_URL` (and related env) available, **before** the meeting:

- [ ] **DNS / Vercel** — `demo.meengine.io` resolves to the correct deployment; `OrganizationDomain.host` matches (see [vercel-deployment.md](./vercel-deployment.md)).
- [ ] **Bootstrap org** — dry-run then apply (`pnpm demo:org:bootstrap`); see [Commands](#commands).
- [ ] **List demo orgs** — `pnpm demo:orgs:list`; copy the organization **id** (CUID).
- [ ] **Configure showcase profile** — `pnpm demo:showcase:configure` with `DEMO_SHOWCASE_PROFILE=full-showcase` (dry-run then apply).
- [ ] **Readiness** — `pnpm demo:readiness` passes for that org id ([public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check)).
- [ ] **Feature check** — `pnpm demo:features:check` passes ([public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).
- [ ] **Private demo personas** — dry-run then apply `pnpm demo:personas:configure`; then `pnpm demo:personas:check` with the same three emails ([Configure private demo personas](#configure-private-demo-personas)).
- [ ] **Manual login** — each persona signs in on `https://demo.meengine.io` using **private** credentials.
- [ ] **Destructive actions** — confirm blocked actions return safe errors (demo guards; see [public-demo-policy.md](./public-demo-policy.md#implemented-guards)).
- [ ] **No privileged leaks** — confirm no **PLATFORM_ADMIN**, production DB URLs, or service keys appear in slides, screen shares, or shared notes.

---

## Commands

Run from the app package (repo root relative path):

```bash
cd driving_school_platform/nextjs_space
```

Replace `<demo-org-id>` with the CUID from `pnpm demo:orgs:list`.

**Dry-run bootstrap** (no writes):

```bash
DEMO_ORGANIZATION_NAME="DAT Demo — Full Showcase" \
DEMO_ORGANIZATION_DOMAIN=demo.meengine.io \
pnpm demo:org:bootstrap
```

**Apply bootstrap** (requires both env and CLI flag):

```bash
DEMO_ORGANIZATION_NAME="DAT Demo — Full Showcase" \
DEMO_ORGANIZATION_DOMAIN=demo.meengine.io \
DEMO_BOOTSTRAP_APPLY=true \
pnpm demo:org:bootstrap -- --apply
```

**List demo organizations** (read-only):

```bash
pnpm demo:orgs:list
```

**Configure Full Showcase (dry-run)**:

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SHOWCASE_PROFILE=full-showcase \
pnpm demo:showcase:configure
```

**Apply Full Showcase**:

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SHOWCASE_PROFILE=full-showcase \
DEMO_SHOWCASE_APPLY=true \
pnpm demo:showcase:configure -- --apply
```

**Readiness** (read-only):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> pnpm demo:readiness
```

**Feature showcase check** (read-only):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> pnpm demo:features:check
```

**Reset dry-run** (validates demo org only; no deletes):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> pnpm demo:reset:dry-run
```

### Configure private demo personas

Create or update the three **private** demo users (Demo School Admin → internal `SUPER_ADMIN`, Instructor, Student) on the **demo** organization only. **Never** commit these environment values to git; prefer a temporary shell, a local ignored env file, or your secret manager. **Do not** paste credentials into README, docs tickets, or AI prompts. Share credentials **only** through private channels for the controlled demo session. Use **“Demo School Admin”** wording externally.

**Dry-run** (no writes; passwords are never printed):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SCHOOL_ADMIN_EMAIL=<private-demo-admin-email> \
DEMO_SCHOOL_ADMIN_PASSWORD=<private-demo-admin-password> \
DEMO_INSTRUCTOR_EMAIL=<private-demo-instructor-email> \
DEMO_INSTRUCTOR_PASSWORD=<private-demo-instructor-password> \
DEMO_STUDENT_EMAIL=<private-demo-student-email> \
DEMO_STUDENT_PASSWORD=<private-demo-student-password> \
pnpm demo:personas:configure
```

**Apply** (requires both `DEMO_PERSONAS_APPLY=true` and `--apply`):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SCHOOL_ADMIN_EMAIL=<private-demo-admin-email> \
DEMO_SCHOOL_ADMIN_PASSWORD=<private-demo-admin-password> \
DEMO_INSTRUCTOR_EMAIL=<private-demo-instructor-email> \
DEMO_INSTRUCTOR_PASSWORD=<private-demo-instructor-password> \
DEMO_STUDENT_EMAIL=<private-demo-student-email> \
DEMO_STUDENT_PASSWORD=<private-demo-student-password> \
DEMO_PERSONAS_APPLY=true \
pnpm demo:personas:configure -- --apply
```

**Persona check** (read-only; supply **all three** emails to enforce presence, or omit all three for role counts only):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SCHOOL_ADMIN_EMAIL=<private-demo-admin-email> \
DEMO_INSTRUCTOR_EMAIL=<private-demo-instructor-email> \
DEMO_STUDENT_EMAIL=<private-demo-student-email> \
pnpm demo:personas:check
```

On **Windows PowerShell**, set env vars per command or use `cmd /c` with the same variable assignments; the important part is **both** apply gates where documented (`DEMO_BOOTSTRAP_APPLY=true` **and** `--apply`, etc.).

---

## Before leaving for the meeting

- [ ] Open `https://demo.meengine.io` and confirm TLS and tenant resolution.
- [ ] **Demo School Admin** — login works; admin paths you need are reachable.
- [ ] **Demo Instructor** — login works; instructor home loads.
- [ ] **Demo Student** — login works; student home loads.
- [ ] **Features** — licensed / showcase UI matches the story (re-run `pnpm demo:features:check` if unsure).
- [ ] **Blocked actions** — a known destructive path returns the **403** demo restriction payload (not a silent success).
- [ ] **Data** — dataset is fictional; no production customer names or real pupil PII.
- [ ] **No platform credentials** — laptop password manager or vault ready if needed; nothing pasted into chat logs or slides.

---

## At the client machine

- Open **`https://demo.meengine.io`** only for the tenant demo.
- Log in with the **agreed persona** for that part of the story; use credentials from your **private** channel only.
- **Do not** run terminal commands, migrations, or scripts on the client laptop unless that is an explicit technical engagement with cleared scope.
- **Do not** open **Supabase**, **Vercel** env screens, **GitLab** variables, or **platform** admin UIs during a standard product demo.
- **Do not** read passwords aloud or leave them visible in screen shares longer than necessary.

---

## What not to show

Unless the session is a **scoped technical review** with written agreement:

| Do not show                                          | Why                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`platform.meengine.io`**                           | Operator surface; not the tenant SaaS story.                                       |
| **Supabase** dashboard / SQL                         | Infrastructure; risk of exposing schema, keys, or live data.                       |
| **Vercel** environment variable UI                   | Secrets and deployment keys.                                                       |
| **GitLab CI** variable screens                       | Pipeline secrets.                                                                  |
| **`DATABASE_URL` / `DIRECT_URL`**                    | Database credentials.                                                              |
| **PLATFORM_ADMIN** accounts or URLs                  | Platform operator access; never part of client demo handouts.                      |
| **Password hashes** or raw auth payloads             | Sensitive by definition.                                                           |
| **Internal billing / webhook** implementation detail | Baseline billing is not a public demo pillar; keep to agreed technical depth only. |

---

## Troubleshooting

| Symptom                            | Likely cause                                             | What to do                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo.meengine.io` does not load   | DNS, Vercel project domain, or wrong deployment          | Fix DNS / Vercel; confirm `OrganizationDomain.host` matches.                                                                                                                                                                                                                                   |
| Persona / login issue              | User missing, wrong org, or password policy              | Run `pnpm demo:personas:check` with all three emails; re-run `pnpm demo:personas:configure` (dry-run then apply). Passwords must meet app rules (see validation / signup). If apply fails on role switch, the user may have blocking related rows—use a clean demo user or clear dependencies. |
| Expected UI / module missing       | Feature rows or profile mismatch                         | Run `pnpm demo:features:check`; re-run `pnpm demo:showcase:configure` (dry-run then apply) per [public-demo-feature-showcase.md](./public-demo-feature-showcase.md).                                                                                                                           |
| Org id unknown                     | Bootstrap not applied or wrong DB                        | Run `pnpm demo:orgs:list`; confirm `DATABASE_URL` targets the intended environment.                                                                                                                                                                                                            |
| Destructive action **not** blocked | Wrong org (`isDemo` false), guard gap, or non-demo stack | **Stop** the demo narrative; verify `Organization.isDemo` and demo guards ([public-demo-policy.md](./public-demo-policy.md)); escalate internally—do not present as “safe demo” until resolved.                                                                                                |

---

## Related docs

- [public-demo-policy.md](./public-demo-policy.md) — data, credentials, implemented guards.
- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — seed/reset thinking, readiness, dry-run reset.
- [public-demo-feature-showcase.md](./public-demo-feature-showcase.md) — Full Showcase keys, `DEMO_SHOWCASE_PROFILE`, checks.
- [public-portfolio-access.md](./public-portfolio-access.md) — portfolio access policy and first Full Showcase prep flow.
- [release-checklist.md](./release-checklist.md) — deploy and demo preconditions.
