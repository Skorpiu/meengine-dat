"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import type { StudentRecordDto } from "@/lib/students/student-record-ui-types";
import { getStudentRecordDisplayName } from "@/lib/students/student-record-ui-utils";
import {
  buildManualPracticalLessonPayload,
  emptyPracticalHistoryForm,
  formatPracticalHistoryDate,
  getPracticalHistorySourceLabel,
  practicalHistoryApiErrorMessage,
  type InstructorOption,
  type PracticalLessonHistoryApiError,
  type PracticalLessonHistoryCreateResponse,
  type PracticalLessonHistoryItem,
  type PracticalLessonHistoryListResponse,
} from "@/lib/students/student-practical-history-ui-utils";

async function tryReadJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type Props = {
  student: StudentRecordDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StudentPracticalHistoryDialog({
  student,
  open,
  onOpenChange,
}: Props) {
  const [lessons, setLessons] = useState<PracticalLessonHistoryItem[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState(emptyPracticalHistoryForm);

  const loadHistory = useCallback(async () => {
    if (!student) return;
    setListLoading(true);
    try {
      const response = await fetch(
        `/api/admin/students/${student.id}/practical-lessons`,
      );
      const data = await tryReadJson<
        PracticalLessonHistoryListResponse | PracticalLessonHistoryApiError
      >(response);
      if (!response.ok) {
        const err = data as PracticalLessonHistoryApiError | null;
        toast.error(
          practicalHistoryApiErrorMessage(
            err?.code,
            err?.error || "Failed to load history.",
          ),
        );
        setLessons([]);
        return;
      }
      const list = data as PracticalLessonHistoryListResponse;
      setLessons(list.data?.lessons ?? []);
    } catch {
      toast.error("Failed to load history.");
      setLessons([]);
    } finally {
      setListLoading(false);
    }
  }, [student]);

  const loadInstructors = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/instructors/all");
      const data = await tryReadJson<{ instructors?: InstructorOption[] }>(
        response,
      );
      if (!response.ok || !data?.instructors) {
        setInstructors([]);
        return;
      }
      setInstructors(data.instructors);
    } catch {
      setInstructors([]);
    }
  }, []);

  useEffect(() => {
    if (!open || !student) return;
    setForm(emptyPracticalHistoryForm());
    void loadHistory();
    void loadInstructors();
  }, [open, student, loadHistory, loadInstructors]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const payload = buildManualPracticalLessonPayload(form);
    if ("error" in payload) {
      toast.error(payload.error);
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(
        `/api/admin/students/${student.id}/practical-lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await tryReadJson<
        PracticalLessonHistoryCreateResponse | PracticalLessonHistoryApiError
      >(response);

      if (!response.ok) {
        const err = data as PracticalLessonHistoryApiError | null;
        toast.error(
          practicalHistoryApiErrorMessage(
            err?.code,
            err?.error || "Failed to record lesson.",
          ),
        );
        return;
      }

      toast.success("Practical lesson recorded.");
      setForm(emptyPracticalHistoryForm());
      await loadHistory();
    } catch {
      toast.error("Failed to record lesson.");
    } finally {
      setCreateLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Practical lesson history</DialogTitle>
          <DialogDescription>
            {student.schoolStudentId ?? "—"} —{" "}
            {getStudentRecordDisplayName(student)}. Record lessons completed
            outside the system.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleCreate}
          className="space-y-4 border rounded-lg p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            Add manual lesson
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ph-date">Date</Label>
              <Input
                id="ph-date"
                type="date"
                value={form.lessonDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lessonDate: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph-time">Time</Label>
              <Input
                id="ph-time"
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph-number">Lesson number</Label>
              <Input
                id="ph-number"
                inputMode="numeric"
                placeholder="1"
                value={form.practicalLessonNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    practicalLessonNumber: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph-duration">Duration (min)</Label>
              <Input
                id="ph-duration"
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutes: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ph-instructor">Instructor</Label>
              <Select
                value={form.instructorId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, instructorId: value }))
                }
              >
                <SelectTrigger id="ph-instructor">
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ph-notes">Notes (optional)</Label>
              <Input
                id="ph-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <Button type="submit" disabled={createLoading}>
            {createLoading ? "Recording…" : "Record lesson"}
          </Button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Recorded lessons
          </h3>
          {listLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-gray-500">
              No practical lessons recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      Practical #{lesson.practicalLessonNumber ?? "—"} ·{" "}
                      {formatPracticalHistoryDate(lesson.lessonDate)} ·{" "}
                      {lesson.startTime}
                    </div>
                    <div className="text-sm text-gray-600">
                      {lesson.instructorName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getPracticalHistorySourceLabel(lesson.lessonSource)}
                    </Badge>
                    <Badge variant="secondary">{lesson.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
