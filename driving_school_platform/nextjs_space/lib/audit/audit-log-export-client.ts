/**
 * Client-side helpers for GET /api/admin/audit-logs/export (browser download).
 */
import type { AuditLogListFilters } from "@/lib/audit/audit-log-list-client";
import { defaultAuditLogExportFilename } from "@/lib/audit/audit-log-export";
import { parseContentDispositionFilename } from "@/lib/students/student-records-export-client";

export const AUDIT_LOG_EXPORT_API_PATH = "/api/admin/audit-logs/export";

function appendFilterParam(
  params: URLSearchParams,
  key: keyof AuditLogListFilters,
  value: string | undefined,
) {
  const trimmed = value?.trim();
  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function buildAuditLogExportUrl(filters?: AuditLogListFilters): string {
  const params = new URLSearchParams();
  const filterValues = filters;

  if (filterValues) {
    appendFilterParam(params, "action", filterValues.action);
    appendFilterParam(params, "entityType", filterValues.entityType);
    appendFilterParam(params, "entityId", filterValues.entityId);
    appendFilterParam(params, "actorUserId", filterValues.actorUserId);
    appendFilterParam(params, "targetUserId", filterValues.targetUserId);
    appendFilterParam(params, "requestId", filterValues.requestId);
    appendFilterParam(params, "dateFrom", filterValues.dateFrom);
    appendFilterParam(params, "dateTo", filterValues.dateTo);
  }

  const query = params.toString();
  return query
    ? `${AUDIT_LOG_EXPORT_API_PATH}?${query}`
    : AUDIT_LOG_EXPORT_API_PATH;
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

export type AuditLogExportResult =
  | {
      ok: true;
      filename: string;
      exportedCount: number;
      truncated: boolean;
    }
  | { ok: false; message: string };

function parseExportCountHeader(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchAuditLogExport(
  filters?: AuditLogListFilters,
): Promise<AuditLogExportResult> {
  const url = buildAuditLogExportUrl(filters);

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
    ) ?? defaultAuditLogExportFilename();

  const exportedCount =
    parseExportCountHeader(response.headers.get("x-audit-log-export-count")) ??
    0;
  const truncated =
    response.headers.get("x-audit-log-export-truncated") === "true";

  try {
    const blob = await response.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true, filename, exportedCount, truncated };
  } catch {
    return {
      ok: false,
      message: "Export failed while preparing the download.",
    };
  }
}
