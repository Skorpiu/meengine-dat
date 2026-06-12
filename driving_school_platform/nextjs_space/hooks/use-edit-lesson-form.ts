"use client";

import { useCallback, useEffect, useState } from "react";
import type { LessonFormPayload } from "@/components/lessons/LessonForm";
import type { Lesson } from "@/lib/types";
import { buildAdminLessonUpdateRequestBody } from "@/lib/lessons/lesson-update-request-body";
import {
  isInstructorEditLessonOwner,
  parseAdminLessonDetailResponse,
} from "@/lib/lessons/parse-admin-lesson-detail-response";
import toast from "react-hot-toast";

export type EditLessonUserRole = "SUPER_ADMIN" | "INSTRUCTOR";

export type EditLessonAccessDeniedReason =
  | "unauthorized"
  | "not_found"
  | "forbidden_ownership";

async function tryReadJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type UseEditLessonFormOptions = {
  lessonId: string | null;
  userRole: EditLessonUserRole;
  userId: string;
  /** When false, skip fetch and reset local state. */
  enabled?: boolean;
  onAccessDenied?: (reason: EditLessonAccessDeniedReason) => void;
};

export function useEditLessonForm({
  lessonId,
  userRole,
  userId,
  enabled = true,
  onAccessDenied,
}: UseEditLessonFormOptions) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setLesson(null);
    setError(null);
    setIsLoading(false);
    setIsSubmitting(false);
  }, []);

  const fetchLesson = useCallback(async () => {
    if (!lessonId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        toast.error("Unauthorized access");
        onAccessDenied?.("unauthorized");
        return;
      }

      if (response.status === 404) {
        setError("Lesson not found");
        toast.error("Lesson not found");
        onAccessDenied?.("not_found");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch lesson");
      }

      const result = await tryReadJson<unknown>(response);
      const lessonData = parseAdminLessonDetailResponse(result);
      if (!lessonData) {
        throw new Error("Invalid lesson response shape");
      }

      if (
        userRole === "INSTRUCTOR" &&
        !isInstructorEditLessonOwner(lessonData, userId)
      ) {
        toast.error("You can only edit your own lessons");
        onAccessDenied?.("forbidden_ownership");
        return;
      }

      setLesson(lessonData);
    } catch (err) {
      console.error("Error fetching lesson:", err);
      setError("Failed to load lesson");
      toast.error("Failed to load lesson");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, lessonId, onAccessDenied, userId, userRole]);

  useEffect(() => {
    if (!enabled || !lessonId) {
      reset();
      return;
    }

    void fetchLesson();
  }, [enabled, fetchLesson, lessonId, reset]);

  const submit = useCallback(
    async (payload: LessonFormPayload): Promise<boolean> => {
      if (!lessonId) return false;

      try {
        setIsSubmitting(true);

        const response = await fetch(`/api/admin/lessons/${lessonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(buildAdminLessonUpdateRequestBody(payload)),
        });

        if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized access");
          onAccessDenied?.("unauthorized");
          return false;
        }

        const data = await tryReadJson<{ error?: string }>(response);

        if (response.ok) {
          toast.success("Lesson updated successfully!");
          return true;
        }

        toast.error(data?.error || "Failed to update lesson");
        return false;
      } catch (submitError) {
        console.error("Error updating lesson:", submitError);
        toast.error("An error occurred while updating the lesson");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [lessonId, onAccessDenied],
  );

  return {
    lesson,
    isLoading,
    error,
    isSubmitting,
    submit,
    reset,
    refetch: fetchLesson,
  };
}
