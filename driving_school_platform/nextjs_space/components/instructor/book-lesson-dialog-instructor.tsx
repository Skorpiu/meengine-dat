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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const isLikelyJson = contentType.toLowerCase().includes("application/json");

  // Some routes return empty bodies or non-JSON on errors; keep this defensive.
  const text = await response.text();
  if (!text) return {};

  if (!isLikelyJson) {
    // If the server didn't mark it as JSON, still attempt JSON parse as a best effort.
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

interface BookLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instructorUserId: string;
}

export function BookLessonDialog({
  open,
  onOpenChange,
  onSuccess,
  instructorUserId,
}: BookLessonDialogProps) {
  const handleSubmit = async (payload: LessonFormPayload) => {
    try {
      const requestBody: Record<string, unknown> = {
        lessonType: payload.lessonType,
        instructorId: instructorUserId,
        lessonDate: payload.lessonDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
      };

      // Add student data based on lesson type
      if (payload.studentIds && payload.studentIds.length > 0) {
        // Multi-student lesson types (EXAM, THEORY_EXAM)
        requestBody.studentIds = payload.studentIds;
      } else if (payload.studentId) {
        // Single student lesson types (DRIVING, THEORY)
        requestBody.studentId = payload.studentId;
      }

      // Add vehicle if selected
      if (payload.vehicleId) {
        const vehicleId = Number.parseInt(payload.vehicleId, 10);
        if (Number.isFinite(vehicleId)) {
          requestBody.vehicleId = vehicleId;
        }
      }

      const response = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await safeReadJson(response);
      const payloadObj = isRecord(data) ? data : {};
      const message = getString(payloadObj.message);
      const errorMessage = getString(payloadObj.error);

      if (response.ok) {
        toast.success(message || "Lesson booked successfully!");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(errorMessage || message || "Failed to book lesson");
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
            Schedule a new driving lesson or theory class for your students.
          </DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="INSTRUCTOR"
          instructorUserId={instructorUserId}
          allowedLessonTypes={["THEORY", "DRIVING"]}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
