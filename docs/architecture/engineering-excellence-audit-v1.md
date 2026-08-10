# Engineering Excellence Audit v1

## Status

- **Slice:** `engineering-excellence-audit-v1`
- **Priority:** P1 — engineering excellence
- **Mode:** analysis-only
- **Entry baseline:** `da5aea6fe4150e86d5bf568bb56b26dd53f7abeb`
- **Started:** 2026-08-06
- **Current phase:** exhaustive static snapshot analysis, Security Wave A, environment/configuration evidence E1-E7, and Data Wave B1-B5.2 are complete. Data Wave B is audit-complete. The audit remains analysis-only in `audit-surface-completeness-reconciliation-v1`: reconcile all confirmed findings and additional slices against the audited repository surfaces, classify implementation readiness versus remaining evidence/disposition needs, and select the next unresolved audit frontier.
- **Confirmed findings:** 51 total, with 51/51 remediation coverage. Historical phase checkpoints below retain the finding counts that were current when each evidence phase completed.
- **Refactor implementation authorized:** no

This report is the detailed evidence record for the audit. The concise live state must remain synchronized with `.cursor/rules/architect-mode.mdc`, `current-state.md`, and `roadmap-todo.md` after every material audit phase.

## Repository and Super Agent baseline

### Super Agent operating role

The Super Agent is the DAT repository-aware operational worker. It may be used at any time to investigate the repository, trace implementations and tests, prepare guarded commands, synchronize canonical documentation, and plan smallest-safe slices.

It is not an autonomous approval authority. Pushes, merges, remote branch deletion, hosted configuration changes, database writes, mutation smoke, destructive operations, and behavioural changes remain subject to explicit human authorization and the DAT safety gates.

### Node 24 runtime baseline inherited by this audit

- Node 24 migration P0 is closed.
- Portable local runtime: Node `v24.18.0`.
- Root and app `.nvmrc`: `24.18.0`.
- App Node engine: `24.x`.
- GitLab CI image: `node:24`.
- Vercel Project Settings, Preview, and Production: Node 24.x.
- Retained tool baseline: pnpm `10.24.0`, Prisma `6.19.0`, Next.js `14.2.28`.
- Runtime implementation: `e5ddc39`.
- Runtime evidence: `f23e423`.
- Application merge: `909b69a`.
- Closure record: `a397054`.
- Audit entry baseline and current `main` baseline: `da5aea6`.
- Local validation passed 207 test files, 1738 tests, and the production build.
- GitLab and Vercel gates passed.
- Production fixture preflight, API verification, and four read-only UI smoke tests passed.
- Mutation smoke was not repeated because the slice was runtime/configuration-only and prior mutation evidence remained valid.
- Node 24 migration and closure branches were removed locally and remotely after verified integration.

The audit must not change this baseline or introduce dependency/runtime upgrades. Any future runtime change requires a separate explicitly authorized slice.

<!-- node24-local-runtime-chain-v1 -->
### Local Node 24 runtime-chain correction — 2026-08-07

A post-checkpoint validation exposed an environment-specific routing issue on the Windows/Git Bash workstation. Direct `node` resolution used the portable Node `v24.18.0`, while bare `pnpm` resolved through Volta `2.0.2`. Volta's active default Node is `v20.20.0`, so pnpm child processes launched through the bare Volta shim also used Node `v20.20.0`.

The earlier bare-pnpm check passed functionally, but it is not accepted as Node-24 runtime evidence.

The runtime chain was then explicitly pinned and revalidated using:

- Node: `$HOME/.dat-toolchains/node-v24.18.0-win-x64/node.exe`
- pnpm package: `10.24.0`
- pnpm CLI: `$HOME/AppData/Local/Volta/tools/image/packages/pnpm/node_modules/pnpm/bin/pnpm.cjs`
- child-runtime proof: Node `v24.18.0` using the portable `node.exe`
- outer-only result: 207/207 test files passed, 1738/1738 tests passed, production build succeeded, check exit `0`; later probing showed nested bare pnpm calls could still execute under Volta Node `v20.20.0`, so this run is not full Node-24 provenance evidence
- final transitive result: a guarded temporary PATH shim forced all nested pnpm routing through portable Node `v24.18.0` + pnpm `10.24.0`; direct, nested, and Windows-shell child probes all reported Node `v24.18.0`; 9 shim invocations were recorded; 207/207 test files and 1738/1738 tests passed; production build succeeded; check exit `0`; the shim was then removed successfully

For this workstation, future Node-24 validation must prove **transitive** package-manager provenance. Invoking the outer pnpm CLI through portable Node is not sufficient because nested bare pnpm calls can resolve back through Volta Node `v20.20.0`. Until a permanent local-runtime standardization slice is implemented, full local Node-24 evidence requires guarded routing that keeps both direct and nested pnpm invocations on Node `v24.18.0`.

This correction changes no application behaviour, dependency, runtime configuration, schema, data, hosted setting, or production state.

## Audit invariants

1. No runtime, schema, migration, data, hosted configuration, or functional behaviour changes.
2. File size and proxy counts are investigation signals, not findings by themselves.
3. Every confirmed finding must cite concrete files, symbols, responsibilities, call paths, duplication, tests, or observable maintenance risk.
4. Test files must be distinguished from production implementation.
5. Operational and safety-sensitive modules may legitimately be large; decomposition must preserve fail-closed behaviour, target guards, dry-run/apply boundaries, and human authorization.
6. No opportunistic refactor is permitted inside this audit.
7. Derived implementation work must be proposed later as one smallest-safe slice per branch.
8. The Super Agent and all canonical memory surfaces must be updated after every material audit phase.

## Normalized repository inventory

| Metric | Count |
| --- | ---: |
| TypeScript / TSX files | 661 |
| Production TypeScript / TSX files | 438 |
| Test and E2E files | 223 |
| Unit-test files, including integration tests | 207 |
| Integration-test files, subset of unit-test count | 49 |
| API route files | 58 |
| Component files | 96 |
| Hook files | 9 |
| `lib` files | 369 |
| Script files | 27 |

### Metric correction

The initial inventory incorrectly reported `hook_files=0` and `script_files=0` because the original pathspecs did not match files directly inside those directories. The normalized repository-wide inventory corrected those values to **9 hooks** and **27 scripts**.

## Preserved candidate input

- **Branch:** `production-smoke-module-structure-audit-record-v1`
- **Tip:** `a4bea9dfcfb3407acd952c9a383e1fdf2c4d0e60`
- **Base:** `14bdc402ffee59c8dea7e8fb323306c892fa7205`
- **Scope:** documentation-only changes to `.cursor/rules/architect-mode.mdc` and `roadmap-todo.md`
- **Consumption status:** inspected only; not merged, cherry-picked, or copied

### Candidate hypothesis

Production smoke entry specs live under `e2e/production-smoke/`, while substantial smoke-specific implementation and unit tests live under the generic `e2e/helpers/` directory. Related operator logic and documentation span `lib/ops/`, `scripts/`, and `docs/ops/`.

This may create discoverability and ownership friction, but it is currently a **candidate hypothesis**, not a confirmed structural defect. The audit must first trace entrypoints, imports, shared helpers, safety boundaries, and test ownership.

## Current investigation signals

### Largest production UI modules

| Lines | File | Selected proxies |
| ---: | --- | --- |
| 1879 | `components/admin/student-records-manager.tsx` | 39 imports, 25 state hooks, 7 fetch calls, 16 dialog references |
| 1611 | `components/schedule/schedule-map.tsx` | 18 imports, 12 state hooks, 7 effects, 3 fetch calls |
| 1302 | `components/admin/instructor-records-manager.tsx` | 26 imports, 18 state hooks, 5 fetch calls, 14 dialog references |
| 818 | `components/lessons/LessonForm.tsx` | 15 imports, 14 state hooks, 3 callbacks, 3 fetch calls |
| 634 | `components/admin/invitations-management-client.tsx` | 15 imports, 14 state hooks, 3 fetch calls |
| 629 | `components/admin/lessons-management-client.tsx` | 17 imports, 10 state hooks, 3 effects |
| 598 | `components/admin/vehicles-management-client.tsx` | 13 imports, 7 state hooks, 7 callbacks |

These are hotspot candidates only. The audit must distinguish orchestration, presentation, data loading, form state, modal ownership, and reusable domain behaviour before recommending extraction.

### Largest production library and operational modules

| Lines | File |
| ---: | --- |
| 1792 | `lib/ops/production-smoke-fixtures-reconciliation.ts` |
| 1338 | `lib/ops/production-smoke-reconciliation-inspection.ts` |
| 774 | `lib/translations.ts` |
| 672 | `lib/import-export/practical-lesson-import-dry-run.ts` |
| 609 | `lib/import-export/student-record-import-dry-run.ts` |
| 574 | `lib/tenant-organization-backfill-dry-run.ts` |
| 568 | `lib/students/student-app-access-lifecycle-service.ts` |
| 538 | `lib/audit/student-audit.ts` |
| 503 | `lib/students/student-email-change-service.ts` |
| 499 | `lib/ops/repair-accepted-student-invitation-link.ts` |

The two production-smoke operational modules require special treatment: their size may partly reflect explicit result types, safety validation, planning, refusal states, and deterministic reporting. No decomposition is recommended until those responsibilities are mapped.

### Largest API routes

| Lines | Route | Prisma references | Response references |
| ---: | --- | ---: | ---: |
| 580 | `app/api/admin/vehicles/route.ts` | 0 | 33 |
| 450 | `app/api/admin/settings/route.ts` | 8 | 32 |
| 429 | `app/api/admin/feature-flags/route.ts` | 8 | 31 |
| 338 | `app/api/admin/students/[id]/route.ts` | 0 | 6 |
| 304 | `app/api/signup/route.ts` | 3 | 13 |
| 265 | `app/api/admin/lessons/[id]/route.ts` | 1 | 2 |
| 261 | `app/api/admin/students/route.ts` | 0 | 5 |
| 241 | `app/api/admin/lessons/route.ts` | 0 | 4 |
| 212 | `app/api/users/create/route.ts` | 7 | 8 |

Zero direct Prisma references do not mean that a route is thin; the route may still contain validation, branching, response translation, orchestration, or imported service calls. Each route must be inspected by responsibility and call graph.

### Largest scripts

| Lines | Script |
| ---: | --- |
| 1059 | `scripts/seed.ts` |
| 520 | `scripts/configure-demo-personas.ts` |
| 417 | `scripts/check-client-demo-ready.ts` |
| 357 | `scripts/cleanup-demo-personas.ts` |
| 332 | `scripts/report-tenant-organization-null-scope.ts` |
| 311 | `scripts/configure-demo-showcase.ts` |

The legacy seed is safety-sensitive and local-only. Size alone cannot justify touching it; any future proposal must preserve the destructive-seed safety boundary and remote fail-closed behaviour.

## Initial investigation workstreams

1. **Production UI orchestration:** student records, instructor records, schedule map, and lesson form.
2. **Route-to-service boundaries:** vehicles, settings, feature flags, signup, students, lessons, and user creation.
3. **Production smoke structure:** entry specs, helper ownership, operational modules, scripts, documentation, and safety gates.
4. **Operational tooling:** seed, demo configuration, reconciliation, inspection, repair, dry-run/apply boundaries, and duplicated reporting patterns.

## Evidence classification

| Classification | Meaning |
| --- | --- |
| Signal | Metric or structural observation requiring investigation |
| Confirmed finding | Concrete maintenance problem supported by inspected responsibilities and call paths |
| Safe refactor candidate | Behaviour-preserving change with clear tests and rollback |
| Architecture candidate | Boundary or ownership change requiring a dedicated plan |
| Product/functional question | Possible behaviour change; not implementable as a refactor |
| Safety-sensitive debt | Improvement constrained by remote-write, data, auth, or operational safety requirements |

## Current conclusion

The normalized inventory, targeted evidence phases, exhaustive static snapshot analysis, Security Wave A1-A4, environment/configuration evidence E1-E7, and Data Wave B1-B5.2 are complete. Data Wave B is audit-complete. The audit currently contains **51 confirmed findings with 51/51 remediation coverage**.

These findings are evidence-backed audit conclusions and may include approved future resolution directions, but **no refactor implementation is authorized by this analysis slice**.

The active evidence frontier is `audit-surface-completeness-reconciliation-v1`: reconcile all 51 findings and the additional evidence/cleanup slices against the audited repository surfaces, distinguish implementation-ready remediation from work that still requires evidence or disposition, and select the next unresolved audit frontier.

The audit remains analysis-only. Runtime, schema, data, hosted configuration, and functional behaviour must remain unchanged.

<!-- sa-rulebook-audit-phase-1 -->
## Super Agent rulebook audit — phase 1

### Overall assessment

The Super Agent is correctly positioned as the repository-aware operational worker: it investigates, prepares guarded work, maintains canonical memory, and proposes smallest-safe slices. It is not an autonomous approval authority.

Branch discipline, scope control, remote-write safety, destructive-operation safety, memory governance, repository navigation, runtime discipline, and human-controlled publication are strongly represented.

### `SA-GOV-001` — Semantic gate precision

- **Classification:** confirmed governance finding
- **Severity:** P1 internal engineering quality
- **State:** fixed in the audit branch
- **Runtime/schema/data impact:** none

The rulebook previously contained only a partial instruction to report patches that omit untracked files. It did not formally require a gate to prove its exact proposition or distinguish negation, historical context, untracked content, and heuristic evidence.

Observed regressions:

1. `git grep` undercounted role references because the audit report was untracked.
2. A broad `2026-08-04` count mixed an incorrect audit-start date with correct historical Node 24 closure dates.
3. A broad finding search treated negative and future statements as positive implementation claims.

The new Semantic Gate Precision Protocol requires exact propositions, appropriate evidence sources, contextual interpretation, explicit Git-state handling, and non-blocking treatment of unconfirmed heuristics.

### Phase-1 validation queue — historical snapshot

These were the unresolved states at the end of phase 1. They were resolved by the contextual review recorded in phase 2 below and must not be interpreted as current classifications.

| ID | Aspect | Current status |
| --- | --- | --- |
| `SA-GOV-002` | Authority hierarchy and instruction-conflict precedence | Resolved in phase 2: **APTO** |
| `SA-GOV-003` | Explicit operational Definition of Done | Resolved in phase 2: **APTO** through canonical Merge readiness criteria |
| `SA-GOV-004` | Multidimensional engineering quality review | Resolved in phase 2: **confirmed and fixed** |

Absence from `architect-mode.mdc` alone is not sufficient to classify these as system-wide gaps. The next read-only phase must inspect `cursor-operating-model.md`, `reviewer-workflow.md`, `system-design.md`, and `command-batteries.md` before confirming or dismissing them.

<!-- sa-rulebook-audit-phase-2 -->
## Super Agent rulebook audit — phase 2

### `SA-GOV-002` — Authority hierarchy and conflict precedence

- **Classification:** APTO
- **Finding:** no

Roles and authority are explicit: the User/Product Owner owns priorities, final decisions, approvals, and merge; ChatGPT acts as architect/reviewer/QA lead; the Super Agent is the repository executor. D0–D4 constrain autonomous decisions, and recommendations are separated from authorization.

Canonical-source conflicts also have an explicit precedence: verified operational evidence, latest approved DEC, current-state, roadmap, then historical evidence.

No additional authority protocol is required. Duplicating it would create another source capable of drifting.

### `SA-GOV-003` — Operational Definition of Done

- **Classification:** APTO
- **Finding:** no

The canonical Merge readiness criteria are the operational Definition of Done. They require approved scope conformance, successful validation, Final Evidence Pack, Implementation Conformance Matrix where applicable, Memory Consistency Gate, forbidden-area confirmation, and complete close/next-branch batteries.

The reviewer workflow contains corresponding rejection criteria. A second standalone Definition of Done would duplicate this contract and increase inconsistency risk.

### `SA-GOV-004` — Multidimensional engineering quality review

- **Classification:** confirmed governance finding
- **Severity:** P1 internal engineering quality
- **State:** fixed in the audit branch
- **Runtime/schema/data impact:** none

The existing model strongly covered scope, validation, sensitive areas, evidence, conformance, and merge mechanics, but did not require one proportional review across all engineering-quality dimensions applicable to a slice.

The Engineering Quality Review Protocol now covers correctness, security, tenancy, integrity, structure, testability, performance, accessibility, observability, reliability, reversibility, runtime compatibility, documentation, and canonical memory.

The protocol is proportional: non-applicable dimensions require reasons, proxy metrics remain signals, and out-of-scope findings remain deferred instead of expanding the current branch.

### Reversibility

Reversibility was already present in decision recommendations and recovery protocols. It is now also an explicit quality-review dimension, together with rollback, recovery, and operational failure behavior. No separate governance finding is necessary.

### Governance conclusion

The Super Agent is correctly positioned for the DAT team and now has sufficiently explicit rules for authority, semantic gates, completion, evidence, engineering quality, human-controlled lifecycle, memory continuity, and safe operational execution.

The engineering audit now proceeds to code evidence. The first investigation target is `components/admin/student-records-manager.tsx`; no structural finding is assumed in advance.

<!-- ui-orch-001-linked-student-profile-split-mutation -->
## `UI-ORCH-001` — Linked student profile split mutation

- **Classification:** confirmed code finding
- **Priority:** P1 engineering-quality follow-up
- **Dimensions:** reliability, data consistency, orchestration ownership, testability
- **Security/tenancy classification:** no failure identified
- **Implementation authorized:** no

### Exact proposition

Editing an `APP_USER` student may persist changes to the `Student` row before attempting the linked `User` update. When the second request fails, the application has no transaction or compensation that restores the first write.

### Evidence

1. `StudentRecordsManager.handleEdit` sends `PATCH /api/admin/students/[id]` first.
2. When linked profile fields changed, it subsequently sends `PUT /api/users/update`.
3. A failed User update returns after the Student write has already succeeded.
4. The client displays an explicit partial-success message and reloads the student list.
5. No combined server transaction or compensating write was found for this flow.
6. Existing test matches cover routes and payload helpers, but no direct component/orchestration test exercises `Student success + User failure`.

### Impact

`Student` and linked `User` can retain different values for shared profile fields. Consumers that read different records or fallback orders can therefore expose inconsistent profile information until an operator retries or manually repairs the state.

The explicit partial-success message is a useful mitigation and prevents false success reporting, but it does not restore consistency.

### Smallest-safe future-slice hypothesis

Prefer one tenant-scoped server operation that validates and updates the allowed `Student` and linked `User` fields inside one transaction, while preserving current authorization, demo restrictions, audit evidence, DTOs, sanitized errors, and behavior for manual-only students.

This is a hypothesis pending boundary inspection. No runtime implementation is authorized by this audit record.

### Required regression evidence for a future implementation

- all-or-nothing behavior when the User update fails;
- Student-only update when no linked User synchronization is needed;
- tenant and role rejection;
- demo mutation rejection;
- unchanged email-specific workflow;
- audit-event preservation;
- client behavior for success and server failure;
- no duplicate or stale local overlay after reload.

<!-- api-atom-001-generic-user-update-split-write -->
## `API-ATOM-001` — Generic user update split write

- **Classification:** confirmed code finding
- **Priority:** P1 engineering-quality follow-up
- **Dimensions:** data consistency, reliability, transaction ownership, testability
- **Security/tenancy classification:** no guard failure identified
- **Implementation authorized in this branch:** no

### Exact proposition

`PUT /api/users/update` persists the tenant-scoped `User` update before attempting role-specific `Student` or `Instructor` updates. A role-specific failure therefore does not roll back the already committed User write.

### Evidence

1. The route performs `prisma.user.updateMany` first.
2. It later performs `prisma.student.updateMany` or `prisma.instructor.updateMany` depending on the body role.
3. No `$transaction`, rollback, compensation, or retry path was found.
4. The route tests cover authorization, demo restrictions, tenant scope, role rejection, and email exclusion, but no injected role-specific write failure.

### Impact

Profile, licence, category, or transmission information may diverge across the User and operational role record after a partial failure.

### Recommended resolution

Remove Student and Instructor aggregate mutations from the generic route after aggregate-specific transactional PATCH services are available.

<!-- ui-orch-002-instructor-profile-category-split-mutation -->
## `UI-ORCH-002` — Instructor profile and category split mutation

- **Classification:** confirmed code finding
- **Priority:** P1 engineering-quality follow-up
- **Dimensions:** data consistency, reliability, orchestration ownership, testability
- **Security/tenancy classification:** no guard failure identified
- **Implementation authorized in this branch:** no

### Exact proposition

The unified instructor edit form sends profile and licence changes to `/api/users/update`, then sends qualified-category changes to `/api/admin/instructors/[id]`. Failure of the second request leaves the first operation committed.

### Existing mitigation

The UI explicitly reports that the instructor profile was saved while qualified categories failed. The failure is therefore not silently represented as full success.

### Missing guarantee

No single server-side transaction or compensating operation covers the complete instructor edit form, and no direct orchestration failure test was identified.

### Recommended resolution

Extend the aggregate-specific instructor PATCH contract through a transactional domain service that updates allowed User profile fields, instructor licence fields, and qualified categories together.

## Approved implementation order

1. Student atomic profile update.
2. Instructor atomic profile update.
3. Generic user-update contract narrowing after caller migration.

The three changes must remain separate smallest-safe slices. This audit branch records evidence and direction only.

<!-- super-agent-continuity-recovery-v1 -->
## Super Agent continuity checkpoint

The DAT team requires the Super Agent to remain at the same verified knowledge level as the human operator and architecture/review workflow, independently of conversation history.

`docs/ops/super-agent-continuity-state.md` is now the canonical recovery index. It records current baselines, findings, decisions, branch state, safety boundaries, implementation order, and the Recovery Startup Procedure.

This continuity mechanism is a knowledge and operational backup. Git, hosted configuration, secrets, databases, and infrastructure still require their own backup and disaster-recovery controls.

<!-- ui-struct-001-people-manager-orchestration-concentration -->
## `UI-STRUCT-001` — People-manager orchestration concentration

- **Classification:** confirmed code finding
- **Priority:** P2 deferred structural follow-up
- **Dimensions:** maintainability, cohesion, reliability, testability
- **Known production defect:** none demonstrated
- **Implementation authorized in this branch:** no

### Exact proposition

`StudentRecordsManager` and `InstructorRecordsManager` each coordinate multiple independently changing workflows and local reconciliation states, while no direct component-level tests were found for either manager.

### Evidence

- The Student manager owns list loading/pagination, search, import/export, editing, account synchronization, invitations, email changes, deletion, history, and app-access lifecycle.
- The Instructor manager owns search/list projection, profile/licence/category editing, email changes, deletion, deactivation, and reactivation.
- Both maintain local reconciliation state after server mutations and refreshes.
- No direct manager tests or component test files were found.

### Non-findings

- File size and hook counts alone do not prove a defect.
- Existing extraction into helpers, services, policies, dialogs, and unit tests is substantial.
- Current evidence does not justify a generic shared People manager.

### To-Do sequencing

Complete the three approved atomicity and contract slices first. Then evaluate Student and Instructor orchestration separately, adding regression coverage and extracting only boundaries supported by evidence.

Accessibility and performance remain separate unclassified audit dimensions.

<!-- a11y-001-people-search-accessible-names -->
## `A11Y-001` — People search accessible names

- **Classification:** confirmed code finding
- **Priority:** P2 accessibility correction
- **Affected surfaces:** Student and Instructor profile search
- **Implementation authorized in this branch:** no

### Exact proposition

Both People search inputs depend on placeholder text and the corresponding icon-only submit buttons have no explicit accessible name.

### Evidence

- Student search input has no `id`, associated Label, or `aria-label`.
- Instructor search input has no `id`, associated Label, or `aria-label`.
- Both submit buttons contain only a Search icon and no visible or programmatic name.
- Existing mobile viewport tests verify page presence/layout, not these accessible names.

### Smallest-safe future slice

`people-search-accessible-names-v1`: add stable input IDs, visible or screen-reader labels, explicit search-action names, and accessible-role/name regression assertions.

Do not add `aria-label` mechanically to every button; buttons with visible text already have an accessible name.

<!-- a11y-002-people-badge-help-touch-discoverability -->
## `A11Y-002` — People badge help touch discoverability

- **Classification:** confirmed code finding
- **Priority:** P2 accessibility and mobile-usability correction
- **Production blocker:** no
- **Implementation authorized in this branch:** no

### Exact proposition

Detailed explanations for Student and Instructor profile badges are presented through tooltips and are not reliably discoverable through touch interaction.

### Evidence

- Student profile, operational, and app-access badges use Badge elements as tooltip triggers.
- Instructor role and status badges use the same pattern.
- The prior mobile/tablet review explicitly records hover-dependent People tooltips as losing context on touch.
- Concise badge labels and the existing People label guide remain positive fallback context, so this is P2 rather than a production blocker.

### Smallest-safe future slice

`people-badge-help-accessibility-v1`: provide a tap- and keyboard-discoverable help mechanism while preserving concise badges and the existing PeopleProfileLabelGuide. Do not perform a broad People redesign.

<!-- people-manager-performance-no-finding-v1 -->
## People-manager performance classification

- **Classification:** no finding

Student profiles use cursor pagination and an explicit Load more action. Instructor profiles use an initial visible count of 15 and memoized slicing.

The components do perform local overlay reconciliation and router refreshes, but no measured user-visible performance degradation was established. Their structural cost is already represented by `UI-STRUCT-001`.

Do not create a performance remediation slice without measured evidence or a reproducible user-visible symptom.

<!-- api-dup-001-config-route-skeleton-duplication -->
## `API-DUP-001` — Configuration-route skeleton duplication

- **Classification:** confirmed code finding
- **Priority:** P2 maintainability follow-up
- **Dimensions:** duplication, maintainability, consistency, testability
- **Implementation authorized in this branch:** no

### Exact proposition

`settings/route.ts` and `feature-flags/route.ts` duplicate a substantial HTTP, authorization, tenant, demo, CRUD, audit, response, and error-handling skeleton while applying different domain schemas and persistence models.

### Evidence

- Both routes expose GET, POST, PUT, and DELETE.
- Their normalized line similarity is 0.7739.
- Corresponding methods have closely aligned sizes, await counts, response counts, guards, persistence order, and audit calls.
- Their Zod schemas and domain data differ materially.

### Approved resolution

`admin-config-route-helpers-v1` must use small typed auxiliary functions for only the proven common mechanics.

Candidate helper responsibilities:

- resolve the authenticated SUPER_ADMIN and organization context;
- apply tenant validation;
- apply the common configuration mutation demo guard;
- normalize validation-error responses where contracts are identical.

SystemSetting and FeatureFlag schemas, DTOs, persistence, response payloads, and audit payloads remain explicit and domain-specific.

### Rejected resolution

Do not create a generic CRUD route factory, generic repository, callback-heavy route builder, or broad configuration framework.

<!-- api-struct-001-vehicle-route-domain-concentration -->
## `API-STRUCT-001` — Vehicles route domain concentration

- **Classification:** confirmed code finding
- **Priority:** P2 maintainability and testability follow-up
- **Dimensions:** cohesion, maintainability, validation, testability
- **Implementation authorized in this branch:** no

### Exact proposition

The Vehicles route combines transport and response handling with authorization, feature policy, tenant and demo guards, input conversion, identifier uniqueness, operational-status projection, persistence, and deletion-eligibility rules.

### Evidence

- GET reads Vehicles, Lessons, and legacy Exams and derives effective vehicle status.
- POST and PUT repeat registration-number and VIN conflict handling.
- POST and PUT map extensive unvalidated request bodies directly into persistence inputs.
- DELETE resolves usage counts and applies a domain-level deletion prohibition.
- Existing extraction is limited primarily to access helpers.

### Approved resolution

`vehicle-route-domain-services-v1` should introduce small typed domain functions and services for:

- mutation-input validation and normalization;
- registration-number and VIN conflict resolution;
- effective operational-status projection;
- deletion eligibility;
- domain persistence boundaries.

The route must remain responsible for HTTP composition and must preserve all current role, feature, tenant, demo, response, and error contracts.

<!-- configuration-audit-failure-no-finding-v1 -->
## Configuration audit failure classification

- **Classification:** no finding

`logConfigurationChange` catches and logs its own persistence failures. A configuration mutation is therefore not converted into an HTTP failure solely because configuration-history persistence failed.

This best-effort contract must be preserved unless a separate product or compliance decision changes the required audit guarantee.

<!-- api-dup-002-local-super-admin-tenant-helper-duplication -->
## `API-DUP-002` — Local SUPER_ADMIN tenant-context helper duplication

- **Classification:** confirmed code finding
- **Priority:** P2 maintainability and consistency follow-up
- **Dimensions:** duplication, modularity, security consistency, testability
- **Implementation authorized in this branch:** no

### Exact proposition

Seventeen administrative route files declare a local `requireSuperAdminTenant` helper. Sixteen retain a local implementation variant of the same session, SUPER_ADMIN, organization, tenant-host, and actor-context resolution; the Student collection route is already a thin delegate.

### Contextual evidence

- Most variants obtain the NextAuth session, require an authenticated SUPER_ADMIN, require an organization, validate the tenant host, and return actor information.
- Some variants return only the organization; others rename actor fields as `currentUserId`, `actorRole`, or `actorEmail`.
- These return-shape differences do not represent different authorization semantics.
- Shared domain modules and route-access helpers already exist, demonstrating that the repository is intentionally modular.

### Approved resolution

`admin-route-context-helper-v1` should introduce:

- `lib/admin/admin-route-access.ts`;
- a canonical typed `requireSuperAdminTenantContext(request)` result;
- focused unit tests for unauthenticated, wrong-role, missing-organization, tenant-mismatch, and success paths;
- incremental route migration with unchanged endpoint contracts.

Routes may destructure only the fields they need from the canonical context.

### Preserved domain boundaries

- Student read/write role policy remains in `requireStudentRecordsAccess`.
- User-management demo rules remain in the User domain.
- Vehicle feature and demo rules remain in the Vehicle domain.
- Lesson, import, email, lifecycle, schema, persistence, and audit behavior remain domain-specific.

### Rejected resolution

Do not introduce a generic route superclass, middleware framework, CRUD factory, callback-heavy builder, service locator, or unbounded shared-utils module.

<!-- domain-modular-design-and-thin-route-adapters-v1 -->
## Modular design rule

DAT should continue to organize production code by domain or capability. HTTP routes should remain thin adapters, domain services should own business behavior, and shared modules should contain only stable cross-cutting mechanics with explicit contracts.

<!-- ui-struct-002-schedule-map-view-orchestration -->
## `UI-STRUCT-002` — Schedule Map view duplication and orchestration

- **Classification:** confirmed code finding
- **Priority:** P2 maintainability and testability follow-up
- **Dimensions:** duplication, modularity, cohesion, testability
- **Implementation authorized in this branch:** no

### Exact proposition

Schedule Map has meaningful existing module extraction, but its Month and Week branches substantially duplicate the same wide-grid lesson-card and interaction implementation while the parent component continues to coordinate data loading, filters, navigation, printing, selection, editing, deletion, and all three views.

### Contextual evidence

- Normalized Month/Week similarity is 0.8595.
- Both branches use the same seven-column structure, day selection, expanded details, warnings, and edit/delete interactions.
- Day similarity is approximately 0.40 because it implements a distinct continuous timeline with duration, overlap, position, and current-time behavior.
- Card, navigation, responsive, viewport, student-display, and lesson-display logic is already meaningfully extracted.
- No component-level tests exercise Schedule Map state transitions directly.
- Existing helper, viewport, DTO integration, and smoke tests partially mitigate the risk.

### Approved resolution

1. `schedule-map-wide-grid-components-v1`: extract a focused Month/Week grid and reusable lesson details/actions.
2. Preserve Month-specific maximum-visible behavior and Week-specific full-day listing as explicit configuration.
3. Preserve Day as a separate timeline component.
4. `schedule-map-data-orchestration-v1`: subsequently evaluate lesson fetching, instructor filtering, refresh registration, and interaction state as focused hooks or modules.

### Preserved boundaries

- Keep `schedule-map-card.ts`, `schedule-map-navigation.ts`, `schedule-map-responsive.ts`, and `use-schedule-map-wide-viewport.ts`.
- Keep existing Lesson, Student, Vehicle, responsive, and smoke-test contracts.
- Do not create a generic calendar framework or universal renderer.
- Do not duplicate the existing `LD-008` CalendarLessonDto item.

<!-- ui-struct-003-lesson-form-orchestration-concentration -->
## `UI-STRUCT-003` — LessonForm orchestration concentration

- **Classification:** confirmed code finding
- **Priority:** P2 maintainability and testability follow-up
- **Dimensions:** cohesion, modularity, testability, consistency
- **Implementation authorized in this branch:** no

### Exact proposition

`LessonForm` delegates persistence contracts and server orchestration appropriately, but still coordinates three option-data sources, all form state, role/mode/type policies, client validation, payload composition, and every visual section without direct component-transition coverage.

### Positive modular evidence

- Create and update request-body builders are separate and unit-tested.
- Edit loading/submission is coordinated through `useEditLessonForm`.
- Server creation and update/delete behavior resides in focused services.
- Student option mapping, styles, and response parsing are extracted.

### Residual concentration

- Instructor, Student, and Vehicle options are loaded directly by the component.
- Lesson-type, role, mode, Student-limit, vehicle-requirement, and status policies are evaluated throughout initialization, validation, payload composition, and JSX.
- All participant, vehicle, date/time, status, search, and action sections remain in one component.
- No test directly mounts or exercises LessonForm state transitions.

### Approved resolution

1. `lesson-form-policy-module-v1`: pure typed UI policy and payload helpers.
2. `lesson-form-option-data-hook-v1`: focused option loading and parsing.
3. `lesson-form-sections-v1`: explicit sections after the preceding contracts stabilize.

LessonForm remains the composition root. Server validation remains authoritative.

### Rejected findings and resolutions

- No create/edit HTTP-contract duplication finding.
- No generic form framework or dynamic schema renderer.
- No separate client/server policy-duplication finding until the next contextual comparison.

<!-- a11y-003-lesson-form-control-associations -->
## `A11Y-003` — LessonForm accessible control associations

- **Classification:** confirmed code finding
- **Priority:** P2 accessibility correction
- **Affected surface:** shared LessonForm create/edit flows
- **Implementation authorized in this branch:** no

### Exact proposition

LessonForm displays labels for its Select controls without programmatically associating those labels with the SelectTrigger elements. Its two Student search fields depend on placeholder text, and their icon-only clear buttons have no accessible name.

### Evidence

- Labels reference lessonType, instructor, student, vehicle, and status.
- The corresponding five SelectTrigger elements have no matching ID or accessible-label association.
- Both Student search inputs lack an ID, associated label, and aria-label.
- Both clear actions contain only an X icon and have no accessible name.

### Positive evidence

- Date, start-time, and end-time inputs have matching IDs and labels.
- Multi-Student checkboxes have matching IDs and per-Student labels.
- Cancel and submit actions contain visible text.

### Smallest-safe future slice

`lesson-form-accessible-controls-v1`: correct only the incomplete Select, search, and clear-action associations and add accessible-role/name regression assertions.

<!-- lesson-form-client-server-policy-classification-v1 -->
## LessonForm client/server policy classification

- **Classification:** no broad duplication finding

Client and server agree on the central Student-selection rules: exams require one or more Students, THEORY may have no Student, and DRIVING requires one Student.

The client currently hard-codes the practical-exam maximum as `2`, while the server uses `VALIDATION_RULES.MAX_STUDENTS_PER_EXAM`. This consistency risk is already covered by `UI-STRUCT-003` and `lesson-form-policy-module-v1`; it is not counted as a separate finding.

Server validation remains authoritative. Vehicle-requirement consistency remains pending until the intended product contract is confirmed.

<!-- dat-toolchain-rationalization-v1 -->
## Toolchain rationalization audit

### Confirmed finding `TOOLCHAIN-001` — stale Volta runtime contract

**Classification:** confirmed configuration/toolchain finding.

Repository evidence:

- `package.json` declares `packageManager: pnpm@10.24.0`.
- `package.json` declares `engines.node: 24.x`.
- the same `package.json` declares Volta Node `20.20.0` and Volta pnpm `10.24.0`.
- the workstation's bare `pnpm` resolves through Volta.
- `pnpm exec node` launched through that shim was proven to run Node `v20.20.0`.
- the explicit portable Node `v24.18.0` → pnpm `10.24.0` chain was independently proven and passed 207/207 test files, 1738/1738 tests, and the production build.

Conclusion:

The project-level Volta Node pin is stale and conflicts with the closed canonical Node 24 runtime baseline. This can make apparently valid local commands execute under Node 20 while repository and hosted configuration require Node 24.

No implementation is authorized in the audit branch.

### Tool ownership conclusions

- pnpm is the single authoritative package manager; only `pnpm-lock.yaml` exists.
- npm/npx are bundled utilities and are not a second DAT package-management workflow.
- Vitest owns unit/integration tests.
- Playwright owns browser/E2E tests.
- `tsx` is actively used by operational scripts.
- Jest and Cypress are not active runners.
- Corepack has a distinct CI responsibility and is not currently redundant there.
- `ts-node` remains unclassified pending exact usage evidence.
- the previous repository-wide `npm ` count was invalid because the substring also matched `pnpm `; it must not be used as evidence.

### Follow-up evidence frontier

Before dependency-removal recommendations, inspect exact `ts-node`, `@types/node`, npm/npx, and Playwright web-server runtime usage. In particular, determine whether the two Playwright `pnpm dev` web-server commands can fall back to the Volta Node 20 path.

<!-- toolchain-transitive-provenance-evidence-v1 -->
### `TOOLCHAIN-001` transitive provenance evidence

A targeted nested-runtime probe established that explicit Node-24 invocation of the outer pnpm process does not automatically propagate to nested bare pnpm commands. Without PATH interception, a nested `pnpm exec node` returned Node `v20.20.0` from the Volta image.

A temporary guarded PATH shim was then used outside the repository to route both `pnpm` and `pnpm.cmd` through portable Node `v24.18.0` and the existing pnpm `10.24.0` CLI. This produced:

- direct child: Node `v24.18.0`;
- nested pnpm child: Node `v24.18.0`;
- Windows-shell nested child: Node `v24.18.0`;
- 9 recorded shim invocations, including nested `lint`, `typecheck`, `env:check`, `test:run`, and `build` calls;
- 207/207 test files passed;
- 1738/1738 tests passed;
- successful Next.js production build;
- full check exit `0`;
- unchanged tracked repository scope;
- successful temporary-shim cleanup.

Therefore the canonical Node-24 requirement is **transitive**, not merely outer-process based.

The failed earlier presence-oriented pre-commit consistency inspection is also recorded as a gate-design lesson under the already established `SA-GOV-001` semantic-gate principle: exact propositions must be validated, including taxonomy/count agreement. No additional governance finding is created for the same underlying principle.

<!-- lesson-edit-contract-finding-v1 -->
### Confirmed finding `UI-CONTRACT-001` — lesson edit UI exposes fields the update contract silently discards

**Classification:** confirmed UI/client-server contract finding.

**Observed contract:**

- `LessonForm` is reused for create and edit and explicitly advertises multi-student support.
- in edit mode, `EXAM` and `THEORY_EXAM` render the multi-select participant UI.
- the persisted `Lesson` row has one optional `studentId`; multi-student exam creation is represented by multiple Lesson rows rather than multiple participants on one Lesson row.
- `selectedStudents` initializes as an empty array and the edit synchronization effect restores `studentId` but does not initialize `selectedStudents` from the existing exam Lesson participant.
- submitting `EXAM` or `THEORY_EXAM` writes the chosen participants to `LessonFormPayload.studentIds`.
- `buildAdminLessonUpdateRequestBody` accepts only singular `studentId`; `studentIds` is therefore silently discarded.
- the PUT route accepts only singular `studentId`, and `updateAdminLesson` updates exactly one Lesson row.
- edit mode exposes all four `lessonType` values, but the update request builder, PUT route, and update service do not accept or persist `lessonType`; a type selection made by the user is silently discarded.
- existing update tests cover singular `studentId`, primarily through DRIVING semantics, but do not cover EXAM/THEORY_EXAM participant editing or lesson-type transitions.

**Impact:**

The edit UI can communicate that an exam participant set or lesson type has been changed while the network contract cannot persist that change. This is a silent-success/contract-integrity problem rather than merely missing functionality.

**Architecture note:**

The current active lesson surface is row-oriented: one Lesson row has at most one student. The separate Prisma `Exam` / `ExamRegistration` models exist but were not found in this update call path and must not be introduced into the fix merely because they exist.

**Implementation boundary:**

A dedicated slice must first make edit semantics explicit. The smallest safe design is expected to preserve row-level Lesson ownership unless product evidence requires grouped-exam editing. Unsupported fields must be disabled/hidden in edit mode or be implemented end-to-end; they must never be accepted by the UI and silently discarded.

No code change is authorized in this audit branch.

<!-- exhaustive-snapshot-audit-5eded00-v1 -->
## Full-project snapshot audit — first transversal pass

**Snapshot:** HEAD `5eded00ae3d0dedde8b1a251d393a9180911814b`.

- Safe archive: 817 tracked files; only the two `.env.example` files were intentionally excluded.
- Repository inventory remains 819 tracked files and 661 TypeScript/TSX files.
- Snapshot SHA-256: `9e61686d43458901c798d06ef8ba501d310aa2ea6c6a0c5ba7315bf71957a043`.
- The pass crossed imports, API boundaries, auth, tenant ownership, billing/licensing, Prisma models, operational scripts, tests, duplication, dead-code signals, and toolchain contracts.
- Signals are not promoted merely because they appear in static analysis; the findings below have cross-file evidence sufficient for audit classification.

### Confirmed finding `BILLING-SEC-001` — billing webhook authenticity is not enforced before commercial-state mutation

**Priority:** P0 safety/security containment.

- `/api/billing/webhooks/[provider]` explicitly states that real provider signatures/cryptographic parsing are not implemented.
- no repository-level authentication, provider-signature verification, secret gate, middleware gate, or environment-disable boundary was found in front of the route.
- provider adapters accept normalized envelope data including `providerEventId` and `organizationId`.
- accepted events are persisted and immediately passed to `processPersistedBillingEventLifecycle`.
- the lifecycle calls `applyBillingProjectionForOrganization`, which can update `Organization.subscriptionTier`, `subscriptionStatus`, `subscriptionEndsAt`, and create/expire billing `EntitlementGrant` rows.
- the PREMIUM and ENTERPRISE plan mappings contain all nine licensed feature keys.

**Finding:** repository code does not prove authenticity before externally supplied webhook data can reach commercial-state mutation. No exploitation or production incident is asserted.

### Confirmed finding `LICENSING-001` — School Admin can mutate provider-owned Premium entitlements

**Priority:** P1 commercial authorization boundary.

- the school-facing Plan & features page is read-only and explicitly says plan/module changes are managed by the software provider.
- `POST /api/admin/license/features` nevertheless authorizes tenant role `SUPER_ADMIN`, which is the DAT School Admin role.
- the route calls `LicenseService.enableFeature` / `disableFeature` for the School Admin's organization.
- `enableFeature` persists `OrganizationFeature.isEnabled` through an upsert.
- all current feature definitions are PREMIUM.
- effective entitlement resolution treats enabled manual `OrganizationFeature` rows as strongest and non-expiring for the same feature key.

**Finding:** hiding the school-facing mutation UI did not establish provider-only mutation authority at the server boundary.

### Confirmed finding `AUTHZ-OPERATOR-001` — internal Settings / Feature Flags remain School-Admin-authorized

**Priority:** P2 ownership boundary.

- `/admin/settings` labels itself internal/operator tooling and says it is not school-facing.
- direct access is still allowed to tenant `SUPER_ADMIN`.
- `/api/admin/settings` and `/api/admin/feature-flags` expose mutation methods to the same tenant role.
- a prior visibility audit already queued `platform-settings-and-feature-flags-boundary-v1`; that slice is reused rather than duplicated.

### Confirmed finding `AUTH-LEGACY-001` — parallel custom login endpoint diverges from the authoritative NextAuth path

**Priority:** P2 auth-surface reduction.

- the actual login page uses `signIn("credentials")` and NextAuth.
- no product runtime consumer of `/api/auth/login` was found.
- the custom endpoint validates credentials and returns `Login successful` but does not create the NextAuth session used by the application.
- NextAuth rejects users whose email is not verified; the parallel route does not apply that rule.

### Confirmed finding `AUTH-RATE-001` — distributed login rate limiting protects the non-authoritative login path

**Priority:** P1 security.

- `enforceLoginRateLimits` is called by `/api/auth/login`.
- the actual login UI enters through NextAuth Credentials.
- no application-level invocation of `enforceLoginRateLimits` was found in the NextAuth Credentials `authorize` path.
- no external WAF/provider protection is assumed by this finding; the repository simply does not prove equivalent application-level protection on the actual path.

### Confirmed finding `API-ATOM-002` — `/api/users/create` can leave User/profile creation partially persisted

**Priority:** P1 data integrity.

- the route creates `User` first and subsequently creates `Student` or `Instructor` without a Prisma transaction.
- manual compensation exists only for one precondition branch where instructor license fields are missing.
- a downstream role-profile create failure can therefore leave the already-created User row.
- the signup path provides a repository precedent by using `prisma.$transaction` for aggregate creation.

### Confirmed finding `ONBOARD-001` — direct Instructor creation lacks a usable production activation handoff

**Priority:** P1 onboarding/product integrity.

- the current New instructor UI uses `/api/users/create` and describes the result as an app login account plus operational Instructor profile.
- the route generates a random temporary password and creates the user with `isEmailVerified=false`.
- production responses intentionally omit the temporary password.
- the route contains a TODO to send the verification email / password rather than a completed activation handoff.
- the legacy token fields written on User are not the token records consumed by the current `EmailVerificationToken` verification service.
- NextAuth requires email verification.

**Finding:** a production direct-create success can create the account/profile without completing the login-activation contract promised by the UI.

### Confirmed finding `CODE-HYGIENE-001` — orphan scaffold and dependency surface remains in the project

**Priority:** P2 cleanup.

- the 661-file TS/TSX import graph found 25 `components/ui/*` modules with zero inbound literal static/dynamic importers.
- three hooks (`use-optimistic-update`, `use-async`, `use-loading-states`) and two production helpers (`lib/cache.ts`, `lib/date-utils.ts`) also have zero inbound code importers.
- sixteen runtime dependencies are referenced exclusively from the orphan UI set.
- deletion is not authorized from static evidence alone; the cleanup slice must repeat exact reference checks and run the full canonical validation after every removal batch.

### Confirmed finding `UI-DUP-001` — role-specific booking shells are duplicated and already drifting

**Priority:** P2 safe structural consolidation.

- admin and instructor exam-booking dialogs are approximately structurally identical, with role plumbing as the primary difference.
- admin and instructor dashboard clients show the same pattern.
- lesson-booking copies already differ in HTTP error parsing despite calling the same `/api/admin/lessons` contract.

**Finding:** the duplication has crossed from cosmetic repetition into independently evolving behavior.

### Confirmed finding `SCHEMA-LEGACY-001` — legacy Exam domain remains coupled to current Lesson-based exams

**Priority:** P2 evidence-first architecture/data disposition.

- active EXAM/THEORY_EXAM creation persists Lesson rows, one row per student.
- Prisma still contains full `Exam` and `ExamRegistration` models.
- the vehicles API explicitly labels `Exam` as a legacy table and still queries it when determining vehicles currently in use.
- legacy Exam/ExamRegistration data also participates in deletion policies, smoke inspection, seed/cleanup and tenant backfill/reporting scripts.

**Finding:** DAT currently carries two exam representations with real operational coupling. No model/data removal is authorized without read-only target-DB evidence and a dedicated migration decision.

### Confirmed finding `TOOLCHAIN-002` — direct `@next/env` contract is two majors ahead of Next

**Priority:** P2/P3 toolchain alignment.

- application Next.js is `14.2.28`.
- direct devDependency `@next/env` is `^16.1.6`.
- the lockfile contains both `@next/env@14.2.28` and `@next/env@16.1.6`.
- seventeen operational/demo scripts directly use `loadEnvConfig` from `@next/env`.

**Finding:** this is a dual-major framework-adjacent contract and upgrade/maintenance risk; no current runtime incompatibility is asserted.

### Snapshot signals from the first pass — resolved

- billing projection retry/atomicity is confirmed as `BILLING-SEC-002`;
- repeated tenant-scoped row locks are confirmed as `DB-DUP-001`;
- duplicated import workflow orchestration is confirmed as `UI-DUP-002`;
- the auth request-page shell remains a safe-refactor candidate, not a separate defect;
- broad direct-dependency responsibility is assigned to an evidence-first pruning slice under `CODE-HYGIENE-001`; no literal-import-only bulk deletion is authorized;
- Node runtime type-package divergence is confirmed as `TOOLCHAIN-003`;
- the detected import cycles are type-only/barrel cycles erased from runtime and are not findings.

No runtime, package, schema, data, hosted, billing, or production mutation was performed by this snapshot audit.

<!-- exhaustive-snapshot-audit-5eded00-v2 -->
## Full-project snapshot audit — second exhaustive pass

**Static snapshot analysis status:** complete for HEAD `5eded00ae3d0dedde8b1a251d393a9180911814b`.

The second pass prioritized security, commercial authority, credential/session boundaries, transaction integrity, exports, test architecture, dependency security, dormant schema, duplication and dead-code disposition.

### Confirmed finding `BILLING-SEC-002` — billing projection and lifecycle completion are not one atomic idempotent unit

**Priority:** P0/P1 commercial integrity.

- billing projection runs before the BillingEvent is independently marked PROCESSED;
- projection updates Organization and entitlement state through separate writes without one encompassing transaction;
- FAILED/RECEIVED events are retryable;
- EntitlementGrant has no uniqueness guarantee that makes repeated grant creation intrinsically idempotent;
- a failure after commercial projection but before lifecycle completion can therefore be retried against already-applied effects.

### Confirmed finding `AUTH-SESSION-001` — database Session deletion does not revoke active JWT-strategy sessions

**Priority:** P0/P1 access revocation.

- NextAuth uses `session.strategy = "jwt"`;
- access-removal, deactivation and email-change services delete Session rows as a revocation primitive;
- password reset also does not invalidate already-issued JWTs;
- the authoritative JWT callback/session path does not perform a per-request revocation/version lookup.

### Confirmed finding `AUTH-LINK-001` — public security-email links derive origin from the incoming request instead of the account's trusted tenant

**Priority:** P1 tenant/security identity.

- public password-reset and email-verification request flows derive their base URL from `new URL(request.url).origin`;
- the user is resolved by email, but the generated link origin is not resolved from that user's trusted organization/domain registry;
- tenant-admin invitation routes using request origin are not included in this finding because they first enforce tenant-host ownership.

### Confirmed finding `PLATFORM-ATOM-001` — organization onboarding escapes its Prisma transaction for license creation

**Priority:** P1 integrity.

- organization/domain/admin creation uses a transaction client;
- inside that transaction the onboarding code calls `LicenseService.createLicenseKey`, which uses the global DB client rather than the transaction client;
- license creation failure can therefore sit outside the aggregate atomicity boundary and is not surfaced as a hard onboarding failure.

### Confirmed finding `LICENSING-002` — commercial license keys use weak generation and a race-prone single-use activation contract

**Priority:** P1 commercial security.

- license keys are generated from `Date.now()` plus `Math.random()` rather than a cryptographically secure source;
- `isUsed` is checked before the activation transaction;
- the in-transaction update is not conditional on `isUsed=false`;
- concurrent activations can pass the pre-check and attempt duplicate entitlement creation.

### Confirmed finding `API-ERROR-001` — generic API 500 handling returns internal Error.message to clients

**Priority:** P1/P2 security hardening.

- the shared `withErrorHandling` wrapper logs the exception and also uses the underlying `Error.message` as the external 500 response;
- routes using this wrapper can therefore expose implementation/database detail that should remain server-side.

### Confirmed finding `UI-FEEDBACK-001` — one active toast API has no mounted renderer

**Priority:** P1/P2 functional integrity and cleanup.

- the root layout mounts Sonner and react-hot-toast;
- active Schedule Map, lessons-management and practical-import code also use the custom `useToast` store;
- the matching custom Toaster is not mounted and is itself zero-inbound;
- the project therefore carries three notification stacks while one active stack can emit messages with no visible renderer.

### Confirmed finding `TEST-CONTRACT-001` — feature smoke validates FeatureFlag rather than the effective entitlement boundary used by the product

**Priority:** P1/P2 test confidence.

- the smoke helper queries `/api/config/features`, backed by FeatureFlag;
- live product gating uses LicenseService/effective OrganizationFeature + EntitlementGrant resolution;
- the smoke can therefore pass without proving the commercial feature boundary that users actually exercise.

### Confirmed finding `TEST-HYGIENE-001` — Playwright includes external scaffold and a stale THEORY_EXAM participant contract

**Priority:** P2.

- the configured E2E tree still contains the default external Playwright example;
- the theory-exam spec sources User ids and sends them where the active lesson-create contract requires operational Student ids;
- these tests reduce signal quality and can encode an obsolete contract.

### Confirmed finding `DB-DUP-001` — tenant-scoped row-lock SQL is duplicated across mutation services

**Priority:** P2 safe concurrency refactor.

- equivalent `FOR UPDATE` primitives are repeated across Student, Instructor and Invitation mutation services;
- concurrency/security SQL should have one tested domain-aware implementation per locked aggregate rather than copy-pasted raw SQL.

### Confirmed finding `CLIENT-DUP-001` — client JSON/error response parsing is repeated across many live surfaces

**Priority:** P2.

- `tryReadJson` and equivalent safe-JSON/error extraction logic are reproduced across numerous components and hooks;
- the copies already differ in error behavior;
- a small shared HTTP response primitive is justified without creating a generic API framework.

### Confirmed finding `UI-DUP-002` — Student and Practical Lesson imports duplicate the same orchestration state machine

**Priority:** P2.

- both dialogs implement file selection, preview/dry-run, findings, confirmation, apply and result/loading orchestration;
- their duplicated implementations already differ in notification/error handling;
- shared workflow primitives can remove redundancy while preserving domain-specific parsers and endpoints.

### Confirmed finding `TOOLCHAIN-003` — Node type definitions lag the declared Node 24 runtime

**Priority:** P2/P3 toolchain alignment.

- the runtime contract is Node 24.x;
- direct `@types/node` remains 20.6.2;
- the compiler therefore describes an older Node API generation than the runtime contract.

### Confirmed finding `DEP-SEC-001` — Next.js 14.2.28 is below applicable security patches and outside the supported release lines

**Priority:** P0/P1 dependency security.

- DAT uses Next 14.2.28 with App Router;
- applicable published fixes for the 14.x security line require later 14.2.x patches, including the complete 14.2.35 follow-up;
- Next 14 is no longer a currently supported release line;
- containment and supported-LTS migration must be separate, controlled slices rather than an opportunistic framework upgrade.

### Confirmed finding `SCHEMA-LEGACY-002` — dormant operational models remain coupled to runtime/history without current write flows

**Priority:** P2 data-sensitive architecture.

- LessonRequest, Payment and Notification remain represented in Prisma and operational counts/policies/scripts;
- no current non-test runtime create/update flow was found for those domains;
- they are not safe to delete blindly because historical rows can still affect dashboards, cleanup or deletion policy.

### Confirmed finding `EXPORT-SEC-001` — Student and Practical Lesson CSV exports do not neutralize spreadsheet formulas

**Priority:** P1/P2 export security.

- the shared Student/Practical export helper performs CSV quoting but does not neutralize leading `=`, `+`, `-` or `@`;
- exported values include user-controlled text;
- the audit-log exporter already contains formula-injection hardening, proving an existing repository precedent.

### Confirmed finding `AUTH-PASSWORD-001` — privileged account provisioning bypasses the canonical password-strength policy

**Priority:** P1.

- the canonical user password schema requires length, uppercase, numeric and special-character constraints;
- Platform School Admin onboarding only requires minimum length;
- Platform Admin provisioning accepts any non-empty password;
- the weakest rules therefore apply to highly privileged account-creation paths.

### Confirmed finding `TEST-GATE-001` — critical E2E coverage is not a CI/canonical gate

**Priority:** P1/P2 release confidence.

- canonical `check` runs lint, typecheck, Vitest and build;
- GitLab runs that check but no Playwright job;
- E2E suites therefore exist without gating ordinary integration changes.

### Confirmed finding `TEST-ARCH-001` — the project lacks a real database integration layer for transaction/FK/concurrency contracts

**Priority:** P1/P2 engineering safety.

- 49 tests are named `*.integration.unit.test.ts`, but no real `*.integration.test.ts` database layer was found;
- many of those tests mock the DB boundary;
- transaction-client escape, FK visibility and concurrency races therefore require a disposable real-Postgres integration harness.

### Resolution ledger — signals intentionally not promoted

- a generic tenant-host bypass across API routes was rejected after tracing indirect host guards and organization-scoped services;
- import file-size/row-count handling is bounded server-side; no unbounded-import finding;
- no runtime SQL-injection path was found; the operational unsafe-query helper is SELECT-only guarded;
- no runtime input-driven eval or shell-execution path was found;
- remaining import cycles are type-only/barrel cycles and do not form runtime cycles;
- Category and TransmissionType are legitimate read-only reference data, not dormant models;
- the public signup path remains fail-closed in the intended production cutline; its incomplete verification path becomes a release-readiness gate rather than an active vulnerability finding;
- tenant-admin invitation routes derive origin from the request but first enforce tenant-host ownership; they are not included in `AUTH-LINK-001`;
- no clear production N+1 query finding survived the final await-in-loop review;
- security-response headers cannot be classified from repository static analysis alone and require a hosted read-only probe;
- accessibility icon-button candidates remain evidence-first and are assigned to a regression sweep rather than promoted from heuristic evidence alone.

No code, package, lockfile, schema, data, billing, hosted or production mutation was performed by this second pass.

<!-- exhaustive-audit-master-remediation-ledger-v1 -->
### Remediation coverage checkpoint

All **46 confirmed findings** now have an explicit roadmap remediation/disposition mapping. Cross-cutting cleanup/evidence items remain separate from the finding count. This mapping is planning evidence only and does not authorize implementation.

<!-- hosted-security-wave-a1-headers-v1 -->
## Hosted security Wave A1 — response boundary evidence

**Probe baseline:** audit HEAD `2925f17813300821a4a5aa9c575ba1bea683d938`; read-only unauthenticated GET/header probes only.

### Positive controls

- `www.meengine.io` and `platform.meengine.io` redirect HTTP to HTTPS with `308 Permanent Redirect`.
- both HTTPS roots return `Strict-Transport-Security: max-age=63072000`.
- no `x-powered-by` disclosure was observed in the filtered response set.
- unauthenticated GET requests to school license/features, settings and feature-flags APIs return `401 Unauthorized` on the tenant host.

### Hosted reinforcement of `BILLING-SEC-001`

- GET to `/api/billing/webhooks/sibs` returns `405 Method Not Allowed` on both `www.meengine.io` and `platform.meengine.io`.
- this proves the webhook route is deployed on both public host surfaces without requiring any mutation probe.
- no POST was performed; the existing static finding remains the authority for missing webhook authenticity verification.

### Confirmed finding `SEC-HEADERS-001` — baseline browser hardening headers are absent on deployed responses

**Priority:** P1/P2 security hardening.

- the measured tenant and Platform HTML/API responses expose HSTS but no `Content-Security-Policy` or report-only CSP;
- no `X-Content-Type-Options` was observed;
- no `Referrer-Policy` was observed;
- no `Permissions-Policy` was observed;
- no `X-Frame-Options` was observed and no CSP `frame-ancestors` policy was present;
- no COOP/CORP/COEP policy was observed; those headers require product-specific necessity assessment rather than automatic enforcement.

**Finding:** HTTPS/HSTS transport protection is present, but the deployed browser-response boundary lacks the baseline defense-in-depth policies used to constrain script/resource execution, framing, MIME interpretation, referrer leakage and browser capabilities.

**Implementation guard:** do not deploy an untested enforcing CSP directly to Production. Inventory required origins, use Preview and staged/report-only validation where appropriate, then enforce the smallest policy that preserves intended application behavior.

### Signals retained for later hosted evidence

- `/login` returned 404 and is treated only as an incorrect probe pathname, not a finding.
- unauthenticated API responses use `Cache-Control: public, max-age=0, must-revalidate`; authenticated/sensitive-response cache behavior still requires a separate read-only session-aware probe before classification.

No authentication, cookie, POST, database, billing, hosted-configuration or production mutation was performed.

<!-- security-wave-a2-dependency-audit-v1 -->
## Security Wave A2 — dependency and lockfile evidence

**Baseline:** audit HEAD `335528ffead00ac9d77c84a889f8a4729629c1d3`; Node `24.18.0`; pnpm `10.24.0`; registry audit and static path applicability only.

### Dependency inventory

- 88 direct production dependencies + 25 direct development dependencies = 113 direct dependencies.
- pnpm audit returned 81 unique advisories across the complete graph: 2 critical, 40 high, 33 moderate and 6 low.
- production graph: 61 unique advisories = 1 critical, 26 high, 29 moderate and 5 low.
- development graph: 32 unique advisories = 1 critical, 20 high, 10 moderate and 1 low.
- audit reports were generated outside the repository; no audit fix/install/package/lockfile mutation was performed.

### `DEP-SEC-001` refinement — Next.js containment and supported-LTS migration remain separate

- DAT declares `next@14.2.28` and contains 130 App Router code files.
- the December 2025 App Router Server Components DoS advisory includes `14.2.28` in the affected range and provides 14.2.34 followed by 14.2.35 as the complete 14.x fix sequence.
- therefore `next-security-patch-containment-v1` remains a valid immediate P0 containment slice: move the current 14.2.28 baseline to at least the complete 14.2.35 security level and fully regress it.
- this containment does not close `DEP-SEC-001`: Next 14 is outside the supported LTS policy and must subsequently move to a supported line through `next-supported-lts-migration-v1`.
- the A2.1 path probe found zero `use server` directives, zero middleware files, zero custom server files, zero rewrites, image optimization disabled and zero `beforeInteractive` references.
- advisories whose exploit preconditions specifically require Server Actions, middleware/proxy routing, custom-server WebSocket handling, rewrites, Image Optimizer or `beforeInteractive` are therefore not promoted as separate active DAT findings from current evidence.

### NextAuth disposition

- DAT declares `next-auth@4.24.11`.
- the code imports the Credentials provider once, imports no other NextAuth provider, and contains zero `getToken()` call files.
- current audit advisories for Email-provider normalization/misdelivery, OAuth state/nonce/PKCE cross-provider handling and malformed-Bearer `getToken()` therefore do not match the authoritative DAT login path.
- `nextauth-v4-security-patch-alignment-v1` remains an evidence-first maintenance/security-alignment slice rather than a separate active vulnerability finding.

### Vitest / Vite / PostCSS disposition

- Vitest UI/browser/API-server exposure is not configured; Vite network host exposure was not found; Vitest uses the Node environment.
- PostCSS has zero application-code importers and remains present as build configuration.
- the current advisories in these families are retained as development/build dependency maintenance evidence unless a future path introduces the advisory's attacker-controlled input/exposure precondition.

### Direct-root pruning evidence

- nine direct production dependency roots have zero literal code importers in the tracked application: `lodash`, `webpack`, `formik`, `recharts`, `mapbox-gl`, `plotly.js`, `react-use`, `gray-matter`, `react-select`.
- zero importer count is not deletion authority: scripts, configuration, peer/framework and build responsibilities must still be checked.
- these nine roots are added to `direct-dependency-responsibility-pruning-v1`; genuinely responsibility-free roots should be removed rather than security-upgraded solely to preserve dead surface.

### Confirmed finding `DEP-SEC-002` — dependency advisory drift is not continuously gated

**Priority:** P1/P2 engineering security.

- the current lockfile resolves 81 unique advisories, including critical/high entries;
- `.gitlab-ci.yml` and package scripts contain no pnpm/npm audit, OSV, Snyk, Dependabot-equivalent gate, dependency-check or comparable advisory-drift control;
- repository validation can therefore remain green while newly disclosed vulnerabilities accumulate in the exact locked dependency graph;
- this finding is about absence of continuous detection/governance, not a claim that every advisory is exploitable by DAT.

**Finding:** dependency security is currently point-in-time/manual rather than a reproducible engineering gate.

**Remediation:** `dependency-security-monitoring-v1` must create a deterministic advisory policy after the current baseline is triaged: path-aware exceptions with rationale, no uncontrolled automatic upgrades, and a CI failure policy for new unreviewed material security advisories.

### A2 evidence hashes

- all-dependency report SHA-256: `574b3071d38c823768461506e8bfe469e4fd2fd0d408ecf6b88d6ec10ed21e10`.
- production report SHA-256: `c68ba65d1bddd14ce6b816cc24d3520ba39e2b268ad5251c01f389b531fb4c42`.
- development report SHA-256: `0bc8de10ba8c11a32270d5b0c54accc74ee3a3a00e32a81834e8cf8941ae54ef`.

No dependency update, package install, audit fix, code, database, hosted or production mutation was performed.

<!-- security-wave-a3-hosted-auth-v1 -->
## Security Wave A3 — hosted authentication/session boundary

**Baseline:** audit HEAD `9696552b98f77f4bea8d846e4b9fa69c801b86e1`; anonymous read-only GET/header probes only.

### Probe validity

- the initial A3 shell/awk parser attempt was inconclusive because header parsing failed while the outer gate remained green;
- no security conclusion is derived from that invalid attempt;
- A3.1 replaced parsing with explicit Node 24 fail-closed parsing;
- all eight A3.1 endpoint parses succeeded, all eight header captures were present, temporary evidence was deleted and the repository remained unchanged;
- A3.2 repeated cache-specific probes with explicit Vercel/CDN header inspection and also completed cleanly.

### Cookie boundary — positive evidence

- tenant and Platform CSRF cookies use `__Host-next-auth.csrf-token`;
- CSRF cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` and host-only;
- callback cookies use `__Secure-next-auth.callback-url` and are also `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` and host-only;
- no cross-subdomain `Domain=.meengine.io` cookie scope was observed;
- current evidence therefore does not support a cookie-scope isolation finding between tenant and Platform hosts.

### Sign-in routing — positive evidence

- `/api/auth/signin` returns 302 to `/auth/login` on both tenant and Platform hosts;
- `/auth/login` itself returns 200 on both hosts;
- the earlier `/login=404` A1 observation was an incorrect guessed pathname and is explicitly closed as a false positive.

### Session/CDN cache boundary — positive evidence

- anonymous `/api/auth/session` requests on both hosts returned `x-vercel-cache=MISS`, `age=0` and no ETag;
- repeated requests remained MISS;
- a request carrying the fixed non-auth audit cookie `dat-audit-probe=1` also remained MISS;
- public `/auth/login` can be cached/prerendered (`HIT`/`PRERENDER`), which is consistent with a public login page and is not evidence of session caching;
- `Cache-Control: public, max-age=0, must-revalidate` remains semantically broad, but current edge behavior does not establish shared-cache session leakage.

### Relationship to existing findings

- A3 creates no new finding; audit total remains 48.
- `AUTH-SESSION-001` remains fully open: secure cookies and edge-cache isolation do not provide server-side revocation of already-issued stateless JWT sessions.
- `SEC-HEADERS-001` remains open: A3 auth surfaces again lacked the browser hardening headers already captured by A1; this is reinforcing evidence, not a second finding.
- an authenticated cache probe is not required for current classification; it may be used later as regression evidence during auth remediation.

No credential, real session cookie, login POST, CSRF token output, callback mutation, database, hosted-configuration or production mutation was performed.

<!-- security-wave-a4-commercial-evidence-v1 -->
## Security Wave A4 — billing/licensing deployment-state evidence

**Baseline:** audit HEAD `6fd33024cd2bccc1e4b6db0209137d8519014139`; static repository reads plus anonymous hosted GETs only.

### Static commercial surface

- five commercial/admin route files were identified:
  - `/api/admin/feature-flags` — GET/POST/PUT/DELETE;
  - `/api/admin/license/activate` — POST;
  - `/api/admin/license/features` — GET/POST;
  - `/api/admin/settings` — GET/POST/PUT/DELETE;
  - `/api/billing/webhooks/[provider]` — POST.
- the billing webhook route contains zero detected signature/HMAC/timing-safe/webhook-secret authenticity signals.
- this directly reinforces `BILLING-SEC-001`; it does not create a duplicate finding.

### Configuration evidence boundary

- within the commercial-file scan, the only detected environment-key name was `DEMO_ORGANIZATION_ID`.
- no environment values were read or printed.
- absence of a provider-specific key from this constrained scan is not evidence that a billing provider is unconfigured in hosted infrastructure.
- provider operational configuration therefore remains intentionally unproven and is not required to establish the current billing findings.

### Authority evidence

- feature-flags, license activation, license features and settings routes contain session-authentication signals.
- no anonymous hosted access was observed.
- static A4 does not overturn `LICENSING-001` or `AUTHZ-OPERATOR-001`, because those findings concern authority after authentication rather than anonymous access.

### Hosted deployment-state evidence

- billing webhook GET returned 405 on both tenant and Platform hosts, proving the POST route is deployed on both public surfaces without invoking it.
- license/features, settings and feature-flags GET returned 401 on both public hosts.
- all eight commercial probes returned Vercel MISS with age=0.
- no unexpected anonymous 200 commercial/admin surface was identified.

### Finding disposition

- `BILLING-SEC-001` remains open and is reinforced by both static zero-authenticity-signal evidence and public route deployment evidence.
- `BILLING-SEC-002` remains open; A4 performs no mutation/retry and therefore does not attempt to prove runtime idempotency.
- `LICENSING-001` remains open; anonymous 401 does not prove correct authenticated entitlement authority.
- `LICENSING-002` remains open; no license activation/key mutation was exercised.
- `AUTHZ-OPERATOR-001` remains open; A4 confirms anonymous fail-closed behavior only.
- A4 promotes no new finding; audit total remains 48 and roadmap coverage remains 48/48.

### Security Wave A closure

- A1 response/header boundary: complete;
- A2/A2.1 dependency-security classification: complete;
- A3/A3.1/A3.2 auth/session/cookie/cache boundary: complete;
- A4 commercial billing/licensing hosted boundary: complete;
- Security Wave A is therefore complete and the next evidence phase is Wave B data-sensitive read-only disposition.

No webhook POST, billing event, license activation, entitlement mutation, credential, database write, hosted configuration change or production mutation was performed.

<!-- data-wave-b1-legacy-dormant-inventory-v1 -->
## Data Wave B1 — legacy/dormant model read-only inventory

**Baseline:** audit HEAD `2fb2cf407bb720f871e3c5894bde78548fe1f3ec`; current local `DATABASE_URL`; aggregate-only read transaction.

### Target and safety evidence

- `DATABASE_URL` was sourced from local `.env`; `.env.local` exists but does not define `DATABASE_URL`.
- target guard identified remote PostgreSQL on a Supabase host with pooler characteristics.
- target database and user identifiers were emitted only as non-reversible short fingerprints.
- PostgreSQL transaction state explicitly returned `transaction_read_only=on` before model queries.
- no row content, PII, individual payment value, database URL, host, username or credential was printed.

### Model results

- `Exam`: schema/delegate present; 0 rows.
- `ExamRegistration`: schema/delegate present; 0 rows.
- `LessonRequest`: schema/delegate present; 0 rows.
- `Payment`: schema/delegate present; 0 rows.
- `Notification`: schema/delegate present; 0 rows.
- current target contains 1 Organization row.

### Finding disposition

- `SCHEMA-LEGACY-001` remains confirmed but is materially refined: `Exam` and `ExamRegistration` have no data in the observed target.
- `SCHEMA-LEGACY-002` remains confirmed but is materially refined: `LessonRequest`, `Payment`, and `Notification` have no data in the observed target.
- absence of rows substantially lowers data-migration risk for these models on this target, but is not deletion authority.
- before schema removal, the relevant disposition slices must prove zero current runtime responsibility, inspect migration/script/ops responsibility, and account for any other deployed database environments.
- B1 creates no new finding; audit total remains 48 and remediation coverage remains 48/48.

No INSERT, UPDATE, DELETE, schema change, hosted configuration change or production mutation was performed.

<!-- environment-configuration-responsibility-audit-v1 -->
## Environment configuration responsibility audit — E1-E4

### Inventory and profile responsibilities

- five real local env profiles plus two tracked `.env.example` files were observed;
- `.env.operator.production.local` contains 23 keys and `.env.smoke.production.local` contains 15 keys;
- the operator and smoke profiles have zero key overlap and together cover 38 of 40 real local keys (95%);
- both operational profiles are ignored/untracked;
- historical Production Smoke workflows explicitly load the operator and smoke profiles together, so the smoke profile is not considered orphaned merely because its filename has no current tracked literal reference;
- no direct Client Component reference to a non-public env key and no secret-like `NEXT_PUBLIC_*` name was detected.

### Configuration duplication

- ten real local keys are duplicated across local profiles;
- eight duplicated keys currently have equal values;
- `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` intentionally differ because `.env.local` provides loopback/local-development URL overrides while the operator profile uses the remote hosted role;
- `DATABASE_URL` and `DIRECT_URL` are logically aligned between the automatic app profile and the Production operator profile.

### Central validation architecture

- `lib/env.ts` exists and uses Zod-based validation signals;
- its only direct importer is `scripts/env-check.ts`; the runtime does not consume all configuration through one central config object;
- package lifecycle hooks run `env:check` before development/typecheck/tests/build;
- this validation architecture is not itself classified as defective: specialized runtime, email, operator and E2E boundaries may retain distinct configuration responsibilities.

### Confirmed finding `CONFIG-ENV-001` — local development can resolve to the Production operator database target

**Priority:** P0/P1 operational safety.

- no shell override for `DATABASE_URL` or `DIRECT_URL` was present during E4;
- automatic local resolution selects `nextjs_space/.env` for both database URLs;
- that automatic app database identity matches the explicit Production operator target;
- `nextjs_space/.env.local` does not provide a `DATABASE_URL` override;
- `env-check.ts` / `lib/env.ts` contain no explicit Production target identity guard, expected DB host/name/project-ref guard, localhost/loopback guard, or reuse of the existing remote operator target guard;
- therefore starting a local application or another write-capable workflow that relies on automatic env loading can target the Production operator database without an explicit fail-closed environment-isolation decision.

**Remediation slice:** `local-development-database-isolation-v1`.

**Required contract:**

- local development must not resolve silently to the Production operator database;
- development must use an explicitly separate local/development database target or fail closed;
- Production/operator access remains deliberate and uses the explicit operator profile plus target guards;
- no generic escape hatch may make Production the normal development default;
- add regression tests for target classification and startup refusal.

### Cleanup / consolidation evidence retained

- `environment-configuration-contract-consolidation-v1` will rationalize ownership and duplication after the isolation slice;
- `public-env-pruning-v1` will prove implicit/build responsibility before removing `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_URL`; current scans found no tracked/client consumers;
- inspect `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` versus `NEXTAUTH_SECRET`, `LICENSE_TIER`, and `VERCEL_OIDC_TOKEN` before any removal;
- do not merge the operator and smoke profiles: their zero-overlap responsibility split is intentional and useful.

E4's direct-runtime scanner reported 13 candidates but one was `nextjs_space/docs/engineering/email-provider-evaluation.md`; the corrected runtime candidate count is 12.

No env value, secret, URL, host, database name, username, password or token was recorded in canonical evidence.

<!-- environment-configuration-disposition-e5-e7-v1 -->
## Environment configuration disposition — E5-E7

E5-E7 narrowed the environment audit from discovery to exact responsibility and final disposition. No new finding was promoted; the audit remains at 49 findings with 49/49 remediation coverage.

### KEEP

- `NEXTAUTH_SECRET` — canonical authentication secret variable for the current NextAuth v4 contract.
- `NEXTAUTH_URL` — legitimate NextAuth environment-specific URL; local loopback override and remote operator value have distinct intentional responsibilities.

### CONSOLIDATE / REMOVE ALIAS

- `AUTH_SECRET` — remove from DAT-managed configuration in favor of `NEXTAUTH_SECRET`.
- installed NextAuth 4.24.11 source resolves `NEXTAUTH_SECRET ?? AUTH_SECRET`; `AUTH_SECRET` is a fallback alias.
- the operator profile currently defines both aliases with equal values, proving redundant local source-of-truth duplication.
- remediation slice: `auth-secret-alias-consolidation-v1`.

### REMOVE

- `NEXT_PUBLIC_APP_URL` — no functional consumer outside `lib/env.ts`; remove from the DAT environment contract and validation/docs where no longer needed.
- `NEXT_PUBLIC_SUPABASE_URL` — no functional consumer outside `lib/env.ts`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — no functional consumer outside `lib/env.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` — no functional environment consumer outside `lib/env.ts`; current application has no direct Supabase SDK/client responsibility.
- `LICENSE_TIER` — zero functional tracked consumers; legacy env contract only.

Removal slices:

- `public-env-pruning-v1` — `NEXT_PUBLIC_APP_URL`.
- `supabase-environment-contract-retirement-v1` — Supabase public URL/anon key/service-role env contract.
- `legacy-environment-key-pruning-v1` — `LICENSE_TIER` and externally-owned residual-key disposition.

### DEFER / external ownership

- `VERCEL_OIDC_TOKEN` has zero functional DAT consumer and no tracked Vercel CLI env workflow.
- classify it as outside the DAT application contract; do not blindly delete external/hosted ownership.
- before removal from any local or hosted environment, verify whether current Vercel tooling generated or owns it.

### Execution ordering

1. execute `local-development-database-isolation-v1` first;
2. execute `auth-secret-alias-consolidation-v1`;
3. execute `supabase-environment-contract-retirement-v1` and `public-env-pruning-v1`;
4. execute `legacy-environment-key-pruning-v1` with Vercel ownership verification;
5. execute `environment-configuration-contract-consolidation-v1` to normalize the surviving contract and documentation;
6. run canonical Node24 validation plus Preview/hosted verification appropriate to each changed responsibility.

Hosted environment keys must be verified by name and environment before deletion; local/static zero responsibility is not authority for blind hosted removal.

<!-- data-wave-b2-responsibility-and-sa-handoff-v1 -->
## Data Wave B2 — legacy/dormant model responsibility

B2 statically classified schema, runtime, script, test and migration responsibility for the five models that B1 proved contain zero rows on the currently configured remote Supabase target.

### B2 interpretation

- zero observed rows do **not** currently make any of the five models immediately removable;
- all five remain represented in the Prisma relation graph;
- all five retain at least one Prisma delegate responsibility in runtime/ops/scripts;
- historic migrations are provenance and must not be edited; eventual removal requires a new forward migration;
- no new finding is created; B2 deepens `SCHEMA-LEGACY-001` and `SCHEMA-LEGACY-002`.

### `Exam`

- B1 observed rows: 0.
- inbound schema relations: `Category`, `ExamRegistration`, `Instructor`, `Organization`, `Vehicle`.
- runtime delegates: `app/api/admin/vehicles/route.ts`, `lib/ops/production-smoke-reconciliation-inspection.ts`.
- script responsibility: 5 files.
- tests mentioning the domain: 2.
- migration provenance: 4 migrations.
- disposition: **not removal-ready**; classify runtime references semantically before retirement.

### `ExamRegistration`

- B1 observed rows: 0.
- inbound schema relations: `Exam`, `Payment`, `Student`.
- runtime delegate: `lib/ops/production-smoke-reconciliation-inspection.ts`.
- script responsibility: 3 files.
- direct test responsibility: 0.
- migration provenance: 2 migrations.
- disposition: **not removal-ready**, although current responsibility may be primarily legacy/ops.

### `LessonRequest`

- B1 observed rows: 0.
- inbound schema relations: `Category`, `Instructor`, `Lesson`, `Organization`, `Student`, `User`, `Vehicle`.
- runtime delegates: `app/instructor/page.tsx`, `app/student/page.tsx`, `lib/ops/production-smoke-reconciliation-inspection.ts`.
- script responsibility: 5 files.
- direct test responsibility: 0.
- migration provenance: 4 migrations.
- disposition: **not removal-ready**; live page-level responsibility must be explained or retired first.

### `Payment`

- B1 observed rows: 0.
- inbound schema relations: `ExamRegistration`, `Lesson`, `Student`, `User`.
- runtime delegates: `lib/instructors/instructor-record-delete.ts`, `lib/students/student-record-delete.ts`, `lib/ops/production-smoke-reconciliation-inspection.ts`.
- script responsibility: 3 files.
- direct test responsibility: 0.
- migration provenance: 2 migrations.
- disposition: **not removal-ready**; delete/retention policy responsibility must be resolved first.

### `Notification`

- B1 observed rows: 0.
- inbound schema relation: `User`.
- runtime delegate: `lib/ops/production-smoke-reconciliation-inspection.ts`.
- script responsibility: 2 files.
- direct test responsibility: 0.
- migration provenance: 2 migrations.
- disposition: **not removal-ready**, likely requiring ops/seed retirement rather than business-flow replacement.

### Next evidence phase

`legacy-model-runtime-responsibility-classification-v1` must classify every remaining delegate/reference as one of:

- active business behavior;
- defensive deletion/retention behavior;
- operator/Production Smoke observation;
- seed/demo compatibility;
- historical/legacy compatibility;
- incidental type/text responsibility.

Only after that classification can `legacy-exam-model-disposition-v1` and `dormant-operational-model-disposition-v1` become schema-removal implementation-ready.

<!-- data-wave-b3-runtime-responsibility-v1 -->
## Data Wave B3 — runtime responsibility classification

B3 classified the actual Prisma operations behind the remaining B2 references. No new finding was promoted; the audit remains at 49 findings with 49/49 remediation coverage.

### Cross-model result

- none of the five models has a runtime write responsibility;
- each model has one script write only: destructive local seed `deleteMany()` compatibility;
- no target model is imported as a Prisma model type in tracked source;
- therefore schema retirement is blocked by semantic behavior and relation cleanup, not Prisma type coupling.

### `Exam`

- 7 delegate operations: 6 reads, 1 seed-only write.
- no active page behavior.
- one unresolved API read in `app/api/admin/vehicles/route.ts` using `db.exam.findMany()`.
- remaining reads are Production Smoke, demo cleanup, tenant maintenance and seed compatibility.
- 17 source files contain token-only `Exam` references but zero Prisma type-bound files.
- important distinction: the product/domain concept `Exam` is not equivalent to the legacy Prisma model.
- current disposition: **blocked only by API semantic classification plus coordinated ops/schema cleanup**.

### `ExamRegistration`

- 4 delegate operations: 3 reads, 1 seed-only write.
- zero active business behavior.
- zero defensive-delete behavior.
- remaining responsibility is Production Smoke, demo cleanup and seed compatibility.
- current disposition: **retirement candidate; no active business runtime blocker identified**.

### `LessonRequest`

- 10 delegate operations: 9 reads, 1 seed-only write.
- active page behavior exists in `app/instructor/page.tsx` and `app/student/page.tsx`, both using `lessonRequest.count()`.
- remaining operations are Smoke/demo/tenant-maintenance/seed compatibility.
- current disposition: **not removal-ready because active product/page behavior remains**.

### `Payment`

- 7 delegate operations: 6 reads, 1 seed-only write.
- zero active business flow identified.
- two runtime reads are defensive delete/retention checks in instructor and student record deletion.
- remaining responsibility is Smoke/demo/seed compatibility.
- current disposition: **retirement candidate after delete/retention semantics are decoupled from the legacy table**.

### `Notification`

- 3 delegate operations: 2 reads, 1 seed-only write.
- zero active business behavior.
- remaining responsibility is Production Smoke inspection/wrapper and destructive seed compatibility.
- current disposition: **retirement candidate; no active business runtime blocker identified**.

### Next phase

`legacy-model-blocker-semantic-closure-v1` must inspect only the remaining semantic blockers:

1. determine why the admin vehicles API reads `Exam` and whether the behavior is defensive/reference-integrity only;
2. determine what user-visible behavior the two `LessonRequest` page counts drive and whether that feature remains product-authoritative;
3. determine exactly what `Payment` protects during student/instructor deletion and define the replacement delete/retention contract;
4. confirm Production Smoke/seed/demo references can be removed mechanically with model retirement.

Do not start schema removal until these blocker semantics are closed.

<!-- data-wave-b4-blocker-semantics-v1 -->
## Data Wave B4 — blocker semantic closure

B4 inspected only the semantic blockers retained by B3. No new finding is promoted yet; the audit remains at 49 findings with 49/49 remediation coverage.

### `Exam`

- the admin vehicles GET computes real-time vehicle usage from current `Lesson` rows;
- its own comment states that lessons may represent exams through `lessonType = EXAM`;
- the additional `db.exam.findMany()` is explicitly labelled a legacy-table fallback for old data;
- both sources only contribute vehicle IDs used to derive `IN_USE` status;
- vehicle DELETE also retains a legacy relational guard through `vehicle._count.exams`;
- semantic disposition: **retirement-ready once the legacy status fallback and exam relation/delete guard are removed together with ops/scripts/schema references**;
- the product concept of an exam remains supported through the current Lesson model and must not be confused with retirement of the legacy `Exam` table.

### `ExamRegistration`

- B4 found no new product responsibility;
- remaining consumers are operational inspection, demo cleanup, destructive-local-seed compatibility and schema relations;
- disposition: **retirement-ready subject to coordinated mechanical/schema retirement and execution-time data guards**.

### `Notification`

- B4 found no product responsibility;
- remaining consumers are Production Smoke inspection/adapter, destructive-local-seed compatibility and schema relation cleanup;
- disposition: **retirement-ready subject to coordinated mechanical/schema retirement and execution-time data guards**.

### `LessonRequest` — B3 classification corrected

- instructor and student dashboards both execute `lessonRequest.count()` for PENDING rows;
- however, both Promise.all result arrays contain three values while their destructuring expressions retain only two;
- instructor order is scheduled Lesson count, completed Lesson count, pending LessonRequest count, but destructuring is `[completedLessonsThisMonth, pendingRequests]`; therefore the LessonRequest result is discarded and the names are shifted relative to the first two queries;
- student order is scheduled Lesson count, completed Lesson count, pending LessonRequest count, but destructuring is `[scheduledLessons, completedLessons]`; therefore the LessonRequest result is discarded;
- B3's `active-page-behavior` classification therefore does not prove authoritative LessonRequest product behavior;
- instructor JSX contains a `Pending Requests` label, so a final narrow data-flow inspection is required before either promoting a dashboard-statistics defect or declaring the model retirement-ready.

### `Payment`

- both remaining runtime reads are confirmed zero-dependency hard-delete guards;
- instructor deletion counts Payment rows linked to the User and passes the result into `evaluateInstructorRecordDeleteEligibility()`;
- student deletion counts Payment rows linked to the Student and passes the result into `evaluateStudentRecordDeleteEligibility()`;
- no Payment business transaction flow was found;
- disposition: **near retirement-ready**; inspect the two policy modules to prove the exact payment block condition/code and define its removal contract.

### Operational references

- Production Smoke only counts the target models and its Prisma adapter only exposes count delegates;
- demo cleanup uses dependency counts;
- tenant maintenance references only Exam/LessonRequest historical scope checks;
- destructive local seed only performs model cleanup deleteMany calls;
- these are mechanical retirement consumers, not independent business blockers.

### Final evidence required

`legacy-model-blocker-final-semantic-closure-v1` must inspect only:

1. instructor dashboard JSX/data flow for `completedLessonsThisMonth`, `pendingRequests` and the Pending Requests card;
2. student dashboard JSX/data flow for its stats tuple and confirmation that the third result is unused;
3. `instructor-record-delete-policy.ts` payment dependency behavior/block code;
4. `student-record-delete-policy.ts` payment dependency behavior/block code.

Do not repeat B1-B4 broad discovery.

<!-- data-wave-b41-final-semantics-ui-data-001-v1 -->
## Data Wave B4.1 — final semantic closure and UI-DATA-001

B4.1 completed the final targeted semantic inspection for the five zero-row legacy/dormant models and proved a new user-visible dashboard data-binding defect.

The audit is now at **50 confirmed findings with 50/50 remediation coverage**.

### `UI-DATA-001` — instructor dashboard statistics are misbound

- the instructor dashboard `Promise.all()` executes three queries in this order:
  1. scheduled Lesson count;
  2. completed Lesson count for the current month;
  3. pending LessonRequest count;
- the result is destructured as `[completedLessonsThisMonth, pendingRequests]`, retaining only the first two positions;
- therefore `completedLessonsThisMonth` receives the scheduled Lesson count;
- `pendingRequests` receives the completed-current-month Lesson count;
- the actual pending LessonRequest count is discarded;
- both misbound variables are rendered in visible dashboard cards;
- the `This Month / Lessons completed` card therefore displays the wrong metric;
- the `Pending Requests / Awaiting approval` card also displays the wrong metric;
- remediation slice: `dashboard-statistics-contract-alignment-v1`.

The student dashboard does not have the same visible binding defect: its two displayed bindings match the first two Lesson queries. Its third pending LessonRequest query is unused and has no Pending Requests card, making that query dead work rather than an active LessonRequest feature.

### Final model semantic disposition

`Exam`:
- retirement-ready at the semantic layer;
- remove the explicit legacy vehicle-status fallback;
- remove vehicle `_count.exams` deletion guard;
- remove instructor delete-policy `HAS_EXAMS` dependency;
- retire ops/demo/tenant-maintenance/seed/schema references together.

`ExamRegistration`:
- retirement-ready at the semantic layer;
- remove student delete-policy `HAS_EXAM_REGISTRATIONS` dependency;
- retire ops/demo/seed/schema references together.

`LessonRequest`:
- retirement-ready at the semantic layer;
- no runtime writer was found;
- the dashboard queries do not prove an active workflow: student result is discarded and instructor result is discarded while other tuple positions are rendered incorrectly;
- remove instructor/student delete-policy `HAS_LESSON_REQUESTS` dependencies;
- align/remove affected dashboard statistics through `dashboard-statistics-contract-alignment-v1`;
- retire ops/demo/tenant-maintenance/seed/schema references together.

`Payment`:
- retirement-ready at the semantic layer;
- remaining runtime responsibility is only zero-dependency hard-delete protection;
- instructor policy blocks on `counts.payments > 0` with `instructor_has_payments`;
- student policy blocks on `counts.payments > 0` with `student_has_payments`;
- remove counts, stable block codes and corresponding policy-test cases together with retirement;
- retire Smoke/demo/seed/schema references together.

`Notification`:
- retirement-ready at the semantic layer;
- no product/runtime business responsibility was found;
- retire Smoke/seed/schema references together.

### Safety boundary

- semantic retirement-ready does not authorize schema deletion;
- B1 zero-row evidence applies only to the observed configured remote Supabase target;
- execution requires target/environment guards, a new forward Prisma migration, validation and explicit human GO;
- never rewrite applied migration history.

### Next phase

`legacy-model-retirement-execution-contract-v1`

Prepare exact implementation-ready retirement scope, relation/drop ordering, expected files, tests, migration/rollback contract, target guards and validation for `legacy-exam-model-disposition-v1` and `dormant-operational-model-disposition-v1` without changing runtime/schema yet.

<!-- data-wave-b5-retirement-execution-contract-v1 -->
## Data Wave B5 — legacy model retirement execution contract

B5 converted the final B1-B4.1 semantic disposition into a staged execution contract. No new finding was promoted; the audit remains at 50 findings with 50/50 remediation coverage.

### Execution scope

- static coupling scan identified 20 candidate application/test/script files requiring review or change during runtime decoupling;
- targeted test scan identified at least 7 directly affected tests;
- the five target tables remain `exams`, `exam_registrations`, `lesson_requests`, `payments`, and `notifications`.

### Important B5 scanner correction

- the raw target-to-target graph reported cycles between Exam/ExamRegistration and ExamRegistration/Payment;
- those cycles are a scanner artefact because the graph treated Prisma inverse relation fields as if every reference represented a database foreign key;
- the actual historical DDL shows the physical target-to-target FK chain is `payments.examRegistrationId -> exam_registrations.id -> exams.id`;
- there is no physical `exams -> exam_registrations` FK and no physical `exam_registrations -> payments` FK;
- therefore the target tables do not form a SQL dependency cycle.

### Explicit Stage B drop order

Among the mutually related legacy tables:

1. `payments`;
2. `exam_registrations`;
3. `exams`.

`lesson_requests` and `notifications` are independent of that target-to-target chain. The final forward migration should use explicit relation/table operations rather than a blind generic CASCADE strategy.

### Stage A — runtime decoupling

Slice: `legacy-model-runtime-decoupling-v1`.

Goal:
- remove runtime/API/delete-policy/UI-helper/Smoke/demo/maintenance/seed dependencies on all five legacy models while leaving the Prisma models/tables present;
- update affected tests;
- remove dead LessonRequest dashboard work;
- coordinate with `dashboard-statistics-contract-alignment-v1` so instructor statistics are corrected without reviving LessonRequest as a product source of truth.

Validation:
- targeted policy/route/ops tests;
- canonical recursive Node24 `check`;
- deployed Preview/hosted read-only verification appropriate to the affected surfaces;
- prove deployed application no longer requires the five Prisma delegates before Stage B.

### Stage B — schema retirement

Slice: `legacy-model-schema-retirement-v1`.

Dependencies:
- `local-development-database-isolation-v1` completed before normal migration-authoring workflows;
- `dashboard-statistics-contract-alignment-v1` completed;
- `legacy-model-runtime-decoupling-v1` deployed and validated;
- explicit environment/database identity;
- all five target table counts re-proven equal to zero on the exact authorized target;
- explicit human GO before any remote schema write.

Action:
- remove Prisma inverse relations from surviving models;
- remove the five target Prisma models;
- create a new forward migration;
- apply explicit FK/table retirement in a dependency-safe order;
- never rewrite applied migration history.

Rollback:
- before Stage B, Stage A is conventionally reversible by reverting the application decoupling;
- after Stage B is applied, rollback must be a new forward recovery migration plus compatible application contract; never edit applied migration history.

### Migration workflow still to close

- application package lifecycles run `prisma generate`, but B5 did not prove a canonical in-package migration-deploy command;
- migration deployment appears operator/runbook-owned;
- existing `remote-operator-target-guard.ts` already owns expected DB host/name/Supabase-project identity and should be evaluated for reuse rather than inventing a second guard contract;
- next evidence phase: `legacy-model-migration-workflow-closure-v1`.

<!-- data-wave-b51-migration-workflow-db-migration-001-v1 -->
## Data Wave B5.1 — migration workflow closure and DB-MIGRATION-001

B5.1 proved the current migration deployment ownership and identified a missing purpose-scoped remote schema-write target gate.

The audit is now at **51 confirmed findings with 51/51 remediation coverage**.

### Migration deployment ownership

- `prisma migrate deploy` is not owned by GitLab CI, a tracked script or a package lifecycle;
- repository evidence found zero CI files, zero scripts and zero package files executing `migrate deploy`, while the command is intentionally documented across operator/runbook material;
- current release policy therefore treats remote migration deploy as an explicit human-operator operation;
- this is intentional and is not itself a defect;
- Vercel builds must remain repeatable and non-destructive;
- the Super Agent must never independently execute a remote/Production migration.

### `DB-MIGRATION-001` — no write-purpose target gate for remote migration deploy

- the canonical remote schema-write path ultimately invokes raw `prisma migrate deploy` after operator/environment verification;
- there is no dedicated executable fail-closed migration wrapper that proves the target identity before the remote schema write;
- this matters especially while `CONFIG-ENV-001` remains open;
- the existing `remote-operator-target-guard.ts` already proves host/database/Supabase-project identity and validates DIRECT_URL project/database consistency;
- however, its documented authorization contract is specifically inspect-only and must not silently become generic write authorization;
- remediation slice: `migration-deploy-target-safety-gate-v1`.

### Required remediation architecture

`migration-deploy-target-safety-gate-v1` should:

- preserve explicit human ownership of migration deployment;
- extract or reuse safe target-identity parsing/comparison primitives rather than duplicate them;
- keep operation authorization purpose-scoped;
- require explicit expected DB host, DB name and Supabase project identity;
- verify DATABASE_URL and DIRECT_URL target compatibility;
- show only safe/redacted target identity;
- fail closed before Prisma receives authority to perform a remote schema write;
- require an explicit human GO after preflight;
- never create an unattended Production migration path.

### Existing guard boundary

- the existing guard's comments state that it authorizes only application-level inspect-only operator tooling;
- current callers already span inspection plus reconciliation/repair tooling, reinforcing the need to separate target identity validation from operation-purpose authorization;
- do not weaken the existing local-only destructive-seed boundary.

### Migration authoring remains open

- B5.1 proved deployment ownership but did not prove a single canonical migration-authoring workflow;
- `migrate dev` references are primarily prohibitions against Production use rather than an implementation-ready authoring recipe;
- do not invent the authoring contract from convention;
- `local-development-database-isolation-v1` remains a prerequisite to normal local migration-authoring workflows.

### Next evidence phase

`legacy-model-migration-authoring-contract-v1`

Close only the migration-authoring/test workflow needed for Stage B: safe development target, creation strategy, generated SQL review, migration test strategy and handoff into the human-operated deploy path. No DB/schema mutation.

<!-- data-wave-b52-authoring-and-data-wave-b-closure-v1 -->
## Data Wave B5.2 — migration authoring contract and Wave B closure

B5.2 closed the final migration-authoring evidence gap for the legacy-model retirement plan. No new finding was promoted. The audit remains at **51 confirmed findings with 51/51 remediation coverage**.

### Current authoring capability

- Prisma configuration declares schema, migration path and seed but no shadow database;
- the datasource uses DATABASE_URL and DIRECT_URL;
- repository evidence contains zero `migrate dev --create-only` references;
- zero `migrate diff` references;
- zero `db push` references;
- zero tracked Supabase-local workflow;
- zero tracked Docker Compose development database workflow;
- zero TEST_DATABASE_URL / INTEGRATION_DATABASE_URL-style contract;
- zero shadow-database contract.

### Interpretation

- DAT does not currently provide an implementation-ready isolated migration-authoring environment;
- this is not promoted as a separate finding because its safety responsibility is already covered by CONFIG-ENV-001 / `local-development-database-isolation-v1` and its real-database validation responsibility is covered by TEST-ARCH-001 / `database-integration-test-harness-v1`;
- DB-MIGRATION-001 separately owns the remote migration-write target gate;
- creating another overlapping finding/safety mechanism would duplicate ownership.

### Future migration authoring contract

After `local-development-database-isolation-v1` and the database integration harness exist:

1. use an explicit disposable non-Production Postgres-compatible target;
2. create only a new forward migration; never modify applied migration history;
3. generate or author migration SQL against the isolated target;
4. review the complete generated SQL before commit;
5. permit deliberate SQL editing where the migration contract requires explicit FK/table ordering or security semantics;
6. exercise the complete migration history plus new migration against a disposable database;
7. run Prisma generate plus targeted tests and canonical recursive Node24 check;
8. commit the reviewed migration;
9. hand remote deployment to the separately human-operated, purpose-gated migration-deploy workflow.

Production `migrate dev`, Production `db push`, ad-hoc DROP/reset and automatic migration application remain forbidden.

### Migration style evidence

- 29 tracked migration SQL files;
- 9 contain CREATE TABLE;
- 19 contain ALTER TABLE without CREATE TABLE;
- 8 include policy/RLS/security SQL;
- 21 are comment-heavy;
- the repository therefore has a mixed migration history where explicit SQL review is appropriate rather than treating migration output as an opaque generated artifact.

### Migration-test evidence

- only one tracked test file contains migration/schema-artifact signals;
- no disposable real-Postgres migration application harness was identified;
- real database migration validation belongs in `database-integration-test-harness-v1` rather than a new overlapping test system.

### Data Wave B final disposition

- five target models were proven zero-row on the observed authorized remote target;
- runtime/domain/policy/ops responsibilities are semantically classified;
- Exam, ExamRegistration, LessonRequest, Payment and Notification are retirement-ready at the semantic layer;
- runtime decoupling and schema retirement are explicitly separated;
- physical target FK ordering is known;
- deployment ownership is known;
- remote migration target-safety deficiency is mapped to DB-MIGRATION-001;
- safe authoring prerequisites are mapped to existing findings/slices;
- Data Wave B requires no further discovery before implementation planning/execution in DAT_4.4.

### Next DAT_4.3 phase

`audit-surface-completeness-reconciliation-v1`

Remain analysis-only. Reconcile all 51 findings and additional slices against the audited repository surfaces, identify which are already implementation-ready versus which still need evidence/disposition work, and select the next unresolved audit frontier. Do not implement findings merely because Data Wave B is closed.
