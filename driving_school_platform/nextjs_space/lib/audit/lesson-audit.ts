import type { UpdateAdminLessonPayload } from "@/lib/lessons/lesson-update-delete-service";
import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const LESSON_AUDIT_ENTITY_TYPE = "Lesson";

export type LessonAuditAction =
  | "lesson.create"
  | "lesson.update"
  | "lesson.delete";

export type LessonImportApplyAuditAction = "lesson.import.apply";

export type LessonAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

export const LESSON_IMPORT_AUDIT_ENTITY_TYPE = "LessonImport";

export type LessonAuditSnapshot = {
  id: string;
  lessonType: string;
  studentId?: string | null;
  instructorId: string;
  vehicleId?: number | null;
  lessonSource?: string | null;
  practicalLessonNumber?: number | null;
};

export type LessonDeleteAuditSnapshot = LessonAuditSnapshot & {
  lessonDate?: Date;
};

export const MANUAL_PRACTICAL_LESSON_CREATE_VIA =
  "manual_practical_lesson" as const;

export type LessonCreateAuditMetadataExtras = {
  createdVia?: typeof MANUAL_PRACTICAL_LESSON_CREATE_VIA;
  lessonDate?: Date;
};

type WriteLessonAuditEventBase = {
  organizationId: string;
  actor: LessonAuditActor;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

export function buildLessonImportApplyAuditMetadata(input: {
  format: "csv" | "json";
  totalRows: number;
  createdCount: number;
  skippedCount: number;
}): Record<string, unknown> {
  return {
    totalRows: input.totalRows,
    createdCount: input.createdCount,
    updatedCount: 0,
    skippedCount: input.skippedCount,
    failedCount: 0,
    dryRun: false,
    source: "import",
    format: input.format,
    mode: "createOnly",
    lessonSource: "IMPORT",
    lessonType: "DRIVING",
    hasErrors: false,
  };
}

/**
 * Batch surrogate when the product has no persisted importId.
 * Prefer inbound request correlation headers when present.
 */
export function resolveLessonImportApplyAuditEntityId(
  requestContext?: AuditRequestContext,
): string {
  const requestId = requestContext?.requestId?.trim();
  if (requestId) {
    return requestId;
  }
  return crypto.randomUUID();
}

export function buildLessonCreateAuditMetadata(
  lesson: LessonAuditSnapshot,
  extras?: LessonCreateAuditMetadataExtras,
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

  if (extras?.createdVia) {
    metadata.createdVia = extras.createdVia;
  }

  if (extras?.lessonDate) {
    metadata.scheduledAtDateOnly = formatLessonScheduledDateOnly(
      extras.lessonDate,
    );
  }

  return metadata;
}

export function formatLessonScheduledDateOnly(lessonDate: Date): string {
  return lessonDate.toISOString().slice(0, 10);
}

export function buildLessonDeleteAuditMetadata(
  lesson: LessonDeleteAuditSnapshot,
): Record<string, unknown> {
  const metadata = buildLessonCreateAuditMetadata(lesson);

  if (lesson.lessonDate) {
    metadata.scheduledAtDateOnly = formatLessonScheduledDateOnly(
      lesson.lessonDate,
    );
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
    metadataExtras?: LessonCreateAuditMetadataExtras;
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
      metadata: buildLessonCreateAuditMetadata(
        input.lesson,
        input.metadataExtras,
      ),
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

export async function writeLessonDeleteAuditEvent(
  input: WriteLessonAuditEventBase & {
    lesson: LessonDeleteAuditSnapshot;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "lesson.delete",
      entityType: LESSON_AUDIT_ENTITY_TYPE,
      entityId: input.lesson.id,
      metadata: buildLessonDeleteAuditMetadata(input.lesson),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeLessonImportApplyAuditEvent(input: {
  organizationId: string;
  actor: LessonAuditActor;
  format: "csv" | "json";
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
}) {
  const entityId = resolveLessonImportApplyAuditEntityId(input.requestContext);

  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "lesson.import.apply",
      entityType: LESSON_IMPORT_AUDIT_ENTITY_TYPE,
      entityId,
      metadata: buildLessonImportApplyAuditMetadata({
        format: input.format,
        totalRows: input.totalRows,
        createdCount: input.createdCount,
        skippedCount: input.skippedCount,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}
