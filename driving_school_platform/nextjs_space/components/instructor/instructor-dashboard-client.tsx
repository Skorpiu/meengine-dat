"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ScheduleMap,
  type Lesson as ScheduleLesson,
  type ScheduleMapRefetch,
} from "@/components/schedule/schedule-map";
import { BookLessonDialog } from "@/components/instructor/book-lesson-dialog-instructor";
import { BookExamDialog } from "@/components/instructor/book-exam-dialog-instructor";
import type { LessonBookingSuccessMeta } from "@/components/lessons/lesson-booking-meta";

interface InstructorDashboardClientProps {
  lessons: ScheduleLesson[];
  instructorUserId: string;
}

export function InstructorDashboardClient({
  lessons: initialLessons,
  instructorUserId,
}: InstructorDashboardClientProps) {
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusLessonDate, setFocusLessonDate] = useState<string | null>(null);
  const scheduleRefetchRef = useRef<ScheduleMapRefetch | null>(null);

  const registerScheduleRefetch = useCallback((refetch: ScheduleMapRefetch) => {
    scheduleRefetchRef.current = refetch;
  }, []);

  const refreshSchedule = useCallback(
    async (meta?: LessonBookingSuccessMeta) => {
      if (meta?.lessonDate) {
        setFocusLessonDate(meta.lessonDate);
      }
      setRefreshKey((k) => k + 1);
      await scheduleRefetchRef.current?.(
        meta?.lessonDate ? { focusDate: meta.lessonDate } : undefined,
      );
    },
    [],
  );

  const handleLessonBooked = useCallback(
    async (meta?: LessonBookingSuccessMeta) => {
      setBookLessonOpen(false);
      setBookExamOpen(false);
      await refreshSchedule(meta);
    },
    [refreshSchedule],
  );

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
          showPrintButton={false}
          userRole="instructor"
          onLessonsUpdate={refreshSchedule}
          onRegisterRefetch={registerScheduleRefetch}
          refreshKey={refreshKey}
          focusLessonDate={focusLessonDate}
        />
      </div>

      <BookLessonDialog
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={handleLessonBooked}
        instructorUserId={instructorUserId}
      />

      <BookExamDialog
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={handleLessonBooked}
        instructorUserId={instructorUserId}
      />
    </>
  );
}
