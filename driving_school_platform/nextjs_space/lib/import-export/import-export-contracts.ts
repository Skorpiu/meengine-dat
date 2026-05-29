/**
 * Import/export contracts for client data migration (DAT_3.6 strategy batch).
 *
 * Types and constants only — no parsers, Prisma, or I/O.
 * See docs/engineering/client-data-import-export-strategy.md
 */

/** Supported entity types for phased import/export. */
export const IMPORT_EXPORT_ENTITIES = ["students", "practicalLessons"] as const;
export type ImportExportEntity = (typeof IMPORT_EXPORT_ENTITIES)[number];

/** Import execution mode (future API). */
export const IMPORT_MODES = ["dryRun", "apply"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

/** Severity for a single row finding in dry-run reports. */
export const IMPORT_ROW_SEVERITIES = ["error", "warning"] as const;
export type ImportRowSeverity = (typeof IMPORT_ROW_SEVERITIES)[number];

/**
 * Stable machine-readable error codes for dry-run/import reports and UI.
 * Extend only with documented codes in the strategy doc.
 */
export const IMPORT_ERROR_CODES = [
  "missing_required_field",
  "invalid_school_student_id",
  "duplicate_school_student_id",
  "invalid_date",
  "invalid_time",
  "unknown_instructor",
  "duplicate_practical_lesson_number",
  "unsupported_value",
] as const;
export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number];

/** Recommended CSV column separator for Excel PT locale. */
export const RECOMMENDED_CSV_DELIMITER = ";" as const;

/** Alternate delimiter that may be supported by future parsers. */
export const ALTERNATE_CSV_DELIMITER = "," as const;

/** Contract date/time string formats (documentation constants). */
export const IMPORT_EXPORT_DATE_FORMAT = "YYYY-MM-DD" as const;
export const IMPORT_EXPORT_TIME_FORMAT = "HH:mm" as const;

/** Placeholder JSON envelope version for future structured imports. */
export const IMPORT_EXPORT_FORMAT_VERSION = 1 as const;

export type ImportDryRunRowFinding = {
  rowNumber: number;
  field: string | null;
  code: ImportErrorCode;
  message: string;
  rawValue: string | null;
};

export type ImportDryRunPreviewRow<TNormalized = Record<string, unknown>> = {
  rowNumber: number;
  normalized: TNormalized;
};

/** Conceptual dry-run report returned by future import endpoints. */
export type ImportDryRunReport<TPreview = ImportDryRunPreviewRow> = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: ImportDryRunRowFinding[];
  errors: ImportDryRunRowFinding[];
  preview: TPreview[];
};

/** Normalized student row after CSV/JSON parse (pre-persist). */
export type StudentImportRow = {
  schoolStudentId: string;
  yearSuffix: string;
  sequence: number;
  firstName: string;
  lastName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  enrollmentDate?: string | null;
};

/** Normalized practical lesson history row (pre-persist). */
export type PracticalLessonImportRow = {
  schoolStudentId: string;
  practicalLessonNumber: number;
  lessonDate: string;
  startTime: string;
  durationMinutes?: number;
  instructorEmail: string;
  notes?: string | null;
};

/** Student export row (normalized external representation). */
export type StudentExportRow = {
  schoolStudentId: string;
  yearSuffix: string;
  sequence: number | null;
  firstName: string;
  lastName: string | null;
  phoneNumber: string | null;
  email: string | null;
  enrollmentDate: string | null;
  appAccessMode: string;
};

/** Practical lesson export row (normalized external representation). */
export type PracticalLessonExportRow = {
  schoolStudentId: string;
  practicalLessonNumber: number | null;
  lessonDate: string;
  startTime: string;
  durationMinutes: number | null;
  instructorEmail: string | null;
  instructorName: string | null;
  lessonSource: string;
  status: string;
  notes: string | null;
};

/** CSV header row strings aligned with docs/examples import templates. */
export const STUDENT_IMPORT_CSV_HEADERS = [
  "schoolStudentId",
  "yearSuffix",
  "sequence",
  "firstName",
  "lastName",
  "phoneNumber",
  "email",
  "enrollmentDate",
] as const;

/** CSV header row for student export (includes appAccessMode). */
export const STUDENT_EXPORT_CSV_HEADERS = [
  ...STUDENT_IMPORT_CSV_HEADERS,
  "appAccessMode",
] as const;

export const PRACTICAL_LESSON_IMPORT_CSV_HEADERS = [
  "schoolStudentId",
  "practicalLessonNumber",
  "lessonDate",
  "startTime",
  "durationMinutes",
  "instructorEmail",
  "notes",
] as const;

/** CSV header row for practical lesson export. */
export const PRACTICAL_LESSON_EXPORT_CSV_HEADERS = [
  "schoolStudentId",
  "practicalLessonNumber",
  "lessonDate",
  "startTime",
  "durationMinutes",
  "instructorEmail",
  "instructorName",
  "lessonSource",
  "status",
  "notes",
] as const;

/** Future implementation batch identifiers (documentation / feature flags). */
export const IMPORT_EXPORT_PHASES = [
  "export-student-records",
  "import-student-records-dry-run",
  "import-student-records-apply",
  "export-practical-lessons",
  "import-practical-lessons-dry-run",
  "import-practical-lessons-apply",
] as const;
export type ImportExportPhase = (typeof IMPORT_EXPORT_PHASES)[number];
