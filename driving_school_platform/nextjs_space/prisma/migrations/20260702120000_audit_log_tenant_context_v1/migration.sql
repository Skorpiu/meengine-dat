/*
  Audit log tenant context (v1) — additive schema only.

  Adds tenant-aware columns to audit_logs per audit-log-tenant-context-schema-plan.md (DEC-044).
  No write paths, no policies, no GRANT to anon/authenticated.

  Preserves Class-B hardening: RLS enabled + REVOKE ALL FROM anon, authenticated.
*/

-- AlterTable: tenant scope + actor attribution + payload + request correlation
ALTER TABLE "audit_logs" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "actorUserId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "actorRole" "UserRole";
ALTER TABLE "audit_logs" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "targetUserId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "requestId" TEXT;

-- CreateIndex: tenant-aware query paths
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");
CREATE INDEX "audit_logs_targetUserId_createdAt_idx" ON "audit_logs"("targetUserId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- Backfill (best-effort): derive tenant + actor fields from legacy userId when safe
UPDATE "audit_logs" AS al
SET
  "organizationId" = u."organizationId",
  "actorUserId" = al."userId",
  "actorRole" = COALESCE(al."userRole", u."role"),
  "actorEmail" = al."userEmail"
FROM "users" AS u
WHERE al."userId" IS NOT NULL
  AND al."userId" = u."id"
  AND al."organizationId" IS NULL;

-- Class-B hardening reinforcement (idempotent)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "audit_logs" FROM anon, authenticated;
