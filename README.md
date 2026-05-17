# Driving Academy Tool (DAT)

## What is DAT?

DAT is a **multi-tenant SaaS** for **driving schools**: one codebase and data model scoped by organization, with staff and student workflows (lessons, vehicles, users, and related admin surfaces). The product is engineered for **tenant isolation**, operational checks, and a **controlled** public demo story when the app is shown as portfolio—not as an anonymous “try everything” playground.

Application code lives under **`driving_school_platform/nextjs_space`**.

---

## Current focus

- **Product / portfolio** positioning: honest scope, no credential leaks, no billing fiction.
- **Safe demo**: demo organizations (`Organization.isDemo`), mutation guards, read-only readiness and feature-showcase checks.
- **Tenant isolation** and clear separation between **tenant app** and **platform operator** surfaces (platform remains roadmap / operator-only, not the main public story).
- **Operational readiness**: CI gate, health smoke, migrations, and Supabase posture documented in ops runbooks.

---

## Architecture snapshot

| Layer | Choice |
| ----- | ------ |
| App | **Next.js 14** (App Router), **TypeScript**, React |
| Data | **Prisma 6**, **Supabase Postgres** (migrations in-repo) |
| Auth | **NextAuth** (credentials flow; secrets never in git) |
| Hosting | **Vercel**; DNS / edge via **Cloudflare** |
| CI | **GitLab CI** |

More detail: [docs/architecture.md](./docs/architecture.md). Ops entry points: [driving_school_platform/nextjs_space/docs/ops/deployment-readiness.md](./driving_school_platform/nextjs_space/docs/ops/deployment-readiness.md).

---

## Production / demo model

- **`www.meengine.io`** — tenant-facing app host (schools and their users).
- **`platform.meengine.io`** — platform / operator host (not marketed as a public self-serve product front today).
- **Demo access is controlled**: credentials and links are shared **privately**, not embedded in README or public snippets. There are **no public privileged credentials** (no demo **PLATFORM_ADMIN**, **SUPER_ADMIN**, or similar).
- **Controlled Full Showcase demo** is **operational** on `demo.meengine.io` for private client/recruiter sessions; access is **not** public self-serve — follow the [client demo runbook](./driving_school_platform/nextjs_space/docs/ops/client-demo-runbook.md).
- **Public demo rules** follow [driving_school_platform/nextjs_space/docs/ops/public-demo-policy.md](./driving_school_platform/nextjs_space/docs/ops/public-demo-policy.md) and [driving_school_platform/nextjs_space/docs/ops/public-portfolio-access.md](./driving_school_platform/nextjs_space/docs/ops/public-portfolio-access.md).
- **Client demo runbook** — [driving_school_platform/nextjs_space/docs/ops/client-demo-runbook.md](./driving_school_platform/nextjs_space/docs/ops/client-demo-runbook.md).

---

## Safety notes

- **No PLATFORM_ADMIN demo credentials** in docs, issues, or marketing—and platform admin is **not** part of a public demo narrative.
- **No real customer or pupil data** in anything presented as a public demo; use fictional, resettable data only.
- **Destructive and high-privilege demo actions** are limited by demo guards; they are a safety net, not a substitute for good access hygiene.
- **Billing**: real **checkout**, **billing portal**, and **live payment service provider** flows are **not** production-ready in this baseline; do not present them as live commerce.

---

## Engineering posture

- **CI check** — `pnpm -C driving_school_platform/nextjs_space check` is the local gate aligned with pipeline expectations.
- **Smoke health** — `GET /api/health` and optional scripted checks; see ops smoke docs under `driving_school_platform/nextjs_space/docs/ops/`.
- **Optional E2E demo smoke** — read-only Playwright check for Demo School Admin (`pnpm test:e2e:demo`); not part of `pnpm check`. See [e2e-smoke.md](./driving_school_platform/nextjs_space/docs/ops/e2e-smoke.md).
- **Prisma migrations** — committed migrations and deliberate deploy to target DB; see [driving_school_platform/nextjs_space/docs/ops/supabase-prisma-migrations.md](./driving_school_platform/nextjs_space/docs/ops/supabase-prisma-migrations.md).
- **Tenant / platform separation** — hostname and responsibility split documented in [driving_school_platform/nextjs_space/docs/ops/production-host-split.md](./driving_school_platform/nextjs_space/docs/ops/production-host-split.md).
- **Demo hardening** — policy, seed/reset runbook, `demo:readiness`, `demo:features:check`, dry-run reset tooling (links in [release-checklist.md](./driving_school_platform/nextjs_space/docs/ops/release-checklist.md)).
- **Supabase Data API policy** — RLS and internal-table posture: [driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md](./driving_school_platform/nextjs_space/docs/ops/supabase-data-api-policy.md).
- **Engineering excellence audit** — initial DAT-specific review: [driving_school_platform/nextjs_space/docs/engineering/engineering-excellence-audit.md](./driving_school_platform/nextjs_space/docs/engineering/engineering-excellence-audit.md).
- **Route handler consistency audit** — API route patterns and refactor backlog (docs only): [driving_school_platform/nextjs_space/docs/engineering/route-handler-consistency-audit.md](./driving_school_platform/nextjs_space/docs/engineering/route-handler-consistency-audit.md).
- **Lessons route refactor** — substantially complete (`lib/lessons/*`, list/detail DTO selects, contract tests): [lessons-route-refactor-plan.md](./driving_school_platform/nextjs_space/docs/engineering/lessons-route-refactor-plan.md). Findings inventory: [lesson-dto-minimization-audit.md](./driving_school_platform/nextjs_space/docs/engineering/lesson-dto-minimization-audit.md).
- **Public signup** — disabled by default (`PUBLIC_SIGNUP_ENABLED` opt-in); status and pending hardening: [signup-hardening-plan.md](./driving_school_platform/nextjs_space/docs/engineering/signup-hardening-plan.md). **Invite-only (B2B)** — design: [invite-only-foundation-plan.md](./driving_school_platform/nextjs_space/docs/engineering/invite-only-foundation-plan.md) (implementation pending).

---

## Development

```bash
pnpm install
pnpm dev
```

**GitLab CI** runs the same full gate as below (`check` job in `.gitlab-ci.yml`).

From a fresh clone, install the app package and run the full gate:

```bash
pnpm -C driving_school_platform/nextjs_space install
pnpm -C driving_school_platform/nextjs_space check
```

Copy `driving_school_platform/nextjs_space/.env.example` to `.env.local` and fill values from your secret process—**never** commit secrets. Variable reference: [driving_school_platform/nextjs_space/docs/ops/environment-variables.md](./driving_school_platform/nextjs_space/docs/ops/environment-variables.md).

Husky runs `lint-staged` from `driving_school_platform/nextjs_space` on commit; install dependencies there so Prettier and ESLint resolve locally.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Author

Rui Eduardo Alexandre Sousa  
Software Engineer  
LinkedIn: https://www.linkedin.com/in/rukahh
