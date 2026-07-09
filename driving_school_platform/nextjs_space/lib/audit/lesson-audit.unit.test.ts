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
  buildLessonDeleteAuditMetadata,
  buildLessonImportApplyAuditMetadata,
  buildLessonUpdateAuditMetadata,
  collectLessonUpdateChangedFields,
  resolveLessonImportApplyAuditEntityId,
  writeLessonCreateAuditEvent,
  writeLessonDeleteAuditEvent,
  writeLessonImportApplyAuditEvent,
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

  it("adds createdVia and scheduledAtDateOnly for manual practical history", () => {
    expect(
      buildLessonCreateAuditMetadata(drivingLesson, {
        createdVia: "manual_practical_lesson",
        lessonDate: new Date("2026-01-10T00:00:00.000Z"),
      }),
    ).toEqual({
      lessonType: "DRIVING",
      instructorId: "inst-row-1",
      studentId: "stu-1",
      vehicleId: 7,
      source: "SYSTEM",
      practicalLessonNumber: 3,
      createdVia: "manual_practical_lesson",
      scheduledAtDateOnly: "2026-01-10",
    });
  });
});

describe("buildLessonImportApplyAuditMetadata", () => {
  it("includes aggregated counts and format without row payloads", () => {
    expect(
      buildLessonImportApplyAuditMetadata({
        format: "csv",
        totalRows: 3,
        createdCount: 3,
        skippedCount: 0,
      }),
    ).toEqual({
      totalRows: 3,
      createdCount: 3,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      dryRun: false,
      source: "import",
      format: "csv",
      mode: "createOnly",
      lessonSource: "IMPORT",
      lessonType: "DRIVING",
      hasErrors: false,
    });
  });
});

describe("resolveLessonImportApplyAuditEntityId", () => {
  it("prefers requestId from request context", () => {
    expect(
      resolveLessonImportApplyAuditEntityId({ requestId: "req-imp-1" }),
    ).toBe("req-imp-1");
  });

  it("generates a surrogate batch id when requestId is absent", () => {
    const id = resolveLessonImportApplyAuditEntityId(undefined);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("writeLessonImportApplyAuditEvent", () => {
  it("writes lesson.import.apply with LessonImport entity and summary metadata", async () => {
    await writeLessonImportApplyAuditEvent({
      organizationId: "org-a",
      actor,
      format: "json",
      totalRows: 2,
      createdCount: 2,
      skippedCount: 0,
      requestContext: { requestId: "req-batch-99" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "lesson.import.apply",
        entityType: "LessonImport",
        entityId: "req-batch-99",
        metadata: buildLessonImportApplyAuditMetadata({
          format: "json",
          totalRows: 2,
          createdCount: 2,
          skippedCount: 0,
        }),
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("Nota importada");
    expect(payload).not.toContain("instrutor@");
    expect(
      h.writeAuditEventMock.mock.calls[0]?.[0].metadata,
    ).not.toHaveProperty("preview");
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

describe("buildLessonDeleteAuditMetadata", () => {
  it("reuses create metadata and adds scheduledAtDateOnly without free text", () => {
    expect(
      buildLessonDeleteAuditMetadata({
        ...drivingLesson,
        lessonDate: new Date("2030-06-01T00:00:00.000Z"),
      }),
    ).toEqual({
      lessonType: "DRIVING",
      instructorId: "inst-row-1",
      studentId: "stu-1",
      vehicleId: 7,
      source: "SYSTEM",
      practicalLessonNumber: 3,
      scheduledAtDateOnly: "2030-06-01",
    });
  });

  it("omits scheduledAtDateOnly when lessonDate is absent", () => {
    expect(buildLessonDeleteAuditMetadata(drivingLesson)).toEqual(
      buildLessonCreateAuditMetadata(drivingLesson),
    );
  });
});

describe("writeLessonDeleteAuditEvent", () => {
  it("writes tenant-scoped lesson.delete without secrets", async () => {
    await writeLessonDeleteAuditEvent({
      organizationId: "org-a",
      actor,
      lesson: {
        ...drivingLesson,
        lessonDate: new Date("2030-06-01T00:00:00.000Z"),
      },
      requestContext: { requestId: "req-del-1" },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        action: "lesson.delete",
        entityType: "Lesson",
        entityId: "lesson-1",
        metadata: buildLessonDeleteAuditMetadata({
          ...drivingLesson,
          lessonDate: new Date("2030-06-01T00:00:00.000Z"),
        }),
        requestId: "req-del-1",
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("password");
    expect(payload).not.toContain("tokenHash");
    expect(payload).not.toContain("notes");
    expect(
      h.writeAuditEventMock.mock.calls[0]?.[0].metadata,
    ).not.toHaveProperty("email");
  });
});
