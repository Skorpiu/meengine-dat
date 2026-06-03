/**
 * Client-side helpers for GET /api/admin/practical-lessons/export (browser download).
 */

import { parseContentDispositionFilename } from "@/lib/students/student-records-export-client";

export const PRACTICAL_LESSONS_EXPORT_API_PATH =
  "/api/admin/practical-lessons/export";

export type PracticalLessonsExportFormat = "csv" | "json";

export type PracticalLessonsExportFilters = {
  studentId?: string;
  schoolStudentId?: string;
  source?: "SYSTEM" | "MANUAL" | "IMPORT";
  from?: string;
  to?: string;
};

export function buildPracticalLessonsExportUrl(
  format: PracticalLessonsExportFormat,
  filters?: PracticalLessonsExportFilters,
): string {
  const params = new URLSearchParams();
  params.set("format", format);

  const studentId = filters?.studentId?.trim();
  if (studentId) params.set("studentId", studentId);

  const schoolStudentId = filters?.schoolStudentId?.trim();
  if (schoolStudentId) params.set("schoolStudentId", schoolStudentId);

  if (filters?.source) params.set("source", filters.source);

  const from = filters?.from?.trim();
  if (from) params.set("from", from);

  const to = filters?.to?.trim();
  if (to) params.set("to", to);

  return `${PRACTICAL_LESSONS_EXPORT_API_PATH}?${params.toString()}`;
}

export function defaultPracticalLessonsExportFilename(
  format: PracticalLessonsExportFormat,
  date = new Date(),
): string {
  const day = date.toISOString().slice(0, 10);
  const ext = format === "csv" ? "csv" : "json";
  return `practical-lessons-export-${day}.${ext}`;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type PracticalLessonsExportResult =
  | { ok: true; filename: string }
  | { ok: false; message: string };

export async function fetchPracticalLessonsExport(
  format: PracticalLessonsExportFormat,
  filters?: PracticalLessonsExportFilters,
): Promise<PracticalLessonsExportResult> {
  const url = buildPracticalLessonsExportUrl(format, filters);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return {
      ok: false,
      message: "Export failed. Check your connection and try again.",
    };
  }

  if (!response.ok) {
    let message = "Export failed.";
    const contentType = response.headers.get("content-type") || "";
    if (contentType.toLowerCase().includes("application/json")) {
      try {
        const body = (await response.json()) as { error?: string };
        if (typeof body.error === "string" && body.error.trim()) {
          message = body.error;
        }
      } catch {
        // keep default message
      }
    }
    return { ok: false, message };
  }

  const filename =
    parseContentDispositionFilename(
      response.headers.get("content-disposition"),
    ) ?? defaultPracticalLessonsExportFilename(format);

  try {
    const blob = await response.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true, filename };
  } catch {
    return {
      ok: false,
      message: "Export failed while preparing the download.",
    };
  }
}
