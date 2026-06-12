"use client";

import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LessonForm,
  type LessonFormPayload,
} from "@/components/lessons/LessonForm";
import {
  lessonFormDialogContentClass,
  lessonFormDialogContentWideClass,
} from "@/components/lessons/lesson-form-styles";
import type { LessonBookingSuccessMeta } from "@/components/lessons/lesson-booking-meta";
import {
  useEditLessonForm,
  type EditLessonUserRole,
} from "@/hooks/use-edit-lesson-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EditLessonDialogProps = {
  open: boolean;
  lessonId: string | null;
  userRole: EditLessonUserRole;
  userId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (meta?: LessonBookingSuccessMeta) => void | Promise<void>;
};

function formatEditLessonSubtitle(lesson: {
  lessonType: string;
  lessonDate: Date | string;
  startTime: string;
}): string {
  const rawDate =
    lesson.lessonDate instanceof Date
      ? lesson.lessonDate
      : new Date(String(lesson.lessonDate));
  const dateLabel = Number.isNaN(rawDate.getTime())
    ? String(lesson.lessonDate)
    : rawDate.toLocaleDateString("en-GB");
  return `${lesson.lessonType.replace(/_/g, " ")} · ${dateLabel} · ${lesson.startTime}`;
}

export function EditLessonDialog({
  open,
  lessonId,
  userRole,
  userId,
  onOpenChange,
  onSuccess,
}: EditLessonDialogProps) {
  const handleAccessDenied = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const { lesson, isLoading, error, submit } = useEditLessonForm({
    lessonId,
    userRole,
    userId,
    enabled: open && !!lessonId,
    onAccessDenied: handleAccessDenied,
  });

  const handleSubmit = async (payload: LessonFormPayload) => {
    const ok = await submit(payload);
    if (!ok) return;

    onOpenChange(false);
    await onSuccess({ lessonDate: payload.lessonDate });
  };

  const isWideLesson =
    lesson?.lessonType === "EXAM" || lesson?.lessonType === "THEORY_EXAM";

  const lessonFormUserRole =
    userRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "INSTRUCTOR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isWideLesson
            ? lessonFormDialogContentWideClass
            : lessonFormDialogContentClass
        }
      >
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>
            {lesson
              ? formatEditLessonSubtitle(lesson)
              : "Update the lesson details below."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading lesson...</p>
          </div>
        ) : error || !lesson ? (
          <div className="space-y-4 py-6">
            <p className="text-sm text-destructive">
              {error || "Lesson not found"}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <LessonForm
            mode="edit"
            initialLesson={lesson}
            userRole={lessonFormUserRole}
            instructorUserId={
              userRole === "INSTRUCTOR"
                ? lesson.instructor?.user?.id
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            submitButtonText="Update Lesson"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
