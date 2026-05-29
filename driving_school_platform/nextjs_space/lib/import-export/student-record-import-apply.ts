/**
 * Student import apply (validate like dry-run, then create MANUAL_ONLY students).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import type { Prisma, StudentAppAccessMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isStudentSchoolIdConflict } from "@/lib/students/student-record-queries";
import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  ImportDryRunRowFinding,
  StudentImportRow,
} from "@/lib/import-export/import-export-contracts";
import {
  buildStudentImportDryRunReport,
  collectSchoolStudentIdsForDuplicateLookup,
  normalizeStudentImportRows,
  parseStudentImportCsv,
  parseStudentImportJson,
  type ParseStudentImportJsonInput,
  validateStudentImportRows,
} from "@/lib/import-export/student-record-import-dry-run";

/** Conservative max rows per apply request (no streaming in this batch). */
export const STUDENT_IMPORT_APPLY_MAX_ROWS = 500;

/** Max UTF-16 length for CSV/JSON `content` string payloads. */
export const STUDENT_IMPORT_MAX_CONTENT_LENGTH = 2 * 1024 * 1024;

export type StudentImportApplyResult = {
  applied: boolean;
  createdCount: number;
  skippedCount: number;
  report: ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>>;
};

export type StudentImportApplyPlan = {
  report: ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>>;
  rowsToCreate: ImportDryRunPreviewRow<StudentImportRow>[];
  canApply: boolean;
};

function limitFinding(message: string): ImportDryRunRowFinding {
  return {
    rowNumber: 1,
    field: null,
    code: "unsupported_value",
    message,
    rawValue: null,
  };
}

export function checkStudentImportPayloadLimits(input: {
  content?: string;
  rowCount: number;
}): ImportDryRunRowFinding[] {
  const errors: ImportDryRunRowFinding[] = [];

  if (
    input.content !== undefined &&
    input.content.length > STUDENT_IMPORT_MAX_CONTENT_LENGTH
  ) {
    errors.push(
      limitFinding(
        `Import content exceeds maximum size of ${STUDENT_IMPORT_MAX_CONTENT_LENGTH} characters`,
      ),
    );
  }

  if (input.rowCount > STUDENT_IMPORT_APPLY_MAX_ROWS) {
    errors.push(
      limitFinding(
        `Import exceeds maximum of ${STUDENT_IMPORT_APPLY_MAX_ROWS} rows`,
      ),
    );
  }

  return errors;
}

function parseEnrollmentDateForDb(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  return new Date(`${iso.trim()}T00:00:00.000Z`);
}

function studentCreateData(input: {
  organizationId: string;
  normalized: StudentImportRow;
}): Prisma.StudentUncheckedCreateInput {
  return {
    organizationId: input.organizationId,
    userId: null,
    firstName: input.normalized.firstName,
    lastName: input.normalized.lastName ?? null,
    email: input.normalized.email ?? null,
    phoneNumber: input.normalized.phoneNumber ?? null,
    schoolStudentId: input.normalized.schoolStudentId,
    schoolStudentYearSuffix: input.normalized.yearSuffix,
    schoolStudentSequence: input.normalized.sequence,
    schoolStudentIdSource: "IMPORT",
    appAccessMode: "MANUAL_ONLY" satisfies StudentAppAccessMode,
    enrollmentDate: parseEnrollmentDateForDb(input.normalized.enrollmentDate),
  };
}

export function buildStudentImportApplyPlan(input: {
  format: "csv" | "json";
  content?: string;
  rows?: ParseStudentImportJsonInput["rows"];
  existingSchoolStudentIds: ReadonlySet<string>;
}): StudentImportApplyPlan {
  const parsed =
    input.format === "csv"
      ? parseStudentImportCsv(input.content ?? "")
      : parseStudentImportJson({ content: input.content, rows: input.rows });

  if (!parsed.ok) {
    const report = buildStudentImportDryRunReport([], parsed.fileErrors);
    return { report, rowsToCreate: [], canApply: false };
  }

  const limitErrors = checkStudentImportPayloadLimits({
    content: input.content,
    rowCount: parsed.rows.length,
  });
  if (limitErrors.length > 0) {
    const report = buildStudentImportDryRunReport([], limitErrors);
    return { report, rowsToCreate: [], canApply: false };
  }

  const normalizedRows = normalizeStudentImportRows(parsed.rows);
  const validations = validateStudentImportRows({
    rows: normalizedRows,
    existingSchoolStudentIds: input.existingSchoolStudentIds,
  });
  const report = buildStudentImportDryRunReport(validations);
  const rowsToCreate = report.preview;
  const canApply = report.errors.length === 0 && rowsToCreate.length > 0;

  return { report, rowsToCreate, canApply };
}

/** IDs to lookup in org before validation (same as dry-run route). */
export function collectDuplicateLookupIdsFromApplyInput(input: {
  format: "csv" | "json";
  content?: string;
  rows?: ParseStudentImportJsonInput["rows"];
}): string[] {
  const parsed =
    input.format === "csv"
      ? parseStudentImportCsv(input.content ?? "")
      : parseStudentImportJson({ content: input.content, rows: input.rows });

  if (!parsed.ok) {
    return [];
  }

  return collectSchoolStudentIdsForDuplicateLookup(
    normalizeStudentImportRows(parsed.rows),
  );
}

export async function createStudentRecordsFromImport(input: {
  organizationId: string;
  rows: ImportDryRunPreviewRow<StudentImportRow>[];
}): Promise<{ createdCount: number }> {
  if (input.rows.length === 0) {
    return { createdCount: 0 };
  }

  await prisma.$transaction(async (tx) => {
    for (const row of input.rows) {
      await tx.student.create({
        data: studentCreateData({
          organizationId: input.organizationId,
          normalized: row.normalized,
        }),
      });
    }
  });

  return { createdCount: input.rows.length };
}

export function appendSchoolStudentIdConflictError(
  report: ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>>,
  schoolStudentId: string | null,
): ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>> {
  return {
    ...report,
    validRows: 0,
    invalidRows: report.totalRows,
    preview: [],
    errors: [
      ...report.errors,
      {
        rowNumber: 1,
        field: "schoolStudentId",
        code: "duplicate_school_student_id",
        message:
          "Student with this schoolStudentId already exists in organization",
        rawValue: schoolStudentId,
      },
    ],
  };
}

export function buildStudentImportApplyResult(input: {
  applied: boolean;
  createdCount: number;
  skippedCount?: number;
  report: ImportDryRunReport<ImportDryRunPreviewRow<StudentImportRow>>;
}): StudentImportApplyResult {
  return {
    applied: input.applied,
    createdCount: input.createdCount,
    skippedCount: input.skippedCount ?? 0,
    report: input.report,
  };
}

export async function runStudentImportApply(input: {
  organizationId: string;
  format: "csv" | "json";
  content?: string;
  rows?: ParseStudentImportJsonInput["rows"];
  existingSchoolStudentIds: ReadonlySet<string>;
}): Promise<StudentImportApplyResult> {
  const plan = buildStudentImportApplyPlan(input);

  if (!plan.canApply) {
    return buildStudentImportApplyResult({
      applied: false,
      createdCount: 0,
      report: plan.report,
    });
  }

  try {
    const { createdCount } = await createStudentRecordsFromImport({
      organizationId: input.organizationId,
      rows: plan.rowsToCreate,
    });
    return buildStudentImportApplyResult({
      applied: true,
      createdCount,
      report: plan.report,
    });
  } catch (error) {
    if (isStudentSchoolIdConflict(error)) {
      return buildStudentImportApplyResult({
        applied: false,
        createdCount: 0,
        report: appendSchoolStudentIdConflictError(plan.report, null),
      });
    }
    throw error;
  }
}
