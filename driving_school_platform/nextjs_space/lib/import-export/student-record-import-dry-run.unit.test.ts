import { describe, expect, it } from "vitest";
import {
  buildStudentImportDryRunReport,
  normalizeStudentImportRows,
  parseCsvLine,
  parseStudentImportCsv,
  parseStudentImportJson,
  validateStudentImportRows,
} from "@/lib/import-export/student-record-import-dry-run";
import { STUDENT_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";

const CSV_HEADER = STUDENT_IMPORT_CSV_HEADERS.join(";");

function runDryRun(
  rows: ReturnType<typeof normalizeStudentImportRows>,
  existingSchoolStudentIds: ReadonlySet<string> = new Set(),
) {
  const validations = validateStudentImportRows({
    rows,
    existingSchoolStudentIds,
  });
  return buildStudentImportDryRunReport(validations);
}

function runCsvDryRun(
  content: string,
  existingSchoolStudentIds: ReadonlySet<string> = new Set(),
) {
  const parsed = parseStudentImportCsv(content);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return buildStudentImportDryRunReport([], parsed.fileErrors);
  return runDryRun(
    normalizeStudentImportRows(parsed.rows),
    existingSchoolStudentIds,
  );
}

describe("parseCsvLine", () => {
  it("parses quoted fields with semicolon", () => {
    expect(parseCsvLine('"João;Silva";26;1')).toEqual([
      "João;Silva",
      "26",
      "1",
    ]);
  });
});

describe("student import dry-run", () => {
  it("accepts valid CSV with one student", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;26;1;João;Silva;912345678;joao@example.com;2026-05-29`,
    );
    expect(report.totalRows).toBe(1);
    expect(report.validRows).toBe(1);
    expect(report.invalidRows).toBe(0);
    expect(report.errors).toHaveLength(0);
    expect(report.preview[0]?.normalized).toEqual({
      schoolStudentId: "26001",
      yearSuffix: "26",
      sequence: 1,
      firstName: "João",
      lastName: "Silva",
      phoneNumber: "912345678",
      email: "joao@example.com",
      enrollmentDate: "2026-05-29",
    });
  });

  it("accepts valid JSON rows with one student", () => {
    const parsed = parseStudentImportJson({
      rows: [
        {
          schoolStudentId: "26002",
          yearSuffix: "26",
          sequence: 2,
          firstName: "Maria",
          lastName: "Santos",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const report = runDryRun(normalizeStudentImportRows(parsed.rows));
    expect(report.validRows).toBe(1);
    expect(report.preview[0]?.normalized.schoolStudentId).toBe("26002");
  });

  it("reports missing firstName", () => {
    const report = runCsvDryRun(`${CSV_HEADER}\n26001;26;1;;;`);
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "firstName",
          code: "missing_required_field",
        }),
      ]),
    );
  });

  it("reports invalid schoolStudentId", () => {
    const report = runCsvDryRun(`${CSV_HEADER}\n2601;26;1;João;;;`);
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

  it("reports mismatch between schoolStudentId and yearSuffix/sequence", () => {
    const report = runCsvDryRun(`${CSV_HEADER}\n26001;26;2;João;;;`);
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schoolStudentId",
          code: "invalid_school_student_id",
          message: expect.stringContaining("does not match"),
        }),
      ]),
    );
  });

  it("reports duplicate schoolStudentId within file", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;26;1;João;;;\n26001;26;1;Maria;;;`,
    );
    expect(report.validRows).toBe(1);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_school_student_id",
          rowNumber: 3,
        }),
      ]),
    );
  });

  it("reports duplicate schoolStudentId existing in organization", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;26;1;João;;;`,
      new Set(["26001"]),
    );
    expect(report.validRows).toBe(0);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_school_student_id",
          message: expect.stringContaining("already exists"),
        }),
      ]),
    );
  });

  it("reports invalid enrollmentDate", () => {
    const report = runCsvDryRun(`${CSV_HEADER}\n26001;26;1;João;;;;29/05/2026`);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "enrollmentDate",
          code: "invalid_date",
        }),
      ]),
    );
  });

  it("reports invalid email", () => {
    const report = runCsvDryRun(
      `${CSV_HEADER}\n26001;26;1;João;;;not-an-email;`,
    );
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          code: "unsupported_value",
        }),
      ]),
    );
  });

  it("ignores completely empty lines", () => {
    const parsed = parseStudentImportCsv(
      `${CSV_HEADER}\n26001;26;1;João;;;\n\n\n26002;26;2;Maria;;;`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.rowNumber).toBe(2);
    expect(parsed.rows[1]?.rowNumber).toBe(5);
  });

  it("rejects invalid CSV headers", () => {
    const parsed = parseStudentImportCsv("wrong;headers\n26001;26;1;João");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fileErrors[0]?.code).toBe("unsupported_value");
  });

  describe("sequence parsing", () => {
    it("accepts 001 and normalizes to sequence 1", () => {
      const report = runCsvDryRun(`${CSV_HEADER}\n26001;26;001;João;;;`);
      expect(report.validRows).toBe(1);
      expect(report.preview[0]?.normalized.sequence).toBe(1);
    });

    it.each([
      ["000", "invalid_school_student_id"],
      ["1000", "invalid_school_student_id"],
      ["1abc", "unsupported_value"],
      ["1.5", "unsupported_value"],
      ["-1", "unsupported_value"],
      ["abc", "unsupported_value"],
    ])("rejects sequence %s with code %s", (sequence, code) => {
      const report = runCsvDryRun(
        `${CSV_HEADER}\n26001;26;${sequence};João;;;`,
      );
      expect(report.validRows).toBe(0);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "sequence",
            code,
          }),
        ]),
      );
    });
  });
});
