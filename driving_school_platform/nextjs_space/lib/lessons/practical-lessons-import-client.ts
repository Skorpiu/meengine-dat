/**
 * Client-side helpers for practical lesson import dry-run preview.
 */

import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  PracticalLessonImportDryRunRow,
} from "@/lib/import-export/import-export-contracts";

export const PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH =
  "/api/admin/practical-lessons/import/dry-run";

export type PracticalLessonsImportFormat = "csv" | "json";

export type PracticalLessonsImportDryRunReport = ImportDryRunReport<
  ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
>;

export function inferPracticalLessonsImportFormat(
  filename: string,
): PracticalLessonsImportFormat | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return null;
}

export type PracticalLessonsImportDryRunResult =
  | { ok: true; report: PracticalLessonsImportDryRunReport }
  | { ok: false; message: string };

export async function fetchPracticalLessonsImportDryRun(
  format: PracticalLessonsImportFormat,
  content: string,
): Promise<PracticalLessonsImportDryRunResult> {
  let response: Response;
  try {
    response = await fetch(PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH, {
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
    data?: PracticalLessonsImportDryRunReport;
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
