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
- Canonical validation target: `pnpm -C driving_school_platform/nextjs_space check`.
- Local Windows/Git Bash execution rule: bare `pnpm` currently routes through Volta/Node `v20.20.0`. An explicitly Node-24-launched outer pnpm is also insufficient by itself because nested bare pnpm can fall back to Volta. Full local Node-24 evidence must prove transitive provenance for direct and nested pnpm execution using the guarded routing procedure recorded in the Super Agent rulebook.

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

<!-- dat-toolchain-rationalization-v1 -->
## Toolchain rationalization queue

- Confirmed: `TOOLCHAIN-001` — stale project Volta Node `20.20.0` conflicts with canonical Node `24.x`.
- Queued: `toolchain-volta-decoupling-v1`.
- Queued: `toolchain-local-runtime-standardization-v1` — must establish durable transitive Node-24 provenance for outer and nested pnpm execution without retaining a machine-specific temporary shim as the permanent design.
- Queued/evidence-first: `toolchain-e2e-runtime-provenance-v1` — explicitly prove the runtime used by Playwright `pnpm dev` web-server subprocesses because nested bare-pnpm fallback to Volta Node 20 is now confirmed as a real execution mode.
- Queued/evidence-first: `toolchain-unused-dev-dependencies-v1`.
- Vitest and Playwright remain intentionally separate test layers.
- `tsx` remains active.
- npm/npx are not authoritative DAT package-management workflows.
- Corepack remains justified in CI pending any future design decision.
- The EXAM edit-participant frontier is closed as `UI-CONTRACT-001`; the audit has moved to full-snapshot cross-domain evidence and targeted follow-up of unresolved signals.

<!-- lesson-edit-contract-finding-v1 -->
## EXAM edit-participant checkpoint

- Confirmed finding: `UI-CONTRACT-001`.
- Audit total before full-snapshot pass: 16 confirmed findings = 2 governance + 13 code + 1 toolchain/configuration.
- Proven mismatch: EXAM/THEORY_EXAM edit submits `studentIds`, while the update builder/PUT/service support only singular `studentId`.
- Proven mismatch: edit exposes `lessonType`, while the update builder/PUT/service do not persist it.
- `selectedStudents` is not initialized from the existing exam Lesson participant.
- Current persistence/update unit is one Lesson row; no grouped-exam update path was found.
- Queued slice: `lesson-edit-contract-alignment-v1`.
- Super Agent may prepare the slice after GO; no audit-branch implementation is authorized.

<!-- exhaustive-snapshot-audit-5eded00-v1 -->
## Full-project snapshot audit checkpoint

- Snapshot HEAD: `5eded00ae3d0dedde8b1a251d393a9180911814b`.
- Safe snapshot: 817 files; SHA-256 `9e61686d43458901c798d06ef8ba501d310aa2ea6c6a0c5ba7315bf71957a043`.
- First-pass total: 27 confirmed findings = 2 governance + 23 code/runtime/security/architecture + 2 toolchain/configuration.
- New P0: `BILLING-SEC-001` → `billing-webhook-authenticity-gate-v1`.
- New P1: `LICENSING-001` → `provider-owned-entitlement-mutation-boundary-v1`.
- New P1: `AUTH-RATE-001` → `nextauth-credentials-rate-limit-alignment-v1`.
- New P1: `API-ATOM-002` → `user-create-atomicity-v1`.
- New P1: `ONBOARD-001` → `instructor-direct-create-activation-contract-v1`.
- New P2: `AUTHZ-OPERATOR-001` → existing `platform-settings-and-feature-flags-boundary-v1`.
- New P2: `AUTH-LEGACY-001` → `legacy-login-endpoint-retirement-v1`.
- New P2: `CODE-HYGIENE-001` → `unused-ui-scaffold-pruning-v1`.
- New P2: `UI-DUP-001` → `role-aware-booking-dialog-consolidation-v1`.
- New P2/data-sensitive: `SCHEMA-LEGACY-001` → `legacy-exam-model-disposition-v1`.
- New toolchain P2/P3: `TOOLCHAIN-002` → `toolchain-next-env-alignment-v1`.
- Existing `toolchain-unused-dev-dependencies-v1` gains `@next/swc-wasm-nodejs` alongside `ts-node` as an evidence-first candidate.
- Unpromoted signals remain investigation-only, including billing projection failure/idempotency, additional duplication candidates, broad zero-reference packages, and Node type-package alignment.
- No implementation, package, schema, data, hosted, billing, or production mutation is authorized by this checkpoint.

<!-- exhaustive-snapshot-audit-5eded00-v2 -->
## Exhaustive static audit completion checkpoint

- Snapshot HEAD remains `5eded00ae3d0dedde8b1a251d393a9180911814b`.
- Safe snapshot remains 817 files / SHA-256 `9e61686d43458901c798d06ef8ba501d310aa2ea6c6a0c5ba7315bf71957a043`.
- Static-snapshot total before hosted Wave A1: 46 confirmed findings = 2 governance + 40 code/runtime/security/architecture/test + 4 toolchain/configuration/dependency-security.
- Second pass adds 19 confirmed findings.
- Highest implementation priorities are security/commercial containment: billing authenticity, billing idempotency, JWT revocation and Next security containment.
- Next priority tier includes entitlement authority, license-key security, login-rate alignment, trusted security-link origin, privileged password policy, API-error sanitization and CSV export hardening.
- Integrity/onboarding then follows with User/profile atomicity, Platform onboarding transaction boundary and Instructor activation contract.
- Test architecture is strengthened with real-Postgres integration and a deterministic critical E2E CI gate.
- Cleanup thereafter removes orphan scaffold/dependencies and consolidates stable repeated primitives instead of preserving redundant implementations.
- The 25 zero-inbound UI components are removal candidates after notification-stack migration and a repeated exact reference scan.
- Dormant/legacy data models remain read-only disposition work until target-environment evidence exists.
- All remaining static signals have a disposition: finding, named slice or documented false positive.
- No stage, commit, code/package/schema/data/billing/hosted/production mutation is authorized by this synchronization.

<!-- exhaustive-audit-master-remediation-ledger-v1 -->
## Master 48-finding queue coverage

- Roadmap coverage: **48/48 confirmed findings mapped**.
- One previously deferred structural finding now has an explicit name: `UI-STRUCT-001` → `people-manager-orchestration-seams-v1`.
- Additional non-finding evidence/cleanup slices remain explicitly listed and do not inflate the finding count.
- Security containment remains first; test prerequisites and dependency order are explicit in the roadmap execution waves.
- SA and roadmap must be updated together whenever a finding changes status or a slice is split/merged.

<!-- hosted-security-wave-a1-headers-v1 -->
## Hosted security Wave A1 checkpoint

- Audit HEAD at probe: `2925f17813300821a4a5aa9c575ba1bea683d938`.
- Current total: 47 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 4 toolchain/configuration/dependency-security.
- HTTPS 308 redirect and HSTS `max-age=63072000` are present on both public hosts.
- Anonymous GET to tenant license/features, settings and feature-flags APIs returns 401.
- Billing webhook route is deployed on both tenant and Platform public hosts; GET returns 405 and no mutation probe was performed.
- `SEC-HEADERS-001` confirmed: measured responses lack CSP/anti-framing, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- `security-response-headers-verification-v1` is complete and promoted to `security-response-headers-hardening-v1`.
- Roadmap/SA coverage is now 47/47.

<!-- security-wave-a2-dependency-audit-v1 -->
## Security dependency Wave A2 checkpoint

- Audit HEAD during A2/A2.1: `335528ffead00ac9d77c84a889f8a4729629c1d3`.
- Current total: 48 confirmed findings = 2 governance + 41 code/runtime/security/architecture/test + 5 toolchain/configuration/dependency-security.
- pnpm audit inventory: 81 unique advisories overall; 61 production; 32 development.
- `DEP-SEC-001` refined: `next-security-patch-containment-v1` retains immediate 14.2.35-level containment; `next-supported-lts-migration-v1` remains a separate supported-LTS migration.
- New `DEP-SEC-002`: no continuous dependency-security/advisory-drift CI control; maps to promoted `dependency-security-monitoring-v1`.
- NextAuth current advisories are version-matched but current Credentials-only/no-getToken path evidence does not establish exploitability.
- nine direct-prod zero-importer roots are queued for exact responsibility proof under `direct-dependency-responsibility-pruning-v1`.
- A2/A2.1 performed no install, audit-fix, package, lockfile, code, database, hosted or production mutation.
- Roadmap/SA master coverage is now 48/48.

<!-- security-wave-a3-hosted-auth-v1 -->
## Security hosted-auth Wave A3 checkpoint

- Audit HEAD during A3.1/A3.2: `9696552b98f77f4bea8d846e4b9fa69c801b86e1`.
- Finding total remains 48 and roadmap/SA coverage remains 48/48.
- A3.1 authoritative cookie evidence: Secure + HttpOnly + SameSite=Lax + Path=/ + host-only on tenant and Platform.
- authoritative hosted login page is `/auth/login` on both hosts.
- A3.2 session cache evidence: repeated anonymous and dummy-cookie requests remained Vercel MISS with age=0 and no ETag.
- login page caching is public-page behavior and is not promoted as a finding.
- `AUTH-SESSION-001` remains unresolved because JWT revocation is independent of cookie/cache transport properties.
- initial awk-based A3 attempt is explicitly non-authoritative; A3.1/A3.2 are the valid evidence.
- no credential, login mutation, real-session cookie output, database or hosted mutation occurred.

<!-- security-wave-a4-commercial-evidence-v1 -->
## Security commercial Wave A4 checkpoint

- Audit HEAD during A4: `6fd33024cd2bccc1e4b6db0209137d8519014139`.
- finding total remains 48; roadmap/SA coverage remains 48/48.
- five commercial/admin route surfaces were inventoried.
- billing webhook is POST-only, deployed on both public hosts and contains zero detected authenticity-verification signals in the route.
- license/features, settings and feature-flags return anonymous 401 on tenant and Platform hosts.
- no anonymous commercial 200 surface was discovered.
- `BILLING-SEC-001`, `BILLING-SEC-002`, `LICENSING-001`, `LICENSING-002` and `AUTHZ-OPERATOR-001` all remain open according to their existing contracts.
- A4 creates no new finding.
- Security Wave A1-A4 is complete.
- next phase: Wave B read-only data disposition for legacy/dormant operational models.
- no commercial mutation, database operation or hosted configuration change occurred.

<!-- data-wave-b1-legacy-dormant-inventory-v1 -->
## Data Wave B1 checkpoint

- Audit HEAD during B1: `2fb2cf407bb720f871e3c5894bde78548fe1f3ec`.
- finding total remains 48; roadmap/SA coverage remains 48/48.
- remote Supabase target guard passed and PostgreSQL reported `transaction_read_only=on`.
- current target row counts: Exam 0; ExamRegistration 0; LessonRequest 0; Payment 0; Notification 0.
- one Organization row exists in the observed target.
- `SCHEMA-LEGACY-001` and `SCHEMA-LEGACY-002` remain findings, now with zero-data evidence for this target.
- next evidence slice: `environment-configuration-responsibility-audit-v1`.
- no database or repository mutation occurred.

<!-- environment-configuration-responsibility-audit-v1 -->
## Environment configuration E1-E4 checkpoint

- Audit HEAD during E1-E4: `ccb11b7739fa5f89af6a54241bc347521490f8cf`.
- Finding total moves 48 → 49; roadmap/SA coverage becomes 49/49.
- new finding: `CONFIG-ENV-001`.
- remediation: `local-development-database-isolation-v1`.
- automatic local DATABASE_URL/DIRECT_URL resolve from app `.env` and match the Production operator database identity.
- no app-local DATABASE_URL override exists.
- current predev/env-check lifecycle does not contain an explicit Production-target identity guard.
- operator profile: 23 keys; smoke profile: 15 keys; overlap 0; combined coverage 95% of real local keys.
- eight of ten duplicated local keys currently agree; URL differences are intentional local-loopback overrides.
- follow-up cleanup slices: `environment-configuration-contract-consolidation-v1`, `public-env-pruning-v1`.
- corrected direct-runtime env candidate count is 12 because one E4 result was a nested documentation file.
- no env value or secret was persisted in audit evidence.

<!-- environment-configuration-disposition-e5-e7-v1 -->
## Environment E5-E7 disposition checkpoint

- Audit HEAD during E5-E7: `da8a1ce159232a09ea34e6a15a449f25fc847984`.
- findings remain 49; roadmap coverage remains 49/49.
- NextAuth 4.24.11 source proves canonical precedence `NEXTAUTH_SECRET ?? AUTH_SECRET`.
- operator profile contains both aliases with equal values.
- KEEP: NEXTAUTH_SECRET, NEXTAUTH_URL.
- REMOVE/CONSOLIDATE: AUTH_SECRET.
- REMOVE: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, LICENSE_TIER.
- DEFER external ownership: VERCEL_OIDC_TOKEN.
- new cleanup slices: `auth-secret-alias-consolidation-v1`, `supabase-environment-contract-retirement-v1`, `legacy-environment-key-pruning-v1`.
- existing cleanup slices retained: `public-env-pruning-v1`, `environment-configuration-contract-consolidation-v1`.
- environment discovery/disposition is complete enough for implementation planning; hosted deletions remain explicit execution-time gates.
