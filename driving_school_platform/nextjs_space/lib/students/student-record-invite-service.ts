import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations/invitation-service";
import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import { normalizeStudentRecordEmail } from "@/lib/students/student-record-validation";

export type InviteExistingStudentRecordInput = {
  organizationId: string;
  createdByUserId: string;
  studentId: string;
  email?: string;
  baseUrl: string;
};

export type InviteExistingStudentRecordResult =
  | {
      ok: true;
      invitation: InvitationDto;
      inviteLink: string;
      organizationName: string;
    }
  | {
      ok: false;
      error: string;
      code:
        | "student_not_found"
        | "student_already_linked"
        | "student_not_invitable"
        | "missing_email"
        | "invalid_email"
        | "invalid_role"
        | "invalid_instructor_license"
        | "instructor_license_exists"
        | "instructor_license_pending_invitation"
        | "pending_invitation_exists"
        | "user_already_exists";
      status: number;
    };

export async function inviteExistingStudentRecord(
  input: InviteExistingStudentRecordInput,
): Promise<InviteExistingStudentRecordResult> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: {
        id: input.studentId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        userId: true,
        email: true,
        appAccessMode: true,
      },
    });

    if (!student) {
      return {
        ok: false,
        error: "Student not found",
        code: "student_not_found",
        status: 404,
      };
    }

    if (student.userId) {
      return {
        ok: false,
        error: "This student record is already linked to an account.",
        code: "student_already_linked",
        status: 409,
      };
    }

    if (student.appAccessMode === "APP_USER") {
      return {
        ok: false,
        error: "This student record already has app access.",
        code: "student_not_invitable",
        status: 400,
      };
    }

    const resolvedEmail =
      input.email !== undefined
        ? normalizeStudentRecordEmail(input.email)
        : normalizeStudentRecordEmail(student.email);

    if (!resolvedEmail) {
      return {
        ok: false,
        error: "An email address is required to send an invitation.",
        code: "missing_email",
        status: 400,
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      return {
        ok: false,
        error: "Invalid email address",
        code: "invalid_email",
        status: 400,
      };
    }

    const inviteResult = await createInvitation({
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      email: resolvedEmail,
      role: "STUDENT",
      baseUrl: input.baseUrl,
      studentId: student.id,
      tx,
    });

    if (!inviteResult.ok) {
      return inviteResult;
    }

    await tx.student.update({
      where: { id: student.id },
      data: {
        email: normalizeInvitationEmail(resolvedEmail),
        appAccessMode: "INVITED",
      },
    });

    return inviteResult;
  });
}
