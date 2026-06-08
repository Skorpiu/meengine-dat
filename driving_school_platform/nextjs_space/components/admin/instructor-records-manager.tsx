"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit2, ChevronRight, Search, Trash2, UserCog } from "lucide-react";
import type { InstructorRecordUserDto } from "@/lib/instructors/instructor-record-ui-types";
import {
  buildInstructorUserUpdateBody,
  hasInstructorEditFormChanges,
  INSTRUCTOR_PROFILE_ROW_DELETE_LABEL,
  INSTRUCTOR_PROFILE_ROW_EDIT_LABEL,
  toInstructorEditForm,
  type InstructorEditForm,
} from "@/lib/instructors/instructor-record-edit-ui-utils";
import {
  getInstructorDeleteConfirmActionLabel,
  getInstructorDeleteUiState,
  instructorRecordDeleteApiErrorMessage,
  mapInstructorDeleteBlockCodesToMessages,
} from "@/lib/instructors/instructor-record-delete-ui-utils";
import {
  filterInstructorRecordUsersBySearch,
  formatInstructorLicenseExpiry,
  getInstructorAppAccountStatusLabel,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
} from "@/lib/instructors/instructor-record-ui-utils";
import { PeopleProfileLabelGuide } from "@/components/admin/people-profile-label-guide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const INSTRUCTOR_PAGE_SIZE = 15;

type InstructorRecordsManagerProps = {
  users: InstructorRecordUserDto[];
  embedded?: boolean;
};

type DeleteDialogState = {
  user: InstructorRecordUserDto;
  allowed: boolean;
  title: string;
  blockMessages: string[];
  confirmMessages: string[];
  footerNote: string;
};

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

export function InstructorRecordsManager({
  users,
  embedded = false,
}: InstructorRecordsManagerProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INSTRUCTOR_PAGE_SIZE);
  const [editingUser, setEditingUser] =
    useState<InstructorRecordUserDto | null>(null);
  const [editForm, setEditForm] = useState<InstructorEditForm | null>(null);
  const [editOriginal, setEditOriginal] = useState<InstructorEditForm | null>(
    null,
  );
  const [editLoading, setEditLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(
    () => new Set(),
  );

  const visibleUsers = useMemo(
    () => users.filter((user) => !removedUserIds.has(user.id)),
    [users, removedUserIds],
  );

  const filteredInstructors = useMemo(
    () => filterInstructorRecordUsersBySearch(visibleUsers, appliedSearch),
    [visibleUsers, appliedSearch],
  );

  const visibleInstructors = useMemo(
    () => filteredInstructors.slice(0, visibleCount),
    [filteredInstructors, visibleCount],
  );

  const hasMore = visibleCount < filteredInstructors.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setVisibleCount(INSTRUCTOR_PAGE_SIZE);
  };

  const openEdit = (user: InstructorRecordUserDto) => {
    const form = toInstructorEditForm(user);
    setEditingUser(user);
    setEditForm(form);
    setEditOriginal(form);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
    setEditOriginal(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm || !editOriginal) return;

    if (!hasInstructorEditFormChanges(editForm, editOriginal)) {
      toast.error("No changes to save.");
      return;
    }

    if (!editForm.instructorLicenseNumber.trim()) {
      toast.error("Instructor license number is required.");
      return;
    }
    if (!editForm.instructorLicenseExpiry) {
      toast.error("Instructor license expiry is required.");
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildInstructorUserUpdateBody({
            userId: editingUser.id,
            form: editForm,
          }),
        ),
      });
      const data = await tryReadJson<{ error?: string }>(response);

      if (!response.ok) {
        toast.error(data?.error || "Failed to update instructor.");
        return;
      }

      toast.success("Instructor updated.");
      closeEdit();
      router.refresh();
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog?.allowed) return;
    const target = deleteDialog.user;
    const instructorId = target.instructor?.id;
    if (!instructorId) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(
        `/api/admin/instructors/${encodeURIComponent(instructorId)}`,
        { method: "DELETE" },
      );
      const data = await tryReadJson<{
        code?: string;
        codes?: string[];
        error?: string;
      }>(response);

      if (!response.ok) {
        const message = instructorRecordDeleteApiErrorMessage(
          data?.code,
          data?.error || "Could not delete this instructor.",
        );
        toast.error(message);
        if (data?.code || data?.codes?.length) {
          setDeleteDialog({
            user: target,
            allowed: false,
            title: "Delete not available",
            blockMessages: mapInstructorDeleteBlockCodesToMessages(
              data?.codes ?? (data?.code ? [data.code] : undefined),
              message,
            ),
            confirmMessages: [],
            footerNote: getInstructorDeleteUiState(target).footerNote,
          });
        }
        return;
      }

      toast.success("Instructor removed.");
      setDeleteDialog(null);
      setRemovedUserIds((prev) => new Set(prev).add(target.id));
      if (editingUser?.id === target.id) {
        closeEdit();
      }
      router.refresh();
    } catch {
      toast.error("An error occurred while deleting.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section className={embedded ? "space-y-6" : "mt-10 space-y-6"}>
      {!embedded ? (
        <div className="flex items-start gap-3">
          <UserCog className="h-8 w-8 text-driving-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Instructors</h2>
            <p className="text-gray-600 mt-1 max-w-3xl">
              Instructor operational profiles are linked to app login accounts.
              Each instructor has a User account and an Instructor record with
              license details. To grant access for a new instructor, use the{" "}
              <strong>Onboarding</strong> tab.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 max-w-3xl">
          Instructor profiles — search by name, email, or license number. Add
          new instructors under <strong>Onboarding</strong>.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Instructor profiles</CardTitle>
            <form
              onSubmit={handleSearch}
              className="flex w-full sm:w-auto gap-2"
            >
              <Input
                placeholder="Name, email, or license number"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="sm:min-w-[280px]"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <PeopleProfileLabelGuide variant="instructor" />
        </CardHeader>
        <CardContent>
          {filteredInstructors.length === 0 ? (
            <p className="text-sm text-gray-500">
              {appliedSearch
                ? "No instructor profiles found for this search."
                : "No instructors registered yet. Add an instructor under Onboarding."}
            </p>
          ) : (
            <>
              <TooltipProvider delayDuration={300}>
                <div className="space-y-3">
                  {visibleInstructors.map((user) => {
                    const hasRecord = hasOperationalInstructorRecord(user);
                    const appAccessLabel = getInstructorAppAccountStatusLabel(
                      user.isApproved,
                    );
                    return (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {getInstructorRecordDisplayName(user)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline">Instructor</Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                Operational instructor profile linked to an app
                                login account.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={
                                    user.isApproved ? "secondary" : "default"
                                  }
                                >
                                  {appAccessLabel}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {user.isApproved
                                  ? "Instructor can sign in (account approved)."
                                  : "Account exists but is not approved yet."}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-sm text-gray-600">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.phoneNumber || "No phone"} · App account
                            linked
                          </div>
                          {hasRecord ? (
                            <div className="text-sm text-gray-600 space-y-0.5">
                              <div>
                                License:{" "}
                                <span className="font-mono">
                                  {user.instructor?.instructorLicenseNumber}
                                </span>
                              </div>
                              <div>
                                License expires:{" "}
                                {formatInstructorLicenseExpiry(
                                  user.instructor?.instructorLicenseExpiry,
                                )}
                              </div>
                              {user.instructor?.instructorIdNumber ? (
                                <div className="text-xs text-gray-500">
                                  Instructor ID:{" "}
                                  <span className="font-mono">
                                    {user.instructor.instructorIdNumber}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <Alert variant="destructive" className="py-2">
                              <AlertDescription className="text-sm">
                                App account exists but no operational Instructor
                                record is linked. Use{" "}
                                {INSTRUCTOR_PROFILE_ROW_EDIT_LABEL} to add
                                license details, or contact support if this
                                persists.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(user)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {INSTRUCTOR_PROFILE_ROW_EDIT_LABEL}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const ui = getInstructorDeleteUiState(user);
                              setDeleteDialog({
                                user,
                                allowed: ui.allowed,
                                title: ui.title,
                                blockMessages: ui.blockMessages,
                                confirmMessages: ui.confirmMessages,
                                footerNote: ui.footerNote,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {INSTRUCTOR_PROFILE_ROW_DELETE_LABEL}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>

              {hasMore ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setVisibleCount((n) => n + INSTRUCTOR_PAGE_SIZE)
                    }
                  >
                    Load more
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-gray-400 mt-4 text-center">
                Showing {visibleInstructors.length} of{" "}
                {filteredInstructors.length} instructor profile
                {filteredInstructors.length === 1 ? "" : "s"}
                {appliedSearch ? " (search active)" : ""}.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingUser !== null && editForm !== null}
        onOpenChange={(open) => {
          if (!open && !editLoading) closeEdit();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{INSTRUCTOR_PROFILE_ROW_EDIT_LABEL}</DialogTitle>
            <DialogDescription>
              Update this instructor&apos;s profile and linked app access
              details.
            </DialogDescription>
          </DialogHeader>
          {editForm && editingUser ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Instructor profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-instructor-firstName">
                      First name
                    </Label>
                    <Input
                      id="edit-instructor-firstName"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, firstName: e.target.value } : prev,
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-instructor-lastName">Last name</Label>
                    <Input
                      id="edit-instructor-lastName"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, lastName: e.target.value } : prev,
                        )
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-instructor-phone">Phone</Label>
                  <Input
                    id="edit-instructor-phone"
                    value={editForm.phoneNumber}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, phoneNumber: e.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-instructor-license">
                      Instructor license number
                    </Label>
                    <Input
                      id="edit-instructor-license"
                      value={editForm.instructorLicenseNumber}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                instructorLicenseNumber: e.target.value,
                              }
                            : prev,
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-instructor-license-expiry">
                      Instructor license expiry
                    </Label>
                    <Input
                      id="edit-instructor-license-expiry"
                      type="date"
                      value={editForm.instructorLicenseExpiry}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                instructorLicenseExpiry: e.target.value,
                              }
                            : prev,
                        )
                      }
                      required
                    />
                  </div>
                </div>
                {editingUser.instructor?.instructorIdNumber ? (
                  <div className="space-y-1">
                    <Label>Instructor ID</Label>
                    <p className="text-sm font-mono text-gray-700">
                      {editingUser.instructor.instructorIdNumber}
                    </p>
                    <p className="text-xs text-gray-500">Read-only.</p>
                  </div>
                ) : null}
              </div>

              <Collapsible
                defaultOpen
                className="rounded-lg border border-green-100 bg-green-50/60"
              >
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                  <span className="font-medium text-green-900">App access</span>
                  <ChevronRight className="h-4 w-4 text-green-700 transition-transform group-data-[state=open]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-4 pb-4">
                  <p className="text-sm text-green-800">
                    Login details for the linked app account. Name and phone are
                    edited once in Instructor profile above.
                  </p>
                  <div className="space-y-1">
                    <Label>Login email</Label>
                    <p className="text-sm font-medium text-green-950">
                      {editingUser.email}
                    </p>
                    <p className="text-xs text-green-700">
                      Login email cannot be changed here.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-green-900">
                      App access status:
                    </span>
                    <Badge
                      variant={editingUser.isApproved ? "secondary" : "default"}
                    >
                      {getInstructorAppAccountStatusLabel(
                        editingUser.isApproved,
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-instructor-address">Address</Label>
                    <Input
                      id="edit-instructor-address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, address: e.target.value } : prev,
                        )
                      }
                      placeholder="Address on app account"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEdit}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving…" : "Save Instructor"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {deleteDialog?.allowed ? (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {deleteDialog.confirmMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{deleteDialog.footerNote}</p>
                  </>
                ) : (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {deleteDialog?.blockMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{deleteDialog?.footerNote}</p>
                  </>
                )}
                {deleteDialog ? (
                  <p>
                    Instructor:{" "}
                    <span className="font-medium text-foreground">
                      {getInstructorRecordDisplayName(deleteDialog.user)}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              {deleteDialog?.allowed ? "Cancel" : "Close"}
            </AlertDialogCancel>
            {deleteDialog?.allowed ? (
              <AlertDialogAction
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteConfirm();
                }}
              >
                {deleteLoading
                  ? "Deleting…"
                  : getInstructorDeleteConfirmActionLabel()}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
