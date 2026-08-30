# Disposable database integration tests (DEC-070)

Real PostgreSQL integration tests for contracts that mocks cannot prove: exact migration history, foreign keys, transaction rollback, and row locks.

This harness is **not** ordinary local development (DEC-068) and **not** remote/Production migration (DEC-069). It mutates only a purpose-scoped disposable database, then destroys it.

## What this is

| Item                  | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Slice                 | `database-integration-test-harness-v1` / TEST-ARCH-001                                   |
| Local provision       | `--provision=local-compose`                                                              |
| CI provision          | `--provision=ci-external`                                                                |
| Local bind            | `127.0.0.1:55432`                                                                        |
| CI service alias      | `dat-integration-postgres:5432`                                                          |
| Disposable identity   | database/user/password `dat_it` (not a secret)                                           |
| Image pin             | `postgres:16.15@sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94` |
| Compose project       | `dat-it`                                                                                 |
| Ordinary `pnpm check` | remains DB-free; does **not** run this suite                                             |

The pin is PostgreSQL **16.15** on `linux/amd64`. It is **not** a claim of Production PostgreSQL version parity.

## Commands

Assumed shell: Git Bash

From the repository root, local disposable run:

```bash
pnpm -C driving_school_platform/nextjs_space test:integration
```

CI / already-provisioned service:

```bash
pnpm -C driving_school_platform/nextjs_space test:integration:ci
```

Do **not** run Playwright/E2E as part of this harness.

## Target authority

The harness validates identity **before** any PostgreSQL mutation.

- Local Compose mode **constructs** the canonical URL internally. Inherited `DATABASE_URL`, `DIRECT_URL`, and `INTEGRATION_DATABASE_URL` cannot redirect it.
- CI external mode accepts **only** `INTEGRATION_DATABASE_URL` matching host `dat-integration-postgres`, port `5432`, and identity `dat_it` / `dat_it` / `dat_it`.
- Application `DATABASE_URL` is **not** authority.
- `CI`, `GITLAB_CI`, `NODE_ENV`, and `VERCEL` do **not** expand the allowlist.
- Hosted, Supabase, RFC1918, `localhost` outside the exact local contract, `host.docker.internal`, and generic `postgres` hosts fail closed.

Guard: `lib/ops/integration-database-target-guard.ts`.

## Env-authority invariant

The CLI does **not** call `loadEnvConfig()`, `dotenv/config`, or `--env-file=.env.operator.production.local`.

Before spawning `prisma migrate deploy` or Vitest:

1. start from the current process environment (PATH and toolchain);
2. **explicitly overwrite** `DATABASE_URL` and `DIRECT_URL` with the already validated disposable URL;
3. spawn with `shell: false` and an argument array.

Prisma 6.19 may still discover a local `.env` file, but this harness does not rely on that. Observed Prisma 6.19.0 behavior with the committed `prisma.config.ts`: `migrate deploy` prints `Prisma config detected, skipping environment variable loading` and uses the child-process `DATABASE_URL` / `DIRECT_URL`. Even if a hosted operator URL exists in the parent environment or in `.env`, it cannot redirect the integration run.

## Local Compose

File: `driving_school_platform/nextjs_space/compose.integration.yml`

- dedicated project name `dat-it`
- host bind `127.0.0.1:55432` only
- no named persistent volume (`tmpfs` for PostgreSQL data)
- `restart: "no"`
- healthcheck via `pg_isready`
- no application container

If port `55432` is already occupied, the harness **fail-closes**. It does not pick another port and does not stop unrelated containers.

Teardown is always attempted after Compose has been started:

```text
docker compose -p dat-it down --volumes --remove-orphans
```

Teardown runs after success, migration failure, test failure, or child-process nonzero exit. The original failure is preserved.

## Compatibility bootstrap

Before `prisma migrate deploy`, the harness creates only:

- `anon`
- `authenticated`

as `NOLOGIN` / not superuser / cannot create DB / cannot create roles / no extra membership. It does **not** create `service_role`. This is integration-infrastructure only so committed `REVOKE … FROM anon, authenticated` statements can apply.

If a future migration requires another Supabase role, extension, or platform object, stop and review. Do not patch historical migrations.

## Migration execution

Uses `prisma migrate deploy` against the validated disposable target only.

Never invoke seed, `migrate reset`, `migrate dev`, or `db push`.

The Vitest suite then compares `_prisma_migrations` to the exact committed directory names under `prisma/migrations/` (finished, not rolled back, no extras).

## Real proofs

| Proof                                                  | File                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| A. Migration history                                   | `tests/integration/migration-history.integration.test.ts`    |
| B. Foreign key (`Organization` → `OrganizationDomain`) | `tests/integration/foreign-key.integration.test.ts`          |
| C. Transaction rollback                                | `tests/integration/transaction-rollback.integration.test.ts` |
| D. Row lock / `FOR UPDATE` + `lock_timeout`            | `tests/integration/row-lock.integration.test.ts`             |

These tests create dedicated `PrismaClient` instances. They must not import `lib/db.ts`. They do not load seed or production fixtures.

Existing `*.integration.unit.test.ts` files remain mocked unit tests and are unchanged.

## Capability boundary (PostgreSQL role)

The official PostgreSQL Docker image creates the configured `POSTGRES_USER`
(`dat_it`) with **superuser** privilege. The disposable integration database
therefore runs under a superuser bootstrap account.

This harness **is** valid evidence for:

- committed migration-history application from zero;
- PostgreSQL foreign-key enforcement;
- real transaction rollback;
- row locking / concurrency behavior (including SQLSTATE `55P03` lock timeout).

This harness **is not**, by itself, evidence for:

- application-role PostgreSQL permission semantics;
- RLS policy enforcement;
- least-privilege database-role behavior.

This is a documented capability boundary under DEC-070, **not** a Solution #5
blocker. Do not redesign the role model inside Solution #5. If a future
finding or feature requires RLS/grants/application-role proof, introduce a
non-superuser integration execution profile then.

## GitLab CI

Job `database-integration` is separate from `check`.

- `check` stays DB-free and keeps DEC-068 loopback dummy `DATABASE_URL` / `DIRECT_URL`.
- The integration job uses GitLab `services:` with the **same** pinned PostgreSQL image and alias `dat-integration-postgres`.
- Provision mode is explicit (`--provision=ci-external` via `pnpm test:integration:ci`). `CI=true` is not authorization.
- No Docker CLI, no `docker.sock`, no hosted DB, no GitLab secret DB in that job.

Hosted `services:` behavior is proven after source publication. Local implementation validates YAML structure only until that lifecycle gate.

## Out of scope

This harness does **not** fix billing, licensing, platform atomicity, API atomicity, UI orchestration, or E2E contract findings. If a real DB test exposes one of those, report it. Do not skip-as-green. Do not fix it here.
