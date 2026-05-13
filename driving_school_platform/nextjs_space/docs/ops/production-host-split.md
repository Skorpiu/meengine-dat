# Production host split (tenant app vs platform)

Operational reference for **DNS / Vercel** and **manual smoke** when the app is served on **two hostnames**: one for schools (tenant users) and one for platform operators. No application code changes are implied by this doc.

---

## Host roles (production)

| Host (example)             | Role                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`www.meengine.io`**      | **Tenant / application host** — public site, auth, and school-scoped surfaces for **tenant admin, instructor, and student** users.                                               |
| **`platform.meengine.io`** | **Platform host** — platform operator UI; **PLATFORM_ADMIN** users sign in and use platform flows here (for example **`/platform`** as `https://platform.meengine.io/platform`). |

In the current production layout, **both hostnames attach to the same Vercel project** (one Next.js deployment, multiple domains). That is normal; behavior still depends on **Host** / forwarded host headers, not on separate projects.

---

## Where to run smoke tests

- **Tenant / school smoke** — health, landing, login, admin, instructor, student: run against the **tenant host** (for example `https://www.meengine.io`). Use [smoke-test-checklist.md](./smoke-test-checklist.md) with that **HTTPS origin** as the base URL.
- **Platform smoke** — elevated platform UI: run against the **platform host** at **`/platform`** (for example `https://platform.meengine.io/platform`).
- **`/platform` on the tenant host** (for example `www`) is **not** the intended production path for platform operators. Prefer the platform hostname so routing and sessions match how the app distinguishes platform vs tenant traffic.

---

## PLATFORM_ADMIN vs tenant users

- **PLATFORM_ADMIN** accounts are **not** tenant (school) users. Do not treat them like org admins tied to a single school for product or DNS purposes.
- **Do not** associate the platform hostname with a tenant via **`OrganizationDomain`** (or equivalent tenant domain mapping). The platform host must remain outside normal tenant domain resolution.
- **Credentials** for PLATFORM_ADMIN are secrets: manage via your vault / rotation process. **Do not** document them as demo credentials, placeholders in git, or ticket screenshots. Creating or updating the DB user: **[platform-admin-runbook.md](./platform-admin-runbook.md)**.

---

## Vercel, DNS, and `PLATFORM_HOSTS`

1. **Vercel** — add the **platform** custom domain to the **same** project as the tenant app domain, complete DNS as Vercel instructs, and set **`NEXTAUTH_URL`** (and any other public URL vars you use) **per deployment / hostname** if your process requires distinct values per host.
2. **`PLATFORM_HOSTS`** — comma-separated list of hostnames that should be treated as the **platform** host (see [environment-variables.md](./environment-variables.md)). If you use a non-default platform hostname in production, include it here so routing stays correct. Omitting the variable falls back to application defaults documented alongside `lib/tenant.ts` in the env doc—**do not** rely on undocumented hostnames.
3. **Tenant mapping** — map **school** domains (for example `www` or customer subdomains) via your normal **tenant** / `OrganizationDomain` process only. **Never** map the platform hostname as a tenant `OrganizationDomain`.

---

## Related

- [platform-admin-runbook.md](./platform-admin-runbook.md) — create/update PLATFORM_ADMIN via `scripts/create-platform-admin.ts`.
- [vercel-deployment.md](./vercel-deployment.md) — project settings and domains.
- [environment-variables.md](./environment-variables.md) — `PLATFORM_HOSTS` and related optional vars.
- [smoke-test-checklist.md](./smoke-test-checklist.md) — manual pass by role.
- [first-deploy-smoke.md](./first-deploy-smoke.md) — minimal ordered first deploy smoke.
- [deployment-readiness.md](./deployment-readiness.md) — `pnpm check`, health endpoint.
