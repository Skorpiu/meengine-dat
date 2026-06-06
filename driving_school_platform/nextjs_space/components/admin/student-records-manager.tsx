"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  Download,
  Upload,
  Edit2,
  GraduationCap,
  MailPlus,
  RefreshCw,
  Search,
  Car,
  Trash2,
  UserX,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type {
  StudentRecordApiError,
  StudentRecordDto,
  StudentRecordMutationResponse,
  StudentRecordsListResponse,
} from "@/lib/students/student-record-ui-types";
import type { LinkedStudentUserUpdateForm } from "@/lib/students/student-record-ui-utils";
import {
  buildManualStudentPatchPayload,
  buildLinkedStudentUserUpdateBody,
  canSendStudentRecordInvite,
  canShowStudentAppAccessSection,
  canShowStudentPendingInvitationSection,
  formatEnrollmentDateInputValue,
  formatStudentRecordDate,
  getStudentCanonicalEmailDisplay,
  getStudentRecordDisplayName,
  hasLinkedStudentUserFormChanges,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
  toLinkedStudentUserUpdateForm,
} from "@/lib/students/student-record-ui-utils";
import {
  getStudentDeleteBlockedModalFooterNote,
  getStudentDeleteUiState,
} from "@/lib/students/student-record-delete-ui-utils";
import {
  canShowRemoveStudentAppAccessAction,
  REMOVE_STUDENT_APP_ACCESS_MODAL,
} from "@/lib/students/student-app-access-remove-ui-utils";
import { getStudentAppAccessCompactBadges } from "@/lib/students/student-app-access-summary-utils";
import {
  canRevokeStudentRecordInvitation,
  getStudentAppAccessDetailLines,
} from "@/lib/students/student-record-invitation-ui-utils";
import { getStudentProfileRowBadges } from "@/lib/students/student-profile-label-utils";
import { PeopleProfileLabelGuide } from "@/components/admin/people-profile-label-guide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { invitationApiErrorMessage } from "@/lib/invitations/invitation-ui-utils";
import { StudentPracticalHistoryDialog } from "@/components/admin/student-practical-history-dialog";
import { StudentRecordInviteDialog } from "@/components/admin/student-record-invite-dialog";
import { StudentRecordsImportDialog } from "@/components/admin/student-records-import-dialog";
import {
  fetchStudentRecordsExport,
  type StudentRecordsExportFormat,
} from "@/lib/students/student-records-export-client";

const LIST_LIMIT = 15;

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

const emptyForm = () => ({
  yearSuffix: "",
  sequenceNumber: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  enrollmentDate: "",
  address: "",
  selectedCategories: [] as string[],
  transmissionType: "",
});

type StudentRecordFormState = ReturnType<typeof emptyForm>;

type CategoryOption = { id: number; name: string };
type TransmissionTypeOption = { id: number; name: string };

export type LinkedAppAccountDetails = {
  email: string;
  isApproved: boolean;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address: string | null;
  selectedCategories: string[];
  transmissionType: string;
};

function studentToForm(
  student: StudentRecordDto,
  linked: LinkedAppAccountDetails | null,
): StudentRecordFormState {
  const isAppUser = student.appAccessMode === "APP_USER";
  return {
    yearSuffix: student.schoolStudentYearSuffix ?? "",
    sequenceNumber:
      student.schoolStudentSequence != null
        ? String(student.schoolStudentSequence)
        : "",
    firstName:
      student.firstName?.trim() ||
      linked?.firstName ||
      student.user?.firstName ||
      "",
    lastName:
      student.lastName?.trim() ||
      linked?.lastName ||
      student.user?.lastName ||
      "",
    phoneNumber:
      student.phoneNumber?.trim() || linked?.phoneNumber?.trim() || "",
    email: isAppUser
      ? linked?.email || student.user?.email || student.email || ""
      : student.email || "",
    enrollmentDate: formatEnrollmentDateInputValue(student.enrollmentDate),
    address: linked?.address?.trim() || "",
    selectedCategories: linked?.selectedCategories ?? [],
    transmissionType: linked?.transmissionType ?? "",
  };
}

type StudentRecordsManagerProps = {
  embedded?: boolean;
  categories?: CategoryOption[];
  transmissionTypes?: TransmissionTypeOption[];
  getLinkedAppAccountDetails?: (
    userId: string,
  ) => LinkedAppAccountDetails | null;
};

export function StudentRecordsManager({
  embedded = false,
  categories = [],
  transmissionTypes = [],
  getLinkedAppAccountDetails,
}: StudentRecordsManagerProps = {}) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecordDto[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editingStudent, setEditingStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLinkedOriginal, setEditLinkedOriginal] =
    useState<LinkedStudentUserUpdateForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [inviteStudent, setInviteStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    student: StudentRecordDto;
    allowed: boolean;
    blockMessages: string[];
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [removeAppAccessDialog, setRemoveAppAccessDialog] =
    useState<StudentRecordDto | null>(null);
  const [removeAppAccessLoading, setRemoveAppAccessLoading] = useState(false);
  const [exportingFormat, setExportingFormat] =
    useState<StudentRecordsExportFormat | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    string | null
  >(null);
  const [linkedDetailsOverlay, setLinkedDetailsOverlay] = useState<
    Record<string, LinkedAppAccountDetails>
  >({});

  const getEffectiveLinkedDetails = useCallback(
    (userId: string): LinkedAppAccountDetails | null => {
      const base = getLinkedAppAccountDetails?.(userId) ?? null;
      const overlay = linkedDetailsOverlay[userId];
      if (overlay && base) {
        return { ...base, ...overlay };
      }
      return overlay ?? base;
    },
    [getLinkedAppAccountDetails, linkedDetailsOverlay],
  );

  const editPreviewId = useMemo(
    () => previewSchoolStudentId(editForm.yearSuffix, editForm.sequenceNumber),
    [editForm.yearSuffix, editForm.sequenceNumber],
  );

  const loadStudents = useCallback(
    async (options?: {
      search?: string;
      cursor?: string;
      append?: boolean;
    }) => {
      const search = options?.search ?? appliedSearch;
      const params = new URLSearchParams();
      params.set("limit", String(LIST_LIMIT));
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (options?.cursor) {
        params.set("cursor", options.cursor);
      }

      const isAppend = options?.append === true;
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setListLoading(true);
        setListError("");
      }

      try {
        const response = await fetch(
          `/api/admin/students?${params.toString()}`,
        );
        const data = await tryReadJson<
          StudentRecordsListResponse | StudentRecordApiError
        >(response);

        if (!response.ok) {
          const err = data as StudentRecordApiError | null;
          const message = studentRecordApiErrorMessage(
            err?.code,
            err?.error || "Failed to load student records",
          );
          if (!isAppend) {
            setListError(message);
            setStudents([]);
            setNextCursor(null);
          } else {
            toast.error(message);
          }
          return;
        }

        const list = data as StudentRecordsListResponse;
        const rows = list.data?.students ?? [];
        setNextCursor(list.data?.nextCursor ?? null);
        setStudents((prev) => (isAppend ? [...prev, ...rows] : rows));
      } catch {
        const message = "Failed to load student records";
        if (!isAppend) {
          setListError(message);
          setStudents([]);
        } else {
          toast.error(message);
        }
      } finally {
        setListLoading(false);
        setLoadingMore(false);
      }
    },
    [appliedSearch],
  );

  useEffect(() => {
    loadStudents({ search: appliedSearch });
  }, [appliedSearch, loadStudents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleExport = async (format: StudentRecordsExportFormat) => {
    setExportingFormat(format);
    try {
      const result = await fetchStudentRecordsExport(format, appliedSearch);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Download started (${result.filename}).`);
    } finally {
      setExportingFormat(null);
    }
  };

  const openEdit = (student: StudentRecordDto) => {
    const linked =
      student.userId != null ? getEffectiveLinkedDetails(student.userId) : null;
    const form = studentToForm(student, linked);
    setEditingStudent(student);
    setEditForm(form);
    setEditLinkedOriginal(
      linked
        ? toLinkedStudentUserUpdateForm({
            firstName: form.firstName,
            lastName: form.lastName,
            phoneNumber: form.phoneNumber,
            address: form.address,
            selectedCategories: form.selectedCategories,
            transmissionType: form.transmissionType,
          })
        : null,
    );
  };

  const handleRevokeInvitation = async (student: StudentRecordDto) => {
    const invitationId = student.pendingInvitation?.invitationId;
    if (!invitationId) {
      return;
    }

    const email =
      student.pendingInvitation?.email ?? student.email ?? "this student";
    if (
      !confirm(
        `Revoke the pending invitation for ${email}? The student record will return to no app account if no other pending invitation remains.`,
      )
    ) {
      return;
    }

    setRevokingInvitationId(invitationId);
    try {
      const response = await fetch(
        `/api/admin/invitations/${encodeURIComponent(invitationId)}/revoke`,
        { method: "POST" },
      );
      const data = await tryReadJson<{ error?: string; code?: string }>(
        response,
      );

      if (!response.ok) {
        toast.error(
          invitationApiErrorMessage(
            data?.code,
            data?.error || "Failed to revoke invitation",
            { forAdmin: true },
          ),
        );
        return;
      }

      toast.success("Invitation revoked.");
      await loadStudents({ search: appliedSearch });
    } catch {
      toast.error("An error occurred while revoking the invitation.");
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const closeEdit = () => {
    setEditingStudent(null);
    setEditForm(emptyForm());
    setEditLinkedOriginal(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog?.allowed) return;
    const target = deleteDialog.student;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${target.id}`, {
        method: "DELETE",
      });
      const data = await tryReadJson<{
        code?: string;
        codes?: string[];
        error?: string;
      }>(response);

      if (!response.ok) {
        const message = studentRecordApiErrorMessage(
          data?.code,
          data?.error || "Could not delete this student.",
        );
        toast.error(message);
        if (data?.code) {
          setDeleteDialog({
            student: target,
            allowed: false,
            blockMessages: [message],
          });
        }
        return;
      }

      toast.success("Student removed.");
      setDeleteDialog(null);
      setStudents((prev) => prev.filter((s) => s.id !== target.id));
      if (editingStudent?.id === target.id) {
        closeEdit();
      }
    } catch {
      toast.error("An error occurred while deleting the student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRemoveAppAccessConfirm = async () => {
    if (!removeAppAccessDialog) return;
    const target = removeAppAccessDialog;
    const previousUserId = target.userId;

    setRemoveAppAccessLoading(true);
    try {
      const response = await fetch(
        `/api/admin/students/${encodeURIComponent(target.id)}/app-access/remove`,
        { method: "POST" },
      );
      const data = await tryReadJson<
        StudentRecordMutationResponse | StudentRecordApiError
      >(response);

      if (!response.ok) {
        const err = data as StudentRecordApiError | null;
        toast.error(
          studentRecordApiErrorMessage(
            err?.code,
            err?.error || "Failed to remove app access.",
          ),
        );
        return;
      }

      const updated = (data as StudentRecordMutationResponse).data?.student;
      if (!updated) {
        toast.error("Failed to remove app access.");
        return;
      }

      toast.success("App access removed.");
      setRemoveAppAccessDialog(null);
      setStudents((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );

      if (previousUserId) {
        setLinkedDetailsOverlay((prev) => {
          const next = { ...prev };
          delete next[previousUserId];
          return next;
        });
      }

      if (editingStudent?.id === updated.id) {
        setEditingStudent(updated);
        const form = studentToForm(updated, null);
        setEditForm(form);
        setEditLinkedOriginal(null);
      }

      router.refresh();
    } catch {
      toast.error("An error occurred while removing app access.");
    } finally {
      setRemoveAppAccessLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const patch = buildManualStudentPatchPayload({
      ...editForm,
      original: editingStudent,
    });

    if (canShowStudentAppAccessSection(editingStudent)) {
      delete patch.email;
    }

    const linkedForm = toLinkedStudentUserUpdateForm({
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phoneNumber: editForm.phoneNumber,
      address: editForm.address,
      selectedCategories: editForm.selectedCategories,
      transmissionType: editForm.transmissionType,
    });

    const needsUserSync =
      canShowStudentAppAccessSection(editingStudent) &&
      editingStudent.userId != null &&
      hasLinkedStudentUserFormChanges(linkedForm, editLinkedOriginal);

    if (Object.keys(patch).length === 0 && !needsUserSync) {
      toast.error("No changes to save.");
      return;
    }

    if (patch.yearSuffix !== undefined) {
      const built = previewSchoolStudentId(
        patch.yearSuffix,
        String(patch.sequenceNumber ?? ""),
      );
      if (!built) {
        toast.error("Invalid enrollment year or enrollment number.");
        return;
      }
    }

    setEditLoading(true);
    try {
      if (Object.keys(patch).length > 0) {
        const response = await fetch(
          `/api/admin/students/${editingStudent.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        const data = await tryReadJson<
          StudentRecordMutationResponse | StudentRecordApiError
        >(response);

        if (!response.ok) {
          const err = data as StudentRecordApiError | null;
          toast.error(
            studentRecordApiErrorMessage(
              err?.code,
              err?.error || "Failed to update student",
            ),
          );
          return;
        }
      }

      if (needsUserSync && editingStudent.userId) {
        const userResponse = await fetch("/api/users/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildLinkedStudentUserUpdateBody({
              userId: editingStudent.userId,
              form: linkedForm,
            }),
          ),
        });
        const userData = await tryReadJson<{ error?: string }>(userResponse);
        if (!userResponse.ok) {
          toast.error(
            userData?.error || "Failed to update app access details.",
          );
          if (Object.keys(patch).length > 0) {
            toast.error(
              "Student profile was saved, but app access details could not be updated.",
            );
            await loadStudents({ search: appliedSearch });
          }
          return;
        }
      }

      toast.success("Student updated successfully.");

      if (needsUserSync && editingStudent.userId) {
        const prevLinked = getEffectiveLinkedDetails(editingStudent.userId);
        setLinkedDetailsOverlay((prev) => ({
          ...prev,
          [editingStudent.userId!]: {
            email:
              prevLinked?.email ?? editingStudent.user?.email ?? editForm.email,
            isApproved: prevLinked?.isApproved ?? true,
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phoneNumber: editForm.phoneNumber || null,
            address: editForm.address || null,
            selectedCategories: [...editForm.selectedCategories],
            transmissionType: editForm.transmissionType,
          },
        }));
      }

      closeEdit();
      router.refresh();
      await loadStudents({ search: appliedSearch });
    } catch {
      toast.error("An error occurred while updating the student.");
    } finally {
      setEditLoading(false);
    }
  };

  const renderIdFields = (
    form: StudentRecordFormState,
    setForm: React.Dispatch<React.SetStateAction<StudentRecordFormState>>,
    previewId: string | null,
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="yearSuffix">Enrollment year</Label>
        <Input
          id="yearSuffix"
          placeholder="26"
          maxLength={2}
          value={form.yearSuffix}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, yearSuffix: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sequenceNumber">Enrollment number</Label>
        <Input
          id="sequenceNumber"
          placeholder="1"
          inputMode="numeric"
          value={form.sequenceNumber}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, sequenceNumber: e.target.value }))
          }
        />
      </div>
      {previewId ? (
        <p className="sm:col-span-2 text-sm text-gray-600">
          Generated ID:{" "}
          <span className="font-mono font-medium">{previewId}</span>
        </p>
      ) : null}
    </div>
  );

  const toggleEditCategory = (category: string) => {
    setEditForm((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter((c) => c !== category)
        : [...prev.selectedCategories, category],
    }));
  };

  const renderContactFields = (
    form: StudentRecordFormState,
    setForm: React.Dispatch<React.SetStateAction<StudentRecordFormState>>,
    idPrefix: string,
    options?: { hideEmail?: boolean },
  ) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-firstName`}>First name</Label>
          <Input
            id={`${idPrefix}-firstName`}
            value={form.firstName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, firstName: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-lastName`}>Last name</Label>
          <Input
            id={`${idPrefix}-lastName`}
            value={form.lastName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, lastName: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={form.phoneNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
            }
          />
        </div>
        {!options?.hideEmail ? (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-email`}>Email</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-enrollment`}>Enrollment date</Label>
        <Input
          id={`${idPrefix}-enrollment`}
          type="date"
          value={form.enrollmentDate}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))
          }
        />
        <p className="text-xs text-gray-500">
          Optional on create — if empty, today&apos;s date is used.
        </p>
      </div>
    </>
  );

  const renderAppAccessSection = (
    student: StudentRecordDto,
    form: StudentRecordFormState,
    setForm: React.Dispatch<React.SetStateAction<StudentRecordFormState>>,
    linked: LinkedAppAccountDetails | null,
  ) => (
    <Collapsible
      defaultOpen
      className="rounded-lg border border-blue-100 bg-blue-50/60"
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="font-medium text-blue-900">App access</span>
        <ChevronRight className="h-4 w-4 text-blue-700 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-4 pb-4">
        <p className="text-sm text-blue-800">
          Login and license preferences for the linked app account. Name and
          phone are edited once in Student profile above.
        </p>
        {linked?.email ? (
          <div className="space-y-1">
            <Label>Login email</Label>
            <p className="text-sm font-medium text-blue-950">{linked.email}</p>
            <p className="text-xs text-blue-700">
              Login email cannot be changed here.
            </p>
          </div>
        ) : null}
        {linked ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-blue-900">Access status:</span>
            <Badge variant={linked.isApproved ? "secondary" : "default"}>
              {linked.isApproved
                ? "Approved — can sign in"
                : "Pending approval"}
            </Badge>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="edit-app-address">Address</Label>
          <Input
            id="edit-app-address"
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="Address on app account"
          />
        </div>
        {categories.length > 0 ? (
          <div className="space-y-2">
            <Label>License categories</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded border">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-app-cat-${cat.id}`}
                    checked={form.selectedCategories.includes(cat.name)}
                    onCheckedChange={() => toggleEditCategory(cat.name)}
                  />
                  <label
                    htmlFor={`edit-app-cat-${cat.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {cat.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {transmissionTypes.length > 0 ? (
          <div className="space-y-2">
            <Label>Transmission type</Label>
            <Select
              value={form.transmissionType || undefined}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, transmissionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                {transmissionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {canShowRemoveStudentAppAccessAction(student) ? (
          <div className="border-t border-blue-200 pt-4">
            <p className="text-xs text-blue-800 mb-3">
              Disabling app access preserves the student profile, lessons,
              payments, and history. The linked app account is not deleted.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={removeAppAccessLoading}
              onClick={() => setRemoveAppAccessDialog(student)}
            >
              <UserX className="h-4 w-4 mr-2" />
              Remove app access
            </Button>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );

  const renderPendingInvitationSection = (student: StudentRecordDto) => {
    const inviteEmail =
      student.pendingInvitation?.email?.trim() || student.email?.trim() || "—";
    return (
      <Collapsible
        defaultOpen
        className="rounded-lg border border-amber-100 bg-amber-50/60"
      >
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
          <span className="font-medium text-amber-900">App access</span>
          <ChevronRight className="h-4 w-4 text-amber-700 transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-amber-900">Access status:</span>
            <Badge variant="default">Invitation pending</Badge>
          </div>
          <div className="space-y-1">
            <Label>Invitation email</Label>
            <p className="text-sm font-medium text-amber-950">{inviteEmail}</p>
          </div>
          <p className="text-xs text-amber-800">
            Use <strong>Revoke invitation</strong> on the profile row to cancel
            a pending invite. Resend is not available here.
          </p>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const editingLinkedDetails =
    editingStudent?.userId != null
      ? getEffectiveLinkedDetails(editingStudent.userId)
      : null;

  return (
    <section className={embedded ? "space-y-6" : "mt-10 space-y-6"}>
      {!embedded ? (
        <div className="flex items-start gap-3">
          <GraduationCap className="h-8 w-8 text-driving-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
            <p className="text-gray-600 mt-1">
              School operational student profiles (with or without app access).
              The official ID has 5 digits (enrollment year + enrollment
              number).
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 max-w-3xl">
          Student profiles — search is the fastest way to find someone;
          import/export and row actions are available below. Create new profiles
          under <strong>Onboarding</strong>.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Student profiles</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
              <form
                onSubmit={handleSearch}
                className="flex w-full sm:w-auto gap-2"
              >
                <Input
                  placeholder="Name, phone, email, or ID (e.g. 261)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="sm:min-w-[280px]"
                />
                <Button type="submit" variant="outline" disabled={listLoading}>
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={listLoading}
                  onClick={() => loadStudents({ search: appliedSearch })}
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
                disabled={listLoading}
                className="w-full sm:w-auto shrink-0"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={listLoading || exportingFormat !== null}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingFormat ? "Exporting…" : "Export"}
                    <ChevronDown className="h-4 w-4 ml-2 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={exportingFormat !== null}
                    onSelect={() => void handleExport("csv")}
                  >
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exportingFormat !== null}
                    onSelect={() => void handleExport("json")}
                  >
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Export includes all student profiles matching the current search,
            not only the rows shown on this page.
          </p>
          <PeopleProfileLabelGuide variant="student" />
        </CardHeader>
        <CardContent>
          {listError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          ) : null}

          {listLoading ? (
            <p className="text-sm text-gray-500">Loading student profiles…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-500">
              No student profiles found
              {appliedSearch ? " for this search" : ""}.
            </p>
          ) : (
            <TooltipProvider delayDuration={300}>
              <div className="space-y-3">
                {students.map((student) => {
                  const linked =
                    student.userId != null
                      ? getEffectiveLinkedDetails(student.userId)
                      : null;
                  const profileBadges = getStudentProfileRowBadges(
                    student,
                  ).filter(
                    (badge) =>
                      !(
                        student.appAccessMode === "APP_USER" &&
                        badge.key === "app-access"
                      ),
                  );
                  const appAccessCompactBadges =
                    getStudentAppAccessCompactBadges(
                      student,
                      linked
                        ? {
                            isApproved: linked.isApproved,
                            transmissionType: linked.transmissionType,
                            selectedCategories: linked.selectedCategories,
                          }
                        : null,
                    );
                  const canonicalEmail = getStudentCanonicalEmailDisplay(
                    student,
                    linked?.email,
                  );

                  return (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-driving-primary">
                            {student.schoolStudentId ?? "—"}
                          </span>
                          <span className="font-medium">
                            {getStudentRecordDisplayName(student)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {student.phoneNumber || "No phone"}
                          {canonicalEmail ? ` · ${canonicalEmail}` : ""}
                        </div>
                        <div className="text-sm text-gray-500">
                          Enrollment:{" "}
                          {formatStudentRecordDate(student.enrollmentDate)}
                        </div>
                        <div className="mt-2 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {profileBadges.map((badge) => (
                              <Tooltip key={badge.key}>
                                <TooltipTrigger asChild>
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {badge.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {appAccessCompactBadges.map((badge) => (
                              <Tooltip key={badge.key}>
                                <TooltipTrigger asChild>
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {badge.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          {getStudentAppAccessDetailLines(student).map(
                            (line) => (
                              <p key={line} className="text-xs text-gray-500">
                                {line}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {canSendStudentRecordInvite(student) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInviteStudent(student)}
                          >
                            <MailPlus className="h-4 w-4 mr-1" />
                            Send invitation
                          </Button>
                        ) : null}
                        {canRevokeStudentRecordInvitation(student) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={
                              revokingInvitationId ===
                              student.pendingInvitation?.invitationId
                            }
                            onClick={() => void handleRevokeInvitation(student)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            {revokingInvitationId ===
                            student.pendingInvitation?.invitationId
                              ? "Revoking…"
                              : "Revoke invitation"}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHistoryStudent(student)}
                        >
                          <Car className="h-4 w-4 mr-1" />
                          Practical lessons
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(student)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit Student
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setDeleteDialog({
                              student,
                              ...getStudentDeleteUiState(student),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          )}

          {nextCursor ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() =>
                  loadStudents({
                    search: appliedSearch,
                    cursor: nextCursor,
                    append: true,
                  })
                }
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}

          {!listLoading && students.length > 0 ? (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Showing up to {LIST_LIMIT} student profiles per page
              {appliedSearch ? " (search active)" : ""}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={editingStudent !== null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update this student&apos;s profile and linked app access where
              available.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900">Student profile</h3>
              {renderIdFields(editForm, setEditForm, editPreviewId)}
              {renderContactFields(
                editForm,
                setEditForm,
                "edit",
                editingStudent && canShowStudentAppAccessSection(editingStudent)
                  ? { hideEmail: true }
                  : undefined,
              )}
            </div>
            {editingStudent && canShowStudentAppAccessSection(editingStudent)
              ? renderAppAccessSection(
                  editingStudent,
                  editForm,
                  setEditForm,
                  editingLinkedDetails,
                )
              : null}
            {editingStudent &&
            canShowStudentPendingInvitationSection(editingStudent)
              ? renderPendingInvitationSection(editingStudent)
              : null}
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
                {editLoading ? "Saving…" : "Save Student"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <StudentPracticalHistoryDialog
        student={historyStudent}
        open={historyStudent !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryStudent(null);
        }}
      />

      <StudentRecordInviteDialog
        student={inviteStudent}
        open={inviteStudent !== null}
        onOpenChange={(open) => {
          if (!open) setInviteStudent(null);
        }}
        onSuccess={() => loadStudents({ search: appliedSearch })}
      />

      <StudentRecordsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => loadStudents({ search: appliedSearch })}
      />

      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.allowed
                ? "Delete Student?"
                : "Delete not available"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {deleteDialog?.allowed ? (
                  <p>
                    This will remove the student profile from People where it is
                    safe to do so. Deletion may still be blocked if the student
                    has lessons, payments, invitations, app access, or other
                    records that must be preserved.
                  </p>
                ) : (
                  <>
                    <p>
                      This student cannot be deleted yet. Resolve the items
                      below first.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      {deleteDialog?.blockMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                    <p>{getStudentDeleteBlockedModalFooterNote()}</p>
                  </>
                )}
                {deleteDialog ? (
                  <p>
                    Student:{" "}
                    <span className="font-medium text-foreground">
                      {getStudentRecordDisplayName(deleteDialog.student)}
                    </span>
                    {deleteDialog.student.schoolStudentId ? (
                      <>
                        {" "}
                        (
                        <span className="font-mono">
                          {deleteDialog.student.schoolStudentId}
                        </span>
                        )
                      </>
                    ) : null}
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
                {deleteLoading ? "Deleting…" : "Delete Student"}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeAppAccessDialog !== null}
        onOpenChange={(open) => {
          if (!open && !removeAppAccessLoading) setRemoveAppAccessDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {REMOVE_STUDENT_APP_ACCESS_MODAL.title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{REMOVE_STUDENT_APP_ACCESS_MODAL.description}</p>
                {removeAppAccessDialog ? (
                  <p>
                    Student:{" "}
                    <span className="font-medium text-foreground">
                      {getStudentRecordDisplayName(removeAppAccessDialog)}
                    </span>
                    {removeAppAccessDialog.schoolStudentId ? (
                      <>
                        {" "}
                        (
                        <span className="font-mono">
                          {removeAppAccessDialog.schoolStudentId}
                        </span>
                        )
                      </>
                    ) : null}
                    .
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeAppAccessLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeAppAccessLoading}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveAppAccessConfirm();
              }}
            >
              {removeAppAccessLoading
                ? "Removing…"
                : REMOVE_STUDENT_APP_ACCESS_MODAL.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
