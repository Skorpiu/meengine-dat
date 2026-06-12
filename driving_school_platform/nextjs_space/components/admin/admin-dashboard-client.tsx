"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ScheduleMap,
  type Lesson as ScheduleLesson,
} from "@/components/schedule/schedule-map";
import { BookLessonDialog } from "./book-lesson-dialog";
import { BookExamDialog } from "./book-exam-dialog";
import { EditLessonDialog } from "./edit-lesson-dialog";
import { useScheduleDashboardControls } from "@/hooks/use-schedule-dashboard-controls";

interface AdminDashboardClientProps {
  lessons: ScheduleLesson[];
  adminUserId: string;
}

export function AdminDashboardClient({
  lessons: initialLessons,
  adminUserId,
}: AdminDashboardClientProps) {
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const {
    refreshKey,
    focusLessonDate,
    registerScheduleRefetch,
    refreshSchedule,
    handleLessonBooked,
  } = useScheduleDashboardControls();

  const onScheduleMutationSuccess = async (
    meta?: Parameters<typeof handleLessonBooked>[0],
  ) => {
    setBookLessonOpen(false);
    setBookExamOpen(false);
    setIsEditLessonDialogOpen(false);
    setEditingLessonId(null);
    await handleLessonBooked(meta);
  };

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setIsEditLessonDialogOpen(true);
  };

  const handleEditLessonOpenChange = (open: boolean) => {
    setIsEditLessonDialogOpen(open);
    if (!open) {
      setEditingLessonId(null);
    }
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
          onEditLesson={handleEditLesson}
          refreshKey={refreshKey}
          focusLessonDate={focusLessonDate}
        />
      </div>

      <BookLessonDialog
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={onScheduleMutationSuccess}
      />

      <BookExamDialog
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={onScheduleMutationSuccess}
      />

      <EditLessonDialog
        open={isEditLessonDialogOpen}
        lessonId={editingLessonId}
        userRole="SUPER_ADMIN"
        userId={adminUserId}
        onOpenChange={handleEditLessonOpenChange}
        onSuccess={onScheduleMutationSuccess}
      />
    </>
  );
}
