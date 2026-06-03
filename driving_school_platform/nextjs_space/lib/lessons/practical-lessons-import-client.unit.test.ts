import { describe, it, expect } from "vitest";
import {
  inferPracticalLessonsImportFormat,
  PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH,
} from "./practical-lessons-import-client";

describe("inferPracticalLessonsImportFormat", () => {
  it("detects csv extension", () => {
    expect(inferPracticalLessonsImportFormat("lessons.csv")).toBe("csv");
  });

  it("detects json extension", () => {
    expect(inferPracticalLessonsImportFormat("lessons.json")).toBe("json");
  });

  it("returns null for unsupported extensions", () => {
    expect(inferPracticalLessonsImportFormat("lessons.xlsx")).toBeNull();
  });
});

describe("PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH", () => {
  it("points at admin dry-run route", () => {
    expect(PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH).toBe(
      "/api/admin/practical-lessons/import/dry-run",
    );
  });
});
