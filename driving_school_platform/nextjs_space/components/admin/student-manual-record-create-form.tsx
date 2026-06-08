"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import type {
  StudentRecordApiError,
  StudentRecordMutationResponse,
} from "@/lib/students/student-record-ui-types";
import {
  buildManualStudentCreatePayload,
  previewSchoolStudentId,
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

const emptyForm = () => ({
  yearSuffix: "",
  sequenceNumber: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  address: "",
  enrollmentDate: "",
});

type ManualStudentFormState = ReturnType<typeof emptyForm>;

type StudentManualRecordCreateFormProps = {
  onCreated?: () => void;
};

export function StudentManualRecordCreateForm({
  onCreated,
}: StudentManualRecordCreateFormProps = {}) {
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  const createPreviewId = useMemo(
    () =>
      previewSchoolStudentId(createForm.yearSuffix, createForm.sequenceNumber),
    [createForm.yearSuffix, createForm.sequenceNumber],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildManualStudentCreatePayload(createForm);
    if ("error" in payload) {
      toast.error(studentRecordApiErrorMessage(payload.error, "Invalid data."));
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

      toast.success("Student record created successfully.");
      setCreateForm(emptyForm());
      onCreated?.();
    } catch {
      toast.error("An error occurred while creating the student record.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New manual student record</CardTitle>
        <p className="text-sm text-gray-600 font-normal">
          Creates an operational student record without app login. The learner
          can receive app access later via invitation.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          {renderIdFields(createForm, setCreateForm, createPreviewId)}
          {renderContactFields(createForm, setCreateForm, "create")}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={createLoading}
              className="bg-driving-primary hover:bg-driving-primary/90"
            >
              {createLoading ? "Creating…" : "Create Student"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function renderIdFields(
  form: ManualStudentFormState,
  setForm: React.Dispatch<React.SetStateAction<ManualStudentFormState>>,
  previewId: string | null,
) {
  return (
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
}

function renderContactFields(
  form: ManualStudentFormState,
  setForm: React.Dispatch<React.SetStateAction<ManualStudentFormState>>,
  idPrefix: string,
) {
  return (
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
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Input
          id={`${idPrefix}-address`}
          value={form.address}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="Residential or contact address"
        />
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
}
