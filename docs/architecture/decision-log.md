# DAT Decision Log

Append-only log of **durable product and architecture decisions**. For backlog slices, see [roadmap-todo.md](./roadmap-todo.md). For product narrative, see [docs/product/](../product/).

**Format:** Date | ID | Decision | Status | Batch | Notes

---

## Entries

| Date | ID | Decision | Status | Batch | Notes |
| ---- | -- | -------- | ------ | ----- | ----- |
| 2026-06-03 | DEC-001 | **DAT** = school operational product; **Platform** = future vendor control plane for DAT customers (orgs, plans, entitlements, DAT subscription billing, domains). Platform is not a separate shipped product today. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | [dat-vs-platform-boundary.md](../product/dat-vs-platform-boundary.md) |
| 2026-06-03 | DEC-002 | School-facing DAT should not long-term expose raw System Settings / Feature Flags; demote/reposition; most ownership moves to future Platform. DAT keeps understandable School Settings only. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | Runtime unchanged; slices `admin-settings-client-visibility-review-v1`, `platform-settings-and-feature-flags-boundary-v1` |
| 2026-06-03 | DEC-003 | **People UX:** prefer internal tabs on `/admin/users` before route split; target Students/Onboarding, Instructors/Onboarding, App accounts (temporary). `/admin/instructors` route split deferred (D4). | Accepted | `people-management-onboarding-reframe-v1` | Onboarding reframe done; App accounts demote deferred until row-level app access |
| 2026-06-03 | DEC-004 | **Import/export packaging:** Basic/Starter = provider-assisted onboarding + basic export; Premium/Enterprise = self-service UI, dry-run/apply, templates, history/audit, advanced validation. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | [packaging-and-entitlements.md](../product/packaging-and-entitlements.md); runbook deferred |
| 2026-06-03 | DEC-005 | **Payment Integration** in DAT means school-facing payments (balances, packages, receipts, providers later), not DAT customer subscription billing (Platform). | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | Likely Premium/Enterprise |
| 2026-06-03 | DEC-006 | **Multi-Language** entitlement is not real i18n; framework and pt-PT packs are future slices. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | `i18n-framework-planning-v1`, `language-pack-pt-PT-v1` |
| 2026-06-03 | DEC-007 | **Competitive discovery** is a named future slice only; no deep analysis in sync v1. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | `competitive-product-discovery-v1` |
| 2026-06-03 | DEC-008 | **Super-Agent:** separate facts (repo) vs inferences vs recommendations; may challenge external advice with evidence; no forced agreement; durable decisions here; assumptions in `product-assumptions.md`. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | [cursor-operating-model.md](../ops/cursor-operating-model.md) — Product Strategy Protocol |
| 2026-06-03 | DEC-009 | **Preview/Vercel:** deploy `meengine-dat` from **repo root** (Vercel Root Directory = `driving_school_platform/nextjs_space`); remove temporary Preview hosts from `organization_domains` by exact host when done; never delete production domains; do not commit `.vercel`. | Accepted | `product-roadmap-and-platform-boundary-sync-v1` | [cursor-operating-model.md](../ops/cursor-operating-model.md) — Preview and Vercel housekeeping |
