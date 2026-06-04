import { describe, it, expect } from "vitest";
import {
  getStudentAppAccessStatusLabel,
  getStudentProfileOriginLabel,
  getStudentProfileRowBadges,
} from "@/lib/students/student-profile-label-utils";
import type { StudentRecordDto } from "@/lib/students/student-record-ui-types";

function baseStudent(
  overrides: Partial<StudentRecordDto> = {},
): StudentRecordDto {
  return {
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    user: null,
    pendingInvitation: null,
    ...overrides,
  };
}

describe("getStudentProfileOriginLabel", () => {
  it("maps schoolStudentIdSource values", () => {
    expect(getStudentProfileOriginLabel("MANUAL")).toBe("Manual profile");
    expect(getStudentProfileOriginLabel("IMPORT")).toBe("Imported profile");
    expect(getStudentProfileOriginLabel("AUTO")).toBe("System profile");
    expect(getStudentProfileOriginLabel("LEGACY")).toBe("System profile");
    expect(getStudentProfileOriginLabel(null)).toBe("Profile");
  });
});

describe("getStudentAppAccessStatusLabel", () => {
  it("uses approved app access labels", () => {
    expect(getStudentAppAccessStatusLabel(baseStudent())).toBe("No app access");
    expect(
      getStudentAppAccessStatusLabel(
        baseStudent({
          appAccessMode: "INVITED",
          pendingInvitation: {
            invitationId: "inv-1",
            email: "a@b.test",
            expiresAt: "2099-01-01T00:00:00.000Z",
            status: "PENDING",
          },
        }),
      ),
    ).toBe("Pending invite");
    expect(
      getStudentAppAccessStatusLabel(
        baseStudent({ appAccessMode: "INVITED", pendingInvitation: null }),
      ),
    ).toBe("Invite pending");
    expect(
      getStudentAppAccessStatusLabel(
        baseStudent({ appAccessMode: "APP_USER" }),
      ),
    ).toBe("App access");
  });
});

describe("getStudentProfileRowBadges", () => {
  it("returns origin and app access badges", () => {
    const badges = getStudentProfileRowBadges(
      baseStudent({ schoolStudentIdSource: "IMPORT" }),
    );
    expect(badges).toHaveLength(2);
    expect(badges[0].label).toBe("Imported profile");
    expect(badges[1].label).toBe("No app access");
  });
});
