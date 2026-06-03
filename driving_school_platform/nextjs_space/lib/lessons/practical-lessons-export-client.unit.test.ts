import { describe, it, expect } from "vitest";
import {
  buildPracticalLessonsExportUrl,
  defaultPracticalLessonsExportFilename,
  PRACTICAL_LESSONS_EXPORT_API_PATH,
} from "./practical-lessons-export-client";

describe("buildPracticalLessonsExportUrl", () => {
  it("builds CSV URL without filters", () => {
    expect(buildPracticalLessonsExportUrl("csv")).toBe(
      `${PRACTICAL_LESSONS_EXPORT_API_PATH}?format=csv`,
    );
  });

  it("builds JSON URL with optional filters", () => {
    expect(
      buildPracticalLessonsExportUrl("json", {
        studentId: "student-1",
        schoolStudentId: "26001",
        source: "MANUAL",
        from: "2026-01-01",
        to: "2026-12-31",
      }),
    ).toBe(
      `${PRACTICAL_LESSONS_EXPORT_API_PATH}?format=json&studentId=student-1&schoolStudentId=26001&source=MANUAL&from=2026-01-01&to=2026-12-31`,
    );
  });

  it("omits empty filter values", () => {
    expect(
      buildPracticalLessonsExportUrl("csv", {
        studentId: "   ",
        schoolStudentId: "",
      }),
    ).toBe(`${PRACTICAL_LESSONS_EXPORT_API_PATH}?format=csv`);
  });
});

describe("defaultPracticalLessonsExportFilename", () => {
  it("uses format extension", () => {
    const date = new Date("2026-06-02T12:00:00.000Z");
    expect(defaultPracticalLessonsExportFilename("csv", date)).toBe(
      "practical-lessons-export-2026-06-02.csv",
    );
    expect(defaultPracticalLessonsExportFilename("json", date)).toBe(
      "practical-lessons-export-2026-06-02.json",
    );
  });
});
