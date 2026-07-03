import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const writeAuditEventMock = vi.fn();
  return { writeAuditEventMock };
});

vi.mock("@/lib/audit/audit-log-service", () => ({
  writeAuditEvent: h.writeAuditEventMock,
}));

import {
  buildStudentAppAccessReactivateAuditMetadata,
  buildStudentAppAccessRemoveAuditMetadata,
  buildStudentCreateAuditContextFromRecord,
  buildStudentCreateAuditMetadata,
  buildStudentDeleteAuditMetadata,
  buildStudentEmailChangeAuditMetadata,
  buildStudentInviteAuditMetadata,
  buildStudentProfileUpdateAuditMetadata,
  collectStudentProfileUpdateChangedFields,
  writeStudentAppAccessReactivateAuditEvent,
  writeStudentAppAccessRemoveAuditEvent,
  writeStudentCreateAuditEvent,
  writeStudentDeleteAuditEvent,
  writeStudentEmailChangeAuditEvent,
  writeStudentInviteAuditEvent,
  writeStudentProfileUpdateAuditEvent,
} from "@/lib/audit/student-audit";
import { UserRole } from "@prisma/client";

const actor = {
  userId: "admin-1",
  role: UserRole.SUPER_ADMIN,
  email: "admin@school.test",
};

beforeEach(() => {
  vi.resetAllMocks();
  h.writeAuditEventMock.mockResolvedValue({ ok: true, id: "audit_1" });
});

describe("collectStudentProfileUpdateChangedFields", () => {
  it("lists patch body keys only, collapsing school id parts", () => {
    expect(
      collectStudentProfileUpdateChangedFields({
        firstName: "Maria",
        address: "Street 1",
        yearSuffix: "26",
        sequenceNumber: 12,
      }),
    ).toEqual(["firstName", "address", "schoolStudentId"]);
  });
});

describe("buildStudentProfileUpdateAuditMetadata", () => {
  it("includes changed field names and appAccessMode without values", () => {
    expect(
      buildStudentProfileUpdateAuditMetadata({
        changedFields: ["firstName", "phoneNumber"],
        appAccessMode: "MANUAL_ONLY",
      }),
    ).toEqual({
      changedFields: ["firstName", "phoneNumber"],
      appAccessMode: "MANUAL_ONLY",
    });
  });
});

describe("buildStudentEmailChangeAuditMetadata", () => {
  it("includes policy flags without email values", () => {
    expect(
      buildStudentEmailChangeAuditMetadata({
        policyMode: "INVITED",
        hasLinkedUser: false,
        invitationRevoked: true,
      }),
    ).toEqual({
      policyMode: "INVITED",
      hasLinkedUser: false,
      invitationRevoked: true,
    });
  });
});

describe("writeStudentProfileUpdateAuditEvent", () => {
  it("writes student.update with field names only", async () => {
    await writeStudentProfileUpdateAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      changedFields: ["firstName", "categoryName"],
      appAccessMode: "APP_USER",
      linkedUserId: "user-1",
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "student.update",
        entityType: "Student",
        entityId: "stu-1",
        targetUserId: "user-1",
        metadata: {
          changedFields: ["firstName", "categoryName"],
          appAccessMode: "APP_USER",
        },
      }),
      undefined,
    );

    const payload = h.writeAuditEventMock.mock.calls[0]?.[0] as {
      metadata?: Record<string, unknown>;
    };
    expect(JSON.stringify(payload.metadata)).not.toContain("Maria");
    expect(JSON.stringify(payload.metadata)).not.toContain("@");
  });
});

describe("writeStudentEmailChangeAuditEvent", () => {
  it("writes student.email.change with policy flags only", async () => {
    await writeStudentEmailChangeAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      policyMode: "APP_USER",
      hasLinkedUser: true,
      invitationRevoked: false,
      linkedUserId: "user-1",
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "student.email.change",
        targetUserId: "user-1",
        metadata: {
          policyMode: "APP_USER",
          hasLinkedUser: true,
          invitationRevoked: false,
        },
      }),
      undefined,
    );
  });
});

describe("buildStudentAppAccessRemoveAuditMetadata", () => {
  it("includes lifecycle transition without email or secrets", () => {
    expect(
      buildStudentAppAccessRemoveAuditMetadata({
        appAccessMode: "MANUAL_ONLY",
      }),
    ).toEqual({
      previousAppAccessMode: "APP_USER",
      appAccessMode: "MANUAL_ONLY",
    });
  });
});

describe("buildStudentAppAccessReactivateAuditMetadata", () => {
  it("includes linked user id when present", () => {
    expect(
      buildStudentAppAccessReactivateAuditMetadata({
        appAccessMode: "APP_USER",
        linkedUserId: "user-1",
      }),
    ).toEqual({
      previousAppAccessMode: "MANUAL_ONLY",
      appAccessMode: "APP_USER",
      linkedUserId: "user-1",
    });
  });
});

describe("buildStudentDeleteAuditMetadata", () => {
  it("includes policy flags without PII", () => {
    expect(
      buildStudentDeleteAuditMetadata({
        appAccessMode: "MANUAL_ONLY",
        hadLinkedUser: false,
        hadLessons: false,
      }),
    ).toEqual({
      appAccessMode: "MANUAL_ONLY",
      hadLinkedUser: false,
      hadLessons: false,
    });
  });
});

describe("buildStudentInviteAuditMetadata", () => {
  it("includes invite lifecycle flags without email or secrets", () => {
    expect(
      buildStudentInviteAuditMetadata({
        invitationRole: "STUDENT",
        invitationStatus: "PENDING",
        previousAppAccessMode: "MANUAL_ONLY",
        hasExistingInvitation: false,
      }),
    ).toEqual({
      invitationRole: "STUDENT",
      invitationStatus: "PENDING",
      previousAppAccessMode: "MANUAL_ONLY",
      appAccessMode: "INVITED",
      hasExistingInvitation: false,
    });
  });
});

describe("writeStudentInviteAuditEvent", () => {
  it("writes student.invite with tenant scope and flags only", async () => {
    await writeStudentInviteAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      invitationRole: "STUDENT",
      invitationStatus: "PENDING",
      previousAppAccessMode: "INVITED",
      requestContext: { requestId: "req-inv-1" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "student.invite",
        entityType: "Student",
        entityId: "stu-1",
        metadata: {
          invitationRole: "STUDENT",
          invitationStatus: "PENDING",
          previousAppAccessMode: "INVITED",
          appAccessMode: "INVITED",
          hasExistingInvitation: true,
        },
        requestId: "req-inv-1",
      }),
      undefined,
    );

    const payload = h.writeAuditEventMock.mock.calls[0]?.[0] as {
      metadata?: Record<string, unknown>;
    };
    expect(JSON.stringify(payload.metadata)).not.toContain("@");
    expect(JSON.stringify(payload.metadata)).not.toContain("token");
  });
});

describe("writeStudentDeleteAuditEvent", () => {
  it("writes student.delete with tenant scope and flags only", async () => {
    await writeStudentDeleteAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      appAccessMode: "MANUAL_ONLY",
      hadLinkedUser: false,
      lessonsCount: 0,
      linkedUserId: null,
      requestContext: { requestId: "req-del-1" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "student.delete",
        entityType: "Student",
        entityId: "stu-1",
        targetUserId: null,
        metadata: {
          appAccessMode: "MANUAL_ONLY",
          hadLinkedUser: false,
          hadLessons: false,
        },
        requestId: "req-del-1",
      }),
      undefined,
    );

    const payload = h.writeAuditEventMock.mock.calls[0]?.[0] as {
      metadata?: Record<string, unknown>;
      actorEmail?: string;
    };
    expect(JSON.stringify(payload.metadata)).not.toContain("@");
    expect(JSON.stringify(payload.metadata)).not.toContain("João");
    expect(payload.actorEmail).toBe("admin@school.test");
  });
});

describe("writeStudentAppAccessRemoveAuditEvent", () => {
  it("writes tenant-scoped remove audit without PII", async () => {
    await writeStudentAppAccessRemoveAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      appAccessMode: "MANUAL_ONLY",
      requestContext: { requestId: "req-1" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "student.app_access.remove",
        entityType: "Student",
        entityId: "stu-1",
        metadata: buildStudentAppAccessRemoveAuditMetadata({
          appAccessMode: "MANUAL_ONLY",
        }),
        requestId: "req-1",
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("password");
    expect(payload).not.toContain("tokenHash");
    expect(payload).not.toContain("student@");
  });
});

describe("writeStudentAppAccessReactivateAuditEvent", () => {
  it("writes reactivate audit with targetUserId and linkedUserId", async () => {
    await writeStudentAppAccessReactivateAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      appAccessMode: "APP_USER",
      linkedUserId: "user-1",
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "student.app_access.reactivate",
        entityType: "Student",
        entityId: "stu-1",
        targetUserId: "user-1",
        metadata: {
          previousAppAccessMode: "MANUAL_ONLY",
          appAccessMode: "APP_USER",
          linkedUserId: "user-1",
        },
      }),
      undefined,
    );
  });
});

describe("buildStudentCreateAuditMetadata", () => {
  it("includes lifecycle flags without PII", () => {
    expect(
      buildStudentCreateAuditMetadata({
        appAccessMode: "MANUAL_ONLY",
        hasLicenseCategory: false,
        hasTransmissionType: false,
        hasEmail: true,
        hasAddress: false,
        schoolStudentIdPresent: true,
        createdVia: "manual",
      }),
    ).toEqual({
      appAccessMode: "MANUAL_ONLY",
      hasLicenseCategory: false,
      hasTransmissionType: false,
      hasEmail: true,
      hasAddress: false,
      schoolStudentIdPresent: true,
      createdVia: "manual",
    });
  });
});

describe("buildStudentCreateAuditContextFromRecord", () => {
  it("derives flags from created student without literal identifiers", () => {
    expect(
      buildStudentCreateAuditContextFromRecord({
        appAccessMode: "MANUAL_ONLY",
        email: "student@school.test",
        address: "Street 1",
        schoolStudentId: "26001",
        category: null,
        transmissionType: null,
        userId: null,
      }),
    ).toEqual({
      linkedUserId: null,
      appAccessMode: "MANUAL_ONLY",
      hasLicenseCategory: false,
      hasTransmissionType: false,
      hasEmail: true,
      hasAddress: true,
      schoolStudentIdPresent: true,
      createdVia: "manual",
    });
  });
});

describe("writeStudentCreateAuditEvent", () => {
  it("writes student.create with tenant scope and flags only", async () => {
    await writeStudentCreateAuditEvent({
      organizationId: "org-a",
      actor,
      studentId: "stu-1",
      linkedUserId: null,
      appAccessMode: "MANUAL_ONLY",
      hasLicenseCategory: false,
      hasTransmissionType: false,
      hasEmail: true,
      hasAddress: false,
      schoolStudentIdPresent: true,
      createdVia: "manual",
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "student.create",
        entityType: "Student",
        entityId: "stu-1",
        targetUserId: null,
        metadata: buildStudentCreateAuditMetadata({
          appAccessMode: "MANUAL_ONLY",
          hasLicenseCategory: false,
          hasTransmissionType: false,
          hasEmail: true,
          hasAddress: false,
          schoolStudentIdPresent: true,
          createdVia: "manual",
        }),
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("student@");
    expect(payload).not.toContain("26001");
    expect(payload).not.toContain("Street");
  });
});
