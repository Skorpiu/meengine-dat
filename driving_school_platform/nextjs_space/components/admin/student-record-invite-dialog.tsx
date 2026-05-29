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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, MailPlus } from "lucide-react";
import toast from "react-hot-toast";
import type { InvitationEmailDeliveryDto } from "@/lib/invitations/invitation-ui-types";
import {
  copyTextToClipboard,
  invitationApiErrorMessage,
} from "@/lib/invitations/invitation-ui-utils";
import type {
  StudentRecordDto,
  StudentRecordInviteResponse,
} from "@/lib/students/student-record-ui-types";
import {
  buildStudentRecordInvitePayload,
  getStudentRecordDisplayName,
  studentRecordApiErrorMessage,
} from "@/lib/students/student-record-ui-utils";

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

type StudentRecordInviteDialogProps = {
  student: StudentRecordDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function StudentRecordInviteDialog({
  student,
  open,
  onOpenChange,
  onSuccess,
}: StudentRecordInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailDelivery, setEmailDelivery] =
    useState<InvitationEmailDeliveryDto | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (open && student) {
      setEmail(student.email ?? "");
      setInviteLink(null);
      setEmailDelivery(null);
      setLinkCopied(false);
    }
  }, [open, student]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const payload = buildStudentRecordInvitePayload({
      studentEmail: student.email,
      inviteEmail: email,
    });
    if ("error" in payload) {
      toast.error(
        studentRecordApiErrorMessage(payload.error, "Email obrigatório."),
      );
      return;
    }

    setLoading(true);
    setInviteLink(null);
    setEmailDelivery(null);

    try {
      const response = await fetch(`/api/admin/students/${student.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await tryReadJson<
        StudentRecordInviteResponse | { error?: string; code?: string }
      >(response);

      if (!response.ok) {
        const err = data as { error?: string; code?: string } | null;
        toast.error(
          studentRecordApiErrorMessage(
            err?.code,
            invitationApiErrorMessage(
              err?.code,
              err?.error || "Falha ao enviar convite.",
              {
                forAdmin: true,
              },
            ),
          ),
        );
        return;
      }

      const result = data as StudentRecordInviteResponse;
      const link = result.data?.inviteLink ?? null;
      const delivery = result.data?.emailDelivery ?? null;
      setInviteLink(link);
      setEmailDelivery(delivery);

      if (delivery?.ok) {
        toast.success("Convite enviado por email.");
      } else {
        toast.success("Convite criado. Copie o link e partilhe-o com o aluno.");
      }

      onSuccess?.();
    } catch {
      toast.error("Ocorreu um erro ao enviar o convite.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    const copied = await copyTextToClipboard(inviteLink);
    if (copied) {
      setLinkCopied(true);
      toast.success("Link copiado — partilhe apenas com o aluno.");
      window.setTimeout(() => setLinkCopied(false), 2500);
    } else {
      toast.error("Não foi possível copiar. Selecione o campo manualmente.");
    }
  };

  if (!student) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar convite</DialogTitle>
          <DialogDescription>
            O aluno criará apenas a conta de acesso. A ficha operacional de{" "}
            <span className="font-medium">
              {getStudentRecordDisplayName(student)}
            </span>{" "}
            ({student.schoolStudentId ?? "—"}) será ligada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do convite</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@exemplo.com"
              required={!student.email}
              disabled={loading || inviteLink !== null}
            />
            {student.email ? (
              <p className="text-xs text-gray-500">
                Email registado na ficha: {student.email}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Indique o email para onde enviar o convite.
              </p>
            )}
          </div>

          {inviteLink ? (
            <Alert>
              <AlertDescription className="space-y-2">
                {emailDelivery?.attempted && emailDelivery.ok ? (
                  <p>Email de convite enviado com sucesso.</p>
                ) : emailDelivery?.attempted && !emailDelivery.ok ? (
                  <p>
                    Não foi possível enviar o email. Copie o link abaixo e
                    partilhe-o manualmente.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Input readOnly value={inviteLink} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {linkCopied ? (
                  <p className="text-xs text-green-700">Link copiado.</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {inviteLink ? "Fechar" : "Cancelar"}
            </Button>
            {!inviteLink ? (
              <Button type="submit" disabled={loading}>
                <MailPlus className="h-4 w-4 mr-1" />
                {loading ? "A enviar…" : "Enviar convite"}
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
