import { describe, it, expect } from "vitest";
import {
  canRevokeStudentRecordInvitation,
  canShowLinkedStudentInvitationChangeEmailAction,
  getStudentAppAccessDetailLines,
  getStudentAppAccessLabel,
  getStudentInvitedWithoutPendingHelp,
  mapStudentRecordPendingInvitationToDto,
} from "@/lib/students/student-record-invitation-ui-utils";
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
    address: null,
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
    ...overrides,
  };
}

describe("getStudentAppAccessLabel", () => {
  it("uses English profile app access labels", () => {
    expect(getStudentAppAccessLabel("MANUAL_ONLY")).toBe("No app access");
    expect(getStudentAppAccessLabel("INVITED")).toBe("Invite pending");
    expect(
      getStudentAppAccessLabel("INVITED", {
        pendingInvitation: {
          invitationId: "inv-1",
          email: "a@b.test",
          expiresAt: "2099-01-01T00:00:00.000Z",
          status: "PENDING",
        },
      }),
    ).toBe("Pending invite");
    expect(getStudentAppAccessLabel("APP_USER")).toBe("App access");
  });
});

describe("canRevokeStudentRecordInvitation", () => {
  it("allows revoke when INVITED with pending invitation", () => {
    expect(
      canRevokeStudentRecordInvitation(
        baseStudent({
          appAccessMode: "INVITED",
          pendingInvitation: {
            invitationId: "inv-1",
            email: "ana@school.test",
            expiresAt: "2099-01-01T00:00:00.000Z",
            status: "PENDING",
          },
        }),
      ),
    ).toBe(true);
  });

  it("blocks revoke without pending invitation metadata", () => {
    expect(
      canRevokeStudentRecordInvitation(
        baseStudent({ appAccessMode: "INVITED", pendingInvitation: null }),
      ),
    ).toBe(false);
  });
});

describe("canShowLinkedStudentInvitationChangeEmailAction", () => {
  const invitedWithPending = baseStudent({
    appAccessMode: "INVITED",
    pendingInvitation: {
      invitationId: "inv-1",
      email: "invite@school.test",
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "PENDING",
    },
  });

  it("shows for INVITED student with pending invite and no userId", () => {
    expect(
      canShowLinkedStudentInvitationChangeEmailAction(invitedWithPending),
    ).toBe(true);
  });

  it("hides for APP_USER", () => {
    expect(
      canShowLinkedStudentInvitationChangeEmailAction(
        baseStudent({
          appAccessMode: "APP_USER",
          userId: "user-1",
          pendingInvitation: invitedWithPending.pendingInvitation,
        }),
      ),
    ).toBe(false);
  });

  it("hides without pending invitation", () => {
    expect(
      canShowLinkedStudentInvitationChangeEmailAction(
        baseStudent({ appAccessMode: "INVITED", pendingInvitation: null }),
      ),
    ).toBe(false);
  });
});

describe("mapStudentRecordPendingInvitationToDto", () => {
  it("maps linked pending invitation for change-email dialog", () => {
    const student = baseStudent({
      appAccessMode: "INVITED",
      pendingInvitation: {
        invitationId: "inv-1",
        email: "invite@school.test",
        expiresAt: "2099-01-01T00:00:00.000Z",
        status: "PENDING",
      },
    });

    const dto = mapStudentRecordPendingInvitationToDto(student);
    expect(dto?.id).toBe("inv-1");
    expect(dto?.studentId).toBe("stu-1");
    expect(dto?.role).toBe("STUDENT");
    expect(dto?.status).toBe("PENDING");
  });
});

describe("getStudentAppAccessDetailLines", () => {
  it("describes MANUAL_ONLY", () => {
    const lines = getStudentAppAccessDetailLines(baseStudent());
    expect(lines[0]).toContain("Send an invitation");
  });

  it("shows pending email for INVITED with metadata", () => {
    const lines = getStudentAppAccessDetailLines(
      baseStudent({
        appAccessMode: "INVITED",
        pendingInvitation: {
          invitationId: "inv-1",
          email: "invite@school.test",
          expiresAt: "2099-06-01T12:00:00.000Z",
          status: "PENDING",
        },
      }),
    );
    expect(lines.some((l) => l.includes("invite@school.test"))).toBe(true);
    expect(lines.some((l) => l.includes("shown once"))).toBe(true);
  });

  it("explains missing pending invite for INVITED", () => {
    const lines = getStudentAppAccessDetailLines(
      baseStudent({ appAccessMode: "INVITED", pendingInvitation: null }),
    );
    expect(lines[0]).toBe(getStudentInvitedWithoutPendingHelp());
  });

  it("returns no detail lines for APP_USER (compact badges + row email)", () => {
    const lines = getStudentAppAccessDetailLines(
      baseStudent({
        appAccessMode: "APP_USER",
        userId: "u1",
        user: {
          id: "u1",
          email: "linked@school.test",
          firstName: "Ana",
          lastName: "Silva",
        },
      }),
    );
    expect(lines).toEqual([]);
  });
});
