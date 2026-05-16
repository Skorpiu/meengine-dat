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
import { lessonFormDialogContentWideClass } from "@/components/lessons/lesson-form-styles";
import toast from "react-hot-toast";
import type { LessonBookingSuccessMeta } from "@/components/lessons/lesson-booking-meta";
import { buildAdminLessonCreateRequestBody } from "@/lib/lessons/lesson-create-request-body";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const isLikelyJson = contentType.toLowerCase().includes("application/json");

  const text = await response.text();
  if (!text) return {};

  if (!isLikelyJson) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { message: text };
    }
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

interface BookExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (meta?: LessonBookingSuccessMeta) => void | Promise<void>;
  instructorUserId: string;
}

export function BookExamDialog({
  open,
  onOpenChange,
  onSuccess,
  instructorUserId,
}: BookExamDialogProps) {
  const handleSubmit = async (payload: LessonFormPayload) => {
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildAdminLessonCreateRequestBody(payload, {
            instructorId: instructorUserId,
          }),
        ),
      });

      if (!res.ok) {
        const data = await safeReadJson(res);
        const payloadObj = isRecord(data) ? data : {};
        const errorMessage =
          getString(payloadObj.error) ??
          getString(payloadObj.message) ??
          "Failed to create exam";
        throw new Error(errorMessage);
      }

      toast.success("Exam created successfully");
      onOpenChange(false);
      await onSuccess({ lessonDate: payload.lessonDate });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create exam");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={lessonFormDialogContentWideClass}>
        <DialogHeader>
          <DialogTitle>Book Exam</DialogTitle>
          <DialogDescription>
            Schedule a practical or theoretical exam.
          </DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="INSTRUCTOR"
          instructorUserId={instructorUserId}
          allowedLessonTypes={["EXAM", "THEORY_EXAM"]}
          submitButtonText="Book Exam"
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
