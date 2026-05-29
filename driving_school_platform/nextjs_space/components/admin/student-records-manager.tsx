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
import { Edit2, GraduationCap, RefreshCw, Search, Car } from "lucide-react";
import toast from "react-hot-toast";
import type {
  StudentRecordApiError,
  StudentRecordDto,
  StudentRecordMutationResponse,
  StudentRecordsListResponse,
} from "@/lib/students/student-record-ui-types";
import {
  buildManualStudentCreatePayload,
  buildManualStudentPatchPayload,
  formatEnrollmentDateInputValue,
  formatStudentRecordDate,
  getStudentAppAccessLabel,
  getStudentRecordDisplayName,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
} from "@/lib/students/student-record-ui-utils";
import { StudentPracticalHistoryDialog } from "@/components/admin/student-practical-history-dialog";

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

export function StudentRecordsManager() {
  const [students, setStudents] = useState<StudentRecordDto[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [createForm, setCreateForm] = useState(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingStudent, setEditingStudent] = useState<StudentRecordDto | null>(
    null,
  );
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentRecordDto | null>(
    null,
  );

  const createPreviewId = useMemo(
    () =>
      previewSchoolStudentId(createForm.yearSuffix, createForm.sequenceNumber),
    [createForm.yearSuffix, createForm.sequenceNumber],
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildManualStudentCreatePayload(createForm);
    if ("error" in payload) {
      toast.error(
        studentRecordApiErrorMessage(payload.error, "Dados inválidos."),
      );
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await tryReadJson<
        StudentRecordMutationResponse | StudentRecordApiError
      >(response);

      if (!response.ok) {
        const err = data as StudentRecordApiError | null;
        toast.error(
          studentRecordApiErrorMessage(
            err?.code,
            err?.error || "Failed to create student record",
          ),
        );
        return;
      }

      toast.success("Ficha de aluno criada com sucesso.");
      setCreateForm(emptyForm());
      await loadStudents({ search: appliedSearch });
    } catch {
      toast.error("Ocorreu um erro ao criar a ficha.");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (student: StudentRecordDto) => {
    setEditingStudent(student);
    setEditForm(studentToForm(student));
  };

  const closeEdit = () => {
    setEditingStudent(null);
    setEditForm(emptyForm());
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const patch = buildManualStudentPatchPayload({
      ...editForm,
      original: editingStudent,
    });

    if (Object.keys(patch).length === 0) {
      toast.error("Nenhuma alteração para guardar.");
      return;
    }

    if (patch.yearSuffix !== undefined) {
      const built = previewSchoolStudentId(
        patch.yearSuffix,
        String(patch.sequenceNumber ?? ""),
      );
      if (!built) {
        toast.error("Ano ou nº de inscrição inválidos.");
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

      toast.success("Ficha atualizada com sucesso.");
      closeEdit();
      await loadStudents({ search: appliedSearch });
    } catch {
      toast.error("Ocorreu um erro ao atualizar a ficha.");
    } finally {
      setEditLoading(false);
    }
  };

  const renderIdFields = (
    form: typeof createForm,
    setForm: React.Dispatch<React.SetStateAction<typeof createForm>>,
    previewId: string | null,
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="yearSuffix">Ano de inscrição</Label>
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
        <Label htmlFor="sequenceNumber">Nº inscrição</Label>
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
          ID gerado: <span className="font-mono font-medium">{previewId}</span>
        </p>
      ) : null}
    </div>
  );

  const renderContactFields = (
    form: typeof createForm,
    setForm: React.Dispatch<React.SetStateAction<typeof createForm>>,
    idPrefix: string,
  ) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-firstName`}>Nome</Label>
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
          <Label htmlFor={`${idPrefix}-lastName`}>Apelido</Label>
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
          <Label htmlFor={`${idPrefix}-phone`}>Contacto</Label>
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
        <Label htmlFor={`${idPrefix}-enrollment`}>Data de inscrição</Label>
        <Input
          id={`${idPrefix}-enrollment`}
          type="date"
          value={form.enrollmentDate}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))
          }
        />
        <p className="text-xs text-gray-500">
          Opcional na criação — se vazio, usa a data de hoje.
        </p>
      </div>
    </>
  );

  return (
    <section className="mt-10 space-y-6">
      <div className="flex items-start gap-3">
        <GraduationCap className="h-8 w-8 text-driving-primary shrink-0 mt-1" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alunos</h2>
          <p className="text-gray-600 mt-1">
            Fichas operacionais da escola (com ou sem conta na app). O ID
            oficial tem 5 dígitos (ano + nº inscrição).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova ficha manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {renderIdFields(createForm, setCreateForm, createPreviewId)}
            {renderContactFields(createForm, setCreateForm, "create")}
            <Button
              type="submit"
              disabled={createLoading}
              className="bg-driving-primary hover:bg-driving-primary/90"
            >
              {createLoading ? "A criar…" : "Criar ficha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Fichas registadas</CardTitle>
          <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-2">
            <Input
              placeholder="Nome, contacto, email ou ID (ex. 261)"
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
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {listError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          ) : null}

          {listLoading ? (
            <p className="text-sm text-gray-500">A carregar fichas…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma ficha encontrada
              {appliedSearch ? " para esta pesquisa" : ""}.
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
                      {student.phoneNumber || "Sem contacto"}
                      {student.email ? ` · ${student.email}` : ""}
                    </div>
                    <div className="text-sm text-gray-500">
                      Inscrição:{" "}
                      {formatStudentRecordDate(student.enrollmentDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">
                      {getStudentAppAccessLabel(student.appAccessMode)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHistoryStudent(student)}
                    >
                      <Car className="h-4 w-4 mr-1" />
                      Aulas práticas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(student)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
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
                {loadingMore ? "A carregar…" : "Carregar mais"}
              </Button>
            </div>
          ) : null}

          {!listLoading && students.length > 0 ? (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Mostrando até {LIST_LIMIT} fichas por página
              {appliedSearch ? " (pesquisa ativa)" : ""}.
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
            <DialogTitle>Editar ficha</DialogTitle>
            <DialogDescription>
              Atualize os dados operacionais. O estado de acesso à app não pode
              ser alterado aqui.
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
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "A guardar…" : "Guardar"}
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
    </section>
  );
}
