"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type {
  StudentRecordApiError,
  StudentRecordDto,
  StudentRecordMutationResponse,
  StudentRecordsListResponse,
} from "@/lib/students/student-record-ui-types";
import {
  buildManualStudentPatchPayload,
  canSendStudentRecordInvite,
  canShowStudentRecordDeleteAction,
  formatEnrollmentDateInputValue,
  formatStudentRecordDate,
  getStudentRecordDisplayName,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
} from "@/lib/students/student-record-ui-utils";
import {
  canRevokeStudentRecordInvitation,
  getStudentAppAccessDetailLines,
  getStudentAppAccessLabel,
} from "@/lib/students/student-record-invitation-ui-utils";
import { invitationApiErrorMessage } from "@/lib/invitations/invitation-ui-utils";
import { StudentPracticalHistoryDialog } from "@/components/admin/student-practical-history-dialog";
import { StudentRecordInviteDialog } from "@/components/admin/student-record-invite-dialog";
import { StudentRecordsImportDialog } from "@/components/admin/student-records-import-dialog";
import {
  fetchStudentRecordsExport,
  type StudentRecordsExportFormat,
} from "@/lib/students/student-records-export-client";

const LIST_LIMIT = 100;

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
});

type StudentRecordFormState = ReturnType<typeof emptyForm>;

function studentToForm(student: StudentRecordDto) {
  return {
    yearSuffix: student.schoolStudentYearSuffix ?? "",
    sequenceNumber:
      student.schoolStudentSequence != null
        ? String(student.schoolStudentSequence)
        : "",
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    phoneNumber: student.phoneNumber ?? "",
    email: student.email ?? "",
    enrollmentDate: formatEnrollmentDateInputValue(student.enrollmentDate),
  };
}

type StudentRecordsManagerProps = {
  embedded?: boolean;
};

export function StudentRecordsManager({
  embedded = false,
}: StudentRecordsManagerProps = {}) {
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
  const [editLoading, setEditLoading] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [inviteStudent, setInviteStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [deleteStudent, setDeleteStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportingFormat, setExportingFormat] =
    useState<StudentRecordsExportFormat | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    string | null
  >(null);

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
    setEditingStudent(student);
    setEditForm(studentToForm(student));
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
  };

  const handleDeleteConfirm = async () => {
    if (!deleteStudent) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${deleteStudent.id}`, {
        method: "DELETE",
      });
      const data = await tryReadJson<{ code?: string; error?: string }>(
        response,
      );

      if (!response.ok) {
        toast.error(
          studentRecordApiErrorMessage(
            data?.code,
            data?.error || "Could not remove the student record.",
          ),
        );
        return;
      }

      toast.success("Student record removed successfully.");
      setDeleteStudent(null);
      setStudents((prev) => prev.filter((s) => s.id !== deleteStudent.id));
      if (editingStudent?.id === deleteStudent.id) {
        closeEdit();
      }
    } catch {
      toast.error("An error occurred while removing the student record.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const patch = buildManualStudentPatchPayload({
      ...editForm,
      original: editingStudent,
    });

    if (Object.keys(patch).length === 0) {
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
      const response = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await tryReadJson<
        StudentRecordMutationResponse | StudentRecordApiError
      >(response);

      if (!response.ok) {
        const err = data as StudentRecordApiError | null;
        toast.error(
          studentRecordApiErrorMessage(
            err?.code,
            err?.error || "Failed to update student record",
          ),
        );
        return;
      }

      toast.success("Student record updated successfully.");
      closeEdit();
      await loadStudents({ search: appliedSearch });
    } catch {
      toast.error("An error occurred while updating the student record.");
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

  const renderContactFields = (
    form: StudentRecordFormState,
    setForm: React.Dispatch<React.SetStateAction<StudentRecordFormState>>,
    idPrefix: string,
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

  return (
    <section className={embedded ? "space-y-6" : "mt-10 space-y-6"}>
      {!embedded ? (
        <div className="flex items-start gap-3">
          <GraduationCap className="h-8 w-8 text-driving-primary shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
            <p className="text-gray-600 mt-1">
              School operational student records (with or without an app
              account). The official ID has 5 digits (enrollment year +
              enrollment number).
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 max-w-3xl">
          Registered student records — search, import/export, and row actions.
          Create new records under <strong>Onboarding</strong>.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              Registered student records
            </CardTitle>
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
            Export includes all student records matching the current search, not
            only the rows shown on this page.
          </p>
        </CardHeader>
        <CardContent>
          {listError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          ) : null}

          {listLoading ? (
            <p className="text-sm text-gray-500">Loading student records…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-500">
              No student records found
              {appliedSearch ? " for this search" : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
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
                      {student.email ? ` · ${student.email}` : ""}
                    </div>
                    <div className="text-sm text-gray-500">
                      Enrollment:{" "}
                      {formatStudentRecordDate(student.enrollmentDate)}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {getStudentAppAccessLabel(student.appAccessMode)}
                        </Badge>
                      </div>
                      {getStudentAppAccessDetailLines(student).map((line) => (
                        <p key={line} className="text-xs text-gray-500">
                          {line}
                        </p>
                      ))}
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
                      Edit
                    </Button>
                    {canShowStudentRecordDeleteAction(student) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteStudent(student)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove student record
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
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
              Showing up to {LIST_LIMIT} student records per page
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
            <DialogTitle>Edit student record</DialogTitle>
            <DialogDescription>
              Update operational details. App access status cannot be changed
              here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {renderIdFields(editForm, setEditForm, editPreviewId)}
            {renderContactFields(editForm, setEditForm, "edit")}
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
                {editLoading ? "Saving…" : "Save"}
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
        open={deleteStudent !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteStudent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student record</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStudent
                ? `Are you sure you want to remove student record ${deleteStudent.schoolStudentId ?? ""} (${getStudentRecordDisplayName(deleteStudent)})? This action cannot be undone and is only allowed for manual records with no operational history.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleteLoading ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
