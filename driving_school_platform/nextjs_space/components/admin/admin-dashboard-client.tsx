"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ScheduleMap,
  type Lesson as ScheduleLesson,
} from "@/components/schedule/schedule-map";
import { BookLessonDialog } from "./book-lesson-dialog";
import { BookExamDialog } from "./book-exam-dialog";
import { useScheduleDashboardControls } from "@/hooks/use-schedule-dashboard-controls";

interface AdminDashboardClientProps {
  lessons: ScheduleLesson[];
}

export function AdminDashboardClient({
  lessons: initialLessons,
}: AdminDashboardClientProps) {
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);
  const {
    refreshKey,
    focusLessonDate,
    registerScheduleRefetch,
    refreshSchedule,
    handleLessonBooked,
  } = useScheduleDashboardControls();

  const onLessonBooked = async (
    meta?: Parameters<typeof handleLessonBooked>[0],
  ) => {
    setBookLessonOpen(false);
    setBookExamOpen(false);
    await handleLessonBooked(meta);
  };

  return (
    <>
      <div className="relative">
        <div className="mb-4 flex justify-end gap-2">
          <Button
            className="bg-driving-primary hover:bg-driving-primary/90"
            onClick={() => setBookLessonOpen(true)}
          >
            + Book Lesson
          </Button>
          <Button variant="outline" onClick={() => setBookExamOpen(true)}>
            + Book Exam
          </Button>
        </div>
        <ScheduleMap
          lessons={initialLessons}
          showPrintButton={true}
          userRole="admin"
          onLessonsUpdate={refreshSchedule}
          onRegisterRefetch={registerScheduleRefetch}
          refreshKey={refreshKey}
          focusLessonDate={focusLessonDate}
        />
      </div>

      <BookLessonDialog
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={onLessonBooked}
      />

      <BookExamDialog
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={onLessonBooked}
      />
    </>
  );
}
