"use client";

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
import { lessonFormDialogContentClass } from "@/components/lessons/lesson-form-styles";
import toast from "react-hot-toast";
import type { LessonBookingSuccessMeta } from "@/components/lessons/lesson-booking-meta";
import { buildAdminLessonCreateRequestBody } from "@/lib/lessons/lesson-create-request-body";

async function tryReadJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

interface BookLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (meta?: LessonBookingSuccessMeta) => void | Promise<void>;
}

export function BookLessonDialog({
  open,
  onOpenChange,
  onSuccess,
}: BookLessonDialogProps) {
  const handleSubmit = async (payload: LessonFormPayload) => {
    try {
      const response = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAdminLessonCreateRequestBody(payload)),
      });

      const data = await tryReadJson<{ message?: string; error?: string }>(
        response,
      );

      if (response.ok) {
        toast.success(data?.message || "Lesson booked successfully!");
        onOpenChange(false);
        await onSuccess({ lessonDate: payload.lessonDate });
      } else {
        toast.error(data?.error || "Failed to book lesson");
      }
    } catch (error) {
      console.error("Error booking lesson:", error);
      toast.error("An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={lessonFormDialogContentClass}>
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
          <DialogDescription>
            Schedule a new driving lesson or theory class for students.
          </DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="SUPER_ADMIN"
          allowedLessonTypes={["THEORY", "DRIVING"]}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
