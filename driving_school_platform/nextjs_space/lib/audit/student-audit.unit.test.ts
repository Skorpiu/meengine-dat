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
  writeStudentAppAccessReactivateAuditEvent,
  writeStudentAppAccessRemoveAuditEvent,
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
