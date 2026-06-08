import { describe, it, expect } from "vitest";
import {
  buildManualStudentCreatePayload,
  buildManualStudentPatchPayload,
  buildLinkedStudentUserUpdateBody,
  buildStudentRecordInvitePayload,
  canSendStudentRecordInvite,
  canShowStudentAppAccessSection,
  canShowStudentManualOnlyAppAccessSection,
  canShowStudentPendingInvitationSection,
  getStudentAppAccessLabel,
  getStudentCanonicalEmailDisplay,
  hasLinkedStudentUserFormChanges,
  previewSchoolStudentId,
  studentRecordApiErrorMessage,
  toLinkedStudentUserUpdateForm,
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
  it("re-exports English labels from invitation UI utils", () => {
    expect(getStudentAppAccessLabel("MANUAL_ONLY")).toBe("No app access");
  });
});

describe("studentRecordApiErrorMessage", () => {
  it("maps school_student_id_already_exists", () => {
    expect(
      studentRecordApiErrorMessage(
        "school_student_id_already_exists",
        "Conflict",
      ),
    ).toContain("already exists in this school");
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

describe("getStudentCanonicalEmailDisplay", () => {
  it("prefers student email then linked then user", () => {
    expect(
      getStudentCanonicalEmailDisplay(
        {
          email: "student@school.test",
          user: {
            id: "u1",
            email: "user@school.test",
            firstName: "A",
            lastName: "B",
          },
        },
        "linked@school.test",
      ),
    ).toBe("student@school.test");
    expect(
      getStudentCanonicalEmailDisplay(
        {
          email: null,
          user: {
            id: "u1",
            email: "user@school.test",
            firstName: "A",
            lastName: "B",
          },
        },
        "linked@school.test",
      ),
    ).toBe("linked@school.test");
    expect(
      getStudentCanonicalEmailDisplay(
        {
          email: null,
          user: {
            id: "u1",
            email: "user@school.test",
            firstName: "A",
            lastName: "B",
          },
        },
        null,
      ),
    ).toBe("user@school.test");
  });
});

describe("canShowStudentAppAccessSection", () => {
  const base: Pick<StudentRecordDto, "userId" | "appAccessMode"> = {
    userId: "user-1",
    appAccessMode: "APP_USER",
  };

  it("shows App access section for APP_USER with userId", () => {
    expect(canShowStudentAppAccessSection(base)).toBe(true);
  });

  it("hides App access section for APP_USER without userId", () => {
    expect(canShowStudentAppAccessSection({ ...base, userId: null })).toBe(
      false,
    );
  });

  it("hides App access section for INVITED", () => {
    expect(
      canShowStudentAppAccessSection({
        ...base,
        appAccessMode: "INVITED",
        userId: null,
      }),
    ).toBe(false);
  });

  it("hides App access section for MANUAL_ONLY", () => {
    expect(
      canShowStudentAppAccessSection({
        ...base,
        appAccessMode: "MANUAL_ONLY",
        userId: null,
      }),
    ).toBe(false);
  });
});

describe("canShowStudentManualOnlyAppAccessSection", () => {
  it("shows App access guidance for MANUAL_ONLY without userId", () => {
    expect(
      canShowStudentManualOnlyAppAccessSection({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
      }),
    ).toBe(true);
  });

  it("hides for APP_USER and INVITED", () => {
    expect(
      canShowStudentManualOnlyAppAccessSection({
        appAccessMode: "APP_USER",
        userId: "u1",
      }),
    ).toBe(false);
    expect(
      canShowStudentManualOnlyAppAccessSection({
        appAccessMode: "INVITED",
        userId: null,
      }),
    ).toBe(false);
  });
});

describe("canShowStudentPendingInvitationSection", () => {
  it("shows for INVITED", () => {
    expect(
      canShowStudentPendingInvitationSection({ appAccessMode: "INVITED" }),
    ).toBe(true);
  });

  it("hides for APP_USER and MANUAL_ONLY", () => {
    expect(
      canShowStudentPendingInvitationSection({ appAccessMode: "APP_USER" }),
    ).toBe(false);
    expect(
      canShowStudentPendingInvitationSection({ appAccessMode: "MANUAL_ONLY" }),
    ).toBe(false);
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

describe("linked student user update helpers", () => {
  const form = {
    firstName: "Ana",
    lastName: "Silva",
    phoneNumber: "912345678",
    address: "Rua A",
  };

  it("buildLinkedStudentUserUpdateBody includes role STUDENT without operational fields", () => {
    expect(
      buildLinkedStudentUserUpdateBody({ userId: "u1", form }),
    ).toMatchObject({
      userId: "u1",
      role: "STUDENT",
      firstName: "Ana",
    });
    expect(
      buildLinkedStudentUserUpdateBody({ userId: "u1", form }),
    ).not.toHaveProperty("selectedCategories");
  });

  it("detects linked user form changes for app access fields only", () => {
    expect(hasLinkedStudentUserFormChanges(form, form)).toBe(false);
    expect(
      hasLinkedStudentUserFormChanges(
        { ...form, address: "Rua B" },
        toLinkedStudentUserUpdateForm(form),
      ),
    ).toBe(true);
  });
});

describe("buildManualStudentPatchPayload", () => {
  const original: StudentRecordDto = {
    id: "stu-1",
    userId: null,
    firstName: "Ana",
    lastName: "Silva",
    email: "ana@school.test",
    phoneNumber: null,
    schoolStudentId: "26001",
    schoolStudentYearSuffix: "26",
    schoolStudentSequence: 1,
    schoolStudentIdSource: "MANUAL",
    enrollmentDate: null,
    appAccessMode: "MANUAL_ONLY",
    category: null,
    transmissionType: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    user: null,
    pendingInvitation: null,
  };

  it("includes categoryName and transmissionTypeName when operational fields change", () => {
    const patch = buildManualStudentPatchPayload({
      firstName: "Ana",
      lastName: "Silva",
      phoneNumber: "",
      email: "ana@school.test",
      yearSuffix: "26",
      sequenceNumber: "1",
      enrollmentDate: "",
      selectedCategories: ["B"],
      transmissionType: "Manual",
      original,
    });
    expect(patch.categoryName).toBe("B");
    expect(patch.transmissionTypeName).toBe("Manual");
  });

  it("omits operational fields when unchanged", () => {
    const patch = buildManualStudentPatchPayload({
      firstName: "Ana",
      lastName: "Silva",
      phoneNumber: "",
      email: "ana@school.test",
      yearSuffix: "26",
      sequenceNumber: "1",
      enrollmentDate: "",
      selectedCategories: [],
      transmissionType: "",
      original,
    });
    expect(patch.categoryName).toBeUndefined();
    expect(patch.transmissionTypeName).toBeUndefined();
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
