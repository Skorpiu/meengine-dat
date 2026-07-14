# DAT Product Documentation

Concise product memory for DAT (driving-school operations) vs **Platform** (MeEngine provider control plane). Engineering runbooks stay under `driving_school_platform/nextjs_space/docs/` and `docs/ops/`.

**Audience:** Rui, ChatGPT architect/reviewer, Cursor Super-Agent.

---

## Documents

| Document | Purpose |
| -------- | ------- |
| [dat-v1-commercial-release-scope.md](./dat-v1-commercial-release-scope.md) | DAT v1.0 commercial scope — current core vs target |
| [dat-plan-and-module-catalog.md](./dat-plan-and-module-catalog.md) | Basic / Standard / Premium, modules, add-ons, intervals |
| [dat-vs-platform-boundary.md](./dat-vs-platform-boundary.md) | DAT vs Platform ownership (partial Platform runtime today) |
| [packaging-and-entitlements.md](./packaging-and-entitlements.md) | Packaging summary and enforcement backlog |
| [product-assumptions.md](./product-assumptions.md) | Living assumptions (dated, confidence, validate-by) |
| [competitive-product-discovery.md](./competitive-product-discovery.md) | Market comparison (2026-07-10) |

**Architecture plans:**

| Document | Purpose |
| -------- | ------- |
| [dat-v1-commercial-release-plan.md](../architecture/dat-v1-commercial-release-plan.md) | Master release plan, ordered slices, RC/final tags |
| [platform-subscription-billing-entitlements-plan.md](../architecture/platform-subscription-billing-entitlements-plan.md) | Platform billing + entitlements |
| [platform-multi-product-control-plane-plan.md](../architecture/platform-multi-product-control-plane-plan.md) | Multi-product Platform extraction |

**Durable decisions (append-only):** [decision-log.md](../architecture/decision-log.md)

**Backlog slices:** [roadmap-todo.md](../architecture/roadmap-todo.md)

**Current state:** [current-state.md](../architecture/current-state.md)

**Tags / recovery:** [git-tags-and-recovery-runbook.md](../ops/git-tags-and-recovery-runbook.md)

---

## Quick reference

- **DAT** — product used by driving schools (students, lessons, fleet, school admin).
- **Platform** — provider control plane for DAT customers (orgs, plans, subscriptions, entitlements, provisioning). **Partial UI/API exists** (`/platform`, `/api/platform/organizations`); commercial billing **not production-ready**.
- **Current deployed core** — controlled B2B, invite-only, no live self-service billing (DEC-032 historical cutline).
- **Target DAT v1.0** — sellable/subscribable; Platform-owned tenant billing; License self-service; Basic/Standard/Premium; email reminders; optional school ledger (DEC-046–057).
- **Safety tag** — `dat-v1-core-baseline-95b833e` @ `95b833e` (pre-commercial core anchor; not final release).
- **English UI baseline** — new product surfaces default to English until i18n ships.

---

## Related engineering docs

- Architecture: [system-design.md](../architecture/system-design.md)
- Import/export contracts: [client-data-import-export-strategy.md](../../driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md)
- Platform operator script: [platform-admin-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/platform-admin-runbook.md)
- Vercel root directory: [vercel-deployment.md](../../driving_school_platform/nextjs_space/docs/ops/vercel-deployment.md)
