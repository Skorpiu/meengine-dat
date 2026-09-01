# Local disposable browser-E2E

Purpose-scoped **local** browser-E2E for DAT (`TEST-HYGIENE-001`). This is **not** Production Smoke, **not** demo smoke, **not** mobile viewport smoke, and **not** the DEC-070 database-integration harness.

Ordinary `pnpm check` remains DB-free and does **not** run this suite.

## Architecture

```text
disposable PostgreSQL (127.0.0.1:55433 / dat_e2e)
→ committed migrations
→ deterministic E2E-owned fixtures
→ DAT app bound to that database (127.0.0.1:13000)
→ Playwright specs in e2e/local/**
→ teardown (compose down --volumes --remove-orphans)
```

Application `.env` files are **not** database authority. `DATABASE_URL` and `DIRECT_URL` are injected into child processes only after the exact local identity matches.

This path does **not** change DEC-068, DEC-069, or DEC-070 identities.

## Identity

| Item            | Value                    |
| --------------- | ------------------------ |
| Host            | `127.0.0.1`              |
| PostgreSQL port | `55433`                  |
| Database/user   | `dat_e2e`                |
| Compose project | `dat-e2e`                |
| Compose file    | `compose.e2e.yml`        |
| App URL         | `http://127.0.0.1:13000` |
| Specs           | `e2e/local/**/*.spec.ts` |
| Playwright cfg  | `playwright.config.ts`   |

The DEC-070 integration identity (`127.0.0.1:55432` / `dat_it` / `dat-it`) is refused here.

## Command

Assumed shell: Git Bash

From the repository root:

```bash
pnpm -C driving_school_platform/nextjs_space test:e2e
```

This runs `tsx scripts/run-browser-e2e-tests.ts`. It does **not** call `pnpm dev`. The orchestrator starts the Next CLI against the disposable database.

Do **not** run Docker, Playwright, or this command unless that runtime validation is explicitly authorized.

## Safety

- Requires `DAT_E2E_ORCHESTRATOR_ACTIVE=1` (injected by the orchestrator).
- Requires the exact loopback app URL `http://127.0.0.1:13000`.
- Rejects `localhost` aliases, hosted hosts, Supabase, Production smoke opt-in, and smoke mutation context.
- Bare `playwright test` fail-closes and **cannot** enter Production Smoke.
- Demo and production smoke use `playwright.smoke.config.ts` via `pnpm test:e2e:demo` and `pnpm e2e:smoke:*`.
- Mobile viewports remain `pnpm e2e:mobile-viewports` (`playwright.mobile-viewports.config.ts`).

## Fixtures

Fixtures are E2E-owned and deterministic (organization, SUPER_ADMIN, instructor user + Instructor row, two operational Students with linked Users, category B, `VEHICLE_MANAGEMENT` disabled). They do not use Production fixtures, operator accounts, or “first row” database order.

`THEORY_EXAM` participants are operational **Student.id** values from `GET /api/admin/students`. Lesson `instructorId` remains the instructor **User.id** resolved through `Instructor.userId`.

This harness does **not** prove application-role, RLS, or grants coverage.

## Related

- [e2e-smoke.md](./e2e-smoke.md) — demo smoke.
- [production-smoke-e2e.md](./production-smoke-e2e.md) — hosted production smoke.
- [database-integration-tests.md](./database-integration-tests.md) — DEC-070 disposable `dat_it` harness (separate purpose).
