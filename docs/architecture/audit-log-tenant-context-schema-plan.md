# Audit log tenant context — schema/migration plan (v1)

**Batch:** `audit-log-tenant-context-schema-plan-v1` (docs-only)  
**Status:** Planning only — no Prisma schema changes, no migrations, no runtime writes  
**Related decision:** [DEC-044](./decision-log.md) (plan-first foundation)  
**Related docs:** [audit-log-tenant-context-foundation-plan.md](./audit-log-tenant-context-foundation-plan.md), [production-readiness-cutline.md](./production-readiness-cutline.md) (DEC-032)

---

## Goal (this document)

Turn the foundation plan (DEC-044) into a **concrete, implementable, low-risk** proposal for the *first real schema/migration slice* that makes `audit_logs` tenant-aware **without breaking existing data** and **without weakening Class‑B hardening**.

This is a design + operator plan, not an execution.

---

## Current state (exact)

### `audit_logs` table (init migration)

`driving_school_platform/nextjs_space/prisma/migrations/20251111214609_init_supabase/migration.sql` created:

- `id TEXT PK`
- `userId`, `userEmail`, `userRole` (nullable)
- `action`, `entityType` (required)
- `entityId` (nullable)
- `oldValues`, `newValues` (JSONB nullable)
- request context: `ipAddress`, `userAgent`, `requestMethod`, `requestPath`
- `status` (`AuditStatus`), `errorMessage`
- `createdAt` default now

### Prisma model (`schema.prisma`)

`model AuditLog { … @@map("audit_logs") }` matches the columns above and relates `userId` → `User.id` (nullable).

### Class‑B hardening already applied

`20260603120000_supabase_rls_class_b_hardening_v1`:

- `ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`
- `REVOKE ALL ON TABLE audit_logs FROM anon, authenticated;`

**Important:** there are **no policies** and no FORCE RLS. This is intentional for DAT’s Prisma‑primary posture.

### Known gap

- There is **no `organizationId`** on `audit_logs`.
- There are **no application write paths** today (only seed/reset tooling touches it).

---

## Proposed schema delta (tenant-aware, back-compat)

### Core principle

We evolve `audit_logs` with **additive columns** only (no drops, no renames in v1). This keeps old rows readable and avoids runtime churn before the write-path slice exists.

### Columns to add (proposal)

Tenant scope:

- `organizationId TEXT NULL`
  - **NULL means platform-scoped** only (deliberate); tenant events should set it.
  - We do **not** add a FK immediately unless we need referential enforcement; see “Relation strategy”.

Actor attribution (keep legacy user fields; add canonical actor fields):

- `actorUserId TEXT NULL` (FK to `users.id` optional)
- `actorRole UserRole NULL`
- `actorEmail TEXT NULL`

Targets (optional but useful for people/account operations):

- `targetUserId TEXT NULL` (FK to `users.id` optional)

Event payload modernization (without removing legacy `oldValues/newValues` yet):

- `metadata JSONB NULL`
  - intended for **redacted, minimal** payload; shape enforced by runtime service later.

Request correlation (optional, but safe to add now):

- `requestId TEXT NULL`

### What we keep (for compatibility)

Keep existing fields untouched:

- `userId`, `userRole`, `userEmail` remain for legacy rows and transitional writes.
- `oldValues/newValues` remain (we can later deprecate in favor of `metadata` when write paths exist).

---

## Index plan (recommended)

Existing indexes already include `userId`, `entityType`, `action`, `createdAt` (from init migration).

Additive indexes for tenant-aware queries:

- `CREATE INDEX IF NOT EXISTS idx_audit_logs_org_createdAt ON audit_logs("organizationId", "createdAt");`
- `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_createdAt ON audit_logs("entityType", "entityId", "createdAt");`
- `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_createdAt ON audit_logs("actorUserId", "createdAt");`
- (optional) `CREATE INDEX IF NOT EXISTS idx_audit_logs_target_createdAt ON audit_logs("targetUserId", "createdAt");`

Notes:

- Composite `(organizationId, createdAt)` is the primary fence for tenant read paths.
- `entityId` is nullable; index remains useful because `entityType` is always present.

---

## Backfill strategy (existing rows)

### Objectives

- Avoid any assumption that legacy rows are tenant-scoped.
- Best-effort derive `organizationId` where possible to reduce future “unknown scope”.
- Preserve platform-scoped NULL as a valid and explicit state.

### Proposed backfill (best-effort, safe)

1. For rows where `organizationId IS NULL` and `userId IS NOT NULL`:
   - set `organizationId = users.organizationId` (nullable; platform admins remain NULL).
2. For actor fields:
   - set `actorUserId = userId` (when present)
   - set `actorRole = COALESCE(userRole, users.role)` when safe
   - set `actorEmail = userEmail` (do not overwrite non-null)

3. Leave rows NULL when:
   - `userId` is NULL (system events) and there is no reliable tenant derivation
   - user is platform-scoped (`users.organizationId IS NULL`)

**No attempt** to infer org from `entityId` in v1 (too risky without a typed mapping contract).

### Audit of backfill impact (operator gate)

Before applying in any environment, produce a dry-run report:

- counts by:
  - `organizationId IS NULL` vs NOT NULL
  - `userId IS NULL` vs NOT NULL
  - candidate rows where `userId` exists but `users.organizationId` is NULL

---

## RLS / grants posture (must remain Class‑B)

### Requirements

- Preserve:
  - `ENABLE ROW LEVEL SECURITY` on `audit_logs`
  - `REVOKE ALL FROM anon, authenticated`
- Do **not** add:
  - `CREATE POLICY`
  - `GRANT` to anon/authenticated
  - `FORCE ROW LEVEL SECURITY`

### Migration safety note

DDL changes (new columns + indexes) should not change RLS/grants; but we include a post-migration verification step:

- confirm `relrowsecurity = true`
- confirm privileges for `anon` / `authenticated` remain revoked

---

## Relation strategy (Organization FK vs scalar-first)

**Recommendation (v1): scalar-first.**

Add `organizationId TEXT NULL` without an immediate FK constraint to `organizations(id)`.

Rationale:

- avoids introducing FK lock/validation behavior across environments before write paths exist,
- keeps the migration minimal and less likely to surprise operator deploy timing,
- still enables strict app-level scoping and indexing.

Follow-up (optional, later slice): add a FK constraint once we have confidence in data hygiene and backfill results.

---

## Migration plan (future execution slice; not this batch)

### Steps (single migration)

1. `ALTER TABLE audit_logs ADD COLUMN ...` (all nullable)
2. Create indexes (IF NOT EXISTS)
3. Run best-effort backfill `UPDATE ... FROM users ...`
4. Verification queries:
   - RLS enabled + REVOKE preserved
   - backfill counts and NULL distribution

### GO / NO-GO (operator gate)

**GO only if:**

- migration runs within acceptable lock window on target DB,
- RLS still enabled and `anon/authenticated` privileges still revoked,
- backfill does not create invalid references (if any FKs are added later),
- post-migration queries show expected distributions (no unexpected tenant leakage patterns).

**NO-GO if:**

- unexpected long locks,
- privilege drift (any grants to `anon/authenticated`),
- data anomalies indicating unsafe inference would be needed.

---

## Rollback approach

DDL rollback is expensive in Postgres; prefer forward-fix. Still, for safety:

- If migration fails mid-way, re-run idempotent parts (ADD COLUMN is not idempotent; plan uses “check before” guards in SQL).
- If indexes create issues, they can be dropped safely.
- If backfill logic is wrong, we can:
  - revert the backfill updates with a targeted `UPDATE ... SET organizationId = NULL ...` filter (limited scope),
  - keep columns present (do not drop).

---

## Next slices (after this plan)

1. **(Gated, schema/migration)** `audit-log-tenant-context-migration-v1` — implement the migration described here + operator verification record.
2. **(Runtime boundary)** `audit-log-write-paths-foundation-v1` — add `writeAuditEvent` service with redaction allowlist + unit tests, but wire only 1–2 high-value mutations first.

