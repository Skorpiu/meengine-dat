import { describe, expect, it } from "vitest";
import {
  buildPracticalLessonImportDryRunReport,
  normalizePracticalLessonImportRows,
  parsePracticalLessonImportCsv,
  parsePracticalLessonImportJson,
  validatePracticalLessonImportRows,
} from "@/lib/import-export/practical-lesson-import-dry-run";
import { PRACTICAL_LESSON_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";
import { MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES } from "@/lib/lessons/manual-practical-lesson-validation";

const CSV_HEADER = PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(";");

const studentsBySchoolStudentId = new Map([["26001", "student-1"]]);
const instructorUserIdsByEmail = new Map([
  ["instrutor@school.test", "instructor-user-1"],
]);

function runDryRun(
  rows: ReturnType<typeof normalizePracticalLessonImportRows>,
  options: {
    studentsBySchoolStudentId?: Map<string, string>;
    instructorUserIdsByEmail?: Map<string, string>;
    existingLessonKeys?: Set<string>;
  } = {},
) {
  const validations = validatePracticalLessonImportRows({
    rows,
    studentsBySchoolStudentId:
      options.studentsBySchoolStudentId ?? studentsBySchoolStudentId,
    instructorUserIdsByEmail:
      options.instructorUserIdsByEmail ?? instructorUserIdsByEmail,
    existingLessonKeys: options.existingLessonKeys ?? new Set(),
  });
  return buildPracticalLessonImportDryRunReport(validations);
}

function runCsvDryRun(
  content: string,
  options: Parameters<typeof runDryRun>[1] = {},
) {
  const parsed = parsePracticalLessonImportCsv(content);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    return buildPracticalLessonImportDryRunReport([], parsed.fileErrors);
  }
  return runDryRun(normalizePracticalLessonImportRows(parsed.rows), options);
}

describe("practical lesson import dry-run", () => {
  it("accepts valid CSV with one lesson", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;3;2026-05-29;09:00;60;instrutor@school.test;Nota`,
    );
    expect(report.totalRows).toBe(1);
    expect(report.validRows).toBe(1);
    expect(report.errors).toHaveLength(0);
    expect(report.preview[0]?.normalized).toEqual({
      schoolStudentId: "26001",
      studentId: "student-1",
      practicalLessonNumber: 3,
      lessonDate: "2026-05-29",
      startTime: "09:00",
      durationMinutes: 60,
      instructorEmail: "instrutor@school.test",
      instructorId: "instructor-user-1",
      notes: "Nota",
    });
  });

  it("accepts valid JSON rows with one lesson", () => {
    const parsed = parsePracticalLessonImportJson({
      rows: [
        {
          schoolStudentId: "26001",
          practicalLessonNumber: 4,
          lessonDate: "2026-05-30",
          startTime: "10:00",
          instructorEmail: "instrutor@school.test",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const report = runDryRun(normalizePracticalLessonImportRows(parsed.rows));
    expect(report.validRows).toBe(1);
    expect(report.preview[0]?.normalized.durationMinutes).toBe(
      MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
    );
  });

  it("defaults durationMinutes to 60 when absent", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1;2026-05-29;09:00;;instrutor@school.test;`,
    );
    expect(report.validRows).toBe(1);
    expect(report.preview[0]?.normalized.durationMinutes).toBe(60);
  });

  it("reports invalid schoolStudentId", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n2601;1;2026-05-29;09:00;60;instrutor@school.test;`,
    );
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schoolStudentId",
          code: "invalid_school_student_id",
        }),
      ]),
    );
  });

  it("reports unknown student", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26002;1;2026-05-29;09:00;60;instrutor@school.test;`,
    );
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schoolStudentId",
          code: "unknown_student",
        }),
      ]),
    );
  });

  it("reports invalid instructorEmail format", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;not-an-email;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "instructorEmail",
          code: "unsupported_value",
        }),
      ]),
    );
  });

  it("reports unknown instructor", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;missing@school.test;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "instructorEmail",
          code: "unknown_instructor",
        }),
      ]),
    );
  });

  it("reports invalid practicalLessonNumber", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1000;2026-05-29;09:00;60;instrutor@school.test;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "practicalLessonNumber",
          code: "unsupported_value",
        }),
      ]),
    );
  });

  it("reports invalid lessonDate", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1;29/05/2026;09:00;60;instrutor@school.test;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "lessonDate",
          code: "invalid_date",
        }),
      ]),
    );
  });

  it("reports invalid startTime", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;1;2026-05-29;25:00;60;instrutor@school.test;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "startTime",
          code: "invalid_time",
        }),
      ]),
    );
  });

  it("reports duplicate practicalLessonNumber within file", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;2;2026-05-29;09:00;60;instrutor@school.test;\n26001;2;2026-05-30;10:00;60;instrutor@school.test;`,
    );
    expect(report.validRows).toBe(1);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_practical_lesson_number",
          rowNumber: 3,
        }),
      ]),
    );
  });

  it("reports duplicate practicalLessonNumber existing in organization", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;5;2026-05-29;09:00;60;instrutor@school.test;`,
      { existingLessonKeys: new Set(["student-1:5"]) },
    );
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_practical_lesson_number",
          message: expect.stringContaining("already exists"),
        }),
      ]),
    );
  });

  it("ignores completely empty lines", () => {
    const parsed = parsePracticalLessonImportCsv(
      `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;instrutor@school.test;\n\n\n26001;2;2026-05-30;10:00;60;instrutor@school.test;`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.rowNumber).toBe(2);
    expect(parsed.rows[1]?.rowNumber).toBe(5);
  });
});
