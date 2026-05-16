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
- **Do not use public registration during a demo:** `/auth/register` may still render, but **`POST /api/signup` rejects organizations marked `isDemo`** (`403`, `code: demo_signup_disabled`). Walkthroughs should use **configured private demo personas** only — [Configure private demo personas](#configure-private-demo-personas).

---

## Controlled demo write sandbox

By default, demo organizations stay **read-mostly**: mutating admin APIs remain blocked as in [public-demo-policy.md](./public-demo-policy.md).

For a **controlled** walkthrough where you want to show **one-off creates** without opening full admin or control-plane:

1. Set **`DEMO_WRITE_SANDBOX_ENABLED=true`** (case-insensitive, trimmed). **If unset or not exactly `true`, writes stay blocked** — same as today.
   - **Production / `demo.meengine.io` (Vercel):** configure **`DEMO_WRITE_SANDBOX_ENABLED`** under the Vercel project → **Settings** → **Environment Variables** → **Production**, set the value to `true`, then **redeploy** so the deployment serves the new env.
   - **Local testing:** use `.env.local` in `driving_school_platform/nextjs_space` or an **inline** env for a single command (see [environment-variables.md](./environment-variables.md#demo-write-sandbox-enabled)).
   - **Do not** rely on a developer’s local `.env` / `.env.local` for production; production must be set explicitly on Vercel (or your host’s env UI).
2. With the flag on, a demo org may create **at most one row per category** (quota is enforced by counting existing rows; **seed data counts** — if the seed already includes e.g. a theory lesson, another theory create returns a stable quota error until a future reset clears data):

   - **One** theory lesson (`THEORY`)
   - **One** driving lesson (`DRIVING`)
   - **One** theoretical exam (`THEORY_EXAM`) — counted separately from practical exams
   - **One** practical exam (`EXAM`) — counted separately from theoretical exams
   - **One** vehicle

   A multi-student exam request that would create more than one row when `maxCount` is 1 still returns a stable quota error (`pendingCreates` check).

**Still blocked** (unchanged): deletes, lesson/vehicle updates, user management, settings, feature flags, licensing writes, billing, cleanup, platform onboarding.

**Operator choice before a meeting:** decide explicitly between **read-mostly demo** (default, safest) and **sandbox-enabled demo** (limited creates, env must be intentional). This mechanism **does not replace** a future automated demo reset (e.g. 24h) — see [public-demo-seed-reset.md](./public-demo-seed-reset.md).

**Stable errors when blocked:**

- Sandbox off or action not allowed: `403` with `code: "demo_restricted_action"` and message _This action is restricted in the public demo environment._
- Quota already used: `403` with `code: "demo_write_quota_exceeded"` and message _This demo sandbox quota has already been used._

---

## Reset demo sandbox after a meeting

After a **controlled** session with `DEMO_WRITE_SANDBOX_ENABLED=true`, operators can clear **lessons and vehicles** for the demo org with a **local script** (no public HTTP endpoint, no scheduler in this batch).

**Dry-run** (prints counts only; requires `DATABASE_URL` and `DEMO_ORGANIZATION_ID`):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> pnpm demo:sandbox:reset
```

**Apply** (requires both `--apply` and `DEMO_SANDBOX_RESET_APPLY=true`):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> DEMO_SANDBOX_RESET_APPLY=true pnpm demo:sandbox:reset -- --apply
```

**Notes**

- Run from `driving_school_platform/nextjs_space` (or use `pnpm -C driving_school_platform/nextjs_space …`).
- Does **not** remove demo personas, users, `OrganizationDomain`, `OrganizationFeature`, `EntitlementGrant`, settings, feature flags, licensing keys, or billing tables.
- Because there is **no** `createdByDemoSandbox` marker yet, the script deletes **all** lessons and **all** vehicles scoped to that demo org — seed data must be **re-runnable** or kept minimal until a finer-grained follow-up exists.
- After apply, run **`pnpm demo:client-ready`** (read-only smoke) before the next external demo.

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

## Vercel and DNS setup for demo.meengine.io

Traffic routing and TLS are controlled **outside** the database. Tenant resolution in the app uses **`OrganizationDomain.host`** in Postgres (e.g. `demo.meengine.io`). You need **both**: the hostname on **Vercel** (so the deployment accepts HTTPS for that host) **and** a matching row in **`organization_domains`** (so the app maps the host to the demo org—typically via `pnpm demo:org:bootstrap`).

### Vercel

1. Open the DAT **Vercel project** → **Settings** → **Domains**.
2. Add **`demo.meengine.io`** and follow Vercel’s instructions until the domain shows as configured for this project.
3. Copy the **CNAME target** Vercel shows for `demo` (or the exact record they require). The target is project-specific.

### Cloudflare (DNS)

Create a DNS record for the demo host (apex zone `meengine.io`, hostname `demo`):

| Field            | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Type**         | `CNAME`                                                                                      |
| **Name**         | `demo`                                                                                       |
| **Target**       | Value shown by Vercel for this project                                                       |
| **Proxy status** | **DNS only** (grey cloud) during first verification so Vercel can validate ownership cleanly |
| **TTL**          | Auto                                                                                         |

After DNS propagates, return to Vercel: the domain should show **valid** configuration and **SSL** should be issued for `demo.meengine.io`.

### Database (`OrganizationDomain`)

Adding the domain in Vercel does **not** create the tenant mapping. The database still needs **`OrganizationDomain.host = demo.meengine.io`** (and the correct `organizationId`). Use **`pnpm demo:org:bootstrap`** (dry-run then apply) with `DEMO_ORGANIZATION_DOMAIN=demo.meengine.io` as described in [Commands](#commands).

### Deployment choices

- **Do not** point `demo.meengine.io` at a different Vercel project unless you **intentionally** use a separated demo deployment and matching demo database—otherwise you risk SSL on one stack while `DATABASE_URL` and org data belong to another.
- **Initial recommended setup:** same Vercel project as production tenant traffic, **separate demo organization** (demo tenant + `isDemo`), shared app build, dedicated `OrganizationDomain` for `demo.meengine.io`.
- **Future stronger setup:** separate Vercel project **and** separate demo database for stricter isolation.

More hosting context: [vercel-deployment.md](./vercel-deployment.md).

---

## One-time setup checklist

Complete on an **operator** machine with `DATABASE_URL` (and related env) available, **before** the meeting:

- [ ] **DNS / Vercel** — follow [Vercel and DNS setup for demo.meengine.io](#vercel-and-dns-setup-for-demo-meengine-io); confirm `demo.meengine.io` resolves and TLS works; confirm `OrganizationDomain.host` matches after bootstrap.
- [ ] **Bootstrap org** — dry-run then apply (`pnpm demo:org:bootstrap`); see [Commands](#commands).
- [ ] **List demo orgs** — `pnpm demo:orgs:list`; copy the organization **id** (CUID).
- [ ] **Configure showcase profile** — `pnpm demo:showcase:configure` with `DEMO_SHOWCASE_PROFILE=full-showcase` (dry-run then apply).
- [ ] **Readiness** — `pnpm demo:readiness` passes for that org id ([public-demo-seed-reset.md](./public-demo-seed-reset.md#readiness-check)).
- [ ] **Feature check** — `pnpm demo:features:check` passes ([public-demo-feature-showcase.md](./public-demo-feature-showcase.md)).
- [ ] **Private demo personas** — dry-run then apply `pnpm demo:personas:configure`; then `pnpm demo:personas:check` with the same three emails ([Configure private demo personas](#configure-private-demo-personas)).
- [ ] **Practical lesson demo** (if showing DRIVING create) — `pnpm demo:practical:configure` dry-run then apply ([Prepare practical lesson demo](#prepare-practical-lesson-demo)).
- [ ] **Client demo readiness smoke** — read-only aggregate gate (domains, features, grants, optional persona verification); run `pnpm demo:client-ready` with the same three **email** env vars as for persona check ([Client demo readiness smoke](#client-demo-readiness-smoke)).
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

### Prepare practical lesson demo

`demo:personas:configure` creates the Demo Instructor profile but does **not** link **qualified driving categories**. Practical (`DRIVING`) lesson creation fails until the instructor has at least one row in `_InstructorCategories` (same rule as production — this script only fixes **demo** orgs).

Run **before** demonstrating creation of a practical driving lesson. Does **not** create users, change passwords, or alter billing/features/licensing/settings.

**Dry-run:**

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_INSTRUCTOR_EMAIL=demo.instructor@meengine.io \
pnpm demo:practical:configure
```

**Apply** (requires both `DEMO_PRACTICAL_READINESS_APPLY=true` and `--apply`):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_INSTRUCTOR_EMAIL=demo.instructor@meengine.io \
DEMO_PRACTICAL_READINESS_APPLY=true \
pnpm demo:practical:configure -- --apply
```

Optional: `DEMO_DRIVING_CATEGORY_CODE=B` (matches `Category.name`) or `DEMO_DRIVING_CATEGORY_NAME=Car`. Default target is active category **B** when present.

Then run **`pnpm demo:client-ready`** (warning clears once the instructor is qualified).

### Client demo readiness smoke

Single **read-only** command that aggregates org/demo checks, `PLATFORM_ADMIN` absence, domain hosts, user counts by role, `OrganizationFeature` keys, entitlement grant window counts, and (when all three persona emails are set) the same persona rules as `demo:personas:check`. It does **not** print passwords, hashes, or tokens. It does **not** replace a **manual** login on `https://demo.meengine.io` before the meeting.

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_SCHOOL_ADMIN_EMAIL=<private-demo-admin-email> \
DEMO_INSTRUCTOR_EMAIL=<private-demo-instructor-email> \
DEMO_STUDENT_EMAIL=<private-demo-student-email> \
pnpm demo:client-ready
```

Omit the three `DEMO_*_EMAIL` variables to skip strict persona verification (you will see warnings if domains, features, or users look incomplete).

### Cleanup old demo personas

Remove **explicitly listed** user emails from the **demo** organization only (for example temporary Gmail accounts after switching to `@meengine.io` aliases). The script **refuses** `@meengine.io` addresses and **PLATFORM_ADMIN** users. It does **not** remove `OrganizationFeature`, `EntitlementGrant`, or billing rows. If foreign keys still reference a user (lessons, audit logs, payments, etc.), the script **stops** with a clear message—resolve data manually first.

Use only for addresses you **know** are obsolete. After apply, run **`pnpm demo:personas:check`** and **`pnpm demo:client-ready`**.

**Dry-run:**

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_PERSONA_CLEANUP_EMAILS=<old-email-1>,<old-email-2>,<old-email-3> \
pnpm demo:personas:cleanup
```

**Apply** (requires both `DEMO_PERSONA_CLEANUP_APPLY=true` and `--apply`):

```bash
DEMO_ORGANIZATION_ID=<demo-org-id> \
DEMO_PERSONA_CLEANUP_EMAILS=<old-email-1>,<old-email-2>,<old-email-3> \
DEMO_PERSONA_CLEANUP_APPLY=true \
pnpm demo:personas:cleanup -- --apply
```

On **Windows PowerShell**, set env vars per command or use `cmd /c` with the same variable assignments; for **apply**, both `DEMO_PERSONA_CLEANUP_APPLY=true` and `--apply` are required (same pattern as other demo scripts).

---

## Before leaving for the meeting

- [ ] **Client demo readiness smoke** — `pnpm demo:client-ready` with persona emails set ([Client demo readiness smoke](#client-demo-readiness-smoke)); expect **PASS** before travel.
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

| Symptom                                      | Likely cause                                                                   | What to do                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo:client-ready` reports FAIL on personas | Misconfigured users or wrong roles                                             | Run `pnpm demo:personas:check`; fix with `pnpm demo:personas:configure` (dry-run then apply).                                                                                                                                                                                                  |
| Vercel domain not verified                   | Wrong or missing Cloudflare CNAME, or Cloudflare proxy still on (orange cloud) | In Cloudflare, set **DNS only** (grey cloud) for the `demo` CNAME, target exactly what Vercel shows; wait for propagation; re-check Vercel **Domains**.                                                                                                                                        |
| SSL pending on `demo.meengine.io`            | DNS not fully propagated or CNAME target mismatch                              | Wait for propagation; verify CNAME **Name** (`demo`) and **Target**; remove orange-cloud proxy until Vercel validates.                                                                                                                                                                         |
| `demo.meengine.io` loads wrong tenant        | Host resolves but DB mapping wrong                                             | Confirm `OrganizationDomain.host` for the demo org is exactly `demo.meengine.io` (bootstrap); ensure `DATABASE_URL` points at the DB you updated.                                                                                                                                              |
| App error / blank but Vercel domain valid    | Build/runtime or env on that deployment                                        | Check the deployment logs and Vercel env vars for that environment; confirm the same project you configured in **Domains**.                                                                                                                                                                    |
| `demo.meengine.io` does not load             | DNS, Vercel project domain, or wrong deployment                                | Fix DNS / Vercel; confirm `OrganizationDomain.host` matches.                                                                                                                                                                                                                                   |
| Persona / login issue                        | User missing, wrong org, or password policy                                    | Run `pnpm demo:personas:check` with all three emails; re-run `pnpm demo:personas:configure` (dry-run then apply). Passwords must meet app rules (see validation / signup). If apply fails on role switch, the user may have blocking related rows—use a clean demo user or clear dependencies. |
| Expected UI / module missing                 | Feature rows or profile mismatch                                               | Run `pnpm demo:features:check`; re-run `pnpm demo:showcase:configure` (dry-run then apply) per [public-demo-feature-showcase.md](./public-demo-feature-showcase.md).                                                                                                                           |
| Org id unknown                               | Bootstrap not applied or wrong DB                                              | Run `pnpm demo:orgs:list`; confirm `DATABASE_URL` targets the intended environment.                                                                                                                                                                                                            |
| Destructive action **not** blocked           | Wrong org (`isDemo` false), guard gap, or non-demo stack                       | **Stop** the demo narrative; verify `Organization.isDemo` and demo guards ([public-demo-policy.md](./public-demo-policy.md)); escalate internally—do not present as “safe demo” until resolved.                                                                                                |

---

## Related docs

- [public-demo-policy.md](./public-demo-policy.md) — data, credentials, implemented guards.
- [public-demo-seed-reset.md](./public-demo-seed-reset.md) — seed/reset thinking, readiness, dry-run reset.
- [public-demo-feature-showcase.md](./public-demo-feature-showcase.md) — Full Showcase keys, `DEMO_SHOWCASE_PROFILE`, checks.
- [public-portfolio-access.md](./public-portfolio-access.md) — portfolio access policy and first Full Showcase prep flow.
- [release-checklist.md](./release-checklist.md) — deploy and demo preconditions.
