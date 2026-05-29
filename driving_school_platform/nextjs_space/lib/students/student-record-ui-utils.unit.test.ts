import { describe, it, expect } from "vitest";
import {
  buildManualStudentCreatePayload,
  getStudentAppAccessLabel,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
} from "./student-record-ui-utils";

describe("previewSchoolStudentId", () => {
  it("returns 26001 for year 26 and sequence 1", () => {
    expect(previewSchoolStudentId("26", "1")).toBe("26001");
  });

  it("returns null for invalid year", () => {
    expect(previewSchoolStudentId("2026", "1")).toBeNull();
  });
});

describe("getStudentAppAccessLabel", () => {
  it("labels MANUAL_ONLY in Portuguese", () => {
    expect(getStudentAppAccessLabel("MANUAL_ONLY")).toBe("Sem acesso à app");
  });
});

describe("studentRecordApiErrorMessage", () => {
  it("maps school_student_id_already_exists", () => {
    expect(
      studentRecordApiErrorMessage(
        "school_student_id_already_exists",
        "Conflict",
      ),
    ).toContain("Já existe um aluno");
  });

  it("falls back for unknown codes", () => {
    expect(studentRecordApiErrorMessage(undefined, "Server error")).toBe(
      "Server error",
    );
  });
});

describe("buildManualStudentCreatePayload", () => {
  it("sends yearSuffix and sequenceNumber separately", () => {
    const result = buildManualStudentCreatePayload({
      firstName: "João",
      lastName: "",
      phoneNumber: "",
      email: "",
      yearSuffix: "26",
      sequenceNumber: "1",
      enrollmentDate: "",
    });
    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    expect(result.yearSuffix).toBe("26");
    expect(result.sequenceNumber).toBe(1);
    expect(result.firstName).toBe("João");
  });
});
