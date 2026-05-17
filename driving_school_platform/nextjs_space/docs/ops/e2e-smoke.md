# E2E demo smoke (optional)

Minimal **read-only** Playwright smoke for the **Demo School Admin** persona on a deployed or local tenant host. This is an **operator / staging** check—not part of `pnpm check` or mandatory GitLab CI.

## Goal

Confirm that a private demo admin can **sign in**, reach the **admin dashboard**, see no obvious fatal error copy, and **sign out**—without creating or mutating tenant data in the test itself.

## Prerequisites

- `@playwright/test` is already in the app package (see `package.json`).
- Install browser binaries once per machine:

  ```bash
  pnpm -C driving_school_platform/nextjs_space exec playwright install
  ```

- **Demo School Admin** credentials from your secret process (same persona as [client-demo-runbook.md](./client-demo-runbook.md)—internal role `SUPER_ADMIN`). **Never** commit real passwords or paste them into git, issues, or AI prompts.

## Environment variables

| Variable                         | Required                    | Purpose                                                                                                            |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `E2E_BASE_URL`                   | Recommended for hosted demo | Tenant origin, e.g. `https://demo.meengine.io`. Falls back to `PLAYWRIGHT_BASE_URL`, then `http://localhost:3000`. |
| `E2E_DEMO_SCHOOL_ADMIN_EMAIL`    | Yes (or test skips)         | Demo School Admin email.                                                                                           |
| `E2E_DEMO_SCHOOL_ADMIN_PASSWORD` | Yes (or test skips)         | Demo School Admin password.                                                                                        |

Optional:

| Variable              | Purpose                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL` | Legacy alias for base URL (used if `E2E_BASE_URL` is unset).                             |
| `E2E_SKIP_WEB_SERVER` | Set to `1` to never auto-start `pnpm dev` (use when the app is already running locally). |
| `.env.playwright`     | Local ignored file (see `.gitignore`); loaded by `playwright.config.ts`.                 |

If `E2E_DEMO_SCHOOL_ADMIN_EMAIL` or `E2E_DEMO_SCHOOL_ADMIN_PASSWORD` is missing, the demo smoke **skips** with a clear message—no failure.

## Run locally against hosted demo

PowerShell example (placeholders only):

```powershell
$env:E2E_BASE_URL = "https://demo.meengine.io"
$env:E2E_DEMO_SCHOOL_ADMIN_EMAIL = "<private-demo-admin-email>"
$env:E2E_DEMO_SCHOOL_ADMIN_PASSWORD = "<private-demo-admin-password>"
pnpm -C driving_school_platform/nextjs_space test:e2e:demo
```

bash example:

```bash
E2E_BASE_URL=https://demo.meengine.io \
E2E_DEMO_SCHOOL_ADMIN_EMAIL=<private-demo-admin-email> \
E2E_DEMO_SCHOOL_ADMIN_PASSWORD=<private-demo-admin-password> \
pnpm -C driving_school_platform/nextjs_space test:e2e:demo
```

## Run against local dev

1. Start the app (`pnpm dev`) **or** let Playwright start it when credentials are set and `E2E_BASE_URL` points at localhost.
2. Set the same `E2E_DEMO_*` variables to a demo org admin on your local DB.
3. Run `pnpm test:e2e:demo` from `driving_school_platform/nextjs_space`.

## Scripts

| Script               | Command                                     |
| -------------------- | ------------------------------------------- |
| `pnpm test:e2e`      | All Playwright specs (`tests/` + `e2e/`).   |
| `pnpm test:e2e:demo` | Demo smoke only (`e2e/demo-smoke.spec.ts`). |

## What this test does **not** do

- No creates, updates, deletes, or sandbox quota usage.
- No **PLATFORM_ADMIN** / platform host flows.
- No dependency on demo sandbox reset or cron.
- Not wired into `pnpm check` or required CI (optional future job only).

## Security

- Do **not** commit `.env.playwright`, real emails, or passwords.
- Do **not** log or print passwords in CI output.
- Prefer vault / private channels for credential distribution ([public-demo-policy.md](./public-demo-policy.md)).

## Related

- [production-smoke-baseline.md](./production-smoke-baseline.md) — manual hosted smoke checklist.
- [smoke-test-checklist.md](./smoke-test-checklist.md) — per-deploy re-smoke.
- [client-demo-runbook.md](./client-demo-runbook.md) — Demo School Admin persona.
