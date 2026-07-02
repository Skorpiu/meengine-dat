# Audit log tenant context foundation — plan (v1)

**Batch:** `audit-log-tenant-context-foundation-plan-v1` (docs-only)  
**Status:** Planning / foundation only (no runtime, no schema, no migrations)  
**Decision:** [DEC-044](./decision-log.md)  
**Related:** [production-readiness-cutline.md](./production-readiness-cutline.md) (DEC-032), [first-client-onboarding-record.md](./first-client-onboarding-record.md) (DEC-043), [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)

---

## Purpose

DAT is moving from “technical smoke readiness” to **controlled first B2B production** (DEC-032). Before implementing runtime audit logging, we need a **tenant-aware foundation**:

- define **what** to audit (event candidates + MVP scope),
- define **where** and **how** to store events,
- define **tenant scoping** rules (no cross-tenant leakage),
- define **actor** and request attribution,
- define **payload minimization** and redaction fences,
- define a **small-slice implementation plan** that keeps risk low.

This plan intentionally avoids:

- Prisma schema changes / migrations,
- auth/RLS changes,
- new APIs or UI,
- billing changes,
- changes to smoke mutation flows.

---

## Current state (evidence)

### Existing table/model

- Prisma model exists: `model AuditLog { … @@map("audit_logs") }`.
- Fields today are user- and request-centric (`userId`, `userEmail`, `userRole`, `action`, `entityType`, `entityId`, `oldValues`, `newValues`, `ipAddress`, `userAgent`, `requestMethod`, `requestPath`, `status`, `errorMessage`, `createdAt`).
- **No `organizationId` column today** (tenant scoping cannot be enforced by column filtering).
- There are **no application write paths** to `audit_logs` (grep finds only seed/reset usages; runtime handlers do not `create` audit logs).

### Security posture

- `audit_logs` is treated as **sensitive/internal** (Class-B hardening): RLS enabled + `REVOKE ALL FROM anon, authenticated` in `20260603120000_supabase_rls_class_b_hardening_v1`.
- DAT remains **Prisma-primary**; Data API client access is blocked by default posture and REVOKEs.

**Implication:** runtime audit logging is currently a **gap**, but the table is already hardened to avoid accidental Data API exposure.

---

## Principles (durable)

### Attribution and accountability

- **Every operational mutation should be attributable** to a specific actor (user or system).
- Every audit event must be **tenant-scoped** when the mutation is tenant-scoped.
- Platform-level actions must be **explicitly platform-scoped** (not “missing tenant by accident”).

### Tenant isolation

- Never trust `organizationId` from request body or query.
- Tenant scope must come from **authenticated session** + **host guard** (DAT baseline rule).
- Audit event retrieval must never allow **cross-tenant reads** for tenant surfaces.

### Data minimization / safety fences

- Audit events are **append-only** (no updates/deletes via product runtime).
- Payload must be **minimal** and **redacted**:
  - no `passwordHash`, no raw tokens, no provider secrets,
  - avoid sensitive PII in `old/new` values when a stable key is sufficient,
  - store *identifiers* and *small diffs*, not full row snapshots.
- Avoid logging high-volume noise; prefer meaningful, user-visible mutations.

### Operational split (demo/smoke vs real client)

- Demo/smoke tenants must not contaminate “first real client” audit evidence.
- Demo orgs remain blocked for sensitive mutations via demo guards; audit logging should:
  - record demo mutations only if explicitly needed for ops/debug,
  - keep demo events easily filterable by tenant scope + environment markers (see model notes).

---

## Target model (proposed; not implemented in this batch)

**Decision driver:** `AuditLog` today lacks tenant scope and mixes “request traces” with “domain events”.

### Option A (recommended): evolve `audit_logs` into tenant-aware `AuditEvent`

Evolve the existing `audit_logs` table into an explicit audit event record:

- `id` (cuid/uuid)
- `organizationId` **nullable** (nullable = platform-scoped only)
- `actorUserId` nullable (system/batch)
- `actorRole` nullable (snapshot at time of action)
- `action` (stable enum-like string, e.g. `student.create`, `invitation.revoke`)
- `entityType` (stable type string)
- `entityId` nullable
- `targetUserId` nullable (when an action targets a user account)
- `metadata` JSON (redacted, minimal; never secrets)
- `requestId` nullable (correlation; stable string)
- `ipAddress`, `userAgent` nullable (optional; consider privacy + necessity)
- `createdAt`

**Why keep nullable `organizationId`:** platform events exist (org creation, license changes) and must be distinguished as **platform-scoped**. Tenant-null must be deliberate and rare.

### Option B (deferred): keep `audit_logs` as request-trace, add a new `audit_events`

This splits “trace logs” from “domain audit events” but requires a new table + schema work. Prefer Option A to keep the smallest surface area unless volume/retention demands otherwise.

---

## Event candidates (map + MVP)

### High value (MVP / first real client)

Tenant-scoped (must carry `organizationId`):

- Invitations:
  - create, revoke, change email, accept (accept may be public route but must resolve tenant)
- People:
  - student create/update/delete, app access remove/reactivate, change email
  - instructor create/update/deactivate/reactivate, change email
  - instructor qualified categories update (DEC-042)
- Lessons:
  - create/update/delete (including practical-number reassignment)
- Vehicles:
  - update status, update maintenance, create/update (if product supports)

Platform-scoped (explicitly `organizationId = null`):

- platform organization onboarding actions (`/platform/organizations`)
- license/entitlements changes (operator/internal)

### Lower priority / later

- demo sandbox reset / cleanup scripts (system events)
- import apply events (students/practical lessons) — may be volume-heavy; log summary only
- settings/feature flags/config history writes (operator-only; already have `configuration_history` table)
- read-only events (normally do not audit reads)

---

## Implementation plan (future slices; not this batch)

### Slice 0 (this batch): docs-only foundation (DONE by this document)

- Agree model direction (Option A recommended).
- Define stable action taxonomy.
- Define redaction fences and “never log” list.

### Slice 1 (P2, gated): add tenant scope to audit storage (schema + migration)

- Add `organizationId` to `audit_logs` (nullable).
- Add `actorUserId` (rename from `userId` or keep both with back-compat plan).
- Add `metadata` JSON (or repurpose `old/new` to `metadata` with stricter shape).
- Indexes: `(organizationId, createdAt)`, `(entityType, entityId, createdAt)`, `(actorUserId, createdAt)`.
- Backfill strategy:
  - best-effort derive `organizationId` via `user.organizationId` for existing rows,
  - leave platform/system rows null with explicit marker.

**Fence:** schema/migration work requires explicit approval and operator deploy gate.

### Slice 2 (P2): introduce an audit logging boundary in code (no UI)

- Central helper: `lib/audit/audit-log-service.ts`:
  - `writeAuditEvent({ organizationId, actor, action, entity, metadata, request })`
  - enforces redaction allowlist and payload size limits
  - safe defaults when request context missing (cron/scripts)
- Integrate into **highest-value** tenant mutations only (MVP list).

**Status:** Foundation implemented in `audit-log-write-paths-foundation-v1`; invitation create/revoke wired in `audit-log-write-paths-integration-v1`; instructor qualified categories + deactivate wired in `audit-log-write-paths-people-v1`; lesson create + update wired in `audit-log-write-paths-lessons-v1`.

**Fence:** do not log secrets; add unit tests for redaction and event shapes.

### Slice 3 (P2): admin read-only viewer (optional)

- Only if operationally required for first client support.
- Tenant-scoped list endpoint and small UI surface under operator/internal, not school admin by default.

---

## Tenant isolation and RLS expectations (future)

- Application must always scope audit reads by:
  - `session.user.organizationId` for tenant admin surfaces,
  - platform-only access for `organizationId = null`.
- RLS `CREATE POLICY` is **not required** for Prisma-primary server writes, but policies may be desirable if Data API is ever used (separate P2).
- Avoid “global audit search” endpoints outside platform scope.

---

## Risks and mitigations

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Cross-tenant audit reads if `organizationId` missing | P1 | Add `organizationId` to storage before any viewer; require org scope in service contract |
| Logging secrets / PII | P0 | Redaction allowlist + tests; never log tokens/hashes/provider errors |
| High volume (import/apply) | P2 | Log summaries only; avoid row-per-record events in v1 |
| Demo/smoke contamination | P2 | Keep tenant scoping; optionally mark environment/source in metadata; do not use real client for smoke fixtures |

---

## Open questions (to resolve before Slice 1)

1. **Keep vs rename**: reuse `AuditLog` name vs introduce `AuditEvent` with stricter schema.
2. **Actor**: keep snapshot fields (`actorRole`, `actorEmail`) vs join to `User` only.
3. **Request correlation**: best `requestId` source in Next.js routes (header / generated).
4. **Retention**: do we need TTL/archival or is Postgres retention acceptable at first-client scale?

