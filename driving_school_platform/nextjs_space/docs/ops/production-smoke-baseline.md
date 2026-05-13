# Production smoke baseline (DAT)

**Current production baseline** — high-level record of what was successfully validated on the first hosted production pass, after GitLab CI was green and Vercel was serving production. This doc is **not** a substitute for re-running smoke on every release; it captures expectations only.

Do **not** store credentials, passwords, tokens, database URLs, Supabase keys, private billing data, customer emails, or raw deployment logs here. **PLATFORM_ADMIN** and other operator credentials are **not** documented anywhere in the repo.

---

## Host model (validated conceptually)

- **Tenant / public app host** — primary school-facing origin (landing, tenant auth, admin, instructor, student surfaces). Health and tenant-role checks use this hostname.
- **Platform host** — separate origin for platform operators; **`/platform`** and **PLATFORM_ADMIN** login are exercised here in split-host production. **`/platform` on the tenant host** is **not** the intended production path for operators (see [production-host-split.md](./production-host-split.md)).

No real hostnames or URLs are required in this baseline file; operators substitute their own HTTPS origins when repeating checks.

---

## What validated successfully (baseline scope)

| Area                             | Result (baseline)                                                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public tenant host**           | Served; used for tenant-facing checks.                                                                                                                                                                                                                |
| **Platform host**                | Served; used for platform operator checks.                                                                                                                                                                                                            |
| **`GET /api/health`**            | `200` and expected JSON; optional `pnpm smoke:health` against each origin as needed ([deployment-readiness.md](./deployment-readiness.md)).                                                                                                           |
| **`/auth/login`**                | Page loads (routing and assets sanity).                                                                                                                                                                                                               |
| **Tenant admin (authenticated)** | `/admin`, `/admin/users`, `/admin/license`, `/admin/settings`, `/profile` reachable for authorized tenant admin flows under test.                                                                                                                     |
| **Instructor**                   | `/instructor`, `/profile` reachable for authorized instructor under test.                                                                                                                                                                             |
| **Student**                      | `/student`, `/profile` reachable for authorized student under test.                                                                                                                                                                                   |
| **Platform**                     | **PLATFORM_ADMIN** login on **platform** host; **`/platform`** works on **platform** host.                                                                                                                                                            |
| **CI / deploy**                  | GitLab pipeline green for the shipped tree; Vercel production deployment serving the app.                                                                                                                                                             |
| **Logs (smoke window)**          | No **obvious fatal** runtime errors observed during the smoke pass when Vercel/runtime logs were skimmed (summarized only; **no raw logs** in git). **Always** re-check logs on **every** deploy—new regressions will not appear in this static note. |

---

## HTTP 403 and protected APIs

Some **`403`** responses on **protected** routes or APIs (for example admin license or feature endpoints) **can be expected** when the caller **lacks** the required role, surface, or entitlement. Treat unexpected **403**s as investigation items; treat **500**s or repeated client crashes as regressions.

---

## Out of scope for this baseline (unchanged product fact)

- **Real billing providers**, **checkout**, and **billing portal / billing UI** are **not** integrated in this baseline; they were **not** validated as live commerce flows.
- **i18n** is not part of smoke scope.

See [release-checklist.md](./release-checklist.md) (**Known not yet integrated**) and [smoke-test-checklist.md](./smoke-test-checklist.md) for the same boundaries.

---

## Related

- [first-deploy-smoke.md](./first-deploy-smoke.md) — ordered first hosted pass.
- [smoke-test-checklist.md](./smoke-test-checklist.md) — fuller manual smoke.
- [release-checklist.md](./release-checklist.md) — deploy order and rollback.
- [production-host-split.md](./production-host-split.md) — tenant vs platform hostnames.
