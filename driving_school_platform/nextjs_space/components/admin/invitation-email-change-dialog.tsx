"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Link2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import {
  CHANGE_INVITATION_EMAIL_MODAL,
  changeInvitationEmailApiErrorMessage,
  getChangeInvitationEmailWarningCopy,
  type ChangeInvitationEmailApiError,
  type ChangeInvitationEmailMutationResponse,
  type ChangeInvitationEmailUiContext,
} from "@/lib/invitations/invitation-email-update-ui-utils";
import { copyTextToClipboard } from "@/lib/invitations/invitation-ui-utils";

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

type InvitationEmailChangeDialogProps = {
  invitation: InvitationDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invitation: InvitationDto) => void;
  context?: ChangeInvitationEmailUiContext;
};

export function InvitationEmailChangeDialog({
  invitation,
  open,
  onOpenChange,
  onSuccess,
  context = "onboarding",
}: InvitationEmailChangeDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedInviteLink, setSavedInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setNewEmail("");
      setSavedInviteLink(null);
      setLinkCopied(false);
    }
  }, [open, invitation?.id]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    if (!savedInviteLink) {
      return;
    }
    const copied = await copyTextToClipboard(savedInviteLink);
    if (copied) {
      setLinkCopied(true);
      toast.success("Invite link copied — share it only with the invitee");
      window.setTimeout(() => setLinkCopied(false), 2500);
    } else {
      toast.error("Could not copy link. Select the field and copy manually.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error("Enter a new email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/invitations/${encodeURIComponent(invitation.id)}/change-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: trimmed }),
        },
      );
      const data = await tryReadJson<
        ChangeInvitationEmailMutationResponse | ChangeInvitationEmailApiError
      >(response);

      if (!response.ok) {
        const err = data as ChangeInvitationEmailApiError | null;
        toast.error(
          changeInvitationEmailApiErrorMessage(
            err?.code,
            err?.error || "Failed to change email",
          ),
        );
        return;
      }

      const updated = data as ChangeInvitationEmailMutationResponse;
      setSavedInviteLink(updated.inviteLink);
      toast.success("Invitation email updated. Copy the new link below.");
      onSuccess?.(updated.invitation);
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
          <DialogTitle>{CHANGE_INVITATION_EMAIL_MODAL.title}</DialogTitle>
          <DialogDescription>
            {getChangeInvitationEmailWarningCopy(context)}
          </DialogDescription>
        </DialogHeader>

        {savedInviteLink ? (
          <div className="space-y-4">
            <Alert className="border-amber-300 bg-amber-50">
              <Link2 className="h-4 w-4 text-amber-800" />
              <AlertDescription className="space-y-3 text-amber-950">
                <p className="font-medium">
                  New invite link — copy now (shown once)
                </p>
                <p className="text-sm">
                  The previous invite link will stop working. Email is not sent
                  automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    readOnly
                    value={savedInviteLink}
                    className="font-mono text-sm bg-white"
                    aria-label="New invite link"
                  />
                  <Button
                    type="button"
                    variant={linkCopied ? "default" : "outline"}
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {linkCopied ? "Copied!" : "Copy invite link"}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-change-email-current">
                {CHANGE_INVITATION_EMAIL_MODAL.currentEmailLabel}
              </Label>
              <Input
                id="invitation-change-email-current"
                type="email"
                value={invitation?.email ?? "—"}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation-change-email-new">
                {CHANGE_INVITATION_EMAIL_MODAL.newEmailLabel}
              </Label>
              <Input
                id="invitation-change-email-new"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={
                  invitation?.role === "STUDENT"
                    ? "student@example.com"
                    : "instructor@example.com"
                }
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
                {CHANGE_INVITATION_EMAIL_MODAL.cancelLabel}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving…"
                  : CHANGE_INVITATION_EMAIL_MODAL.confirmLabel}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ChangeInvitationEmailButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

export function ChangeInvitationEmailButton({
  onClick,
  disabled = false,
  label = "Change email",
}: ChangeInvitationEmailButtonProps) {
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
      {label}
    </Button>
  );
}
