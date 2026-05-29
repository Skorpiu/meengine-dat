/**
 * Student import dry-run (parse + validate only — no DB writes).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import {
  RECOMMENDED_CSV_DELIMITER,
  STUDENT_IMPORT_CSV_HEADERS,
  type ImportDryRunPreviewRow,
  type ImportDryRunReport,
  type ImportDryRunRowFinding,
  type ImportErrorCode,
  type StudentImportRow,
} from "@/lib/import-export/import-export-contracts";
import {
  buildSchoolStudentId,
  parseCanonicalSchoolStudentId,
} from "@/lib/students/student-school-id";

export type StudentImportRawRow = {
  rowNumber: number;
  values: Record<(typeof STUDENT_IMPORT_CSV_HEADERS)[number], string>;
};

export type StudentImportRowValidation = {
  rowNumber: number;
  errors: ImportDryRunRowFinding[];
  warnings: ImportDryRunRowFinding[];
  normalized: StudentImportRow | null;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEQUENCE_DIGITS_RE = /^\d+$/;

/** Parse import sequence: trimmed digits only, integer 1–999 (`001` → 1). */
export function parseImportSequenceValue(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed || !SEQUENCE_DIGITS_RE.test(trimmed)) {
    return { ok: false };
  }
  const num = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(num) || num < 1 || num > 999) {
    return { ok: false };
  }
  return { ok: true, value: num };
}

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

/** Parse a single CSV line (semicolon-delimited, basic quoted fields). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === RECOMMENDED_CSV_DELIMITER) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export type ParseStudentImportCsvResult =
  | { ok: true; rows: StudentImportRawRow[] }
  | { ok: false; fileErrors: ImportDryRunRowFinding[] };

export function parseStudentImportCsv(
  content: string,
): ParseStudentImportCsvResult {
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
    headerFields.length === STUDENT_IMPORT_CSV_HEADERS.length &&
    STUDENT_IMPORT_CSV_HEADERS.every(
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
          `CSV header must be: ${STUDENT_IMPORT_CSV_HEADERS.join(RECOMMENDED_CSV_DELIMITER)}`,
          lines[headerLineIndex] ?? null,
        ),
      ],
    };
  }

  const rows: StudentImportRawRow[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const rowNumber = i + 1;
    if (!line.trim()) continue;

    const cells = parseCsvLine(line);
    const values = {} as Record<
      (typeof STUDENT_IMPORT_CSV_HEADERS)[number],
      string
    >;
    for (let c = 0; c < STUDENT_IMPORT_CSV_HEADERS.length; c++) {
      const key = STUDENT_IMPORT_CSV_HEADERS[c];
      values[key] = cells[c] ?? "";
    }

    if (isRowEmpty(values)) continue;

    rows.push({ rowNumber, values });
  }

  return { ok: true, rows };
}

export type ParseStudentImportJsonInput = {
  content?: string;
  rows?: unknown[];
};

export type ParseStudentImportJsonResult =
  | { ok: true; rows: StudentImportRawRow[] }
  | { ok: false; fileErrors: ImportDryRunRowFinding[] };

function rawRowFromRecord(
  record: Record<string, unknown>,
  rowNumber: number,
): StudentImportRawRow {
  const values = {} as Record<
    (typeof STUDENT_IMPORT_CSV_HEADERS)[number],
    string
  >;
  for (const key of STUDENT_IMPORT_CSV_HEADERS) {
    const raw = record[key];
    values[key] = raw === null || raw === undefined ? "" : String(raw).trim();
  }
  return { rowNumber, values };
}

export function parseStudentImportJson(
  input: ParseStudentImportJsonInput,
): ParseStudentImportJsonResult {
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

  const rows: StudentImportRawRow[] = [];
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

export function normalizeStudentImportRows(
  rows: StudentImportRawRow[],
): StudentImportRawRow[] {
  return rows.map((row) => {
    const values = {} as Record<
      (typeof STUDENT_IMPORT_CSV_HEADERS)[number],
      string
    >;
    for (const key of STUDENT_IMPORT_CSV_HEADERS) {
      values[key] = row.values[key]?.trim() ?? "";
    }
    return { rowNumber: row.rowNumber, values };
  });
}

function parseSequence(
  raw: string,
): { ok: true; value: number } | { ok: false; error: ImportDryRunRowFinding } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: finding(
        0,
        "sequence",
        "missing_required_field",
        "sequence is required",
        raw,
      ),
    };
  }
  if (!SEQUENCE_DIGITS_RE.test(trimmed)) {
    return {
      ok: false,
      error: finding(
        0,
        "sequence",
        "unsupported_value",
        "sequence must contain digits only",
        raw,
      ),
    };
  }
  const num = Number.parseInt(trimmed, 10);
  if (num < 1 || num > 999) {
    return {
      ok: false,
      error: finding(
        0,
        "sequence",
        "invalid_school_student_id",
        "sequence must be between 1 and 999",
        raw,
      ),
    };
  }
  return { ok: true, value: num };
}

function isValidEnrollmentDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validateStudentImportRow(
  row: StudentImportRawRow,
): StudentImportRowValidation {
  const errors: ImportDryRunRowFinding[] = [];
  const warnings: ImportDryRunRowFinding[] = [];
  const { values } = row;
  const rowNumber = row.rowNumber;

  const push = (f: ImportDryRunRowFinding) => {
    errors.push({ ...f, rowNumber });
  };

  const requiredFields: (typeof STUDENT_IMPORT_CSV_HEADERS)[number][] = [
    "schoolStudentId",
    "yearSuffix",
    "sequence",
    "firstName",
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

  let sequenceNumber: number | null = null;
  if (values.sequence) {
    const seq = parseSequence(values.sequence);
    if (!seq.ok) {
      push({ ...seq.error, rowNumber });
    } else {
      sequenceNumber = seq.value;
    }
  }

  let canonicalId: string | null = null;
  if (values.schoolStudentId) {
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
      canonicalId = parsed.value.canonicalId;
    }
  }

  if (values.yearSuffix && sequenceNumber !== null) {
    const built = buildSchoolStudentId(values.yearSuffix, sequenceNumber);
    if (!built.ok) {
      push(
        finding(
          rowNumber,
          "yearSuffix",
          "invalid_school_student_id",
          built.error,
          values.yearSuffix,
        ),
      );
    } else if (canonicalId && built.value !== canonicalId) {
      push(
        finding(
          rowNumber,
          "schoolStudentId",
          "invalid_school_student_id",
          "schoolStudentId does not match yearSuffix and sequence",
          values.schoolStudentId,
        ),
      );
    } else if (!canonicalId) {
      canonicalId = built.value;
    }
  } else if (values.yearSuffix && !values.yearSuffix.trim()) {
    push(
      finding(
        rowNumber,
        "yearSuffix",
        "missing_required_field",
        "yearSuffix is required",
        values.yearSuffix,
      ),
    );
  }

  if (values.enrollmentDate?.trim()) {
    if (!isValidEnrollmentDate(values.enrollmentDate.trim())) {
      push(
        finding(
          rowNumber,
          "enrollmentDate",
          "invalid_date",
          "enrollmentDate must be YYYY-MM-DD",
          values.enrollmentDate,
        ),
      );
    }
  }

  if (values.email?.trim()) {
    if (!EMAIL_RE.test(values.email.trim())) {
      push(
        finding(
          rowNumber,
          "email",
          "unsupported_value",
          "email format is invalid",
          values.email,
        ),
      );
    }
  }

  if (
    errors.length > 0 ||
    !canonicalId ||
    sequenceNumber === null ||
    !values.firstName?.trim()
  ) {
    return { rowNumber, errors, warnings, normalized: null };
  }

  const normalized: StudentImportRow = {
    schoolStudentId: canonicalId,
    yearSuffix: values.yearSuffix.trim(),
    sequence: sequenceNumber,
    firstName: values.firstName.trim(),
    lastName: values.lastName?.trim() || null,
    phoneNumber: values.phoneNumber?.trim() || null,
    email: values.email?.trim().toLowerCase() || null,
    enrollmentDate: values.enrollmentDate?.trim() || null,
  };

  return { rowNumber, errors, warnings, normalized };
}

export function applyDuplicateChecks(
  validations: StudentImportRowValidation[],
  existingSchoolStudentIds: ReadonlySet<string>,
): StudentImportRowValidation[] {
  const seenInFile = new Map<string, number>();
  const results = validations.map((v) => ({
    ...v,
    errors: [...v.errors],
    warnings: [...v.warnings],
  }));

  for (const result of results) {
    const id = result.normalized?.schoolStudentId;
    if (!id) continue;

    const firstRow = seenInFile.get(id);
    if (firstRow !== undefined) {
      result.errors.push(
        finding(
          result.rowNumber,
          "schoolStudentId",
          "duplicate_school_student_id",
          `Duplicate schoolStudentId in file (first at row ${firstRow})`,
          id,
        ),
      );
      result.normalized = null;
      continue;
    }
    seenInFile.set(id, result.rowNumber);

    if (existingSchoolStudentIds.has(id)) {
      result.errors.push(
        finding(
          result.rowNumber,
          "schoolStudentId",
          "duplicate_school_student_id",
          "Student with this schoolStudentId already exists in organization",
          id,
        ),
      );
      result.normalized = null;
    }
  }

  return results;
}

export function validateStudentImportRows(input: {
  rows: StudentImportRawRow[];
  existingSchoolStudentIds: ReadonlySet<string>;
}): StudentImportRowValidation[] {
  const normalized = normalizeStudentImportRows(input.rows);
  const validations = normalized.map(validateStudentImportRow);
  return applyDuplicateChecks(validations, input.existingSchoolStudentIds);
}

export function buildStudentImportDryRunReport(
  validations: StudentImportRowValidation[],
  fileErrors: ImportDryRunRowFinding[] = [],
): ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>> {
  const errors: ImportDryRunRowFinding[] = [...fileErrors];
  const warnings: ImportDryRunRowFinding[] = [];

  for (const v of validations) {
    errors.push(...v.errors);
    warnings.push(...v.warnings);
  }

  const totalRows = validations.length;
  const validRows = validations.filter((v) => v.normalized !== null).length;
  const invalidRows = totalRows - validRows;

  const preview: ImportDryRunPreviewRow<StudentImportRow>[] = validations
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

/** Collect canonical IDs from raw rows for tenant duplicate lookup (pre-validation). */
export function collectSchoolStudentIdsForDuplicateLookup(
  rows: StudentImportRawRow[],
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const { values } = row;
    const trimmedId = values.schoolStudentId?.trim();
    if (trimmedId) {
      const parsed = parseCanonicalSchoolStudentId(trimmedId);
      if (parsed.ok) {
        ids.add(parsed.value.canonicalId);
      }
    }
    const year = values.yearSuffix?.trim();
    const seqRaw = values.sequence?.trim();
    if (year && seqRaw) {
      const seq = parseImportSequenceValue(seqRaw);
      if (seq.ok) {
        const built = buildSchoolStudentId(year, seq.value);
        if (built.ok) {
          ids.add(built.value);
        }
      }
    }
  }
  return [...ids];
}
