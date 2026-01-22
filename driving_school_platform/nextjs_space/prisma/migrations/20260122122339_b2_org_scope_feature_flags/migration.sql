/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,flagKey]` on the table `feature_flags` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "feature_flags_flagKey_key";

-- AlterTable
ALTER TABLE "feature_flags" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "feature_flags_organizationId_idx" ON "feature_flags"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_organizationId_flagKey_key" ON "feature_flags"("organizationId", "flagKey");

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
