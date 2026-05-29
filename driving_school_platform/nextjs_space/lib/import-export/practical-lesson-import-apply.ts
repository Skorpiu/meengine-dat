/**
 * Practical lesson import apply (validate like dry-run, then create DRIVING IMPORT lessons).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LESSON_STATUS, LESSON_TYPES } from "@/lib/constants";
import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  ImportDryRunRowFinding,
  PracticalLessonImportDryRunRow,
} from "@/lib/import-export/import-export-contracts";
import {
  buildPracticalLessonImportDryRunReport,
  collectInstructorEmailsForPracticalLessonLookup,
  collectSchoolStudentIdsForPracticalLessonLookup,
  collectStudentIdsForExistingLessonLookupFromRows,
  normalizePracticalLessonImportRows,
  parsePracticalLessonImportCsv,
  parsePracticalLessonImportJson,
  type ParsePracticalLessonImportJsonInput,
  validatePracticalLessonImportRows,
} from "@/lib/import-export/practical-lesson-import-dry-run";
import { addMinutesToTime } from "@/lib/lessons/manual-practical-lesson-validation";
import { resolveDrivingCategoryIdForInstructor } from "@/lib/lessons/manual-practical-lesson-service";
import {
  buildExistingPracticalLessonKeySet,
  findExistingPracticalLessonNumbersInOrg,
  findInstructorRecordsByUserIdsInOrg,
  findInstructorUserIdsByEmailInOrg,
  findStudentsBySchoolStudentIdsInOrg,
} from "@/lib/lessons/practical-lesson-import-queries";

/** Conservative max rows per apply request (no streaming in this batch). */
export const PRACTICAL_LESSON_IMPORT_APPLY_MAX_ROWS = 500;

/** Max UTF-16 length for CSV/JSON `content` string payloads. */
export const PRACTICAL_LESSON_IMPORT_MAX_CONTENT_LENGTH = 2 * 1024 * 1024;

export type PracticalLessonImportApplyResult = {
  applied: boolean;
  createdCount: number;
  skippedCount: number;
  report: ImportDryRunReport<
    ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
  >;
};

export type PracticalLessonImportApplyPlan = {
  report: ImportDryRunReport<
    ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
  >;
  rowsToCreate: ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>[];
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

export function checkPracticalLessonImportPayloadLimits(input: {
  content?: string;
  rowCount: number;
}): ImportDryRunRowFinding[] {
  const errors: ImportDryRunRowFinding[] = [];

  if (
    input.content !== undefined &&
    input.content.length > PRACTICAL_LESSON_IMPORT_MAX_CONTENT_LENGTH
  ) {
    errors.push(
      limitFinding(
        `Import content exceeds maximum size of ${PRACTICAL_LESSON_IMPORT_MAX_CONTENT_LENGTH} characters`,
      ),
    );
  }

  if (input.rowCount > PRACTICAL_LESSON_IMPORT_APPLY_MAX_ROWS) {
    errors.push(
      limitFinding(
        `Import exceeds maximum of ${PRACTICAL_LESSON_IMPORT_APPLY_MAX_ROWS} rows`,
      ),
    );
  }

  return errors;
}

export function buildPracticalLessonImportApplyPlan(input: {
  format: "csv" | "json";
  content?: string;
  rows?: ParsePracticalLessonImportJsonInput["rows"];
  studentsBySchoolStudentId: ReadonlyMap<string, string>;
  instructorUserIdsByEmail: ReadonlyMap<string, string>;
  existingLessonKeys: ReadonlySet<string>;
}): PracticalLessonImportApplyPlan {
  const parsed =
    input.format === "csv"
      ? parsePracticalLessonImportCsv(input.content ?? "")
      : parsePracticalLessonImportJson({
          content: input.content,
          rows: input.rows,
        });

  if (!parsed.ok) {
    const report = buildPracticalLessonImportDryRunReport(
      [],
      parsed.fileErrors,
    );
    return { report, rowsToCreate: [], canApply: false };
  }

  const limitErrors = checkPracticalLessonImportPayloadLimits({
    content: input.content,
    rowCount: parsed.rows.length,
  });
  if (limitErrors.length > 0) {
    const report = buildPracticalLessonImportDryRunReport([], limitErrors);
    return { report, rowsToCreate: [], canApply: false };
  }

  const normalizedRows = normalizePracticalLessonImportRows(parsed.rows);
  const validations = validatePracticalLessonImportRows({
    rows: normalizedRows,
    studentsBySchoolStudentId: input.studentsBySchoolStudentId,
    instructorUserIdsByEmail: input.instructorUserIdsByEmail,
    existingLessonKeys: input.existingLessonKeys,
  });
  const report = buildPracticalLessonImportDryRunReport(validations);
  const rowsToCreate = report.preview;
  const canApply = report.errors.length === 0 && rowsToCreate.length > 0;

  return { report, rowsToCreate, canApply };
}

function lessonCreateData(input: {
  organizationId: string;
  normalized: PracticalLessonImportDryRunRow;
  /** Instructor row id — Prisma FK on Lesson.instructorId (not User.id). */
  instructorRecordId: string;
  categoryId: number;
}): Prisma.LessonUncheckedCreateInput {
  const endTime = addMinutesToTime(
    input.normalized.startTime,
    input.normalized.durationMinutes,
  );

  return {
    organizationId: input.organizationId,
    studentId: input.normalized.studentId,
    instructorId: input.instructorRecordId,
    vehicleId: null,
    lessonDate: new Date(input.normalized.lessonDate),
    startTime: input.normalized.startTime,
    endTime,
    durationMinutes: input.normalized.durationMinutes,
    lessonType: LESSON_TYPES.DRIVING,
    categoryId: input.categoryId,
    status: LESSON_STATUS.COMPLETED,
    practicalLessonNumber: input.normalized.practicalLessonNumber,
    lessonSource: "IMPORT",
    adminNotes: input.normalized.notes?.trim() || null,
    completedAt: new Date(input.normalized.lessonDate),
  };
}

export function isPracticalLessonNumberConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  if (!Array.isArray(target)) {
    return false;
  }

  return (
    target.includes("practicalLessonNumber") ||
    (target.includes("organizationId") &&
      target.includes("studentId") &&
      target.includes("practicalLessonNumber"))
  );
}

export function appendPracticalLessonNumberConflictError(
  report: ImportDryRunReport<
    ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
  >,
  practicalLessonNumber: string | null,
): ImportDryRunReport<ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>> {
  return {
    ...report,
    validRows: 0,
    invalidRows: report.totalRows,
    preview: [],
    errors: [
      ...report.errors,
      {
        rowNumber: 1,
        field: "practicalLessonNumber",
        code: "duplicate_practical_lesson_number",
        message:
          "DRIVING lesson with this practicalLessonNumber already exists for student in organization",
        rawValue: practicalLessonNumber,
      },
    ],
  };
}

async function resolveCategoryIdsForInstructorRecords(input: {
  organizationId: string;
  instructorRecordIds: string[];
}): Promise<
  | { ok: true; categoryByInstructorRecordId: Map<string, number> }
  | { ok: false; error: string }
> {
  const categoryByInstructorRecordId = new Map<string, number>();

  for (const instructorRecordId of input.instructorRecordIds) {
    const resolved = await resolveDrivingCategoryIdForInstructor({
      organizationId: input.organizationId,
      instructorDbId: instructorRecordId,
    });
    if (!resolved.ok) {
      return { ok: false, error: resolved.error };
    }
    categoryByInstructorRecordId.set(instructorRecordId, resolved.categoryId);
  }

  return { ok: true, categoryByInstructorRecordId };
}

export async function createPracticalLessonsFromImportRows(input: {
  organizationId: string;
  rows: ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>[];
}): Promise<{ createdCount: number }> {
  if (input.rows.length === 0) {
    return { createdCount: 0 };
  }

  const instructorUserIds = [
    ...new Set(input.rows.map((row) => row.normalized.instructorId)),
  ];
  const instructorRecordsByUserId = await findInstructorRecordsByUserIdsInOrg({
    organizationId: input.organizationId,
    userIds: instructorUserIds,
  });

  const uniqueInstructorRecordIds = [
    ...new Set(
      instructorUserIds
        .map(
          (userId) => instructorRecordsByUserId.get(userId)?.instructorRecordId,
        )
        .filter((id): id is string => id != null),
    ),
  ];

  const categories = await resolveCategoryIdsForInstructorRecords({
    organizationId: input.organizationId,
    instructorRecordIds: uniqueInstructorRecordIds,
  });
  if (!categories.ok) {
    throw new Error(categories.error);
  }

  await prisma.$transaction(async (tx) => {
    for (const row of input.rows) {
      const instructorRecord = instructorRecordsByUserId.get(
        row.normalized.instructorId,
      );
      if (!instructorRecord) {
        throw new Error("Instructor not found");
      }

      const categoryId = categories.categoryByInstructorRecordId.get(
        instructorRecord.instructorRecordId,
      );
      if (categoryId === undefined) {
        throw new Error("No category found for instructor");
      }

      await tx.lesson.create({
        data: lessonCreateData({
          organizationId: input.organizationId,
          normalized: row.normalized,
          instructorRecordId: instructorRecord.instructorRecordId,
          categoryId,
        }),
      });
    }
  });

  return { createdCount: input.rows.length };
}

export function buildPracticalLessonImportApplyResult(input: {
  applied: boolean;
  createdCount: number;
  skippedCount?: number;
  report: ImportDryRunReport<
    ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
  >;
}): PracticalLessonImportApplyResult {
  return {
    applied: input.applied,
    createdCount: input.createdCount,
    skippedCount: input.skippedCount ?? 0,
    report: input.report,
  };
}

async function fetchPracticalLessonImportLookups(input: {
  organizationId: string;
  normalizedRows: ReturnType<typeof normalizePracticalLessonImportRows>;
}): Promise<{
  studentsBySchoolStudentId: Map<string, string>;
  instructorUserIdsByEmail: Map<string, string>;
  existingLessonKeys: Set<string>;
}> {
  const schoolStudentIds = collectSchoolStudentIdsForPracticalLessonLookup(
    input.normalizedRows,
  );
  const instructorEmails = collectInstructorEmailsForPracticalLessonLookup(
    input.normalizedRows,
  );

  const [studentsBySchoolStudentId, instructorUserIdsByEmail] =
    await Promise.all([
      findStudentsBySchoolStudentIdsInOrg({
        organizationId: input.organizationId,
        schoolStudentIds,
      }),
      findInstructorUserIdsByEmailInOrg({
        organizationId: input.organizationId,
        emails: instructorEmails,
      }),
    ]);

  const studentIdsForExistingLookup =
    collectStudentIdsForExistingLessonLookupFromRows(
      input.normalizedRows,
      studentsBySchoolStudentId,
    );
  const existingLessons = await findExistingPracticalLessonNumbersInOrg({
    organizationId: input.organizationId,
    studentIds: studentIdsForExistingLookup,
  });

  return {
    studentsBySchoolStudentId,
    instructorUserIdsByEmail,
    existingLessonKeys: buildExistingPracticalLessonKeySet(existingLessons),
  };
}

export async function runPracticalLessonImportApply(input: {
  organizationId: string;
  format: "csv" | "json";
  content?: string;
  rows?: ParsePracticalLessonImportJsonInput["rows"];
}): Promise<PracticalLessonImportApplyResult> {
  const parsed =
    input.format === "csv"
      ? parsePracticalLessonImportCsv(input.content ?? "")
      : parsePracticalLessonImportJson({
          content: input.content,
          rows: input.rows,
        });

  if (!parsed.ok) {
    const report = buildPracticalLessonImportDryRunReport(
      [],
      parsed.fileErrors,
    );
    return buildPracticalLessonImportApplyResult({
      applied: false,
      createdCount: 0,
      report,
    });
  }

  const limitErrors = checkPracticalLessonImportPayloadLimits({
    content: input.content,
    rowCount: parsed.rows.length,
  });
  if (limitErrors.length > 0) {
    const report = buildPracticalLessonImportDryRunReport([], limitErrors);
    return buildPracticalLessonImportApplyResult({
      applied: false,
      createdCount: 0,
      report,
    });
  }

  const normalizedRows = normalizePracticalLessonImportRows(parsed.rows);
  const lookups = await fetchPracticalLessonImportLookups({
    organizationId: input.organizationId,
    normalizedRows,
  });

  const plan = buildPracticalLessonImportApplyPlan({
    format: input.format,
    content: input.content,
    rows: input.rows,
    studentsBySchoolStudentId: lookups.studentsBySchoolStudentId,
    instructorUserIdsByEmail: lookups.instructorUserIdsByEmail,
    existingLessonKeys: lookups.existingLessonKeys,
  });

  if (!plan.canApply) {
    return buildPracticalLessonImportApplyResult({
      applied: false,
      createdCount: 0,
      report: plan.report,
    });
  }

  try {
    const { createdCount } = await createPracticalLessonsFromImportRows({
      organizationId: input.organizationId,
      rows: plan.rowsToCreate,
    });
    return buildPracticalLessonImportApplyResult({
      applied: true,
      createdCount,
      report: plan.report,
    });
  } catch (error) {
    if (isPracticalLessonNumberConflict(error)) {
      return buildPracticalLessonImportApplyResult({
        applied: false,
        createdCount: 0,
        report: appendPracticalLessonNumberConflictError(plan.report, null),
      });
    }
    throw error;
  }
}
