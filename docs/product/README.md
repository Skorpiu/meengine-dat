# DAT Product Documentation

Concise product memory for DAT (driving-school operations) vs the **future Platform** (vendor/provider control plane). Engineering runbooks stay under `driving_school_platform/nextjs_space/docs/` and `docs/ops/`.

**Audience:** Rui, ChatGPT architect/reviewer, Cursor Super-Agent.

---

## Documents

| Document | Purpose |
| -------- | ------- |
| [dat-vs-platform-boundary.md](./dat-vs-platform-boundary.md) | What DAT owns today vs what Platform will own later |
| [packaging-and-entitlements.md](./packaging-and-entitlements.md) | Plans, import/export packaging, payments meaning, i18n, discovery backlog |
| [product-assumptions.md](./product-assumptions.md) | Living assumptions (dated, confidence, validate-by) |

**Durable decisions (append-only):** [decision-log.md](../architecture/decision-log.md)

**Backlog slices:** [roadmap-todo.md](../architecture/roadmap-todo.md)

**Current state:** [current-state.md](../architecture/current-state.md)

---

## Quick reference

- **DAT** — product used by driving schools (students, lessons, fleet, school admin).
- **Platform** — **future** internal product for Rui/vendor (customers, plans, entitlements, DAT subscription billing). Not a separate shipped product today.
- **English UI baseline** — new product surfaces default to English until i18n ships.
- **People UX next** — internal tabs on `/admin/users` (`people-management-internal-tabs-v1`), not route split.

---

## Related engineering docs

- Architecture: [system-design.md](../architecture/system-design.md)
- Import/export contracts: [client-data-import-export-strategy.md](../../driving_school_platform/nextjs_space/docs/engineering/client-data-import-export-strategy.md)
- Platform operator script: [platform-admin-runbook.md](../../driving_school_platform/nextjs_space/docs/ops/platform-admin-runbook.md)
- Vercel root directory: [vercel-deployment.md](../../driving_school_platform/nextjs_space/docs/ops/vercel-deployment.md)
