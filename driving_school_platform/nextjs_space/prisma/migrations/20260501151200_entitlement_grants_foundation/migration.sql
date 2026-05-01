/*
  Entitlement grants foundation.

  Notes:
  - This introduces time-bound feature grants scoped to an organization.
  - Billing/checkout/provider integration is intentionally out of scope.
  - Legacy/manual organization_features remains supported.
*/

-- CreateTable
CREATE TABLE "entitlement_grants" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "entitlement_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entitlement_grants_organizationId_idx" ON "entitlement_grants"("organizationId");

-- CreateIndex
CREATE INDEX "entitlement_grants_organizationId_featureKey_idx" ON "entitlement_grants"("organizationId", "featureKey");

-- CreateIndex
CREATE INDEX "entitlement_grants_organizationId_startsAt_expiresAt_idx"
ON "entitlement_grants"("organizationId", "startsAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

