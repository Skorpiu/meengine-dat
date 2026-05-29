import { describe, it, expect } from "vitest";
import {
  buildManualStudentCreatePayload,
  buildStudentRecordInvitePayload,
  canSendStudentRecordInvite,
  getStudentAppAccessLabel,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
} from "./student-record-ui-utils";
import type { StudentRecordDto } from "./student-record-ui-types";

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

describe("canSendStudentRecordInvite", () => {
  const base: Pick<StudentRecordDto, "userId" | "appAccessMode"> = {
    userId: null,
    appAccessMode: "MANUAL_ONLY",
  };

  it("allows MANUAL_ONLY without userId", () => {
    expect(canSendStudentRecordInvite(base)).toBe(true);
  });

  it("blocks when userId is set", () => {
    expect(canSendStudentRecordInvite({ ...base, userId: "u1" })).toBe(false);
  });

  it("blocks when already INVITED", () => {
    expect(
      canSendStudentRecordInvite({ ...base, appAccessMode: "INVITED" }),
    ).toBe(false);
  });

  it("blocks APP_USER", () => {
    expect(
      canSendStudentRecordInvite({ ...base, appAccessMode: "APP_USER" }),
    ).toBe(false);
  });
});

describe("buildStudentRecordInvitePayload", () => {
  it("returns error when no email available", () => {
    expect(
      buildStudentRecordInvitePayload({
        studentEmail: null,
        inviteEmail: "  ",
      }),
    ).toEqual({ error: "missing_email" });
  });

  it("uses invite email when provided", () => {
    expect(
      buildStudentRecordInvitePayload({
        studentEmail: "old@school.test",
        inviteEmail: "new@school.test",
      }),
    ).toEqual({ email: "new@school.test" });
  });

  it("falls back to student email when invite field empty", () => {
    expect(
      buildStudentRecordInvitePayload({
        studentEmail: "joao@school.test",
        inviteEmail: "",
      }),
    ).toEqual({});
  });
});
