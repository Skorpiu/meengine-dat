"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  Copy,
  Link2,
  MailPlus,
  RefreshCw,
  UserX,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import toast from "react-hot-toast";
import type {
  CreateInvitationResponse,
  InvitationApiError,
  InvitationDto,
  InvitableRole,
  ListInvitationsResponse,
  RevokeInvitationResponse,
} from "@/lib/invitations/invitation-ui-types";
import {
  copyTextToClipboard,
  countLinkedPendingStudentInvitations,
  formatInvitationDateTime,
  getInvitationDisplayStatus,
  getOnboardingVisibleInvitations,
  INVITATION_EXPIRED_ADMIN_ACTION_COPY,
  invitationApiErrorMessage,
  invitationDisplayStatusLabel,
  STUDENT_LINKED_INVITES_ON_PROFILES_COPY,
  type InvitationDisplayStatus,
} from "@/lib/invitations/invitation-ui-utils";

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

function displayStatusBadgeVariant(
  displayStatus: InvitationDisplayStatus,
): "default" | "secondary" | "destructive" | "outline" {
  return displayStatus === "Expired" ? "destructive" : "default";
}

const DEFAULT_EXPIRES_IN_DAYS = 7;

export type InvitationsManagementClientProps = {
  roleFilter?: InvitableRole;
  defaultRole?: InvitableRole;
  embedded?: boolean;
};

export function InvitationsManagementClient({
  roleFilter,
  defaultRole,
  embedded = false,
}: InvitationsManagementClientProps = {}) {
  const lockedRole = roleFilter ?? defaultRole;
  const initialRole = lockedRole ?? "STUDENT";

  const [invitations, setInvitations] = useState<InvitationDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>(initialRole);
  const [expiresInDays, setExpiresInDays] = useState(
    String(DEFAULT_EXPIRES_IN_DAYS),
  );
  const [createLoading, setCreateLoading] = useState(false);

  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(
    null,
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const formBusy = createLoading || revokingId !== null;
  const createRole = lockedRole ?? role;

  useEffect(() => {
    if (lockedRole) {
      setRole(lockedRole);
    }
  }, [lockedRole]);

  const visibleInvitations = useMemo(
    () => getOnboardingVisibleInvitations(invitations, roleFilter),
    [invitations, roleFilter],
  );

  const linkedStudentInviteCount = useMemo(
    () =>
      roleFilter === "STUDENT"
        ? countLinkedPendingStudentInvitations(invitations)
        : 0,
    [invitations, roleFilter],
  );

  const pendingCount = visibleInvitations.length;
  const isStudentOnboarding = roleFilter === "STUDENT";
  const isInstructorOnboarding = roleFilter === "INSTRUCTOR";

  const loadInvitations = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const response = await fetch("/api/admin/invitations");
      const data = await tryReadJson<
        ListInvitationsResponse | InvitationApiError
      >(response);

      if (!response.ok) {
        const err = data as InvitationApiError | null;
        setListError(err?.error || "Failed to load invitations");
        setInvitations([]);
        return;
      }

      const list = (data as ListInvitationsResponse)?.invitations ?? [];
      setInvitations(list);
    } catch {
      setListError("Failed to load invitations");
      setInvitations([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreatedInviteLink(null);

    const days = Number.parseInt(expiresInDays, 10);

    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role: createRole,
          expiresInDays: Number.isFinite(days) ? days : DEFAULT_EXPIRES_IN_DAYS,
        }),
      });

      const data = await tryReadJson<
        CreateInvitationResponse | InvitationApiError
      >(response);

      if (!response.ok) {
        const err = data as InvitationApiError | null;
        toast.error(
          invitationApiErrorMessage(
            err?.code,
            err?.error || "Failed to create invitation",
            { forAdmin: true },
          ),
        );
        return;
      }

      const created = data as CreateInvitationResponse;
      setCreatedInviteLink(created.inviteLink);
      setLinkCopied(false);
      setEmail("");
      toast.success(
        "Invitation created. Copy the link and share it privately.",
      );
      await loadInvitations();
    } catch {
      toast.error("An error occurred while creating the invitation");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdInviteLink) {
      return;
    }
    const copied = await copyTextToClipboard(createdInviteLink);
    if (copied) {
      setLinkCopied(true);
      toast.success("Invite link copied — share it only with the invitee");
      window.setTimeout(() => setLinkCopied(false), 2500);
    } else {
      toast.error("Could not copy link. Select the field and copy manually.");
    }
  };

  const handleRevoke = async (invitation: InvitationDto) => {
    if (invitation.status !== "PENDING") {
      return;
    }

    if (
      !confirm(
        `Revoke the pending invitation for ${invitation.email}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setRevokingId(invitation.id);

    try {
      const response = await fetch(
        `/api/admin/invitations/${encodeURIComponent(invitation.id)}/revoke`,
        { method: "POST" },
      );

      const data = await tryReadJson<
        RevokeInvitationResponse | InvitationApiError
      >(response);

      if (!response.ok) {
        const err = data as InvitationApiError | null;
        toast.error(err?.error || "Failed to revoke invitation");
        return;
      }

      toast.success("Invitation revoked");
      await loadInvitations();
    } catch {
      toast.error("An error occurred while revoking the invitation");
    } finally {
      setRevokingId(null);
    }
  };

  const emptyListMessage = isStudentOnboarding
    ? "No pending student invitations without a profile. When a student profile already exists, use Send invitation on Students → Profiles."
    : isInstructorOnboarding
      ? "No pending instructor invitations."
      : "No pending invitations. Create one above.";

  const listTitle = isStudentOnboarding
    ? "Student invitations without a profile"
    : isInstructorOnboarding
      ? "Pending instructor invitations"
      : "Pending invitation list";

  const cardTitle = isStudentOnboarding
    ? "Invite students without a profile yet"
    : isInstructorOnboarding
      ? "Instructor invitations"
      : "Pending invitations";

  const cardDescription = isStudentOnboarding ? (
    <>
      Use this when someone should register by email but does not have a student
      profile yet. If the student already has a profile, use{" "}
      <strong>Send invitation</strong> on <strong>Students → Profiles</strong>{" "}
      instead. Invite links are <strong>sensitive</strong> — copy when shown
      once after creation. Lists never show links or tokens.
    </>
  ) : isInstructorOnboarding ? (
    <>
      Invite instructors who should register themselves by email. Instructor
      invites are managed here until profile-level status is added. Invite links
      are <strong>sensitive</strong> — copy when shown once after creation.
      Lists never show links or tokens.
    </>
  ) : (
    <>
      Profile status on <strong>Students → Profiles</strong> is the primary view
      for linked student invites. Use this section for{" "}
      <strong>standalone or unlinked</strong> invites and for{" "}
      <strong>instructor</strong> invites. Invite links are{" "}
      <strong>sensitive</strong> — copy when shown once after creation. Lists
      never show links or tokens.
    </>
  );

  return (
    <Card className={embedded ? undefined : "mt-8"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailPlus className="h-5 w-5" />
          {cardTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground max-w-3xl">
          {cardDescription}
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-lg border p-4"
        >
          <h3 className="font-medium text-gray-900">Create invitation</h3>
          <div
            className={`grid grid-cols-1 gap-4 ${lockedRole ? "md:grid-cols-2" : "md:grid-cols-3"}`}
          >
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  createRole === "INSTRUCTOR"
                    ? "instructor@example.com"
                    : "student@example.com"
                }
                disabled={formBusy}
              />
            </div>
            {lockedRole ? (
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {lockedRole === "INSTRUCTOR" ? "Instructor" : "Student"}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as InvitableRole)}
                  disabled={formBusy}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-expires">Expires in (days)</Label>
              <Input
                id="invite-expires"
                type="number"
                min={1}
                max={30}
                required
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                disabled={formBusy}
              />
            </div>
          </div>
          <Button type="submit" disabled={formBusy}>
            {createLoading ? "Creating…" : "Create invitation"}
          </Button>
        </form>

        {createdInviteLink && (
          <Alert className="border-amber-300 bg-amber-50">
            <Link2 className="h-4 w-4 text-amber-800" />
            <AlertDescription className="space-y-3 text-amber-950">
              <p className="font-medium">
                Private invite link — copy now (shown once)
              </p>
              <p className="text-sm">
                Anyone with this URL can create an account. Do not post in chat,
                tickets, or email threads with broad visibility.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  readOnly
                  value={createdInviteLink}
                  className="font-mono text-sm bg-white"
                  aria-label="Invite link"
                />
                <Button
                  type="button"
                  variant={linkCopied ? "default" : "outline"}
                  onClick={handleCopyLink}
                  className="shrink-0"
                  disabled={formBusy}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {linkCopied ? "Copied!" : "Copy invite link"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Collapsible defaultOpen className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger className="group flex flex-1 items-center justify-between gap-2 text-left font-medium text-gray-900 hover:text-gray-950">
              <span>
                {listTitle}
                {pendingCount > 0 ? ` (${pendingCount})` : ""}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadInvitations}
              disabled={listLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${listLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <CollapsibleContent className="space-y-4">
            {listError && (
              <Alert variant="destructive">
                <AlertDescription>{listError}</AlertDescription>
              </Alert>
            )}

            {listLoading && visibleInvitations.length === 0 && !listError && (
              <p className="text-sm text-muted-foreground">
                Loading pending invitations…
              </p>
            )}

            {!listLoading && visibleInvitations.length === 0 && !listError && (
              <p className="text-sm text-muted-foreground">
                {emptyListMessage}
              </p>
            )}

            {isStudentOnboarding && linkedStudentInviteCount > 0 && (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed bg-muted/30 px-3 py-2">
                {linkedStudentInviteCount === 1
                  ? "1 invitation tied to an existing student profile is not shown here. "
                  : `${linkedStudentInviteCount} invitations tied to existing student profiles are not shown here. `}
                {STUDENT_LINKED_INVITES_ON_PROFILES_COPY}
              </p>
            )}

            <div className="space-y-3">
              {visibleInvitations.map((invitation) => {
                const displayStatus = getInvitationDisplayStatus(invitation);
                const isExpired = displayStatus === "Expired";

                return (
                  <div
                    key={invitation.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-medium truncate">
                        {invitation.email}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        {!roleFilter ? (
                          <span>Role: {invitation.role}</span>
                        ) : null}
                        {isStudentOnboarding ? (
                          <span>No student profile yet</span>
                        ) : isInstructorOnboarding ? (
                          <span>Awaiting instructor registration</span>
                        ) : invitation.studentId ? (
                          <span>Also on Students → Profiles</span>
                        ) : (
                          <span>Not linked to a student profile</span>
                        )}
                        <span>
                          Expires:{" "}
                          {formatInvitationDateTime(invitation.expiresAt)}
                        </span>
                        <span>
                          Created:{" "}
                          {formatInvitationDateTime(invitation.createdAt)}
                        </span>
                      </div>
                      {isExpired ? (
                        <p className="text-sm text-destructive">
                          {INVITATION_EXPIRED_ADMIN_ACTION_COPY}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={displayStatusBadgeVariant(displayStatus)}>
                        {invitationDisplayStatusLabel(displayStatus)}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={revokingId === invitation.id}
                        onClick={() => handleRevoke(invitation)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        {revokingId === invitation.id ? "Revoking…" : "Revoke"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
