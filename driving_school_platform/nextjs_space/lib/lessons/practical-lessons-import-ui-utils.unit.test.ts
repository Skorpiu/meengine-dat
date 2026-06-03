import { describe, it, expect } from "vitest";
import {
  canApplyPracticalLessonsImport,
  formatPracticalLessonsImportApplySuccess,
} from "./practical-lessons-import-ui-utils";
import type { PracticalLessonsImportDryRunReport } from "./practical-lessons-import-client";

const validReport: PracticalLessonsImportDryRunReport = {
  totalRows: 1,
  validRows: 1,
  invalidRows: 0,
  warnings: [],
  errors: [],
  preview: [],
};

const payload = { format: "csv" as const, content: "a;b;c" };

describe("canApplyPracticalLessonsImport", () => {
  it("returns false before valid dry-run", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: null,
        report: null,
        previewLoading: false,
        applyLoading: false,
        applyCompleted: false,
      }),
    ).toBe(false);
  });

  it("returns false when dry-run has errors", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: payload,
        report: {
          ...validReport,
          validRows: 0,
          errors: [
            {
              rowNumber: 1,
              field: "schoolStudentId",
              code: "missing_required_field",
              message: "Required",
              rawValue: null,
            },
          ],
        },
        previewLoading: false,
        applyLoading: false,
        applyCompleted: false,
      }),
    ).toBe(false);
  });

  it("returns true when dry-run is valid and payload is current", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: payload,
        report: validReport,
        previewLoading: false,
        applyLoading: false,
        applyCompleted: false,
      }),
    ).toBe(true);
  });

  it("returns false while preview or apply is running", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: payload,
        report: validReport,
        previewLoading: true,
        applyLoading: false,
        applyCompleted: false,
      }),
    ).toBe(false);
    expect(
      canApplyPracticalLessonsImport({
        importPayload: payload,
        report: validReport,
        previewLoading: false,
        applyLoading: true,
        applyCompleted: false,
      }),
    ).toBe(false);
  });

  it("returns false after apply completed until preview runs again", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: null,
        report: validReport,
        previewLoading: false,
        applyLoading: false,
        applyCompleted: true,
      }),
    ).toBe(false);
  });

  it("returns false when payload cleared after file change", () => {
    expect(
      canApplyPracticalLessonsImport({
        importPayload: null,
        report: validReport,
        previewLoading: false,
        applyLoading: false,
        applyCompleted: false,
      }),
    ).toBe(false);
  });
});

describe("formatPracticalLessonsImportApplySuccess", () => {
  it("includes created count and optional skipped/warnings", () => {
    expect(
      formatPracticalLessonsImportApplySuccess({
        createdCount: 3,
        skippedCount: 0,
        warningCount: 1,
      }),
    ).toContain("3 practical lesson record(s) created");
    expect(
      formatPracticalLessonsImportApplySuccess({
        createdCount: 2,
        skippedCount: 1,
        warningCount: 0,
      }),
    ).toContain("1 row(s) skipped");
  });
});
