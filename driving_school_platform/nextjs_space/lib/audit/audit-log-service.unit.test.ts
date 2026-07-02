import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const createMock = vi.fn();
  return {
    createMock,
    prismaMock: {
      auditLog: {
        create: createMock,
      },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

import {
  buildAuditLogCreateData,
  extractAuditRequestContext,
  writeAuditEvent,
} from "@/lib/audit/audit-log-service";
import { UserRole } from "@prisma/client";

beforeEach(() => {
  vi.resetAllMocks();
  h.createMock.mockResolvedValue({ id: "audit_1" });
});

describe("buildAuditLogCreateData", () => {
  it("maps canonical and legacy actor fields", () => {
    const data = buildAuditLogCreateData({
      organizationId: "org_1",
      actorUserId: "user_1",
      actorRole: UserRole.SUPER_ADMIN,
      actorEmail: "admin@school.test",
      action: "invitation.revoke",
      entityType: "UserInvitation",
      entityId: "inv_1",
      metadata: { reason: "operator_request" },
    });

    expect(data.organizationId).toBe("org_1");
    expect(data.actorUserId).toBe("user_1");
    expect(data.userId).toBe("user_1");
    expect(data.actorEmail).toBe("admin@school.test");
    expect(data.userEmail).toBe("admin@school.test");
    expect(data.actorRole).toBe(UserRole.SUPER_ADMIN);
    expect(data.userRole).toBe(UserRole.SUPER_ADMIN);
    expect(data.action).toBe("invitation.revoke");
    expect(data.entityType).toBe("UserInvitation");
    expect(data.status).toBe("SUCCESS");
    expect(data.metadata).toEqual({ reason: "operator_request" });
  });

  it("redacts secrets from metadata and legacy diff fields", () => {
    const data = buildAuditLogCreateData({
      action: "student.update",
      entityType: "Student",
      metadata: { passwordHash: "hash" },
      oldValues: { token: "t1" },
      newValues: { token: "t2" },
    });

    expect(data.metadata).toEqual({ passwordHash: "[REDACTED]" });
    expect(data.oldValues).toEqual({ token: "[REDACTED]" });
    expect(data.newValues).toEqual({ token: "[REDACTED]" });
  });

  it("allows null organizationId for platform-scoped events", () => {
    const data = buildAuditLogCreateData({
      organizationId: null,
      action: "organization.create",
      entityType: "Organization",
    });

    expect(data.organizationId).toBeNull();
  });

  it("rejects empty action labels", () => {
    expect(() =>
      buildAuditLogCreateData({
        action: "  ",
        entityType: "Student",
      }),
    ).toThrow("audit_action_required");
  });
});

describe("extractAuditRequestContext", () => {
  it("reads correlation headers and request metadata", () => {
    const request = new Request("https://app.example/api/admin/students", {
      method: "POST",
      headers: {
        "x-request-id": "req_123",
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });

    expect(extractAuditRequestContext(request)).toEqual({
      requestId: "req_123",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      requestMethod: "POST",
      requestPath: "/api/admin/students",
    });
  });
});

describe("writeAuditEvent", () => {
  it("persists redacted audit rows via prisma", async () => {
    const result = await writeAuditEvent({
      organizationId: "org_1",
      actorUserId: "user_1",
      action: "invitation.create",
      entityType: "UserInvitation",
      entityId: "inv_1",
      metadata: { email: "student@school.test" },
    });

    expect(result).toEqual({ ok: true, id: "audit_1" });
    expect(h.createMock).toHaveBeenCalledOnce();

    const arg = h.createMock.mock.calls[0]?.[0];
    expect(arg.data.organizationId).toBe("org_1");
    expect(arg.data.action).toBe("invitation.create");
    expect(arg.data.metadata).toEqual({ email: "student@school.test" });
  });

  it("swallows persistence errors by default", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.createMock.mockRejectedValueOnce(new Error("db_down"));

    const result = await writeAuditEvent({
      action: "student.delete",
      entityType: "Student",
    });

    expect(result).toEqual({ ok: false, error: "db_down" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("rethrows when throwOnError is set", async () => {
    h.createMock.mockRejectedValueOnce(new Error("db_down"));

    await expect(
      writeAuditEvent(
        {
          action: "student.delete",
          entityType: "Student",
        },
        { throwOnError: true },
      ),
    ).rejects.toThrow("db_down");
  });

  it("uses transaction client when provided", async () => {
    const txCreate = vi.fn().mockResolvedValue({ id: "audit_tx" });
    const tx = { auditLog: { create: txCreate } };

    const result = await writeAuditEvent(
      {
        action: "lesson.create",
        entityType: "Lesson",
      },
      { db: tx as never },
    );

    expect(result).toEqual({ ok: true, id: "audit_tx" });
    expect(txCreate).toHaveBeenCalledOnce();
    expect(h.createMock).not.toHaveBeenCalled();
  });
});
