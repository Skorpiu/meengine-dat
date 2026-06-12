"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LessonForm,
  type LessonFormPayload,
} from "@/components/lessons/LessonForm";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { lessonFormEditCardClass } from "@/components/lessons/lesson-form-styles";
import { buildScheduleReturnHref } from "@/lib/schedule/schedule-map-navigation";
import {
  useEditLessonForm,
  type EditLessonAccessDeniedReason,
} from "@/hooks/use-edit-lesson-form";

interface EditLessonClientProps {
  lessonId: string;
  userRole: "SUPER_ADMIN" | "INSTRUCTOR";
  userId: string;
}

export function EditLessonClient({
  lessonId,
  userRole,
  userId,
}: EditLessonClientProps) {
  const router = useRouter();
  const backHref = userRole === "SUPER_ADMIN" ? "/admin" : "/instructor";

  const handleAccessDenied = useCallback(
    (reason: EditLessonAccessDeniedReason) => {
      if (reason === "not_found") {
        setTimeout(() => {
          router.push(backHref);
        }, 2000);
        return;
      }

      router.push(backHref);
    },
    [backHref, router],
  );

  const { lesson, isLoading, error, submit } = useEditLessonForm({
    lessonId,
    userRole,
    userId,
    enabled: true,
    onAccessDenied: handleAccessDenied,
  });

  const handleSubmit = async (payload: LessonFormPayload) => {
    const ok = await submit(payload);
    if (!ok) return;

    router.push(buildScheduleReturnHref(backHref, payload.lessonDate));
  };

  const handleCancel = () => {
    router.push(backHref);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || "Lesson not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(backHref)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schedule
          </Button>
        </Link>
      </div>

      <Card className={lessonFormEditCardClass}>
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
          <CardTitle className="text-xl">Edit Lesson</CardTitle>
          <CardDescription>
            Update the lesson details below. Changes will be saved when you
            submit.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <LessonForm
            mode="edit"
            initialLesson={lesson}
            userRole={userRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "INSTRUCTOR"}
            instructorUserId={
              userRole === "INSTRUCTOR"
                ? lesson.instructor?.user?.id
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitButtonText="Update Lesson"
          />
        </CardContent>
      </Card>
    </div>
  );
}
