<!-- super-agent-continuity-state-v1 -->
# Super Agent Continuity State

**Purpose:** conversation-independent DAT knowledge continuity and operational recovery.

**Snapshot date:** 2026-08-06

**Validity rule:** this snapshot is valid at the Git commit containing it. Resolve live branch and HEAD through Git; do not treat historical SHA values as eternal current state.

## Recovery Startup Procedure

Run read-only commands first:

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git rev-parse refs/remotes/origin/main
git log --oneline --decorate -12
```

Then read, in this order:

1. `.cursor/rules/architect-mode.mdc`
2. `docs/ops/super-agent-continuity-state.md`
3. `docs/architecture/current-state.md`
4. `docs/architecture/roadmap-todo.md`
5. `docs/architecture/engineering-excellence-audit-v1.md`
6. applicable decisions, system design, reviewer workflow, operating model, and runbooks

Stop before consequential work if Git state or canonical documents disagree.

## Current verified repository state

- Active branch at snapshot creation: `engineering-excellence-audit-v1`
- Previous continuity checkpoint: `e7646076183764990a265391ed01284d7008f9a7`
- `origin/main` baseline: `da5aea6fe4150e86d5bf568bb56b26dd53f7abeb`
- Branch purpose: P1 analysis-only engineering-excellence audit
- Branch publication: not pushed at snapshot creation
- Runtime/schema/data changes in audit branch: none
- Hosted/database/production writes in audit branch: none

## Runtime baseline

- Runtime migration application merge: `909b69a559d85ec6d5f319c75e0d6c04bf790da1`
- Runtime closure record: `a3970549da93108522e8805e3c4bd8923a059afb`
- Main after closure integration: `da5aea6fe4150e86d5bf568bb56b26dd53f7abeb`
- Required runtime: Node `24.x`
- Verified portable Node: `$HOME/.dat-toolchains/node-v24.18.0-win-x64/node.exe`
- Canonical validation: `pnpm -C driving_school_platform/nextjs_space check`

## Super Agent role

- Repository-aware DAT operational worker
- Investigates code and call paths
- Prepares guarded commands
- Maintains canonical documentation and continuity
- Proposes smallest-safe slices
- Does not autonomously approve push, merge, deletion, hosted mutation, database mutation, production mutation, destructive work, or behavioural scope expansion

## Governance status

| ID | Status | Summary |
| --- | --- | --- |
| `SA-GOV-001` | Confirmed and fixed | Semantic gates prove exact propositions and distinguish context, negation, history, and untracked evidence |
| `SA-GOV-002` | APTO | Authority hierarchy and conflict precedence are explicit |
| `SA-GOV-003` | APTO | Canonical Merge readiness criteria are the operational Definition of Done |
| `SA-GOV-004` | Confirmed and fixed | Proportional multidimensional Engineering Quality Review is mandatory |

<!-- ui-struct-001-people-manager-orchestration-concentration -->
<!-- a11y-001-people-search-accessible-names -->
<!-- a11y-002-people-badge-help-touch-discoverability -->
<!-- api-dup-001-config-route-skeleton-duplication -->
<!-- api-struct-001-vehicle-route-domain-concentration -->
<!-- small-typed-helpers-over-generic-route-factories-v1 -->
<!-- api-dup-002-local-super-admin-tenant-helper-duplication -->
<!-- domain-modular-design-and-thin-route-adapters-v1 -->
<!-- ui-struct-002-schedule-map-view-orchestration -->
<!-- ui-struct-003-lesson-form-orchestration-concentration -->
<!-- a11y-003-lesson-form-control-associations -->
<!-- lesson-form-client-server-policy-classification-v1 -->
## Confirmed code findings

| ID | Status | Summary |
| --- | --- | --- |
| `UI-ORCH-001` | Confirmed; not implemented | Student edit can commit Student before linked User update fails |
| `API-ATOM-001` | Confirmed; not implemented | Generic user update commits User before Student/Instructor role-specific update |
| `UI-ORCH-002` | Confirmed; not implemented | Instructor profile/licence and qualified-category updates are separate writes |
| `UI-STRUCT-001` | Confirmed; deferred | People managers concentrate multiple workflows and local reconciliation states without direct component tests |
| `A11Y-001` | Confirmed; not implemented | People search controls lack complete programmatic accessible names |
| `A11Y-002` | Confirmed; not implemented | Detailed People badge help remains tooltip-dependent and is not touch-discoverable |
| `API-DUP-001` | Confirmed; not implemented | Settings and Feature Flags duplicate a substantial route skeleton |
| `API-STRUCT-001` | Confirmed; not implemented | Vehicles route combines transport, access, validation, projection, business rules, and persistence |
| `API-DUP-002` | Confirmed; not implemented | SUPER_ADMIN, organization, tenant-host, and actor-context resolution is repeated across administrative routes |
| `UI-STRUCT-002` | Confirmed; not implemented | Schedule Map Month/Week duplication and residual orchestration concentration |
| `UI-STRUCT-003` | Confirmed; not implemented | LessonForm coordinates option data, state, policies, validation, payload composition, and all visual sections |
| `A11Y-003` | Confirmed; not implemented | LessonForm Select, Student search, and icon-only clear controls have incomplete accessible names or associations |

## Approved implementation direction

1. `student-profile-atomic-update-v1`
   - aggregate-specific transactional service;
   - existing `PATCH /api/admin/students/[id]` contract;
   - Student plus linked User all-or-nothing;
   - preserve authorization, tenant, demo, email, DTO, error, and audit contracts.

2. `instructor-profile-atomic-update-v1`
   - aggregate-specific transactional service;
   - existing `PATCH /api/admin/instructors/[id]` contract;
   - User profile, instructor licence, and qualified categories all-or-nothing;
   - preserve authorization, tenant, demo, email, DTO, error, and audit contracts.

3. `generic-user-update-contract-narrowing-v1`
   - execute only after Student and Instructor callers migrate;
   - remove aggregate-specific Student/Instructor responsibilities;
   - preserve any legitimate generic-user callers.

No implementation belongs in the current analysis branch.

## Required future regression evidence

- all-or-nothing behavior under injected second-write failure;
- tenant and role rejection;
- public-demo mutation rejection;
- unchanged dedicated email flows;
- audit behavior preserved or explicitly approved;
- Student-only/manual-record updates remain valid;
- instructor category and licence validation;
- client success and server failure behavior;
- no stale overlays or misleading complete-success messages;
- canonical Node 24 validation.

## Deferred structural To-Do

- Execute only after the three approved atomicity and generic-contract slices.
- Evaluate Student and Instructor orchestration separately.
- Add direct regression coverage around the remaining orchestration.
- Do not create a generic shared People manager from the current evidence.
- Accessibility findings `A11Y-001` and `A11Y-002` are confirmed.
- Future slices: `people-search-accessible-names-v1` and `people-badge-help-accessibility-v1`.
- Performance review produced no finding; do not reopen without measured evidence.

## Modular design rule

- Organize production code by domain or capability.
- Keep HTTP routes as thin adapters.
- Use small typed modules for proven cross-cutting mechanics.
- Preserve domain-specific services, guards, schemas, DTOs, persistence, and audit behavior.
- Avoid generic route frameworks, service locators, callback-heavy builders, and unbounded shared-utils modules.

## Administrative route follow-up

- `admin-route-context-helper-v1`: introduce `lib/admin/admin-route-access.ts` with a canonical typed `requireSuperAdminTenantContext` helper and migrate routes incrementally without changing endpoint contracts.

- `admin-config-route-helpers-v1`: small typed common helpers; no generic CRUD factory.
- `vehicle-route-domain-services-v1`: typed validation and focused Vehicle domain helpers/services.
- Preserve domain-specific schemas, DTOs, persistence, responses, and audit payloads.
- Configuration-history logging remains best-effort.
- Inspect repeated local `requireSuperAdminTenant` implementations before approving a broader shared helper.

## Schedule Map follow-up

- `schedule-map-wide-grid-components-v1`: shared focused Month/Week grid plus reusable lesson details and actions.
- `schedule-map-data-orchestration-v1`: evaluate focused lesson-loading, instructor-filter, refresh, and interaction-state boundaries.
- Month and Week remain explicit modes of one wide-grid family.
- Day timeline remains separate.
- Preserve all existing Schedule Map helper modules and tests.
- Do not create a generic calendar framework.
- Keep `LD-008` as a separate existing DTO item.

## LessonForm follow-up

- `lesson-form-policy-module-v1`: pure typed UI policy and payload helpers.
- `lesson-form-option-data-hook-v1`: instructor, Student, and Vehicle option loading and parsing.
- `lesson-form-sections-v1`: explicit participant, vehicle, schedule, and status sections after policy/data stabilization.
- Preserve create/update request builders, `useEditLessonForm`, response parsers, server services, styles, and Student option mapping.
- LessonForm remains the composition root.
- Server validation remains authoritative.
- Do not create a generic form framework or add dependencies solely for this work.

## LessonForm accessibility and policy follow-up

- `lesson-form-accessible-controls-v1`: correct Select, Student search, and clear-action accessible associations.
- Preserve correct date/time and Student-checkbox associations.
- No broad client/server policy-duplication finding.
- Move the hard-coded practical-exam limit into the typed policy boundary already planned by `lesson-form-policy-module-v1`.
- Server validation remains authoritative.
- Confirm the EXAM/THEORY_EXAM edit participant contract before classifying another finding.

## Preserved unrelated branch

- Branch: `production-smoke-module-structure-audit-record-v1`
- Commit: `a4bea9dfcfb3407acd952c9a383e1fdf2c4d0e60`
- State: inspected only
- Do not merge, cherry-pick, copy, delete, or modify until separately justified.

## Current next action

Continue the engineering-excellence audit read-only by confirming the EXAM/THEORY_EXAM edit participant contract across LessonForm, EditLessonDialog, useEditLessonForm, and the update request builder. Preserve server authority and all existing form modules. No runtime implementation is authorized in the audit branch.

## Continuity update obligation

After every material phase, update this file and all affected canonical documents in the same checkpoint, then perform the Recovery Reconstruction Drill.

## Recovery Reconstruction Drill

A fresh SA session must be able to state from committed repository evidence:

- active branch and purpose;
- current main and runtime baseline;
- all confirmed findings and their statuses;
- approved implementation order;
- prohibited actions;
- exact next step;
- canonical validation command;
- relevant recovery and rollback expectations.
