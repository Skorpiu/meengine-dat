import { describe, it, expect } from "vitest";
import {
  buildStudentRecordsExportUrl,
  defaultStudentRecordsExportFilename,
  parseContentDispositionFilename,
  STUDENT_RECORDS_EXPORT_API_PATH,
} from "./student-records-export-client";

describe("buildStudentRecordsExportUrl", () => {
  it("builds CSV URL without search", () => {
    expect(buildStudentRecordsExportUrl("csv")).toBe(
      `${STUDENT_RECORDS_EXPORT_API_PATH}?format=csv`,
    );
  });

  it("builds JSON URL with trimmed search", () => {
    expect(buildStudentRecordsExportUrl("json", "  261  ")).toBe(
      `${STUDENT_RECORDS_EXPORT_API_PATH}?format=json&search=261`,
    );
  });

  it("omits empty search", () => {
    expect(buildStudentRecordsExportUrl("csv", "   ")).toBe(
      `${STUDENT_RECORDS_EXPORT_API_PATH}?format=csv`,
    );
  });
});

describe("parseContentDispositionFilename", () => {
  it("parses quoted filename", () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="students-export-2026-06-02.csv"',
      ),
    ).toBe("students-export-2026-06-02.csv");
  });

  it("returns null when header missing", () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
  });
});

describe("defaultStudentRecordsExportFilename", () => {
  it("uses format extension", () => {
    const date = new Date("2026-06-02T12:00:00.000Z");
    expect(defaultStudentRecordsExportFilename("csv", date)).toBe(
      "students-export-2026-06-02.csv",
    );
    expect(defaultStudentRecordsExportFilename("json", date)).toBe(
      "students-export-2026-06-02.json",
    );
  });
});
