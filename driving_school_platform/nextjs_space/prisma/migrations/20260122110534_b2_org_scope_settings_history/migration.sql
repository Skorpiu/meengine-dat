-- AlterTable
ALTER TABLE "configuration_history" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "configuration_history_organizationId_idx" ON "configuration_history"("organizationId");

-- CreateIndex
CREATE INDEX "system_settings_organizationId_idx" ON "system_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_history" ADD CONSTRAINT "configuration_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
