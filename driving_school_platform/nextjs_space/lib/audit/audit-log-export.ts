/**
 * Privacy-minimal CSV export for tenant audit logs (pure helpers).
 */
import { escapeCsvField } from "@/lib/import-export/student-record-export";
import { RECOMMENDED_CSV_DELIMITER } from "@/lib/import-export/import-export-contracts";
import type { AuditLogListItemDto } from "@/lib/audit/audit-log-query-service";

export const AUDIT_LOG_EXPORT_CSV_HEADERS = [
  "id",
  "createdAt",
  "action",
  "entityType",
  "entityId",
  "actorUserId",
  "actorRole",
  "actorEmail",
  "targetUserId",
  "requestId",
  "metadata",
] as const;

const CSV_LINE_ENDING = "\n";

/** Prefix formula-like values to reduce CSV injection risk in spreadsheet apps. */
export function guardCsvInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function serializeAuditLogMetadata(metadata: unknown): string {
  if (metadata === null || metadata === undefined) {
    return "";
  }

  try {
    return typeof metadata === "string" ? metadata : JSON.stringify(metadata);
  } catch {
    return "[unavailable]";
  }
}

function nullableExportField(value: string | null | undefined): string {
  return value ?? "";
}

export function mapAuditLogListItemToExportRow(
  item: AuditLogListItemDto,
): Record<(typeof AUDIT_LOG_EXPORT_CSV_HEADERS)[number], string> {
  return {
    id: item.id,
    createdAt: item.createdAt,
    action: item.action,
    entityType: item.entityType,
    entityId: nullableExportField(item.entityId),
    actorUserId: nullableExportField(item.actorUserId),
    actorRole: nullableExportField(item.actorRole),
    actorEmail: nullableExportField(item.actorEmail),
    targetUserId: nullableExportField(item.targetUserId),
    requestId: nullableExportField(item.requestId),
    metadata: serializeAuditLogMetadata(item.metadata),
  };
}

function exportRowToCsvCells(
  row: Record<(typeof AUDIT_LOG_EXPORT_CSV_HEADERS)[number], string>,
): string[] {
  return AUDIT_LOG_EXPORT_CSV_HEADERS.map((header) =>
    escapeCsvField(guardCsvInjection(row[header])),
  );
}

export function serializeAuditLogExportRowsToCsv(
  items: AuditLogListItemDto[],
): string {
  const header = AUDIT_LOG_EXPORT_CSV_HEADERS.join(RECOMMENDED_CSV_DELIMITER);
  const dataLines = items.map((item) =>
    exportRowToCsvCells(mapAuditLogListItemToExportRow(item)).join(
      RECOMMENDED_CSV_DELIMITER,
    ),
  );
  return [header, ...dataLines].join(CSV_LINE_ENDING);
}

export function defaultAuditLogExportFilename(date = new Date()): string {
  return `audit-logs-${date.toISOString().slice(0, 10)}.csv`;
}
