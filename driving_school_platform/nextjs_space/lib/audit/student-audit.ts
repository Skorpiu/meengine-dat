import type { PatchStudentRecordBody } from "@/lib/students/student-record-validation";
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

export type StudentProfileAuditAction =
  | "student.update"
  | "student.email.change";

export type StudentEmailChangePolicyMode =
  | "APP_USER"
  | "INVITED"
  | "MANUAL_ONLY";

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

export function collectStudentProfileUpdateChangedFields(
  data: PatchStudentRecordBody,
): string[] {
  const fields: string[] = [];

  if (data.firstName !== undefined) {
    fields.push("firstName");
  }
  if (data.lastName !== undefined) {
    fields.push("lastName");
  }
  if (data.phoneNumber !== undefined) {
    fields.push("phoneNumber");
  }
  if (data.address !== undefined) {
    fields.push("address");
  }
  if (data.email !== undefined) {
    fields.push("email");
  }
  if (data.enrollmentDate !== undefined) {
    fields.push("enrollmentDate");
  }
  if (data.yearSuffix !== undefined && data.sequenceNumber !== undefined) {
    fields.push("schoolStudentId");
  }
  if (data.categoryName !== undefined) {
    fields.push("categoryName");
  }
  if (data.transmissionTypeName !== undefined) {
    fields.push("transmissionTypeName");
  }

  return fields;
}

export function buildStudentProfileUpdateAuditMetadata(input: {
  changedFields: string[];
  appAccessMode: string;
}): Record<string, unknown> {
  return {
    changedFields: input.changedFields,
    appAccessMode: input.appAccessMode,
  };
}

export function buildStudentEmailChangeAuditMetadata(input: {
  policyMode: StudentEmailChangePolicyMode;
  hasLinkedUser: boolean;
  invitationRevoked: boolean;
}): Record<string, unknown> {
  return {
    policyMode: input.policyMode,
    hasLinkedUser: input.hasLinkedUser,
    invitationRevoked: input.invitationRevoked,
  };
}

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

export async function writeStudentProfileUpdateAuditEvent(
  input: WriteStudentAuditEventBase & {
    changedFields: string[];
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
      action: "student.update",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentProfileUpdateAuditMetadata({
        changedFields: input.changedFields,
        appAccessMode: input.appAccessMode,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentEmailChangeAuditEvent(
  input: WriteStudentAuditEventBase & {
    policyMode: StudentEmailChangePolicyMode;
    hasLinkedUser: boolean;
    invitationRevoked: boolean;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.email.change",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentEmailChangeAuditMetadata({
        policyMode: input.policyMode,
        hasLinkedUser: input.hasLinkedUser,
        invitationRevoked: input.invitationRevoked,
      }),
      ...input.requestContext,
    },
    input.options,
  );
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
