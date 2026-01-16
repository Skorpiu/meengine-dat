-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "lesson_requests" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "exams_organizationId_idx" ON "exams"("organizationId");

-- CreateIndex
CREATE INDEX "lesson_requests_organizationId_idx" ON "lesson_requests"("organizationId");

-- CreateIndex
CREATE INDEX "lessons_organizationId_idx" ON "lessons"("organizationId");

-- CreateIndex
CREATE INDEX "vehicles_organizationId_idx" ON "vehicles"("organizationId");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_requests" ADD CONSTRAINT "lesson_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
