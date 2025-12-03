-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'THEORY_EXAM';

-- AlterTable
-- Add studentNumber column to students table with unique constraint and autoincrement
-- First create a sequence for studentNumber
CREATE SEQUENCE IF NOT EXISTS "students_studentNumber_seq";

-- Add the column with default value from sequence
ALTER TABLE "students" ADD COLUMN "studentNumber" INTEGER NOT NULL DEFAULT nextval('"students_studentNumber_seq"');

-- Update existing records to have unique studentNumber values
-- This assigns sequential numbers starting from 1
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 1;
BEGIN
    FOR r IN SELECT id FROM "students" ORDER BY "createdAt" ASC
    LOOP
        UPDATE "students" SET "studentNumber" = counter WHERE id = r.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Set the sequence to start from the next value after existing records
SELECT setval('"students_studentNumber_seq"', (SELECT COALESCE(MAX("studentNumber"), 0) + 1 FROM "students"));

-- Add unique constraint
ALTER TABLE "students" ADD CONSTRAINT "students_studentNumber_key" UNIQUE ("studentNumber");

-- Alter the column to use the sequence as default
ALTER TABLE "students" ALTER COLUMN "studentNumber" SET DEFAULT nextval('"students_studentNumber_seq"');

-- Associate the sequence with the column for proper cleanup
ALTER SEQUENCE "students_studentNumber_seq" OWNED BY "students"."studentNumber";

-- CreateIndex
CREATE INDEX "students_studentNumber_idx" ON "students"("studentNumber");
