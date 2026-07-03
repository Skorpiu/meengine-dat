import type { InstructorQualifiedCategoriesDto } from "@/lib/instructors/instructor-record-qualified-categories";
import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const PEOPLE_AUDIT_ENTITY_TYPE = {
  Instructor: "Instructor",
  Student: "Student",
} as const;

export type PeopleAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

export type InstructorQualifiedCategoriesAuditAction =
  "instructor.qualified_categories.update";

export type InstructorLifecycleAuditAction =
  | "instructor.deactivate"
  | "instructor.reactivate"
  | "instructor.delete";

type WritePeopleAuditEventBase = {
  organizationId: string;
  actor: PeopleAuditActor;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

export function buildInstructorQualifiedCategoriesAuditMetadata(
  instructor: InstructorQualifiedCategoriesDto,
): Record<string, unknown> {
  const qualifiedCategoryNames = instructor.qualifiedCategories.map(
    (category) => category.name,
  );

  return {
    qualifiedCategoryNames,
    qualifiedCategoryIds: instructor.qualifiedCategories.map(
      (category) => category.id,
    ),
    qualifiedCategoryCount: qualifiedCategoryNames.length,
  };
}

export function buildInstructorDeactivateAuditMetadata(input: {
  alreadyInactive: boolean;
  warningCodes: string[];
  futureLessonsCount: number;
}): Record<string, unknown> {
  return {
    alreadyInactive: input.alreadyInactive,
    warningCodes: input.warningCodes,
    futureLessonsCount: input.futureLessonsCount,
  };
}

export function buildInstructorReactivateAuditMetadata(input: {
  alreadyActive: boolean;
}): Record<string, unknown> {
  return {
    alreadyActive: input.alreadyActive,
  };
}

export function buildInstructorDeleteAuditMetadata(input: {
  hadLinkedUser: boolean;
  hadLessons: boolean;
  isAvailableForBooking: boolean;
}): Record<string, unknown> {
  return {
    hadLinkedUser: input.hadLinkedUser,
    hadLessons: input.hadLessons,
    isAvailableForBooking: input.isAvailableForBooking,
  };
}

export async function writeInstructorQualifiedCategoriesAuditEvent(
  input: WritePeopleAuditEventBase & {
    instructor: InstructorQualifiedCategoriesDto;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "instructor.qualified_categories.update",
      entityType: PEOPLE_AUDIT_ENTITY_TYPE.Instructor,
      entityId: input.instructor.id,
      metadata: buildInstructorQualifiedCategoriesAuditMetadata(
        input.instructor,
      ),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeInstructorDeactivateAuditEvent(
  input: WritePeopleAuditEventBase & {
    instructorId: string;
    targetUserId?: string | null;
    alreadyInactive: boolean;
    warningCodes: string[];
    futureLessonsCount: number;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "instructor.deactivate",
      entityType: PEOPLE_AUDIT_ENTITY_TYPE.Instructor,
      entityId: input.instructorId,
      targetUserId: input.targetUserId ?? null,
      metadata: buildInstructorDeactivateAuditMetadata({
        alreadyInactive: input.alreadyInactive,
        warningCodes: input.warningCodes,
        futureLessonsCount: input.futureLessonsCount,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeInstructorReactivateAuditEvent(
  input: WritePeopleAuditEventBase & {
    instructorId: string;
    targetUserId?: string | null;
    alreadyActive: boolean;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "instructor.reactivate",
      entityType: PEOPLE_AUDIT_ENTITY_TYPE.Instructor,
      entityId: input.instructorId,
      targetUserId: input.targetUserId ?? null,
      metadata: buildInstructorReactivateAuditMetadata({
        alreadyActive: input.alreadyActive,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeInstructorDeleteAuditEvent(
  input: WritePeopleAuditEventBase & {
    instructorId: string;
    hadLinkedUser: boolean;
    lessonsCount: number;
    linkedUserId?: string | null;
    isAvailableForBooking: boolean;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "instructor.delete",
      entityType: PEOPLE_AUDIT_ENTITY_TYPE.Instructor,
      entityId: input.instructorId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildInstructorDeleteAuditMetadata({
        hadLinkedUser: input.hadLinkedUser,
        hadLessons: input.lessonsCount > 0,
        isAvailableForBooking: input.isAvailableForBooking,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}
