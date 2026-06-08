"use client";

import { useEffect, useState } from "react";
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
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import type {
  StudentRecordApiError,
  StudentRecordDto,
  StudentRecordMutationResponse,
} from "@/lib/students/student-record-ui-types";
import { getStudentCanonicalEmailDisplay } from "@/lib/students/student-record-ui-utils";
import {
  CHANGE_STUDENT_EMAIL_MODAL,
  changeStudentEmailApiErrorMessage,
  getChangeStudentEmailWarningCopy,
} from "@/lib/students/student-email-change-ui-utils";

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

type StudentEmailChangeDialogProps = {
  student: StudentRecordDto | null;
  linkedEmail?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (student: StudentRecordDto) => void;
};

export function StudentEmailChangeDialog({
  student,
  linkedEmail,
  open,
  onOpenChange,
  onSuccess,
}: StudentEmailChangeDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const currentEmail = student
    ? getStudentCanonicalEmailDisplay(student, linkedEmail)
    : null;

  useEffect(() => {
    if (open) {
      setNewEmail("");
    }
  }, [open, student?.id]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error("Enter a new email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/students/${student.id}/change-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: trimmed }),
        },
      );
      const data = await tryReadJson<
        StudentRecordMutationResponse | StudentRecordApiError
      >(response);

      if (!response.ok) {
        const err = data as StudentRecordApiError | null;
        toast.error(
          changeStudentEmailApiErrorMessage(
            err?.code,
            err?.error || "Failed to change email",
          ),
        );
        return;
      }

      const updated = (data as StudentRecordMutationResponse).data?.student;
      toast.success("Email updated successfully.");
      handleClose();
      if (updated) {
        onSuccess?.(updated);
      }
    } catch {
      toast.error("An error occurred while changing the email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{CHANGE_STUDENT_EMAIL_MODAL.title}</DialogTitle>
          <DialogDescription>
            {student
              ? getChangeStudentEmailWarningCopy(student.appAccessMode)
              : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-email-current">
              {CHANGE_STUDENT_EMAIL_MODAL.currentEmailLabel}
            </Label>
            <Input
              id="change-email-current"
              type="email"
              value={currentEmail ?? "—"}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="change-email-new">
              {CHANGE_STUDENT_EMAIL_MODAL.newEmailLabel}
            </Label>
            <Input
              id="change-email-new"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="student@example.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {CHANGE_STUDENT_EMAIL_MODAL.cancelLabel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : CHANGE_STUDENT_EMAIL_MODAL.confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ChangeStudentEmailButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  variant?: "profile" | "app-access";
};

export function ChangeStudentEmailButton({
  onClick,
  disabled = false,
  variant = "profile",
}: ChangeStudentEmailButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={
        variant === "app-access"
          ? "border-blue-200 text-blue-800 hover:bg-blue-100"
          : undefined
      }
      onClick={onClick}
    >
      <Mail className="h-4 w-4 mr-1" />
      Change email
    </Button>
  );
}
