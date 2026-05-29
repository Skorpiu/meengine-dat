import { describe, expect, it } from "vitest";
import {
  ALTERNATE_CSV_DELIMITER,
  IMPORT_ERROR_CODES,
  IMPORT_EXPORT_ENTITIES,
  IMPORT_EXPORT_FORMAT_VERSION,
  IMPORT_EXPORT_PHASES,
  IMPORT_MODES,
  PRACTICAL_LESSON_IMPORT_CSV_HEADERS,
  RECOMMENDED_CSV_DELIMITER,
  STUDENT_IMPORT_CSV_HEADERS,
} from "@/lib/import-export/import-export-contracts";

describe("import-export-contracts", () => {
  it("exposes stable entity and mode unions", () => {
    expect(IMPORT_EXPORT_ENTITIES).toEqual(["students", "practicalLessons"]);
    expect(IMPORT_MODES).toEqual(["dryRun", "apply"]);
  });

  it("locks initial import error codes for UI and tests", () => {
    expect(IMPORT_ERROR_CODES).toEqual([
      "missing_required_field",
      "invalid_school_student_id",
      "duplicate_school_student_id",
      "invalid_date",
      "invalid_time",
      "unknown_instructor",
      "duplicate_practical_lesson_number",
      "unsupported_value",
    ]);
  });

  it("recommends semicolon CSV delimiter for Excel PT", () => {
    expect(RECOMMENDED_CSV_DELIMITER).toBe(";");
    expect(ALTERNATE_CSV_DELIMITER).toBe(",");
  });

  it("aligns CSV headers with documented templates", () => {
    expect(STUDENT_IMPORT_CSV_HEADERS.join(";")).toBe(
      "schoolStudentId;yearSuffix;sequence;firstName;lastName;phoneNumber;email;enrollmentDate",
    );
    expect(PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(";")).toBe(
      "schoolStudentId;practicalLessonNumber;lessonDate;startTime;durationMinutes;instructorEmail;notes",
    );
  });

  it("lists planned implementation phases", () => {
    expect(IMPORT_EXPORT_PHASES).toHaveLength(6);
    expect(IMPORT_EXPORT_FORMAT_VERSION).toBe(1);
  });
});
