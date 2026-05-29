-- Practical lesson counter foundation (DAT_3.6): sequential number per student for DRIVING lessons.

ALTER TABLE "lessons" ADD COLUMN "practicalLessonNumber" INTEGER;

CREATE INDEX "lessons_organizationId_studentId_lessonType_practicalLessonNumber_idx"
  ON "lessons"("organizationId", "studentId", "lessonType", "practicalLessonNumber");
