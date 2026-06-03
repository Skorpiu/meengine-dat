/**
 * Client-side helpers for POST /api/admin/students/import/dry-run (zero-write preview).
 */

import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  StudentImportRow,
} from "@/lib/import-export/import-export-contracts";

export const STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH =
  "/api/admin/students/import/dry-run";

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
