# Engineering Excellence Audit v1

## Status

- **Slice:** `engineering-excellence-audit-v1`
- **Priority:** P1 — engineering excellence
- **Mode:** analysis-only
- **Entry baseline:** `da5aea6fe4150e86d5bf568bb56b26dd53f7abeb`
- **Started:** 2026-08-06
- **Current phase:** normalized inventory complete; Super Agent rulebook governance audit in progress
- **Confirmed findings:** 1 governance finding (`SA-GOV-001`); no code maintainability findings yet
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
- Current audit/main baseline: `da5aea6`.
- Local validation passed 207 test files, 1738 tests, and the production build.
- GitLab and Vercel gates passed.
- Production fixture preflight, API verification, and four read-only UI smoke tests passed.
- Mutation smoke was not repeated because the slice was runtime/configuration-only and prior mutation evidence remained valid.
- Node 24 migration and closure branches were removed locally and remotely after verified integration.

The audit must not change this baseline or introduce dependency/runtime upgrades. Any future runtime change requires a separate explicitly authorized slice.

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

The normalized inventory phase is complete. Several modules are large enough to justify deeper inspection, but **no maintainability defect, extraction target, file move, or implementation slice is confirmed yet**.

The next phase must map responsibilities, imports, exported symbols, call paths, tests, and duplication for the four workstreams before assigning severity or recommending slices.

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

### Remaining rulebook validation queue

| ID | Aspect | Current status |
| --- | --- | --- |
| `SA-GOV-002` | Authority hierarchy and instruction-conflict precedence | Needs cross-document confirmation |
| `SA-GOV-003` | Explicit operational Definition of Done | Needs cross-document confirmation |
| `SA-GOV-004` | Multidimensional engineering quality review | Needs cross-document confirmation |

Absence from `architect-mode.mdc` alone is not sufficient to classify these as system-wide gaps. The next read-only phase must inspect `cursor-operating-model.md`, `reviewer-workflow.md`, `system-design.md`, and `command-batteries.md` before confirming or dismissing them.
