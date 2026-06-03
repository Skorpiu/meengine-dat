/**
 * Client-side helpers for student import dry-run preview and apply.
 */

import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  StudentImportRow,
} from "@/lib/import-export/import-export-contracts";

export const STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH =
  "/api/admin/students/import/dry-run";

export const STUDENT_RECORDS_IMPORT_APPLY_API_PATH =
  "/api/admin/students/import/apply";

export type StudentRecordsImportFormat = "csv" | "json";

export type StudentRecordsImportDryRunReport = ImportDryRunReport<
  ImportDryRunPreviewRow<StudentImportRow>
>;

export function inferStudentRecordsImportFormat(
  filename: string,
): StudentRecordsImportFormat | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return null;
}

export type StudentRecordsImportDryRunResult =
  | { ok: true; report: StudentRecordsImportDryRunReport }
  | { ok: false; message: string };

export async function fetchStudentRecordsImportDryRun(
  format: StudentRecordsImportFormat,
  content: string,
): Promise<StudentRecordsImportDryRunResult> {
  let response: Response;
  try {
    response = await fetch(STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content }),
    });
  } catch {
    return {
      ok: false,
      message: "Import preview failed. Check your connection and try again.",
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      message: response.ok
        ? "Import preview failed."
        : "Import preview failed. Please try again.",
    };
  }

  let body: {
    success?: boolean;
    data?: StudentRecordsImportDryRunReport;
    error?: string;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { ok: false, message: "Import preview failed." };
  }

  if (!response.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error
        : "Import preview failed.";
    return { ok: false, message };
  }

  if (!body.success || !body.data) {
    return { ok: false, message: "Import preview failed." };
  }

  return { ok: true, report: body.data };
}

export type StudentRecordsImportApplyResult = {
  applied: boolean;
  createdCount: number;
  skippedCount: number;
  report: StudentRecordsImportDryRunReport;
};

export type StudentRecordsImportApplyResponse =
  | { ok: true; result: StudentRecordsImportApplyResult }
  | {
      ok: false;
      message: string;
      result?: StudentRecordsImportApplyResult;
    };

async function readImportApiJson<T>(
  response: Response,
  failureMessage: string,
): Promise<{ ok: true; data: T } | { ok: false; message: string; data?: T }> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      message: response.ok
        ? failureMessage
        : `${failureMessage} Please try again.`,
    };
  }

  let body: { success?: boolean; data?: T; error?: string };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { ok: false, message: failureMessage };
  }

  if (!response.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error
        : failureMessage;
    return { ok: false, message, data: body.data };
  }

  if (!body.success || body.data === undefined) {
    return { ok: false, message: failureMessage, data: body.data };
  }

  return { ok: true, data: body.data };
}

export async function fetchStudentRecordsImportApply(
  format: StudentRecordsImportFormat,
  content: string,
): Promise<StudentRecordsImportApplyResponse> {
  let response: Response;
  try {
    response = await fetch(STUDENT_RECORDS_IMPORT_APPLY_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content, mode: "createOnly" }),
    });
  } catch {
    return {
      ok: false,
      message: "Import apply failed. Check your connection and try again.",
    };
  }

  const parsed = await readImportApiJson<StudentRecordsImportApplyResult>(
    response,
    "Import apply failed.",
  );

  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      result: parsed.data,
    };
  }

  if (!parsed.data.applied) {
    return {
      ok: false,
      message:
        "Import was not applied. Fix validation errors and run preview again.",
      result: parsed.data,
    };
  }

  return { ok: true, result: parsed.data };
}
