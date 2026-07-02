import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const writeAuditEventMock = vi.fn();
  return { writeAuditEventMock };
});

vi.mock("@/lib/audit/audit-log-service", () => ({
  writeAuditEvent: h.writeAuditEventMock,
}));

import {
  buildLessonCreateAuditMetadata,
  buildLessonUpdateAuditMetadata,
  collectLessonUpdateChangedFields,
  writeLessonCreateAuditEvent,
  writeLessonUpdateAuditEvent,
} from "@/lib/audit/lesson-audit";
import { UserRole } from "@prisma/client";

const actor = {
  userId: "admin-1",
  role: UserRole.SUPER_ADMIN,
  email: "admin@school.test",
};

const drivingLesson = {
  id: "lesson-1",
  lessonType: "DRIVING",
  studentId: "stu-1",
  instructorId: "inst-row-1",
  vehicleId: 7,
  lessonSource: "SYSTEM",
  practicalLessonNumber: 3,
};

beforeEach(() => {
  vi.resetAllMocks();
  h.writeAuditEventMock.mockResolvedValue({ ok: true, id: "audit_1" });
});

describe("buildLessonCreateAuditMetadata", () => {
  it("includes operational ids and lesson fields without free-text notes", () => {
    expect(buildLessonCreateAuditMetadata(drivingLesson)).toEqual({
      lessonType: "DRIVING",
      instructorId: "inst-row-1",
      studentId: "stu-1",
      vehicleId: 7,
      source: "SYSTEM",
      practicalLessonNumber: 3,
    });
  });

  it("omits optional fields when absent", () => {
    expect(
      buildLessonCreateAuditMetadata({
        id: "lesson-2",
        lessonType: "THEORY",
        studentId: null,
        instructorId: "inst-row-1",
      }),
    ).toEqual({
      lessonType: "THEORY",
      instructorId: "inst-row-1",
    });
  });
});

describe("collectLessonUpdateChangedFields", () => {
  it("lists only keys present in the update payload", () => {
    expect(
      collectLessonUpdateChangedFields({
        startTime: "10:00",
        endTime: "11:00",
        status: "SCHEDULED",
      }),
    ).toEqual(["startTime", "endTime", "status"]);
  });
});

describe("buildLessonUpdateAuditMetadata", () => {
  it("includes changedFields and relevant ids only when changed", () => {
    expect(
      buildLessonUpdateAuditMetadata({
        changedFields: ["studentId", "status"],
        lessonType: "DRIVING",
        studentId: "stu-2",
        instructorId: "inst-row-1",
      }),
    ).toEqual({
      changedFields: ["studentId", "status"],
      lessonType: "DRIVING",
      studentId: "stu-2",
    });
  });
});

describe("writeLessonCreateAuditEvent", () => {
  it("writes tenant-scoped lesson.create without secrets", async () => {
    await writeLessonCreateAuditEvent({
      organizationId: "org-a",
      actor,
      lesson: drivingLesson,
      requestContext: { requestId: "req-1" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "lesson.create",
        entityType: "Lesson",
        entityId: "lesson-1",
        metadata: buildLessonCreateAuditMetadata(drivingLesson),
        requestId: "req-1",
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("password");
    expect(payload).not.toContain("tokenHash");
    expect(payload).not.toContain("notes");
  });
});

describe("writeLessonUpdateAuditEvent", () => {
  it("writes lesson.update with changedFields metadata only", async () => {
    await writeLessonUpdateAuditEvent({
      organizationId: "org-a",
      actor,
      lesson: {
        id: "lesson-1",
        lessonType: "DRIVING",
        studentId: "stu-2",
        instructorId: "inst-row-1",
      },
      changedFields: ["studentId", "startTime"],
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "lesson.update",
        entityType: "Lesson",
        entityId: "lesson-1",
        metadata: {
          changedFields: ["studentId", "startTime"],
          lessonType: "DRIVING",
          studentId: "stu-2",
        },
      }),
      undefined,
    );

    const payload = h.writeAuditEventMock.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty("oldValues");
    expect(payload).not.toHaveProperty("newValues");
  });
});
