-- Manual practical lesson history (DAT_3.6): distinguish system vs manual/import origin.

CREATE TYPE "LessonSource" AS ENUM ('SYSTEM', 'MANUAL', 'IMPORT');

ALTER TABLE "lessons"
ADD COLUMN "lessonSource" "LessonSource" NOT NULL DEFAULT 'SYSTEM';
