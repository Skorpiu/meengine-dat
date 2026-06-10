-- AlterTable
ALTER TABLE "students" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "instructors" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "lesson_requests" ALTER COLUMN "organizationId" SET NOT NULL;
