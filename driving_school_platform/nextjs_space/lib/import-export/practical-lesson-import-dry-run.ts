/**
 * Practical lesson import dry-run (parse + validate only — no DB writes).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import {
  PRACTICAL_LESSON_IMPORT_CSV_HEADERS,
  RECOMMENDED_CSV_DELIMITER,
  type ImportDryRunPreviewRow,
  type ImportDryRunReport,
  type ImportDryRunRowFinding,
  type ImportErrorCode,
  type PracticalLessonImportDryRunRow,
} from "@/lib/import-export/import-export-contracts";
import { parseCsvLine } from "@/lib/import-export/student-record-import-dry-run";
import {
  MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
  MANUAL_PRACTICAL_LESSON_MAX_NUMBER,
} from "@/lib/lessons/manual-practical-lesson-validation";
import { parseCanonicalSchoolStudentId } from "@/lib/students/student-school-id";

export type PracticalLessonImportRawRow = {
  rowNumber: number;
  values: Record<(typeof PRACTICAL_LESSON_IMPORT_CSV_HEADERS)[number], string>;
};

export type PracticalLessonImportRowValidation = {
  rowNumber: number;
  errors: ImportDryRunRowFinding[];
  warnings: ImportDryRunRowFinding[];
  normalized: PracticalLessonImportDryRunRow | null;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const DIGITS_RE = /^\d+$/;

export const PRACTICAL_LESSON_IMPORT_MAX_DURATION_MINUTES = 600;

function finding(
  rowNumber: number,
  field: string | null,
  code: ImportErrorCode,
  message: string,
  rawValue: string | null,
): ImportDryRunRowFinding {
  return { rowNumber, field, code, message, rawValue };
}

function isRowEmpty(values: Record<string, string>): boolean {
  return Object.values(values).every((v) => !v.trim());
}

function isValidEnrollmentDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function parseTimeValue(
  raw: string,
): { ok: true; value: string } | { ok: false } {
  const trimmed = raw.trim();
  const match = TIME_RE.exec(trimmed);
  if (!match) return { ok: false };
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { ok: false };
  }
  return {
    ok: true,
    value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

function parsePracticalLessonNumber(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed || !DIGITS_RE.test(trimmed)) {
    return { ok: false };
  }
  const num = Number.parseInt(trimmed, 10);
  if (
    !Number.isInteger(num) ||
    num < 1 ||
    num > MANUAL_PRACTICAL_LESSON_MAX_NUMBER
  ) {
    return { ok: false };
  }
  return { ok: true, value: num };
}

function parseDurationMinutes(
  raw: string,
): { ok: true; value: number } | { ok: false; invalid: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: true,
      value: MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
    };
  }
  if (!DIGITS_RE.test(trimmed)) {
    return { ok: false, invalid: true };
  }
  const num = Number.parseInt(trimmed, 10);
  if (
    !Number.isInteger(num) ||
    num < 1 ||
    num > PRACTICAL_LESSON_IMPORT_MAX_DURATION_MINUTES
  ) {
    return { ok: false, invalid: true };
  }
  return { ok: true, value: num };
}

export type ParsePracticalLessonImportCsvResult =
  | { ok: true; rows: PracticalLessonImportRawRow[] }
  | { ok: false; fileErrors: ImportDryRunRowFinding[] };

export function parsePracticalLessonImportCsv(
  content: string,
): ParsePracticalLessonImportCsvResult {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length === 0 || lines.every((l) => !l.trim())) {
    return {
      ok: false,
      fileErrors: [
        finding(1, null, "unsupported_value", "CSV content is empty", null),
      ],
    };
  }

  const headerLineIndex = lines.findIndex((l) => l.trim().length > 0);
  const headerLineNumber = headerLineIndex + 1;
  const headerFields = parseCsvLine(lines[headerLineIndex] ?? "");

  const headersMatch =
    headerFields.length === PRACTICAL_LESSON_IMPORT_CSV_HEADERS.length &&
    PRACTICAL_LESSON_IMPORT_CSV_HEADERS.every(
      (expected, i) => headerFields[i] === expected,
    );

  if (!headersMatch) {
    return {
      ok: false,
      fileErrors: [
        finding(
          headerLineNumber,
          null,
          "unsupported_value",
          `CSV header must be: ${PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(RECOMMENDED_CSV_DELIMITER)}`,
          lines[headerLineIndex] ?? null,
        ),
      ],
    };
  }

  const rows: PracticalLessonImportRawRow[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const rowNumber = i + 1;
    if (!line.trim()) continue;

    const cells = parseCsvLine(line);
    const values = {} as Record<
      (typeof PRACTICAL_LESSON_IMPORT_CSV_HEADERS)[number],
      string
    >;
    for (let c = 0; c < PRACTICAL_LESSON_IMPORT_CSV_HEADERS.length; c++) {
      const key = PRACTICAL_LESSON_IMPORT_CSV_HEADERS[c];
      values[key] = cells[c] ?? "";
    }

    if (isRowEmpty(values)) continue;

    rows.push({ rowNumber, values });
  }

  return { ok: true, rows };
}

export type ParsePracticalLessonImportJsonInput = {
  content?: string;
  rows?: unknown[];
};

export type ParsePracticalLessonImportJsonResult =
  | { ok: true; rows: PracticalLessonImportRawRow[] }
  | { ok: false; fileErrors: ImportDryRunRowFinding[] };

function rawRowFromRecord(
  record: Record<string, unknown>,
  rowNumber: number,
): PracticalLessonImportRawRow {
  const values = {} as Record<
    (typeof PRACTICAL_LESSON_IMPORT_CSV_HEADERS)[number],
    string
  >;
  for (const key of PRACTICAL_LESSON_IMPORT_CSV_HEADERS) {
    const raw = record[key];
    values[key] = raw === null || raw === undefined ? "" : String(raw).trim();
  }
  return { rowNumber, values };
}

export function parsePracticalLessonImportJson(
  input: ParsePracticalLessonImportJsonInput,
): ParsePracticalLessonImportJsonResult {
  let records: unknown[] | null = null;

  if (Array.isArray(input.rows)) {
    records = input.rows;
  } else if (typeof input.content === "string" && input.content.trim()) {
    try {
      const parsed: unknown = JSON.parse(input.content);
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { rows?: unknown[] }).rows)
      ) {
        records = (parsed as { rows: unknown[] }).rows;
      } else {
        return {
          ok: false,
          fileErrors: [
            finding(
              1,
              null,
              "unsupported_value",
              "JSON content must be an array or { rows: [...] }",
              input.content.slice(0, 200),
            ),
          ],
        };
      }
    } catch {
      return {
        ok: false,
        fileErrors: [
          finding(
            1,
            null,
            "unsupported_value",
            "Invalid JSON content",
            input.content.slice(0, 200),
          ),
        ],
      };
    }
  } else {
    return {
      ok: false,
      fileErrors: [
        finding(
          1,
          null,
          "missing_required_field",
          "JSON import requires rows or content",
          null,
        ),
      ],
    };
  }

  const rows: PracticalLessonImportRawRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        ok: false,
        fileErrors: [
          finding(
            i + 1,
            null,
            "unsupported_value",
            "Each JSON row must be an object",
            item === null || item === undefined ? null : String(item),
          ),
        ],
      };
    }
    const raw = rawRowFromRecord(item as Record<string, unknown>, i + 1);
    if (!isRowEmpty(raw.values)) {
      rows.push(raw);
    }
  }

  return { ok: true, rows };
}

export function normalizePracticalLessonImportRows(
  rows: PracticalLessonImportRawRow[],
): PracticalLessonImportRawRow[] {
  return rows.map((row) => {
    const values = {} as Record<
      (typeof PRACTICAL_LESSON_IMPORT_CSV_HEADERS)[number],
      string
    >;
    for (const key of PRACTICAL_LESSON_IMPORT_CSV_HEADERS) {
      values[key] = row.values[key]?.trim() ?? "";
    }
    return { rowNumber: row.rowNumber, values };
  });
}

export function collectSchoolStudentIdsForPracticalLessonLookup(
  rows: PracticalLessonImportRawRow[],
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const trimmed = row.values.schoolStudentId?.trim();
    if (!trimmed) continue;
    const parsed = parseCanonicalSchoolStudentId(trimmed);
    if (parsed.ok) {
      ids.add(parsed.value.canonicalId);
    }
  }
  return [...ids];
}

export function collectInstructorEmailsForPracticalLessonLookup(
  rows: PracticalLessonImportRawRow[],
): string[] {
  const emails = new Set<string>();
  for (const row of rows) {
    const trimmed = row.values.instructorEmail?.trim();
    if (trimmed && EMAIL_RE.test(trimmed)) {
      emails.add(trimmed.toLowerCase());
    }
  }
  return [...emails];
}

export function validatePracticalLessonImportRow(
  row: PracticalLessonImportRawRow,
  context: {
    studentsBySchoolStudentId: ReadonlyMap<string, string>;
    instructorUserIdsByEmail: ReadonlyMap<string, string>;
  },
): PracticalLessonImportRowValidation {
  const errors: ImportDryRunRowFinding[] = [];
  const warnings: ImportDryRunRowFinding[] = [];
  const { values } = row;
  const rowNumber = row.rowNumber;

  const push = (f: ImportDryRunRowFinding) => {
    errors.push({ ...f, rowNumber });
  };

  const requiredFields: (typeof PRACTICAL_LESSON_IMPORT_CSV_HEADERS)[number][] =
    [
      "schoolStudentId",
      "practicalLessonNumber",
      "lessonDate",
      "startTime",
      "instructorEmail",
    ];

  for (const field of requiredFields) {
    if (!values[field]?.trim()) {
      push(
        finding(
          rowNumber,
          field,
          "missing_required_field",
          `${field} is required`,
          values[field] || null,
        ),
      );
    }
  }

  let canonicalSchoolStudentId: string | null = null;
  if (values.schoolStudentId?.trim()) {
    const parsed = parseCanonicalSchoolStudentId(values.schoolStudentId);
    if (!parsed.ok) {
      push(
        finding(
          rowNumber,
          "schoolStudentId",
          "invalid_school_student_id",
          parsed.error,
          values.schoolStudentId,
        ),
      );
    } else {
      canonicalSchoolStudentId = parsed.value.canonicalId;
    }
  }

  let practicalLessonNumber: number | null = null;
  if (values.practicalLessonNumber?.trim()) {
    const parsed = parsePracticalLessonNumber(values.practicalLessonNumber);
    if (!parsed.ok) {
      push(
        finding(
          rowNumber,
          "practicalLessonNumber",
          "unsupported_value",
          `practicalLessonNumber must be an integer between 1 and ${MANUAL_PRACTICAL_LESSON_MAX_NUMBER}`,
          values.practicalLessonNumber,
        ),
      );
    } else {
      practicalLessonNumber = parsed.value;
    }
  }

  if (values.lessonDate?.trim()) {
    if (!isValidEnrollmentDate(values.lessonDate.trim())) {
      push(
        finding(
          rowNumber,
          "lessonDate",
          "invalid_date",
          "lessonDate must be YYYY-MM-DD",
          values.lessonDate,
        ),
      );
    }
  }

  let startTime: string | null = null;
  if (values.startTime?.trim()) {
    const parsed = parseTimeValue(values.startTime);
    if (!parsed.ok) {
      push(
        finding(
          rowNumber,
          "startTime",
          "invalid_time",
          "startTime must be HH:mm",
          values.startTime,
        ),
      );
    } else {
      startTime = parsed.value;
    }
  }

  let durationMinutes: number | null = null;
  const durationParsed = parseDurationMinutes(values.durationMinutes ?? "");
  if (!durationParsed.ok) {
    push(
      finding(
        rowNumber,
        "durationMinutes",
        "invalid_duration",
        `durationMinutes must be an integer between 1 and ${PRACTICAL_LESSON_IMPORT_MAX_DURATION_MINUTES}`,
        values.durationMinutes || null,
      ),
    );
  } else {
    durationMinutes = durationParsed.value;
  }

  let instructorEmail: string | null = null;
  if (values.instructorEmail?.trim()) {
    const trimmed = values.instructorEmail.trim();
    if (!EMAIL_RE.test(trimmed)) {
      push(
        finding(
          rowNumber,
          "instructorEmail",
          "unsupported_value",
          "instructorEmail format is invalid",
          values.instructorEmail,
        ),
      );
    } else {
      instructorEmail = trimmed.toLowerCase();
    }
  }

  let studentId: string | null = null;
  if (canonicalSchoolStudentId) {
    const resolved = context.studentsBySchoolStudentId.get(
      canonicalSchoolStudentId,
    );
    if (!resolved) {
      push(
        finding(
          rowNumber,
          "schoolStudentId",
          "unknown_student",
          "Student with this schoolStudentId was not found in organization",
          canonicalSchoolStudentId,
        ),
      );
    } else {
      studentId = resolved;
    }
  }

  let instructorId: string | null = null;
  if (instructorEmail) {
    const resolved = context.instructorUserIdsByEmail.get(instructorEmail);
    if (!resolved) {
      push(
        finding(
          rowNumber,
          "instructorEmail",
          "unknown_instructor",
          "Instructor with this email was not found in organization",
          instructorEmail,
        ),
      );
    } else {
      instructorId = resolved;
    }
  }

  if (
    errors.length > 0 ||
    !canonicalSchoolStudentId ||
    practicalLessonNumber === null ||
    !values.lessonDate?.trim() ||
    !isValidEnrollmentDate(values.lessonDate.trim()) ||
    !startTime ||
    durationMinutes === null ||
    !instructorEmail ||
    !studentId ||
    !instructorId
  ) {
    return { rowNumber, errors, warnings, normalized: null };
  }

  const normalized: PracticalLessonImportDryRunRow = {
    schoolStudentId: canonicalSchoolStudentId,
    studentId,
    practicalLessonNumber,
    lessonDate: values.lessonDate.trim(),
    startTime,
    durationMinutes,
    instructorEmail,
    instructorId,
    notes: values.notes?.trim() || null,
  };

  return { rowNumber, errors, warnings, normalized };
}

export function applyPracticalLessonDuplicateChecks(
  validations: PracticalLessonImportRowValidation[],
  existingLessonKeys: ReadonlySet<string>,
): PracticalLessonImportRowValidation[] {
  const seenInFile = new Map<string, number>();
  const results = validations.map((v) => ({
    ...v,
    errors: [...v.errors],
    warnings: [...v.warnings],
  }));

  for (const result of results) {
    const normalized = result.normalized;
    if (!normalized) continue;

    const fileKey = `${normalized.schoolStudentId}:${normalized.practicalLessonNumber}`;
    const firstRow = seenInFile.get(fileKey);
    if (firstRow !== undefined) {
      result.errors.push(
        finding(
          result.rowNumber,
          "practicalLessonNumber",
          "duplicate_practical_lesson_number",
          `Duplicate practicalLessonNumber in file (first at row ${firstRow})`,
          String(normalized.practicalLessonNumber),
        ),
      );
      result.normalized = null;
      continue;
    }
    seenInFile.set(fileKey, result.rowNumber);

    const dbKey = `${normalized.studentId}:${normalized.practicalLessonNumber}`;
    if (existingLessonKeys.has(dbKey)) {
      result.errors.push(
        finding(
          result.rowNumber,
          "practicalLessonNumber",
          "duplicate_practical_lesson_number",
          "DRIVING lesson with this practicalLessonNumber already exists for student in organization",
          String(normalized.practicalLessonNumber),
        ),
      );
      result.normalized = null;
    }
  }

  return results;
}

export function validatePracticalLessonImportRows(input: {
  rows: PracticalLessonImportRawRow[];
  studentsBySchoolStudentId: ReadonlyMap<string, string>;
  instructorUserIdsByEmail: ReadonlyMap<string, string>;
  existingLessonKeys: ReadonlySet<string>;
}): PracticalLessonImportRowValidation[] {
  const normalized = normalizePracticalLessonImportRows(input.rows);
  const validations = normalized.map((row) =>
    validatePracticalLessonImportRow(row, {
      studentsBySchoolStudentId: input.studentsBySchoolStudentId,
      instructorUserIdsByEmail: input.instructorUserIdsByEmail,
    }),
  );
  return applyPracticalLessonDuplicateChecks(
    validations,
    input.existingLessonKeys,
  );
}

export function buildPracticalLessonImportDryRunReport(
  validations: PracticalLessonImportRowValidation[],
  fileErrors: ImportDryRunRowFinding[] = [],
): ImportDryRunReport<ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>> {
  const errors: ImportDryRunRowFinding[] = [...fileErrors];
  const warnings: ImportDryRunRowFinding[] = [];

  for (const v of validations) {
    errors.push(...v.errors);
    warnings.push(...v.warnings);
  }

  const totalRows = validations.length;
  const validRows = validations.filter((v) => v.normalized !== null).length;
  const invalidRows = totalRows - validRows;

  const preview: ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>[] =
    validations
      .filter((v) => v.normalized !== null && v.errors.length === 0)
      .map((v) => ({
        rowNumber: v.rowNumber,
        normalized: v.normalized!,
      }));

  return {
    totalRows,
    validRows,
    invalidRows,
    warnings,
    errors,
    preview,
  };
}

export function collectStudentIdsForExistingLessonLookupFromRows(
  rows: PracticalLessonImportRawRow[],
  studentsBySchoolStudentId: ReadonlyMap<string, string>,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const trimmed = row.values.schoolStudentId?.trim();
    if (!trimmed) continue;
    const parsed = parseCanonicalSchoolStudentId(trimmed);
    if (!parsed.ok) continue;
    const studentId = studentsBySchoolStudentId.get(parsed.value.canonicalId);
    if (studentId) {
      ids.add(studentId);
    }
  }
  return [...ids];
}
