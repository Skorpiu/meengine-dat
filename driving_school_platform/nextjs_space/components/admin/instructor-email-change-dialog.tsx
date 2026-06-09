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
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  CHANGE_INSTRUCTOR_EMAIL_MODAL,
  changeInstructorEmailApiErrorMessage,
  getChangeInstructorEmailWarningCopy,
  type InstructorEmailChangeApiError,
  type InstructorEmailChangeMutationResponse,
} from "@/lib/instructors/instructor-email-change-ui-utils";

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

type InstructorEmailChangeDialogProps = {
  user: InstructorRecordUserDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: InstructorRecordUserDto) => void;
};

export function InstructorEmailChangeDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: InstructorEmailChangeDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewEmail("");
    }
  }, [open, user?.id]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.instructor?.id) return;

    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error("Enter a new email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/instructors/${encodeURIComponent(user.instructor.id)}/change-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: trimmed }),
        },
      );
      const data = await tryReadJson<
        InstructorEmailChangeMutationResponse | InstructorEmailChangeApiError
      >(response);

      if (!response.ok) {
        const err = data as InstructorEmailChangeApiError | null;
        toast.error(
          changeInstructorEmailApiErrorMessage(
            err?.code,
            err?.error || "Failed to change email",
          ),
        );
        return;
      }

      const updated = (data as InstructorEmailChangeMutationResponse).data
        ?.user;
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
          <DialogTitle>{CHANGE_INSTRUCTOR_EMAIL_MODAL.title}</DialogTitle>
          <DialogDescription>
            {user ? getChangeInstructorEmailWarningCopy(user) : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructor-change-email-current">
              {CHANGE_INSTRUCTOR_EMAIL_MODAL.currentEmailLabel}
            </Label>
            <Input
              id="instructor-change-email-current"
              type="email"
              value={user?.email ?? "—"}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructor-change-email-new">
              {CHANGE_INSTRUCTOR_EMAIL_MODAL.newEmailLabel}
            </Label>
            <Input
              id="instructor-change-email-new"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="instructor@example.com"
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
              {CHANGE_INSTRUCTOR_EMAIL_MODAL.cancelLabel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : CHANGE_INSTRUCTOR_EMAIL_MODAL.confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ChangeInstructorEmailButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function ChangeInstructorEmailButton({
  onClick,
  disabled = false,
}: ChangeInstructorEmailButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className="border-blue-200 text-blue-800 hover:bg-blue-100"
      onClick={onClick}
    >
      <Mail className="h-4 w-4 mr-1" />
      Change email
    </Button>
  );
}
