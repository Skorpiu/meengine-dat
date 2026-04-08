"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ScheduleMap,
  type Lesson as ScheduleLesson,
} from "@/components/schedule/schedule-map";
import { BookLessonDialog } from "./book-lesson-dialog";
import { BookExamDialog } from "./book-exam-dialog";
import { useRouter } from "next/navigation";

interface AdminDashboardClientProps {
  lessons: ScheduleLesson[];
}

export function AdminDashboardClient({
  lessons: initialLessons,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setBookLessonOpen(false);
    setBookExamOpen(false);

    // force server refresh + re-fetch in ScheduleMap
    setRefreshKey((k) => k + 1);
    router.refresh();
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
          onLessonsUpdate={handleSuccess}
          refreshKey={refreshKey}
        />
      </div>

      <BookLessonDialog
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={handleSuccess}
      />

      <BookExamDialog
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
