/**
 * Client-side helpers for GET /api/admin/students/export (browser download).
 */

export const STUDENT_RECORDS_EXPORT_API_PATH = "/api/admin/students/export";

export type StudentRecordsExportFormat = "csv" | "json";

export function buildStudentRecordsExportUrl(
  format: StudentRecordsExportFormat,
  search?: string,
): string {
  const params = new URLSearchParams();
  params.set("format", format);
  const trimmed = search?.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }
  return `${STUDENT_RECORDS_EXPORT_API_PATH}?${params.toString()}`;
}

/** Parse filename from Content-Disposition (attachment; filename="..."). */
export function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null;
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const unquoted = /filename=([^;\s]+)/i.exec(header);
  if (unquoted?.[1]) return unquoted[1].replace(/"/g, "");
  return null;
}

export function defaultStudentRecordsExportFilename(
  format: StudentRecordsExportFormat,
  date = new Date(),
): string {
  const day = date.toISOString().slice(0, 10);
  const ext = format === "csv" ? "csv" : "json";
  return `students-export-${day}.${ext}`;
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

export type StudentRecordsExportResult =
  | { ok: true; filename: string }
  | { ok: false; message: string };

export async function fetchStudentRecordsExport(
  format: StudentRecordsExportFormat,
  search?: string,
): Promise<StudentRecordsExportResult> {
  const url = buildStudentRecordsExportUrl(format, search);

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
    ) ?? defaultStudentRecordsExportFilename(format);

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
