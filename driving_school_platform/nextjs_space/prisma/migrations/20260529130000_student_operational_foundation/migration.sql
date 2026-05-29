-- Student operational foundation (DAT_3.6): decouple Student from required User login.

-- CreateEnum
CREATE TYPE "StudentAppAccessMode" AS ENUM ('MANUAL_ONLY', 'INVITED', 'APP_USER');
CREATE TYPE "StudentSchoolIdSource" AS ENUM ('MANUAL', 'IMPORT', 'AUTO', 'LEGACY');

-- AlterTable: optional login + operational fields
ALTER TABLE "students" DROP CONSTRAINT "students_userId_fkey";

ALTER TABLE "students" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "enrollmentDate" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "enrollmentDate" DROP DEFAULT;

ALTER TABLE "students"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "schoolStudentId" TEXT,
ADD COLUMN "schoolStudentYearSuffix" TEXT,
ADD COLUMN "schoolStudentSequence" INTEGER,
ADD COLUMN "schoolStudentIdSource" "StudentSchoolIdSource",
ADD COLUMN "appAccessMode" "StudentAppAccessMode" NOT NULL DEFAULT 'APP_USER';

ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill operational contact fields from linked User accounts
UPDATE "students" AS s
SET
  "firstName" = u."firstName",
  "lastName" = u."lastName",
  "email" = u."email",
  "phoneNumber" = u."phoneNumber",
  "appAccessMode" = 'APP_USER'::"StudentAppAccessMode"
FROM "users" AS u
WHERE s."userId" = u."id";

-- CreateIndex
CREATE UNIQUE INDEX "students_organizationId_schoolStudentId_key"
  ON "students"("organizationId", "schoolStudentId");

CREATE INDEX "students_organizationId_schoolStudentId_idx"
  ON "students"("organizationId", "schoolStudentId");

CREATE INDEX "students_organizationId_enrollmentDate_idx"
  ON "students"("organizationId", "enrollmentDate");

CREATE INDEX "students_appAccessMode_idx" ON "students"("appAccessMode");
