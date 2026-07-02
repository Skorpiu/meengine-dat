import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const STUDENT_AUDIT_ENTITY_TYPE = "Student";

export type StudentAppAccessAuditAction =
  | "student.app_access.remove"
  | "student.app_access.reactivate";

export type StudentAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

type WriteStudentAuditEventBase = {
  organizationId: string;
  actor: StudentAuditActor;
  studentId: string;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

export function buildStudentAppAccessRemoveAuditMetadata(input: {
  appAccessMode: string;
}): Record<string, unknown> {
  return {
    previousAppAccessMode: "APP_USER",
    appAccessMode: input.appAccessMode,
  };
}

export function buildStudentAppAccessReactivateAuditMetadata(input: {
  appAccessMode: string;
  linkedUserId?: string | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    previousAppAccessMode: "MANUAL_ONLY",
    appAccessMode: input.appAccessMode,
  };

  if (input.linkedUserId) {
    metadata.linkedUserId = input.linkedUserId;
  }

  return metadata;
}

export async function writeStudentAppAccessRemoveAuditEvent(
  input: WriteStudentAuditEventBase & {
    appAccessMode: string;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.app_access.remove",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      metadata: buildStudentAppAccessRemoveAuditMetadata({
        appAccessMode: input.appAccessMode,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentAppAccessReactivateAuditEvent(
  input: WriteStudentAuditEventBase & {
    appAccessMode: string;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.app_access.reactivate",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentAppAccessReactivateAuditMetadata({
        appAccessMode: input.appAccessMode,
        linkedUserId: input.linkedUserId,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}
