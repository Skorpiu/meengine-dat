-- Link invitations to existing operational Student records (optional).
ALTER TABLE "user_invitations" ADD COLUMN "studentId" TEXT;

CREATE INDEX "user_invitations_organizationId_studentId_idx" ON "user_invitations"("organizationId", "studentId");
CREATE INDEX "user_invitations_studentId_idx" ON "user_invitations"("studentId");

ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
