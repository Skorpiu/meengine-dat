"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  buildInstructorQualifiedCategoriesPatchBody,
  buildInstructorUserUpdateBody,
  formatInstructorQualifiedCategoriesLabel,
  hasInstructorProfileFormChanges,
  hasInstructorQualifiedCategoryChanges,
  instructorQualifiedCategoriesApiErrorMessage,
  INSTRUCTOR_PROFILE_ROW_DELETE_LABEL,
  INSTRUCTOR_PROFILE_ROW_EDIT_LABEL,
  toInstructorEditForm,
  type InstructorEditForm,
} from "@/lib/instructors/instructor-record-edit-ui-utils";
import {
  formatDeactivateSuccessToast,
  getInstructorDeactivateConfirmActionLabel,
  getInstructorDeactivateUiState,
  canShowDeactivateInstructorInEditDialog,
  getInstructorEditDeactivateHelpText,
  INSTRUCTOR_EDIT_DEACTIVATE_ACTION_LABEL,
  instructorRecordDeactivateApiErrorMessage,
} from "@/lib/instructors/instructor-record-deactivate-ui-utils";
import {
  formatReactivateSuccessToast,
  getInstructorReactivateConfirmActionLabel,
  getInstructorReactivateUiState,
  canShowReactivateInstructorInEditDialog,
  getInstructorEditReactivateHelpText,
  INSTRUCTOR_EDIT_REACTIVATE_ACTION_LABEL,
  instructorRecordReactivateApiErrorMessage,
} from "@/lib/instructors/instructor-record-reactivate-ui-utils";
import {
  getInstructorDeleteConfirmActionLabel,
  getInstructorDeleteUiState,
  instructorRecordDeleteApiErrorMessage,
  mapInstructorDeleteBlockCodesToMessages,
} from "@/lib/instructors/instructor-record-delete-ui-utils";
import {
  filterInstructorRecordUsersBySearch,
  formatInstructorLicenseExpiry,
  formatInstructorProfileContactLine,
  getInstructorAppAccessSectionTheme,
  getInstructorEditAppAccessStatusBadge,
  getInstructorPeopleStatusBadge,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
} from "@/lib/instructors/instructor-record-ui-utils";
import { isInvitePendingInstructorLicenseNumber } from "@/lib/instructors/instructor-license-utils";
import { PeopleProfileLabelGuide } from "@/components/admin/people-profile-label-guide";
import { PeopleProfileAvatar } from "@/components/people/people-profile-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChangeInstructorEmailButton,
  InstructorEmailChangeDialog,
} from "@/components/admin/instructor-email-change-dialog";
import { canShowChangeInstructorEmailAction } from "@/lib/instructors/instructor-email-change-ui-utils";

const INSTRUCTOR_PAGE_SIZE = 15;

type CategoryOption = {
  id: number;
  name: string;
};

type InstructorRecordsManagerProps = {
  users: InstructorRecordUserDto[];
  categories?: CategoryOption[];
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

type DeactivateDialogState = {
  user: InstructorRecordUserDto;
  allowed: boolean;
  title: string;
  blockMessages: string[];
  confirmMessages: string[];
  footerNote: string;
};

type ReactivateDialogState = {
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
  categories = [],
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
  const [deactivateDialog, setDeactivateDialog] =
    useState<DeactivateDialogState | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [reactivateDialog, setReactivateDialog] =
    useState<ReactivateDialogState | null>(null);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deactivatedUserIds, setDeactivatedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [reactivatedUserIds, setReactivatedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [changeEmailUser, setChangeEmailUser] =
    useState<InstructorRecordUserDto | null>(null);
  const [emailUpdatesByUserId, setEmailUpdatesByUserId] = useState<
    Record<string, string>
  >({});

  const applyLocalProfileState = useCallback(
    (user: InstructorRecordUserDto): InstructorRecordUserDto => {
      const emailOverride = emailUpdatesByUserId[user.id];
      const baseUser = emailOverride ? { ...user, email: emailOverride } : user;

      if (removedUserIds.has(baseUser.id)) {
        return baseUser;
      }
      if (deactivatedUserIds.has(baseUser.id)) {
        return {
          ...baseUser,
          isApproved: false,
          instructor: baseUser.instructor
            ? { ...baseUser.instructor, isAvailableForBooking: false }
            : baseUser.instructor,
        };
      }
      if (reactivatedUserIds.has(baseUser.id)) {
        return {
          ...baseUser,
          isApproved: true,
          instructor: baseUser.instructor
            ? { ...baseUser.instructor, isAvailableForBooking: true }
            : baseUser.instructor,
        };
      }
      return baseUser;
    },
    [
      removedUserIds,
      deactivatedUserIds,
      reactivatedUserIds,
      emailUpdatesByUserId,
    ],
  );

  const visibleUsers = useMemo(
    () =>
      users
        .filter((user) => !removedUserIds.has(user.id))
        .map(applyLocalProfileState),
    [users, removedUserIds, applyLocalProfileState],
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

    const needsProfileUpdate = hasInstructorProfileFormChanges(
      editForm,
      editOriginal,
    );
    const needsCategoriesUpdate = hasInstructorQualifiedCategoryChanges(
      editForm,
      editOriginal,
    );

    if (!needsProfileUpdate && !needsCategoriesUpdate) {
      toast.error("No changes to save.");
      return;
    }

    if (needsProfileUpdate) {
      if (!editForm.instructorLicenseNumber.trim()) {
        toast.error("Instructor license number is required.");
        return;
      }
      if (!editForm.instructorLicenseExpiry) {
        toast.error("Instructor license expiry is required.");
        return;
      }
    }

    const instructorId = editingUser.instructor?.id;
    if (needsCategoriesUpdate && !instructorId) {
      toast.error(
        "Cannot update qualified categories without an operational instructor record.",
      );
      return;
    }

    setEditLoading(true);
    try {
      if (needsProfileUpdate) {
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
      }

      if (needsCategoriesUpdate && instructorId) {
        const patchResponse = await fetch(
          `/api/admin/instructors/${encodeURIComponent(instructorId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              buildInstructorQualifiedCategoriesPatchBody({ form: editForm }),
            ),
          },
        );
        const patchData = await tryReadJson<{
          error?: string;
          code?: string;
        }>(patchResponse);

        if (!patchResponse.ok) {
          toast.error(
            instructorQualifiedCategoriesApiErrorMessage(
              patchData?.code ?? patchData?.error,
              patchData?.error ||
                "Failed to update instructor qualified categories.",
            ),
          );
          if (needsProfileUpdate) {
            toast.error(
              "Instructor profile was saved, but qualified categories could not be updated.",
            );
          }
          return;
        }
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

  const toggleQualifiedCategory = (categoryName: string) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const selected = prev.selectedCategories.includes(categoryName)
        ? prev.selectedCategories.filter((name) => name !== categoryName)
        : [...prev.selectedCategories, categoryName];
      return { ...prev, selectedCategories: selected };
    });
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

  const handleDeactivateConfirm = async () => {
    if (!deactivateDialog?.allowed) return;
    const target = deactivateDialog.user;
    const instructorId = target.instructor?.id;
    if (!instructorId) return;

    setDeactivateLoading(true);
    try {
      const response = await fetch(
        `/api/admin/instructors/${encodeURIComponent(instructorId)}/deactivate`,
        { method: "POST" },
      );
      const data = await tryReadJson<{
        code?: string;
        error?: string;
        data?: {
          deactivated?: boolean;
          alreadyInactive?: boolean;
          warningCodes?: string[];
          futureLessonsCount?: number;
        };
      }>(response);

      if (!response.ok) {
        toast.error(
          instructorRecordDeactivateApiErrorMessage(
            data?.code,
            data?.error || "Could not deactivate this instructor.",
          ),
        );
        return;
      }

      toast.success(
        formatDeactivateSuccessToast({
          alreadyInactive: data?.data?.alreadyInactive,
          warningCodes: data?.data?.warningCodes,
          futureLessonsCount: data?.data?.futureLessonsCount,
        }),
      );
      setDeactivateDialog(null);
      setDeactivatedUserIds((prev) => new Set(prev).add(target.id));
      setReactivatedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      if (editingUser?.id === target.id) {
        setEditingUser((prev) =>
          prev
            ? {
                ...prev,
                isApproved: false,
                instructor: prev.instructor
                  ? { ...prev.instructor, isAvailableForBooking: false }
                  : prev.instructor,
              }
            : prev,
        );
      }
      router.refresh();
    } catch {
      toast.error("An error occurred while deactivating.");
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleReactivateConfirm = async () => {
    if (!reactivateDialog?.allowed) return;
    const target = reactivateDialog.user;
    const instructorId = target.instructor?.id;
    if (!instructorId) return;

    setReactivateLoading(true);
    try {
      const response = await fetch(
        `/api/admin/instructors/${encodeURIComponent(instructorId)}/reactivate`,
        { method: "POST" },
      );
      const data = await tryReadJson<{
        code?: string;
        error?: string;
        data?: {
          reactivated?: boolean;
          alreadyActive?: boolean;
        };
      }>(response);

      if (!response.ok) {
        toast.error(
          instructorRecordReactivateApiErrorMessage(
            data?.code,
            data?.error || "Could not reactivate this instructor.",
          ),
        );
        return;
      }

      toast.success(
        formatReactivateSuccessToast({
          alreadyActive: data?.data?.alreadyActive,
        }),
      );
      setReactivateDialog(null);
      setReactivatedUserIds((prev) => new Set(prev).add(target.id));
      setDeactivatedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      if (editingUser?.id === target.id) {
        setEditingUser((prev) =>
          prev
            ? {
                ...prev,
                isApproved: true,
                instructor: prev.instructor
                  ? { ...prev.instructor, isAvailableForBooking: true }
                  : prev.instructor,
              }
            : prev,
        );
      }
      router.refresh();
    } catch {
      toast.error("An error occurred while reactivating.");
    } finally {
      setReactivateLoading(false);
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
              license details. Pending invitations before registration are on{" "}
              <strong>Onboarding</strong>; after acceptance, status appears here
              as <strong>App access pending approval</strong>,{" "}
              <strong>Active</strong>, or <strong>Inactive</strong>.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 max-w-3xl">
          Instructor profiles — post-account states only (Active, App access
          pending approval, or Inactive). Pending invitations before
          registration are on <strong>Onboarding</strong>.
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
                    const hasPlaceholderLicense =
                      isInvitePendingInstructorLicenseNumber(
                        user.instructor?.instructorLicenseNumber,
                      );
                    const statusBadge = getInstructorPeopleStatusBadge(user);
                    return (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <PeopleProfileAvatar
                            firstName={user.firstName}
                            lastName={user.lastName}
                          />
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
                                  Operational instructor profile linked to an
                                  app login account.
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={statusBadge.variant}
                                    className={statusBadge.className}
                                  >
                                    {statusBadge.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {statusBadge.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-sm text-gray-600">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatInstructorProfileContactLine(user)}
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
                                <div>
                                  Qualified:{" "}
                                  <span className="font-medium">
                                    {formatInstructorQualifiedCategoriesLabel(
                                      user.instructor?.qualifiedCategories,
                                    )}
                                  </span>
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
                            ) : hasPlaceholderLicense ? (
                              <Alert variant="destructive" className="py-2">
                                <AlertDescription className="text-sm">
                                  License data needs correction. Use{" "}
                                  {INSTRUCTOR_PROFILE_ROW_EDIT_LABEL} to enter
                                  the real license number and expiration date.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert variant="destructive" className="py-2">
                                <AlertDescription className="text-sm">
                                  App account exists but no operational
                                  Instructor record is linked. Use{" "}
                                  {INSTRUCTOR_PROFILE_ROW_EDIT_LABEL} to add
                                  license details, or contact support if this
                                  persists.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
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
          {editForm && editingUser
            ? (() => {
                const appAccessTheme = getInstructorAppAccessSectionTheme();
                const editAccessBadge =
                  getInstructorEditAppAccessStatusBadge(editingUser);
                return (
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
                                prev
                                  ? { ...prev, firstName: e.target.value }
                                  : prev,
                              )
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-instructor-lastName">
                            Last name
                          </Label>
                          <Input
                            id="edit-instructor-lastName"
                            value={editForm.lastName}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? { ...prev, lastName: e.target.value }
                                  : prev,
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
                              prev
                                ? { ...prev, phoneNumber: e.target.value }
                                : prev,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-instructor-profile-address">
                          Address
                        </Label>
                        <Input
                          id="edit-instructor-profile-address"
                          value={editForm.address}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? { ...prev, address: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="Residential or contact address"
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
                      {editingUser.instructor?.id && categories.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Qualified license categories</Label>
                          <p className="text-xs text-gray-500">
                            Required for practical (driving) lessons. Select
                            every license category this instructor is qualified
                            to teach.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded border">
                            {categories.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`edit-instructor-cat-${category.id}`}
                                  checked={editForm.selectedCategories.includes(
                                    category.name,
                                  )}
                                  onCheckedChange={() =>
                                    toggleQualifiedCategory(category.name)
                                  }
                                />
                                <label
                                  htmlFor={`edit-instructor-cat-${category.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {category.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          {editForm.selectedCategories.length === 0 ? (
                            <p className="text-xs text-amber-700">
                              No categories selected — practical driving lessons
                              cannot be booked for this instructor.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
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
                      className={appAccessTheme.containerClass}
                    >
                      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                        <span className={appAccessTheme.triggerTitleClass}>
                          App access
                        </span>
                        <ChevronRight
                          className={`${appAccessTheme.triggerIconClass} transition-transform group-data-[state=open]:rotate-90`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 px-4 pb-4">
                        <p className={appAccessTheme.bodyTextClass}>
                          Login status for the linked app account. Name, phone,
                          and address are edited in Instructor profile above.
                        </p>
                        <div className="space-y-2">
                          <Label>Login email</Label>
                          <p className={`text-sm font-medium text-blue-950`}>
                            {editingUser.email}
                          </p>
                          <p className={appAccessTheme.mutedTextClass}>
                            Login email cannot be changed in the profile form.
                          </p>
                          {canShowChangeInstructorEmailAction(editingUser) ? (
                            <ChangeInstructorEmailButton
                              onClick={() => setChangeEmailUser(editingUser)}
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={appAccessTheme.labelTextClass}>
                            Access status:
                          </span>
                          <Badge variant={editAccessBadge.variant}>
                            {editAccessBadge.label}
                          </Badge>
                        </div>
                        {canShowDeactivateInstructorInEditDialog(
                          editingUser,
                        ) ? (
                          <div className="border-t border-blue-200 pt-4 space-y-3">
                            <p
                              className={`${appAccessTheme.mutedTextClass} mb-0`}
                            >
                              {getInstructorEditDeactivateHelpText()}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                              onClick={() => {
                                const ui =
                                  getInstructorDeactivateUiState(editingUser);
                                setDeactivateDialog({
                                  user: editingUser,
                                  allowed: ui.allowed,
                                  title: ui.title,
                                  blockMessages: ui.blockMessages,
                                  confirmMessages: ui.confirmMessages,
                                  footerNote: ui.footerNote,
                                });
                              }}
                            >
                              {INSTRUCTOR_EDIT_DEACTIVATE_ACTION_LABEL}
                            </Button>
                          </div>
                        ) : null}
                        {canShowReactivateInstructorInEditDialog(
                          editingUser,
                        ) ? (
                          <div className="border-t border-blue-200 pt-4 space-y-3">
                            <p
                              className={`${appAccessTheme.mutedTextClass} mb-0`}
                            >
                              {getInstructorEditReactivateHelpText()}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                              onClick={() => {
                                const ui =
                                  getInstructorReactivateUiState(editingUser);
                                setReactivateDialog({
                                  user: editingUser,
                                  allowed: ui.allowed,
                                  title: ui.title,
                                  blockMessages: ui.blockMessages,
                                  confirmMessages: ui.confirmMessages,
                                  footerNote: ui.footerNote,
                                });
                              }}
                            >
                              {INSTRUCTOR_EDIT_REACTIVATE_ACTION_LABEL}
                            </Button>
                          </div>
                        ) : null}
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
                );
              })()
            : null}
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

      <AlertDialog
        open={deactivateDialog !== null}
        onOpenChange={(open) => {
          if (!open && !deactivateLoading) setDeactivateDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deactivateDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {deactivateDialog?.allowed ? (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {deactivateDialog.confirmMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{deactivateDialog.footerNote}</p>
                  </>
                ) : (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {deactivateDialog?.blockMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{deactivateDialog?.footerNote}</p>
                  </>
                )}
                {deactivateDialog ? (
                  <p>
                    Instructor:{" "}
                    <span className="font-medium text-foreground">
                      {getInstructorRecordDisplayName(deactivateDialog.user)}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateLoading}>
              {deactivateDialog?.allowed ? "Cancel" : "Close"}
            </AlertDialogCancel>
            {deactivateDialog?.allowed ? (
              <AlertDialogAction
                disabled={deactivateLoading}
                className="bg-amber-600 hover:bg-amber-700"
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeactivateConfirm();
                }}
              >
                {deactivateLoading
                  ? "Deactivating…"
                  : getInstructorDeactivateConfirmActionLabel()}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={reactivateDialog !== null}
        onOpenChange={(open) => {
          if (!open && !reactivateLoading) setReactivateDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{reactivateDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {reactivateDialog?.allowed ? (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {reactivateDialog.confirmMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{reactivateDialog.footerNote}</p>
                  </>
                ) : (
                  <>
                    <ul className="list-disc pl-5 space-y-1">
                      {reactivateDialog?.blockMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{reactivateDialog?.footerNote}</p>
                  </>
                )}
                {reactivateDialog ? (
                  <p>
                    Instructor:{" "}
                    <span className="font-medium text-foreground">
                      {getInstructorRecordDisplayName(reactivateDialog.user)}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivateLoading}>
              {reactivateDialog?.allowed ? "Cancel" : "Close"}
            </AlertDialogCancel>
            {reactivateDialog?.allowed ? (
              <AlertDialogAction
                disabled={reactivateLoading}
                className="bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.preventDefault();
                  void handleReactivateConfirm();
                }}
              >
                {reactivateLoading
                  ? "Reactivating…"
                  : getInstructorReactivateConfirmActionLabel()}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InstructorEmailChangeDialog
        user={changeEmailUser}
        open={changeEmailUser !== null}
        onOpenChange={(open) => {
          if (!open) setChangeEmailUser(null);
        }}
        onSuccess={(updated) => {
          setEmailUpdatesByUserId((prev) => ({
            ...prev,
            [updated.id]: updated.email,
          }));
          if (editingUser?.id === updated.id) {
            setEditingUser(updated);
          }
          router.refresh();
        }}
      />
    </section>
  );
}
