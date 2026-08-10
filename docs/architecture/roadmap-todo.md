# DAT Roadmap and To-Do

Prioritized backlog for DAT. **P0** is safety; feature work starts at **P1** unless security blocks release.

**Closed-slice history:** see [current-state.md](./current-state.md) (reference archive). This file lists **open** work and **one** recommended next slice.

---

## Single recommended next

| Slice | Priority | Status |
| ----- | -------- | ------ |
| `engineering-excellence-audit-v1` | **P1** engineering excellence | **Active — analysis-only**; exhaustive static snapshot analysis complete; 48 findings confirmed; no unclassified static signal remains; no audit-branch implementation |

**Closed context:** `node-24-runtime-migration-v1` closed 2026-08-04 at merge `909b69a`: Node 24.18.0 local compatibility, repository/CI pins, GitLab `node:24`, Vercel Preview, Project Setting 24.x, Production deployment and post-deploy non-destructive hosted gates passed. The earlier full mutation smoke evidence remains valid; mutation smoke was not repeated for this runtime/config-only change. Fixtures (DEC-064), invite-link repair and the earlier hosted verification remain **closed** — do not re-apply without new evidence + human authorization. Runbook: [production-smoke-e2e.md](../../driving_school_platform/nextjs_space/docs/ops/production-smoke-e2e.md).

---

## Canonical sequence

<!-- node-24-runtime-migration-v1 closed 2026-08-04 at 909b69a -->
**Closed prerequisite:** `node-24-runtime-migration-v1` merged to `main` at `909b69a`; GitLab `node:24`, Vercel Preview/Production Node 24.x, and required post-deploy non-destructive hosted gates passed.

1. `engineering-excellence-audit-v1` — **P1 / engineering excellence — active, analysis-only**; exhaustive static snapshot analysis complete; 48 findings confirmed; implementation remains separate and human-authorized
2. `platform-separation-architecture-plan-v1`
3. Small audit-approved refactor slices (one scope per branch; behavioural equivalence + `pnpm check`)

**P1 parallel (preserved):** `people-instructor-invite-accept-list-refresh-v1`; `school-person-identifiers-settings-product-plan-v1` (DEC-065).

Do **not** resume `platform-commercial-catalog-read-services-v1` inside embedded Platform without the separation plan.

---

## P0 / Safety

- Do not merge **unvalidated** batches.
- If **`pnpm -C driving_school_platform/nextjs_space check`** fails, do not push.
- If **migration** fails or status is unknown on target DB, do not push.
- If **schema/runtime mismatch** exists, stop.
- If a batch touches **auth / security / billing / demo** unexpectedly, stop and report.
- Keep **secrets** out of docs, commits, and logs.

### Controlled production (first B2B client)

**Cutline:** [production-readiness-cutline.md](./production-readiness-cutline.md) (**DEC-032**). DAT core is production-ready for **invite-only**, no public signup, no live billing. P0 here is **operational discipline**.

| Item | Notes |
| ---- | ----- |
| Credential policy | Never expose `PLATFORM_ADMIN` / `SUPER_ADMIN` secrets in docs, git, or client handoff |
| Target env deploy discipline | Per environment: `prisma migrate status` (read-only inspect); `pnpm check` green; post-deploy smoke. `prisma migrate deploy` only when migrations are required, with **explicit human authorization**, in an **isolated** operator block — never automatic / never agent-executed |
| `PUBLIC_SIGNUP_ENABLED=false` | Mandatory on first B2B client production |
| Shared hosts today | `www.meengine.io`, `platform.meengine.io`, `demo.meengine.io`, `meengine-dat.vercel.app` — same Vercel deployment; separation planned, not physical |

---

## Open engineering and product backlog

| Slice | Priority | Notes |
| ----- | -------- | ----- |
| `engineering-excellence-audit-v1` | **P1** active (analysis-only) | Exhaustive static snapshot analysis completed on audit HEAD `5eded00`; 48 findings confirmed; audit report records evidence; audit itself authorizes no implementation |
| `platform-separation-architecture-plan-v1` | **P1** backlog | After the engineering audit — autonomous MeEngine Platform vs DAT; Node 24 prerequisite is closed |
| `people-instructor-invite-accept-list-refresh-v1` | **P1** bug | After INSTRUCTOR invite accept, instructor may not appear under People → Instructors despite correct DB rows |
| `school-person-identifiers-settings-product-plan-v1` | **P1** plan first | DEC-065 — Admin → Settings → Identifiers & numbering; plan before implementation |
| `platform-commercial-catalog-read-services-v1` | **P1** blocked | Gate after Platform separation plan — do not resume in embedded Platform |
| `lesson-reminders-email-product-plan-v1` | **P1** product backlog | Email lesson reminders; `Notification` reuse not assumed |
| `school-balances-ledger-product-plan-v1` | **P1** product backlog | Optional DAT school→student ledger module (DEC-051/052); **not** Platform subscription billing; plan only — no implementation authorization |
| `student-progress-tracking-foundation-plan-v1` | **P1** product backlog | Competency progress — plan only |
| `cursor-automations-super-agent-scheduled-support` | **P1** if free | Only if Automations available at **no extra cost**; else manual daily Super-Agent check |
| `student-lesson-request-policy-planning-v1` | **P2** backlog | Controlled request + approval (`LessonRequest` exists) |
| `import-export-business-packaging-v1` | **P2** | Tier vs self-service UI enforcement |
| `provider-assisted-import-runbook-v1` | **P2** | Operator import runbook |
| `school-operational-alerts-v1` | **P2** | Vehicle expiry/inspection/maintenance lead times |
| `platform-settings-and-feature-flags-boundary-v1` | **P2** confirmed boundary | `AUTHZ-OPERATOR-001` — move internal settings/flags authority away from tenant School Admin; hidden navigation is not authorization |
| `i18n-framework-planning-v1` | **P2** | Real i18n; switcher, fallback, plan tie-in |

**Payment domains (DEC-046 / DEC-052) — keep separate; no implementation authorization:**

| Domain | Owner | Status |
| ------ | ----- | ------ |
| Platform subscription billing (school pays DAT provider) | **Platform** | Planned commercial path (DEC-046); not current deployed baseline |
| School→student ledger / balances | **DAT** optional module | Plan via `school-balances-ledger-product-plan-v1` (DEC-051/052) |

**Superseded / do not reopen as mixed “payments + balances” items:** `payment-integration-product-planning-v1`, `payments-and-balances-foundation-v1` — older labels that blur Platform subscription billing with the optional DAT school ledger. Prefer the split above.

**Abandoned:** `platform-admin-access-and-smoke-reconcile-v1` (superseded by DEC-063 / `dat-production-smoke-reconcile-v1`).

---

## P1 / Engineering excellence — planned (analysis-only)

### `engineering-excellence-audit-v1`

**Status:** **P1 — active**; analysis-only. Normalized inventory, targeted evidence and exhaustive static snapshot analysis are complete. 46 findings are confirmed and mapped to implementation, refactor, evidence or disposition slices; appearance in the roadmap does not authorize implementation. No runtime, schema, data, billing or functional changes belong in the audit branch. Detailed evidence: [engineering-excellence-audit-v1.md](./engineering-excellence-audit-v1.md).

**Inherited baseline:** Node 24 P0 is closed (`909b69a` runtime merge; `da5aea6` current main/audit base). Local Node `v24.18.0`, repository engine `24.x`, GitLab `node:24`, Vercel Node 24.x, 207 test files / 1738 tests, production build, and post-deploy read-only smoke are validated. No dependency or runtime upgrades belong in this audit.

<!-- node24-local-runtime-chain-v1 -->
**Local validation routing:** on the current Windows/Git Bash workstation, bare `pnpm` resolves through Volta and currently runs under Node `v20.20.0`. Even an explicitly Node-24-launched outer pnpm can invoke nested bare pnpm processes that fall back to Node 20. Full Node-24 evidence therefore requires transitive provenance. On 2026-08-07 a guarded temporary PATH shim forced direct and nested pnpm calls through portable Node `v24.18.0` + pnpm `10.24.0`; 9 shim invocations were recorded and the check passed 207/207 test files, 1738/1738 tests, and the production build. The shim was removed after validation.

**Super Agent role:** reusable DAT operational worker for repository investigation, guarded command preparation, canonical memory maintenance, and smallest-safe-slice planning. It does not autonomously authorize remote writes, production mutations, destructive operations, or behavioural changes.

**Rulebook audit:** `SA-GOV-001` semantic gates fixed; `SA-GOV-002` authority hierarchy apt; `SA-GOV-003` operational Definition of Done apt through the canonical Merge readiness criteria; `SA-GOV-004` confirmed and fixed through the Engineering Quality Review Protocol.

<!-- ui-orch-001-linked-student-profile-split-mutation -->
**Confirmed finding `UI-ORCH-001`:** linked student profile editing persists the `Student` update before attempting the linked `User` update. Failure of the second request produces an acknowledged partial success but can leave the two records divergent.

**Priority:** P1 engineering-quality follow-up — data consistency, reliability, orchestration ownership, and regression protection.

<!-- api-atom-001-generic-user-update-split-write -->
**Confirmed finding `API-ATOM-001`:** `/api/users/update` writes the generic `User` record before role-specific `Student` or `Instructor` data without transaction or compensation.

<!-- ui-orch-002-instructor-profile-category-split-mutation -->
**Confirmed finding `UI-ORCH-002`:** instructor profile/license and qualified-category updates are separate requests and may leave an acknowledged partial result.

**Approved future implementation sequence:**

1. `student-profile-atomic-update-v1` — aggregate-specific transactional service behind `PATCH /api/admin/students/[id]`; resolves `UI-ORCH-001` and the student branch of `API-ATOM-001`.
2. `instructor-profile-atomic-update-v1` — aggregate-specific transactional service behind `PATCH /api/admin/instructors/[id]`; resolves `UI-ORCH-002` and the instructor branch of `API-ATOM-001`.
3. `generic-user-update-contract-narrowing-v1` — remove Student/Instructor aggregate responsibilities from `/api/users/update` after all callers migrate.

Each implementation must be a separate smallest-safe branch. No runtime implementation belongs in `engineering-excellence-audit-v1`.

<!-- super-agent-continuity-recovery-v1 -->
**Super Agent continuity:** every material phase must update `docs/ops/super-agent-continuity-state.md` and pass a read-only recovery reconstruction drill.

<!-- ui-struct-001-people-manager-orchestration-concentration -->
**Confirmed finding `UI-STRUCT-001`:** the Student and Instructor managers coordinate several independently changing workflows and local reconciliation states without direct component-level regression tests.

**Deferred To-Do:** after `student-profile-atomic-update-v1`, `instructor-profile-atomic-update-v1`, and `generic-user-update-contract-narrowing-v1`, evaluate separate Student and Instructor orchestration seams and add regression coverage. Do not perform a broad rewrite or introduce a generic shared People manager.

<!-- a11y-001-people-search-accessible-names -->
**Confirmed finding `A11Y-001`:** add explicit labels/IDs to Student and Instructor search inputs and accessible names to their icon-only search actions.

**Future slice:** `people-search-accessible-names-v1` — localized accessibility correction with regression assertions using accessible roles/names.

<!-- a11y-002-people-badge-help-touch-discoverability -->
**Confirmed finding `A11Y-002`:** replace tooltip-dependent People badge explanations with a tap- and keyboard-discoverable help mechanism while preserving concise visible badges.

**Future slice:** `people-badge-help-accessibility-v1` — preserve the existing label guide and badge semantics; avoid a broad People redesign.

**Performance conclusion:** no separate finding. Student cursor pagination and Instructor visible-count slicing bound list rendering; revisit only with measured user-visible evidence.

<!-- api-dup-001-config-route-skeleton-duplication -->
**Confirmed finding `API-DUP-001`:** Settings and Feature Flags duplicate authenticated tenant-scoped CRUD, mutation guarding, audit composition, response, and error-handling mechanics.

<!-- small-typed-helpers-over-generic-route-factories-v1 -->
**Approved future slice:** `admin-config-route-helpers-v1` — extract only proven common behavior into small typed helpers. Keep schemas, DTOs, persistence, domain rules, and audit payloads specific. Do not create a generic CRUD route factory.

<!-- api-struct-001-vehicle-route-domain-concentration -->
**Confirmed finding `API-STRUCT-001`:** the Vehicles route owns several independently changing domain and transport responsibilities.

**Approved future slice:** `vehicle-route-domain-services-v1` — extract typed input validation, identifier-conflict checks, effective-status projection, deletion eligibility, and domain persistence seams while preserving the existing HTTP contract.

**Configuration audit conclusion:** no separate finding. Audit-history writes are best-effort and catch their own errors.

<!-- api-dup-002-local-super-admin-tenant-helper-duplication -->
**Confirmed finding `API-DUP-002`:** local SUPER_ADMIN, organization, tenant-host, and actor-context resolution is repeated across 17 administrative route files.

<!-- domain-modular-design-and-thin-route-adapters-v1 -->
**Approved future slice:** `admin-route-context-helper-v1` — introduce `lib/admin/admin-route-access.ts` and a small typed `requireSuperAdminTenantContext` helper. Migrate routes incrementally while preserving their domain-specific guards and response contracts.

**Modularity rule:** organize by domain/capability, keep routes thin, extract proven common mechanics, and avoid generic frameworks or an unbounded shared-utils module.

<!-- ui-struct-002-schedule-map-view-orchestration -->
**Confirmed finding `UI-STRUCT-002`:** Schedule Map Month and Week views duplicate substantially the same seven-column grid, lesson selection, expanded details, warnings, and edit/delete actions. Day remains a separate timeline responsibility.

**Approved future slice:** `schedule-map-wide-grid-components-v1` — extract a focused shared Month/Week grid plus reusable lesson details/actions while preserving explicit mode differences.

**Follow-up slice:** `schedule-map-data-orchestration-v1` — evaluate focused lesson-loading, instructor-filter, refresh, and interaction-state boundaries after the view extraction.

**Testing requirement:** preserve existing helper and E2E coverage and add regression evidence for view switching, lesson expansion, filtering, refresh/focus, and edit/delete eligibility using the existing toolchain.

**Rejected resolution:** no universal Day/Week/Month renderer and no generic calendar framework.

<!-- ui-struct-003-lesson-form-orchestration-concentration -->
**Confirmed finding `UI-STRUCT-003`:** LessonForm retains several independently changing data, policy, validation, state, payload, and presentation responsibilities.

**Approved future slice:** `lesson-form-policy-module-v1` — extract pure typed lesson-type, role, mode, student-selection, vehicle-requirement, and payload-policy functions. Server validation remains authoritative.

**Approved future slice:** `lesson-form-option-data-hook-v1` — encapsulate instructor, Student, and Vehicle option loading, parsing, loading state, and cancellation.

**Deferred presentation slice:** `lesson-form-sections-v1` — separate explicit participant, vehicle, schedule, and status sections after policy and option-data boundaries are stable.

**Testing requirement:** unit-test pure policy/data modules and use the existing Playwright toolchain for create/edit/type-transition flows; do not add dependencies solely for this refactor.

**Rejected resolution:** no generic form framework, dynamic schema-renderer, oversized shared hook, or domain-erasing form abstraction.

<!-- a11y-003-lesson-form-control-associations -->
**Confirmed finding `A11Y-003`:** LessonForm Select labels are not programmatically associated with their triggers; Student search fields and icon-only clear actions lack accessible names.

**Approved future slice:** `lesson-form-accessible-controls-v1` — add stable SelectTrigger IDs or equivalent accessible associations, label both search inputs, name both clear actions, and preserve the existing correct checkbox/date/time associations.

**Testing requirement:** assert fields and actions through accessible roles and names using the existing test toolchain.

<!-- lesson-form-client-server-policy-classification-v1 -->
**Lesson policy conclusion:** no broad client/server duplication finding. Move stable UI policy into `lesson-form-policy-module-v1`, consume the canonical practical-exam Student limit, and preserve authoritative server validation.

**Pending contract audit:** confirm whether EXAM/THEORY_EXAM participant editing is supported consistently by LessonForm and the update contract.

**Goal (future execution):** Global maintainability and internal-quality audit **without** changing functional behaviour during the audit itself.

**Does not:** reopen or mix with the closed `node-24-runtime-migration-v1` P0; alter runtime/schema/data; mass-refactor; invent abstractions to cut lines; mix internal maintenance with new features.

**Scope (when executed):**

| Area | Look for |
| ---- | -------- |
| Duplication | Repeated blocks; repeated validation/normalization; repeated HTTP response construction; duplicated logic across routes/services/repositories/UI |
| Structure | Business logic in route handlers; mixed responsibilities; oversized modules/functions; helpers too specific or wrongly shared; dead/obsolete paths |
| Readability | Ambiguous names; too many parameters; deep conditionals; inconsistent similar contracts |
| Comments | Future comments in **English**; only for decisions, invariants, safety limits, non-obvious behaviour, trade-offs, cross-module contracts |
| Tests | Duplicate fixtures/mocks/builders/setup; coverage proportional to complexity; avoid redundant tests without confidence gain |

**Minimum deliverable (analysis-only report):** (1) inventory; (2) concrete evidence per file/module; (3) severity + value; (4) distinguish safe refactor / architecture / tech debt / possible functional change; (5) recommended small slices; (6) behavioural-equivalence criteria; (7) risks, rollback, and required tests.

**After the audit:** implement derived refactors later — one small scope per branch; behavioural equivalence + `pnpm check`.

---

## P2 / Topic backlog (not the global audit)

Longer-running topics; prefer audit-derived slices over inventing mass refactors here.

| Topic | Notes |
| ----- | ----- |
| `instructor-id-boundary-hygiene` | Clarify `User.id` vs `Instructor.id`; centralize resolution |
| `practical-lesson-counter-concurrency-hardening` | Unique/partial index + retry before large imports |
| `route handler consistency` | Normalize auth guards / response shapes gradually |
| DTO minimization | Role-based DTOs; never select `passwordHash` except auth |
| `supabase-rls-tenant-policies-v1` | `CREATE POLICY` only if Data API tenant access is product-required |
| Demo DB separation | Recommended for public portfolio |
| Platform subscription billing / PSP checkout | Platform domain (DEC-046) — explicit sensitive-batch approval per slice; not current baseline |
| Billing webhook hardening | When Platform billing exists — sanitize provider errors before production reliance |

**Done (do not reopen as pending):** audit log write + read + viewer + tenant CSV export; mobile/tablet readiness; competitive discovery; calendar v1a–v1d; People UX core; import/export UI; RLS Class-B revoke-only; operational `organizationId` NOT NULL; smoke fixture reconcile (DEC-064); student invite link repair.

---

## P3 / Deferred

| Slice | Notes |
| ----- | ----- |
| `calendar-lessons-polish-v1e-student-warnings` | Product policy first |
| `language-pack-pt-PT-v1` | After i18n framework |
| `people-management-ux-unification-instructor-route-split-v1` | D4; tabs-first stands |
| Soft-delete/archive for student fichas | After retention policy product need |
| `typescript-baseurl-deprecation-v1` | Non-blocking tooling hygiene |
| `cursor-rules-performance-split` | Only if Cursor context noise is confirmed |

---

## P3 / Demo and product polish

- Controlled migration demo sandbox — after DAT UI polish; no real email unless controlled
- Public demo improvements — seed examples; export read-only maybe; **no** import apply on public demo
- Platform/admin maturity — polish after separation plan

---

## P4 / Modernization

### dependency-modernization-audit

- Prisma 7, Next.js, TypeScript, Vitest, pnpm/Node, ESLint/tooling
- **One family at a time**; full `check` between upgrades
- Avoid large upgrades during critical feature work unless security requires it

---

## Explicitly do not open next

- Billing feature/checkout/PSP expansion remains blocked. Security containment for confirmed `BILLING-SEC-001` is the exception and may proceed only as a dedicated human-authorized P0 slice.
- Prisma migrations / schema changes unless gated
- Platform cross-tenant audit viewer (tenant CSV export is **done**)
- `supabase-rls-tenant-policies-v1` unless Data API product-required
- Commercial catalogue read-services inside embedded Platform without separation plan
- Re-running DEC-064 repair/fixture apply without new evidence + human authorization

<!-- dat-toolchain-rationalization-v1 -->
## Engineering Excellence — toolchain follow-up slices

These slices are implementation follow-ups discovered by the analysis-only engineering audit. They are queued, not authorized for implementation merely by appearing here.

### `toolchain-volta-decoupling-v1`

- **Status:** queued.
- **Source:** `TOOLCHAIN-001`.
- **Goal:** remove the stale project-level Volta Node 20 contract from DAT without requiring removal of Volta from the workstation.
- **Must preserve:** Node 24 runtime baseline, pnpm `10.24.0`, lockfile integrity, CI and hosted runtime behaviour.
- **Implementation authority:** human approval required; Super Agent may prepare evidence and patch.

### `toolchain-local-runtime-standardization-v1`

- **Status:** queued after `toolchain-volta-decoupling-v1` evidence/design.
- **Goal:** provide one documented, reproducible local Node 24 + pnpm execution contract with **transitive runtime provenance**, so outer pnpm, nested pnpm lifecycle calls, test/build subprocesses, and development orchestration cannot silently fall back to Volta Node 20.
- **Design preference:** align local semantics with the existing Node 24 + pnpm/Corepack CI contract where safe; prefer one durable repository-supported execution strategy over a permanent machine-specific shim, and do not introduce another tool solely to solve tool proliferation.
- **Implementation authority:** human approval required.

### `toolchain-e2e-runtime-provenance-v1`

- **Status:** evidence-first queued slice.
- **Goal:** prove and, only if required, correct the runtime used by Playwright web-server commands currently expressed as bare `pnpm dev`.
- **Risk:** E2E may otherwise launch the application dev server under Volta Node 20 even when Playwright itself starts under Node 24. The nested-runtime probe has confirmed that this class of fallback is real for bare pnpm commands; the Playwright web-server path must therefore be proven explicitly.
- **Implementation authority:** evidence first; behavior/config change requires human approval.

### `toolchain-unused-dev-dependencies-v1`

- **Status:** evidence-first queued slice.
- **Goal:** identify and remove only direct development dependencies proven to have no required repository responsibility.
- **Initial candidates:** `ts-node` and direct `@next/swc-wasm-nodejs`, neither of which has a repository responsibility proven by the snapshot reference scan; also verify Node type-package alignment and any other obsolete runner/tool residue before removal.
- **Explicit non-targets unless new evidence appears:** Vitest, Playwright, `tsx`, pnpm, Prisma, ESLint, Prettier.
- **Implementation authority:** dependency removal requires human approval and full validation.

<!-- lesson-edit-contract-finding-v1 -->
### `lesson-edit-contract-alignment-v1`

- **Status:** queued from `UI-CONTRACT-001`; implementation not yet authorized.
- **Goal:** make the lesson edit UI and PUT persistence contract describe exactly the same editable fields and semantics.
- **Current persistence baseline:** one Lesson row has at most one operational `studentId`; multi-student EXAM/THEORY_EXAM creation produces multiple Lesson rows.
- **Required product/architecture decision:** preserve row-level exam editing or deliberately introduce grouped-exam editing. Do not infer grouped ownership from the unused `Exam` / `ExamRegistration` models.
- **Minimum safe behavior:** no editable control may report success for data that is discarded by the request builder or server.
- **Participant requirement:** if edit remains row-level, initialize/display the existing participant correctly and constrain participant editing to semantics the single-row PUT can persist.
- **Lesson-type requirement:** either make lesson type immutable in edit mode or implement type transition end-to-end with server validation and reconciliation of student, vehicle, practical-lesson numbering, and other type-specific fields.
- **Testing requirement:** add explicit EXAM and THEORY_EXAM edit coverage, existing-participant initialization coverage, request-body contract coverage, and supported/forbidden lesson-type transition coverage.
- **Safety:** no schema migration or adoption of the separate Exam models unless independently justified by product/architecture evidence.
- **Likely executor:** Super Agent after human GO.

<!-- exhaustive-snapshot-audit-5eded00-v1 -->
## Engineering Excellence — exhaustive snapshot follow-up

These slices come from confirmed full-snapshot findings. They are queued only; implementation requires explicit human GO and a separate branch.

### `billing-webhook-authenticity-gate-v1`

- **Priority:** P0.
- **Source:** `BILLING-SEC-001`.
- **Goal:** fail closed before any webhook event can mutate billing/subscription/entitlement state unless provider authenticity is proven.
- **Minimum safe baseline while live PSP integration is unfinished:** disable or reject externally supplied billing webhook processing by default rather than trusting envelope contents.
- **Future provider path:** provider-specific signature verification must precede event persistence/application.
- **Tests:** missing/invalid authenticity proof must cause zero billing-event/commercial-state writes; valid/replay behavior must remain idempotent.
- **Scope guard:** do not turn this security containment slice into checkout/PSP feature implementation.

### `provider-owned-entitlement-mutation-boundary-v1`

- **Priority:** P1.
- **Source:** `LICENSING-001`.
- **Goal:** ensure tenant School Admin can read effective plan/module state but cannot directly self-enable provider-owned Premium entitlements.
- **Boundary:** mutation belongs to verified Platform/operator/provider authority, not hidden tenant UI.
- **Preserve:** school-facing read-only plan experience and entitlement resolver semantics unless independently justified.

### `platform-settings-and-feature-flags-boundary-v1`

- **Priority:** P2; existing roadmap slice, now explicitly backed by `AUTHZ-OPERATOR-001`.
- **Goal:** enforce operator/Platform ownership server-side for internal settings and feature flags.
- **Rule:** hiding navigation or labeling a page internal is not an authorization boundary.
- **No duplicate slice:** this heading enriches the already-existing backlog item.

### `legacy-login-endpoint-retirement-v1`

- **Priority:** P2.
- **Source:** `AUTH-LEGACY-001`.
- **Goal:** prove there is no required external consumer, then retire the parallel `/api/auth/login` credential path and keep NextAuth Credentials authoritative.
- **Preserve:** tenant-domain and approval/email-verification policy in the authoritative path.

### `nextauth-credentials-rate-limit-alignment-v1`

- **Priority:** P1.
- **Source:** `AUTH-RATE-001`.
- **Goal:** put distributed brute-force protection on the actual NextAuth Credentials login path.
- **Tests:** IP/email limit, correct-password behavior, tenant mismatch and lockout/reset semantics on the real login path.
- **Avoid:** two independent rate-limit implementations after the legacy endpoint is retired.

### `user-create-atomicity-v1`

- **Priority:** P1.
- **Source:** `API-ATOM-002`.
- **Goal:** make User + Student/Instructor aggregate creation atomic.
- **Required proof:** downstream profile-create failure leaves no orphan User.
- **Design:** validate deterministic input before the transaction where possible; follow the existing signup transactional precedent.

### `instructor-direct-create-activation-contract-v1`

- **Priority:** P1.
- **Source:** `ONBOARD-001`.
- **Goal:** give a directly created Instructor a secure, explicit production activation/set-password path or replace direct account creation with the invitation workflow.
- **Security:** do not solve this by emailing a raw temporary password.
- **Consistency:** use the current EmailVerificationToken/activation architecture rather than the legacy User token fields unless an explicit migration decision says otherwise.

### `unused-ui-scaffold-pruning-v1`

- **Priority:** P2 cleanup.
- **Source:** `CODE-HYGIENE-001`.
- **Evidence baseline:** 25 zero-inbound `components/ui/*` modules, 3 zero-inbound hooks, 2 zero-inbound production helpers, and 16 runtime dependencies referenced exclusively by the orphan UI set.
- **Removal rule:** exact reference proof first; remove in small batches; canonical Node-24-transitive `check` after changes.
- **Do not remove:** packages merely because a literal import was not found when framework/config/tool responsibilities remain possible.

### `role-aware-booking-dialog-consolidation-v1`

- **Priority:** P2.
- **Source:** `UI-DUP-001`.
- **Goal:** consolidate duplicated admin/instructor booking orchestration while preserving role-specific authority and presentation.
- **Evidence:** duplicated copies already have different error-decoding behavior for the same lesson-create endpoint.
- **Design guard:** prefer a small role-aware shared handler/container over a generic form framework.

### `legacy-exam-model-disposition-v1`

- **Priority:** P2 evidence-first / data-sensitive.
- **Source:** `SCHEMA-LEGACY-001`.
- **Goal:** determine whether legacy `Exam` / `ExamRegistration` rows still exist on target environments and choose retain/archive/migrate/remove deliberately.
- **First step:** read-only counts and reference inventory only.
- **No schema/data mutation:** migration or deletion requires separate human authorization and a data-safe plan.

### `toolchain-next-env-alignment-v1`

- **Priority:** P2/P3.
- **Source:** `TOOLCHAIN-002`.
- **Goal:** eliminate the unintentional Next 14 / direct `@next/env` 16 dual-major contract without upgrading Next as part of this slice.
- **Validation:** exercise the 17 env-loading operator/demo scripts plus the full canonical check under proven Node-24 transitive execution.
- **No opportunistic framework upgrade.**

<!-- exhaustive-snapshot-audit-5eded00-v2 -->
## Engineering Excellence — second exhaustive-pass queue

Security comes first. Within the same priority tier, dependency order and prerequisite tests determine execution order. Every entry remains human-authorized per slice.

### `billing-projection-atomic-idempotency-v1`

- **Priority:** P0/P1.
- **Source:** `BILLING-SEC-002`.
- Put billing projection plus lifecycle completion behind an atomic/idempotent contract.
- Add failure-injection and retry tests proving already-applied commercial effects cannot duplicate.

### `jwt-session-revocation-v1`

- **Priority:** P0/P1.
- **Source:** `AUTH-SESSION-001`.
- Replace DB-Session deletion as the revocation primitive for JWT sessions with a server-verifiable revocation/version contract.
- Cover access removal, deactivation, email change and password reset.

### `auth-email-link-trusted-origin-v1`

- **Priority:** P1.
- **Source:** `AUTH-LINK-001`.
- Resolve public reset/verification links from the account's trusted organization/domain authority, not an arbitrary request-derived origin.
- Add tenant-mismatch and canonical-domain tests.

### `platform-onboarding-transaction-boundary-v1`

- **Priority:** P1.
- **Source:** `PLATFORM-ATOM-001`.
- Keep organization/domain/admin/license aggregate creation inside one explicit transaction boundary or make the non-transactional step an intentional post-commit workflow.
- Add a real-DB integration test for all-or-nothing behavior.

### `license-key-security-hardening-v1`

- **Priority:** P1.
- **Source:** `LICENSING-002`.
- Use cryptographically secure license-key generation.
- Consume single-use keys atomically and make entitlement effects concurrency-safe/idempotent.
- Add concurrent activation tests.

### `api-500-error-sanitization-v1`

- **Priority:** P1/P2.
- **Source:** `API-ERROR-001`.
- Keep detailed exceptions in structured server logs while returning a stable non-sensitive 500 message to clients.

### `notification-stack-consolidation-v1`

- **Priority:** P1/P2.
- **Source:** `UI-FEEDBACK-001`.
- Select one notification stack, migrate active consumers and remove the unmounted custom toast path plus redundant dependencies.
- This slice precedes final orphan-UI pruning.

### `smoke-effective-entitlements-alignment-v1`

- **Priority:** P1/P2.
- **Source:** `TEST-CONTRACT-001`.
- Make feature smoke validate the same effective-entitlement boundary the product uses.

### `e2e-suite-contract-repair-v1`

- **Priority:** P2.
- **Source:** `TEST-HYGIENE-001`.
- Remove external Playwright scaffold and repair THEORY_EXAM operational Student-id semantics.
- Establish deterministic fixture ownership before the E2E CI gate.

### `tenant-row-lock-helper-consolidation-v1`

- **Priority:** P2.
- **Source:** `DB-DUP-001`.
- Centralize Student/Instructor/Invitation tenant-scoped locking into small typed helpers.
- Do not create a dynamic table-name SQL abstraction.

### `client-http-response-helper-v1`

- **Priority:** P2.
- **Source:** `CLIENT-DUP-001`.
- Extract only stable safe-JSON and error-message primitives used across client fetch flows.

### `import-workflow-consolidation-v1`

- **Priority:** P2.
- **Source:** `UI-DUP-002`.
- Share preview/apply/confirm/result orchestration while keeping domain payload parsers and endpoints explicit.

### `toolchain-node-types-alignment-v1`

- **Priority:** P2/P3.
- **Source:** `TOOLCHAIN-003`.
- Align Node type definitions with the Node 24 runtime contract without changing the runtime itself.

### `next-security-patch-containment-v1`

- **Priority:** P0.
- **Source:** `DEP-SEC-001`.
- Immediate containment: move `next@14.2.28` to at least the complete `14.2.35` security level for the current 14.x line, with full canonical/E2E regression validation.
- Treat this as short-lived containment only: Next 14 is unsupported and this slice does not close the supported-LTS migration requirement.
- Do not combine this containment slice with broad framework migration or unrelated dependency upgrades.

### `next-supported-lts-migration-v1`

- **Priority:** P1.
- **Source:** `DEP-SEC-001`.
- After 14.x containment, design a controlled move to a supported LTS line; at execution time re-evaluate the latest patched 15.x Maintenance LTS and 16.x Active LTS releases and select the safest target from compatibility evidence.
- The migration must include React/Next compatibility, App Router behavior, build/runtime, auth, tenant routing and Playwright regression gates.
- No canary production target and no opportunistic unrelated dependency upgrades.

### `dormant-operational-model-disposition-v1`

- **Priority:** P2 / data-sensitive.
- **Source:** `SCHEMA-LEGACY-002`.
- Read-only inspect LessonRequest, Payment and Notification data/provenance on target environments.
- Decide retain/complete/archive/remove only from evidence.

### `csv-formula-injection-hardening-v1`

- **Priority:** P1/P2.
- **Source:** `EXPORT-SEC-001`.
- Create one tested CSV-cell safety primitive and use it across Student, Practical Lesson and audit exports.

### `privileged-password-policy-alignment-v1`

- **Priority:** P1.
- **Source:** `AUTH-PASSWORD-001`.
- Make School Admin and Platform Admin provisioning obey one server-authoritative privileged password policy.

### `ci-critical-e2e-gate-v1`

- **Priority:** P1/P2.
- **Source:** `TEST-GATE-001`.
- After E2E repair, gate a small deterministic critical-path Playwright subset in CI.
- Do not run production mutation smoke as normal CI.

### `database-integration-test-harness-v1`

- **Priority:** P1/P2.
- **Source:** `TEST-ARCH-001`.
- Add disposable Postgres integration infrastructure for contracts mocks cannot prove.
- Initial suite: billing retry, license concurrency, platform onboarding, aggregate user creation and row locks.
- Keep unit tests fast; do not convert the full suite to DB integration tests.

### `direct-dependency-responsibility-pruning-v1`

- **Classification:** evidence/cleanup slice under `CODE-HYGIENE-001`, not a new finding.
- Build a ledger for every direct dependency: active responsibility, justified implicit/framework responsibility, or remove.
- Remove the 16 orphan-UI-only runtime dependencies once their source consumers are safely removed.
- A2.1 adds nine direct-prod zero-importer roots for exact responsibility proof: `lodash`, `webpack`, `formik`, `recharts`, `mapbox-gl`, `plotly.js`, `react-use`, `gray-matter`, `react-select`.
- Prefer removal over version maintenance when a root has no legitimate runtime/build/config/peer responsibility.

### `legacy-inmemory-rate-limit-retirement-v1`

- **Classification:** safe cleanup.
- Remove the unused in-memory rate-limit option/primitive after exact reference proof; authoritative auth limiting is the distributed path.

### `email-template-safety-helper-v1`

- **Classification:** safe security-sensitive deduplication.
- Centralize repeated HTML escaping used by email templates and unit-test it once.

### `public-signup-production-readiness-v1`

- **Classification:** release gate, not a current vulnerability finding.
- Keep public signup fail-closed until real verification, abuse controls and trusted-origin behavior are complete.

### `security-response-headers-hardening-v1`

- **Priority:** P1/P2.
- **Source:** `SEC-HEADERS-001`.
- **Evidence:** hosted Wave A1 confirmed HTTPS/HSTS but no CSP, anti-framing policy, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy` on the measured tenant/Platform responses.
- Add low-risk hardening headers first; inventory required origins before CSP.
- Validate CSP in Preview and use staged/report-only evidence where appropriate before enforcement.
- Do not add COOP/CORP/COEP mechanically; require an application-specific need and compatibility proof.

### `legacy-vehicle-status-route-disposition-v1`

- **Classification:** contract-disposition investigation.
- The route has no internal consumer but is documented/tested; verify telemetry/external consumers before retirement.

### `auth-request-page-shell-v1`

- **Classification:** safe UI refactor candidate.
- Consolidate strongly duplicated forgot-password/resend-verification request-page shell without coupling domain behavior.

### `nextauth-v4-security-patch-alignment-v1`

- **Classification:** evidence-first dependency maintenance.
- Review the current v4 security-patch release against the DAT Credentials-only usage and upgrade separately if compatible.
- Do not misclassify EmailProvider/getToken-specific advisories as active DAT findings without a matching path.

### `dependency-security-monitoring-v1`

- **Priority:** P1/P2.
- **Source:** `DEP-SEC-002`.
- Establish a reproducible lockfile advisory check in CI after the current baseline is triaged.
- Distinguish new unreviewed advisories from reviewed path-not-applicable/dev-only/transitive exceptions; every exception requires advisory ID, responsibility and rationale.
- Fail closed for new material unreviewed security advisories according to an explicit severity policy.
- No uncontrolled automatic upgrades and no blind `audit --fix`.

### `operator-documentation-runtime-reconciliation-v1`

- **Classification:** recurrence of `SA-GOV-001`, not a new governance finding.
- Reconcile stale Node/runtime/rate-limit/security descriptions after technical slices establish the new authoritative contracts.

### `accessibility-regression-sweep-v1`

- **Classification:** evidence-first quality sweep.
- Validate remaining icon-button accessible names and stable critical flows with role/name assertions or axe-style checks where appropriate.
- Promote only actual failures, not heuristic candidates.

<!-- exhaustive-audit-master-remediation-ledger-v1 -->
## Master remediation ledger — 50 findings

This is the canonical finding-to-work mapping for the engineering audit. A finding may map to more than one smallest-safe slice; several findings may intentionally converge on one shared primitive. Presence in this ledger does **not** authorize implementation.

| Finding | Remediation / disposition slice(s) |
| --- | --- |
| `SA-GOV-001` | `governance guard + operator-documentation-runtime-reconciliation-v1` |
| `SA-GOV-004` | `Engineering Quality Review Protocol (remediation already recorded)` |
| `UI-ORCH-001` | `student-profile-atomic-update-v1` |
| `API-ATOM-001` | `student-profile-atomic-update-v1`; `instructor-profile-atomic-update-v1`; `generic-user-update-contract-narrowing-v1` |
| `UI-ORCH-002` | `instructor-profile-atomic-update-v1` |
| `UI-STRUCT-001` | `people-manager-orchestration-seams-v1` |
| `A11Y-001` | `people-search-accessible-names-v1` |
| `A11Y-002` | `people-badge-help-accessibility-v1` |
| `API-DUP-001` | `admin-config-route-helpers-v1` |
| `API-STRUCT-001` | `vehicle-route-domain-services-v1` |
| `API-DUP-002` | `admin-route-context-helper-v1` |
| `UI-STRUCT-002` | `schedule-map-wide-grid-components-v1`; `schedule-map-data-orchestration-v1` |
| `UI-STRUCT-003` | `lesson-form-policy-module-v1`; `lesson-form-option-data-hook-v1`; `lesson-form-sections-v1` |
| `A11Y-003` | `lesson-form-accessible-controls-v1` |
| `UI-CONTRACT-001` | `lesson-edit-contract-alignment-v1` |
| `TOOLCHAIN-001` | `toolchain-volta-decoupling-v1`; `toolchain-local-runtime-standardization-v1`; `toolchain-e2e-runtime-provenance-v1`; `toolchain-unused-dev-dependencies-v1` |
| `BILLING-SEC-001` | `billing-webhook-authenticity-gate-v1` |
| `LICENSING-001` | `provider-owned-entitlement-mutation-boundary-v1` |
| `AUTHZ-OPERATOR-001` | `platform-settings-and-feature-flags-boundary-v1` |
| `AUTH-LEGACY-001` | `legacy-login-endpoint-retirement-v1` |
| `AUTH-RATE-001` | `nextauth-credentials-rate-limit-alignment-v1` |
| `API-ATOM-002` | `user-create-atomicity-v1` |
| `ONBOARD-001` | `instructor-direct-create-activation-contract-v1` |
| `CODE-HYGIENE-001` | `notification-stack-consolidation-v1`; `unused-ui-scaffold-pruning-v1`; `direct-dependency-responsibility-pruning-v1`; `legacy-inmemory-rate-limit-retirement-v1` |
| `UI-DUP-001` | `role-aware-booking-dialog-consolidation-v1` |
| `SCHEMA-LEGACY-001` | `legacy-exam-model-disposition-v1` |
| `TOOLCHAIN-002` | `toolchain-next-env-alignment-v1` |
| `BILLING-SEC-002` | `billing-projection-atomic-idempotency-v1` |
| `AUTH-SESSION-001` | `jwt-session-revocation-v1` |
| `AUTH-LINK-001` | `auth-email-link-trusted-origin-v1` |
| `PLATFORM-ATOM-001` | `platform-onboarding-transaction-boundary-v1` |
| `LICENSING-002` | `license-key-security-hardening-v1` |
| `API-ERROR-001` | `api-500-error-sanitization-v1` |
| `UI-FEEDBACK-001` | `notification-stack-consolidation-v1` |
| `TEST-CONTRACT-001` | `smoke-effective-entitlements-alignment-v1` |
| `TEST-HYGIENE-001` | `e2e-suite-contract-repair-v1` |
| `DB-DUP-001` | `tenant-row-lock-helper-consolidation-v1` |
| `CLIENT-DUP-001` | `client-http-response-helper-v1` |
| `UI-DUP-002` | `import-workflow-consolidation-v1` |
| `TOOLCHAIN-003` | `toolchain-node-types-alignment-v1` |
| `DEP-SEC-001` | `next-security-patch-containment-v1`; `next-supported-lts-migration-v1`; `dependency-security-monitoring-v1` |
| `SCHEMA-LEGACY-002` | `dormant-operational-model-disposition-v1` |
| `EXPORT-SEC-001` | `csv-formula-injection-hardening-v1` |
| `AUTH-PASSWORD-001` | `privileged-password-policy-alignment-v1` |
| `TEST-GATE-001` | `ci-critical-e2e-gate-v1` |
| `TEST-ARCH-001` | `database-integration-test-harness-v1` |
| `SEC-HEADERS-001` | `security-response-headers-hardening-v1` |
| `DEP-SEC-002` | `dependency-security-monitoring-v1` |

| `CONFIG-ENV-001` | `local-development-database-isolation-v1` |

| `UI-DATA-001` | `dashboard-statistics-contract-alignment-v1` |

### Additional evidence / cleanup slices from the exhaustive audit

- `email-template-safety-helper-v1` — centralize repeated HTML escaping and test once.
- `public-signup-production-readiness-v1` — fail-closed release gate before any self-service signup.
- `security-response-headers-verification-v1` — **completed by hosted Wave A1**; evidence promoted to `SEC-HEADERS-001` and `security-response-headers-hardening-v1`.
- `legacy-vehicle-status-route-disposition-v1` — verify telemetry/external consumers before retirement.
- `auth-request-page-shell-v1` — safe request-page shell deduplication.
- `nextauth-v4-security-patch-alignment-v1` — evidence-first v4 patch review.
- `accessibility-regression-sweep-v1` — promote only actual accessibility failures.

### Security-first execution waves

1. **Immediate containment:** `billing-webhook-authenticity-gate-v1`; `next-security-patch-containment-v1`.
2. **Security foundations / proof:** `database-integration-test-harness-v1`; `e2e-suite-contract-repair-v1`; then `billing-projection-atomic-idempotency-v1`, `jwt-session-revocation-v1`, `license-key-security-hardening-v1`.
3. **Authority / credential / browser boundaries:** `provider-owned-entitlement-mutation-boundary-v1`, `nextauth-credentials-rate-limit-alignment-v1`, `auth-email-link-trusted-origin-v1`, `privileged-password-policy-alignment-v1`, `api-500-error-sanitization-v1`, `csv-formula-injection-hardening-v1`, `security-response-headers-hardening-v1`.
4. **Integrity / onboarding:** `user-create-atomicity-v1`, `platform-onboarding-transaction-boundary-v1`, `instructor-direct-create-activation-contract-v1`.
5. **Test gates / contract alignment:** `smoke-effective-entitlements-alignment-v1`, `ci-critical-e2e-gate-v1`, then the remaining test/evidence slices.
6. **Structural consolidation and pruning:** stable helpers/services first; notification migration before orphan UI deletion; then dependency pruning.
7. **Data-sensitive disposition / modernization:** legacy/dormant model read-only evidence, toolchain alignment, and supported-LTS migration in their prerequisite order.

<!-- security-wave-a3-hosted-auth-v1 -->
### Hosted auth/session evidence disposition — A3 complete

- **Finding count impact:** none; master remediation ledger remains 48/48.
- Secure/HttpOnly/SameSite=Lax/host-only NextAuth cookie scope is confirmed on tenant and Platform hosts.
- Session CDN probes remained `x-vercel-cache=MISS` with `age=0`; no shared-session-cache finding is promoted.
- `/api/auth/signin` resolves to the existing `/auth/login` page on both hosts.
- This positive browser/edge evidence does **not** close `AUTH-SESSION-001`; `jwt-session-revocation-v1` must still implement a server-verifiable revocation contract.
- Reuse the A3 cookie/cache observations as regression expectations during auth/security remediation rather than re-opening discovery.

<!-- security-wave-a4-commercial-evidence-v1 -->
### Commercial deployment-state evidence disposition — A4 complete

- **Finding count impact:** none; master remediation ledger remains 48/48.
- `BILLING-SEC-001` gains hosted proof that `/api/billing/webhooks/[provider]` is publicly deployed on both main hosts plus static proof of zero detected authenticity-verification signals in the route.
- anonymous GET to commercial/admin endpoints fails closed; this does not resolve authenticated authority findings.
- retain `BILLING-SEC-002`, `LICENSING-001`, `LICENSING-002` and `AUTHZ-OPERATOR-001` unchanged.
- no provider-operational-state conclusion may be inferred from absence of provider env-key names in the constrained static scan.
- Security Wave A is complete; advance evidence work to Wave B before implementation slices.

<!-- data-wave-b1-legacy-dormant-inventory-v1 -->
### Data disposition evidence — B1 complete

- **Finding count impact:** none; master remediation ledger remains 48/48.
- `legacy-exam-model-disposition-v1`: observed target row counts are `Exam=0` and `ExamRegistration=0`.
- `dormant-operational-model-disposition-v1`: observed target row counts are `LessonRequest=0`, `Payment=0`, and `Notification=0`.
- zero rows removes the known data-migration blocker on this target but does not authorize Prisma model/table removal.
- before removal: prove zero runtime writers/readers, inspect migrations/seeds/scripts/ops, determine other database-environment exposure, then create an explicit schema-change/rollback plan.
- next evidence slice: `environment-configuration-responsibility-audit-v1`.

<!-- environment-configuration-responsibility-audit-v1 -->
### Environment configuration responsibility — E1-E4 complete

- **Finding count:** 49; master remediation coverage 49/49.
- `CONFIG-ENV-001` → `local-development-database-isolation-v1`.
- P0/P1 prerequisite: local/development runtime must not silently inherit the Production operator database target.
- preserve `.env.operator.production.local` as the deliberate Production/operator profile.
- preserve `.env.smoke.production.local` as the separate Production Smoke fixture/credential profile.
- `environment-configuration-contract-consolidation-v1`: consolidate duplicate ownership only after target isolation exists.
- `public-env-pruning-v1`: prove implicit framework/build responsibility, then remove unused public env keys rather than preserving dead configuration.
- candidates requiring explicit responsibility proof: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `LICENSE_TIER`, `VERCEL_OIDC_TOKEN`.
- no env variable is removed merely to minimize the count; secrets and genuine environment-specific configuration remain env-backed.

<!-- environment-configuration-disposition-e5-e7-v1 -->
### Environment disposition — E5-E7 complete

- **Finding count impact:** none; master ledger remains 49/49.
- `auth-secret-alias-consolidation-v1`: standardize on `NEXTAUTH_SECRET`; remove redundant `AUTH_SECRET` only after each DAT-managed environment is proven to contain the canonical secret.
- `public-env-pruning-v1`: retire unused `NEXT_PUBLIC_APP_URL`.
- `supabase-environment-contract-retirement-v1`: retire `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the DAT contract after hosted name-only verification.
- `legacy-environment-key-pruning-v1`: retire `LICENSE_TIER`; classify/remove `VERCEL_OIDC_TOKEN` only after external Vercel-tool ownership verification.
- `environment-configuration-contract-consolidation-v1`: normalize surviving `.env.example`, local profiles, CI, docs and hosted environment responsibilities after the targeted removals.
- execution dependency: `local-development-database-isolation-v1` precedes ordinary environment cleanup validation.

<!-- data-wave-b2-responsibility-and-sa-handoff-v1 -->
### Data Wave B2 — runtime responsibility classification required

- No new finding; master ledger remains 49/49.
- Existing `SCHEMA-LEGACY-001` → `legacy-exam-model-disposition-v1` remains open.
- Existing `SCHEMA-LEGACY-002` → `dormant-operational-model-disposition-v1` remains open.
- add evidence-only prerequisite `legacy-model-runtime-responsibility-classification-v1`.
- B1 zero-row evidence lowers migration/data-retention risk but is not deletion authority.
- B2 proves current references must be semantically retired/replaced before schema removal.
- eventual schema retirement must use a new forward Prisma migration; never rewrite applied migration history.

<!-- data-wave-b3-runtime-responsibility-v1 -->
### Data Wave B3 — retirement readiness

- No new finding; master ledger remains 49/49.
- `ExamRegistration`: retirement candidate under `dormant-operational-model-disposition-v1`.
- `Notification`: retirement candidate under `dormant-operational-model-disposition-v1`.
- `Payment`: retirement candidate after defensive delete/retention replacement under `dormant-operational-model-disposition-v1`.
- `Exam`: `legacy-exam-model-disposition-v1` remains blocked by semantic classification of the admin vehicles API read.
- `LessonRequest`: `dormant-operational-model-disposition-v1` remains blocked by active instructor/student page responsibility.
- evidence-only next prerequisite: `legacy-model-blocker-semantic-closure-v1`.
- model retirement must also update Production Smoke inspection, demo cleanup, tenant maintenance, destructive local seed and Prisma relations before the forward DROP migration.

<!-- data-wave-b4-blocker-semantics-v1 -->
### Data Wave B4 — semantic blockers narrowed

- No new finding yet; master ledger remains 49/49.
- `legacy-exam-model-disposition-v1`: semantic retirement direction confirmed; implementation must remove legacy vehicle-status fallback and Exam relation/delete guard before forward schema retirement.
- `dormant-operational-model-disposition-v1`: ExamRegistration and Notification are retirement-ready at the semantic layer.
- Payment is blocked only by exact delete-policy contract closure.
- LessonRequest is no longer proven active merely because the dashboards query it; both observed query results are discarded.
- possible dashboard-statistics defect remains evidence-only until JSX/data-flow confirmation.
- next evidence-only prerequisite: `legacy-model-blocker-final-semantic-closure-v1`.

<!-- data-wave-b41-final-semantics-ui-data-001-v1 -->
### Data Wave B4.1 — final disposition

- Master ledger is now 50/50.
- `UI-DATA-001` → `dashboard-statistics-contract-alignment-v1`.
- `legacy-exam-model-disposition-v1`: semantic blockers closed; execution contract still required.
- `dormant-operational-model-disposition-v1`: ExamRegistration, LessonRequest, Payment and Notification semantic blockers closed; execution contract still required.
- delete-policy retirement must remove legacy dependency counts/codes/tests for Exam, ExamRegistration, LessonRequest and Payment.
- `dashboard-statistics-contract-alignment-v1` must not accidentally reactivate LessonRequest as a product source of truth; align the instructor cards with the authoritative Lesson metrics and remove dead LessonRequest dashboard work unless a separately authorized product decision says otherwise.
- next prerequisite: `legacy-model-retirement-execution-contract-v1`.
