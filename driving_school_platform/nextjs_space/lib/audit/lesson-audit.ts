import type { UpdateAdminLessonPayload } from "@/lib/lessons/lesson-update-delete-service";
import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const LESSON_AUDIT_ENTITY_TYPE = "Lesson";

export type LessonAuditAction = "lesson.create" | "lesson.update";

export type LessonAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

export type LessonAuditSnapshot = {
  id: string;
  lessonType: string;
  studentId?: string | null;
  instructorId: string;
  vehicleId?: number | null;
  lessonSource?: string | null;
  practicalLessonNumber?: number | null;
};

type WriteLessonAuditEventBase = {
  organizationId: string;
  actor: LessonAuditActor;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

export function buildLessonCreateAuditMetadata(
  lesson: LessonAuditSnapshot,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    lessonType: lesson.lessonType,
    instructorId: lesson.instructorId,
  };

  if (lesson.studentId) {
    metadata.studentId = lesson.studentId;
  }

  if (lesson.vehicleId != null) {
    metadata.vehicleId = lesson.vehicleId;
  }

  if (lesson.lessonSource) {
    metadata.source = lesson.lessonSource;
  }

  if (lesson.practicalLessonNumber != null) {
    metadata.practicalLessonNumber = lesson.practicalLessonNumber;
  }

  return metadata;
}

export function collectLessonUpdateChangedFields(
  payload: UpdateAdminLessonPayload,
): string[] {
  const fields: string[] = [];

  if (payload.lessonDate !== undefined) {
    fields.push("lessonDate");
  }
  if (payload.startTime !== undefined) {
    fields.push("startTime");
  }
  if (payload.endTime !== undefined) {
    fields.push("endTime");
  }
  if (payload.status !== undefined) {
    fields.push("status");
  }
  if (payload.vehicleId !== undefined) {
    fields.push("vehicleId");
  }
  if (payload.instructorId !== undefined) {
    fields.push("instructorId");
  }
  if (payload.studentId !== undefined) {
    fields.push("studentId");
  }

  return fields;
}

export function buildLessonUpdateAuditMetadata(input: {
  changedFields: string[];
  lessonType: string;
  studentId?: string | null;
  instructorId?: string | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    changedFields: input.changedFields,
    lessonType: input.lessonType,
  };

  if (input.changedFields.includes("studentId") && input.studentId) {
    metadata.studentId = input.studentId;
  }

  if (input.changedFields.includes("instructorId") && input.instructorId) {
    metadata.instructorId = input.instructorId;
  }

  return metadata;
}

export async function writeLessonCreateAuditEvent(
  input: WriteLessonAuditEventBase & {
    lesson: LessonAuditSnapshot;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "lesson.create",
      entityType: LESSON_AUDIT_ENTITY_TYPE,
      entityId: input.lesson.id,
      metadata: buildLessonCreateAuditMetadata(input.lesson),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeLessonUpdateAuditEvent(
  input: WriteLessonAuditEventBase & {
    lesson: Pick<
      LessonAuditSnapshot,
      "id" | "lessonType" | "studentId" | "instructorId"
    >;
    changedFields: string[];
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "lesson.update",
      entityType: LESSON_AUDIT_ENTITY_TYPE,
      entityId: input.lesson.id,
      metadata: buildLessonUpdateAuditMetadata({
        changedFields: input.changedFields,
        lessonType: input.lesson.lessonType,
        studentId: input.lesson.studentId,
        instructorId: input.lesson.instructorId,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}
