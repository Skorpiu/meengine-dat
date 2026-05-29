/**
 * Student record export helpers (pure — no Prisma or server-only deps).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import {
  IMPORT_EXPORT_ENTITIES,
  IMPORT_EXPORT_FORMAT_VERSION,
  RECOMMENDED_CSV_DELIMITER,
  STUDENT_EXPORT_CSV_HEADERS,
  type StudentExportRow,
} from "@/lib/import-export/import-export-contracts";

/** Minimal student fields needed to build an export row. */
export type StudentRecordExportSource = {
  schoolStudentId: string | null;
  schoolStudentYearSuffix: string | null;
  schoolStudentSequence: number | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  email: string | null;
  enrollmentDate: Date | null;
  appAccessMode: string;
};

export type StudentExportPayload = {
  formatVersion: typeof IMPORT_EXPORT_FORMAT_VERSION;
  entity: (typeof IMPORT_EXPORT_ENTITIES)[number];
  exportedAt: string;
  rows: StudentExportRow[];
};

const CSV_LINE_ENDING = "\n";

/** Format a Date as ISO calendar date `YYYY-MM-DD` (UTC). */
export function formatExportDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function mapStudentToExportRow(
  student: StudentRecordExportSource,
): StudentExportRow {
  return {
    schoolStudentId: student.schoolStudentId ?? "",
    yearSuffix: student.schoolStudentYearSuffix ?? "",
    sequence: student.schoolStudentSequence ?? null,
    firstName: student.firstName ?? "",
    lastName: student.lastName,
    phoneNumber: student.phoneNumber,
    email: student.email,
    enrollmentDate: student.enrollmentDate
      ? formatExportDate(student.enrollmentDate)
      : null,
    appAccessMode: student.appAccessMode,
  };
}

/** RFC 4180-style field escaping for semicolon-delimited CSV. */
export function escapeCsvField(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const needsQuotes =
    text.includes('"') ||
    text.includes(RECOMMENDED_CSV_DELIMITER) ||
    text.includes("\n") ||
    text.includes("\r");
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRowToCsvCells(row: StudentExportRow): string[] {
  return [
    escapeCsvField(row.schoolStudentId),
    escapeCsvField(row.yearSuffix),
    escapeCsvField(row.sequence),
    escapeCsvField(row.firstName),
    escapeCsvField(row.lastName ?? ""),
    escapeCsvField(row.phoneNumber ?? ""),
    escapeCsvField(row.email ?? ""),
    escapeCsvField(row.enrollmentDate ?? ""),
    escapeCsvField(row.appAccessMode),
  ];
}

export function serializeStudentExportRowsToCsv(
  rows: StudentExportRow[],
): string {
  const header = STUDENT_EXPORT_CSV_HEADERS.join(RECOMMENDED_CSV_DELIMITER);
  const dataLines = rows.map((row) =>
    exportRowToCsvCells(row).join(RECOMMENDED_CSV_DELIMITER),
  );
  return [header, ...dataLines].join(CSV_LINE_ENDING);
}

export function buildStudentExportPayload(
  rows: StudentExportRow[],
  exportedAt: Date = new Date(),
): StudentExportPayload {
  return {
    formatVersion: IMPORT_EXPORT_FORMAT_VERSION,
    entity: "students",
    exportedAt: exportedAt.toISOString(),
    rows,
  };
}
