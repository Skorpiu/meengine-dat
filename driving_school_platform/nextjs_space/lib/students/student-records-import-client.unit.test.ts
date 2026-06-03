import { describe, it, expect } from "vitest";
import {
  inferStudentRecordsImportFormat,
  STUDENT_RECORDS_IMPORT_APPLY_API_PATH,
  STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH,
} from "./student-records-import-client";

describe("inferStudentRecordsImportFormat", () => {
  it("detects csv extension", () => {
    expect(inferStudentRecordsImportFormat("students.csv")).toBe("csv");
    expect(inferStudentRecordsImportFormat(" Students.CSV ")).toBe("csv");
  });

  it("detects json extension", () => {
    expect(inferStudentRecordsImportFormat("students.json")).toBe("json");
  });

  it("returns null for unsupported extensions", () => {
    expect(inferStudentRecordsImportFormat("students.xlsx")).toBeNull();
    expect(inferStudentRecordsImportFormat("students")).toBeNull();
  });
});

describe("STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH", () => {
  it("points at admin dry-run route", () => {
    expect(STUDENT_RECORDS_IMPORT_DRY_RUN_API_PATH).toBe(
      "/api/admin/students/import/dry-run",
    );
  });
});

describe("STUDENT_RECORDS_IMPORT_APPLY_API_PATH", () => {
  it("points at admin apply route", () => {
    expect(STUDENT_RECORDS_IMPORT_APPLY_API_PATH).toBe(
      "/api/admin/students/import/apply",
    );
  });
});
