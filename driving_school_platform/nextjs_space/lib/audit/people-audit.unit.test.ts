import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const writeAuditEventMock = vi.fn();
  return { writeAuditEventMock };
});

vi.mock("@/lib/audit/audit-log-service", () => ({
  writeAuditEvent: h.writeAuditEventMock,
}));

import {
  buildInstructorDeactivateAuditMetadata,
  buildInstructorQualifiedCategoriesAuditMetadata,
  writeInstructorDeactivateAuditEvent,
  writeInstructorQualifiedCategoriesAuditEvent,
} from "@/lib/audit/people-audit";
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

describe("buildInstructorQualifiedCategoriesAuditMetadata", () => {
  it("includes category names, ids, and count only", () => {
    expect(
      buildInstructorQualifiedCategoriesAuditMetadata({
        id: "inst-1",
        qualifiedCategories: [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ],
      }),
    ).toEqual({
      qualifiedCategoryNames: ["A", "B"],
      qualifiedCategoryIds: [1, 2],
      qualifiedCategoryCount: 2,
    });
  });
});

describe("writeInstructorQualifiedCategoriesAuditEvent", () => {
  it("writes tenant-scoped audit without secrets", async () => {
    await writeInstructorQualifiedCategoriesAuditEvent({
      organizationId: "org-a",
      actor,
      instructor: {
        id: "inst-1",
        qualifiedCategories: [{ id: 2, name: "B" }],
      },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "instructor.qualified_categories.update",
        entityType: "Instructor",
        entityId: "inst-1",
        metadata: {
          qualifiedCategoryNames: ["B"],
          qualifiedCategoryIds: [2],
          qualifiedCategoryCount: 1,
        },
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("password");
    expect(payload).not.toContain("tokenHash");
  });
});

describe("writeInstructorDeactivateAuditEvent", () => {
  it("writes deactivate audit with warning summary metadata", async () => {
    await writeInstructorDeactivateAuditEvent({
      organizationId: "org-a",
      actor,
      instructorId: "inst-1",
      alreadyInactive: false,
      warningCodes: ["instructor_has_future_lessons"],
      futureLessonsCount: 2,
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "instructor.deactivate",
        entityType: "Instructor",
        entityId: "inst-1",
        metadata: buildInstructorDeactivateAuditMetadata({
          alreadyInactive: false,
          warningCodes: ["instructor_has_future_lessons"],
          futureLessonsCount: 2,
        }),
      }),
      undefined,
    );
  });
});
