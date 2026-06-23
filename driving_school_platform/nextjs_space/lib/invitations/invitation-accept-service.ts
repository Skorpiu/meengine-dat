import { prisma } from "@/lib/db";
import type { UserInvitation } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeInstructorLicenseNumber } from "@/lib/instructors/instructor-license-utils";
import {
  INVITATION_LIST_INCLUDE,
  mapInvitationDto,
  type InvitationDto,
} from "./invitation-dto";
import {
  isInvitableUserRole,
  normalizeInvitationEmail,
  type InvitableUserRole,
} from "./invitation-policy";
import {
  canAcceptInvitation,
  hashInvitationToken,
} from "./invitation-token-service";

const BCRYPT_COST = 12;

export type InvitationAcceptErrorCode =
  | "invalid_token"
  | "invitation_expired"
  | "invitation_revoked"
  | "invitation_already_accepted"
  | "invitation_not_pending"
  | "user_already_exists"
  | "invalid_invitation_role"
  | "student_already_linked"
  | "student_record_not_found"
  | "instructor_license_missing"
  | "instructor_license_exists";

export type InvitationAcceptFailure = {
  ok: false;
  error: string;
  code: InvitationAcceptErrorCode;
  status: number;
};

export type InvitationAcceptPreview = {
  email: string;
  role: InvitableUserRole;
  organizationName: string;
  expiresAt: string;
};

export type AcceptedUserDto = {
  id: string;
  email: string;
  role: InvitableUserRole;
  firstName: string;
  lastName: string;
};

export type GetInvitationByTokenResult =
  | { ok: true; invitation: InvitationAcceptPreview }
  | InvitationAcceptFailure;

export type AcceptInvitationInput = {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type AcceptInvitationResult =
  | {
      ok: true;
      user: AcceptedUserDto;
      organizationId: string;
      organizationName: string;
      invitation: InvitationDto;
    }
  | InvitationAcceptFailure;

const invitationWithOrganizationInclude = {
  organization: { select: { id: true, name: true } },
} as const;

type InvitationForAccept = UserInvitation & {
  organization: { id: string; name: string };
};

function acceptError(
  code: InvitationAcceptErrorCode,
  status: number,
  error: string,
): InvitationAcceptFailure {
  return { ok: false, code, status, error };
}

function acceptBlockCode(
  reason: "already_accepted" | "revoked" | "expired" | "not_pending",
): InvitationAcceptErrorCode {
  switch (reason) {
    case "already_accepted":
      return "invitation_already_accepted";
    case "revoked":
      return "invitation_revoked";
    case "expired":
      return "invitation_expired";
    case "not_pending":
      return "invitation_not_pending";
  }
}

function validateInvitationForAccept(
  invitation: InvitationForAccept,
): InvitationAcceptFailure | null {
  if (!isInvitableUserRole(invitation.role)) {
    return acceptError(
      "invalid_invitation_role",
      400,
      "This invitation cannot be accepted",
    );
  }

  const decision = canAcceptInvitation({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  });

  if (!decision.allowed) {
    const messages: Record<InvitationAcceptErrorCode, string> = {
      invitation_already_accepted: "This invitation has already been accepted",
      invitation_revoked: "This invitation has been revoked",
      invitation_expired: "This invitation has expired",
      invitation_not_pending: "This invitation is no longer valid",
      invalid_token: "Invalid invitation",
      user_already_exists: "Unable to accept this invitation",
      invalid_invitation_role: "This invitation cannot be accepted",
      student_already_linked:
        "This student record is already linked to an account.",
      student_record_not_found: "This invitation is no longer valid",
      instructor_license_missing:
        "This invitation is missing instructor license details. Ask your school admin to revoke it and create a new invitation with license number and expiration date.",
      instructor_license_exists:
        "An instructor with this license number already exists. Ask your school admin for a new invitation.",
    };
    const code = acceptBlockCode(decision.reason);
    const status =
      code === "invitation_already_accepted"
        ? 409
        : code === "invitation_expired" || code === "invitation_revoked"
          ? 410
          : 400;
    return acceptError(code, status, messages[code]);
  }

  return null;
}

function mapAcceptPreview(
  invitation: InvitationForAccept,
): InvitationAcceptPreview {
  return {
    email: invitation.email,
    role: invitation.role as InvitableUserRole,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function getInvitationByToken(input: {
  token: string;
}): Promise<GetInvitationByTokenResult> {
  const trimmed = input.token.trim();
  if (!trimmed) {
    return acceptError("invalid_token", 400, "Invalid invitation");
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(trimmed) },
    include: invitationWithOrganizationInclude,
  });

  if (!invitation) {
    return acceptError("invalid_token", 404, "Invalid invitation");
  }

  const blocked = validateInvitationForAccept(invitation);
  if (blocked) {
    return blocked;
  }

  return { ok: true, invitation: mapAcceptPreview(invitation) };
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  const trimmedToken = input.token.trim();
  if (!trimmedToken) {
    return acceptError("invalid_token", 400, "Invalid invitation");
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(trimmedToken) },
    include: invitationWithOrganizationInclude,
  });

  if (!invitation) {
    return acceptError("invalid_token", 404, "Invalid invitation");
  }

  const blocked = validateInvitationForAccept(invitation);
  if (blocked) {
    return blocked;
  }

  const role = invitation.role;
  if (!isInvitableUserRole(role)) {
    return acceptError(
      "invalid_invitation_role",
      400,
      "This invitation cannot be accepted",
    );
  }

  const email = normalizeInvitationEmail(invitation.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return acceptError(
      "user_already_exists",
      409,
      "An account with this email already exists",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.userInvitation.findUnique({
        where: { id: invitation.id },
        include: invitationWithOrganizationInclude,
      });

      if (!current) {
        throw new Error("INVITATION_ACCEPT_INVALID");
      }

      const recheck = validateInvitationForAccept(current);
      if (recheck) {
        throw new Error(`INVITATION_ACCEPT_${recheck.code}`);
      }

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          firstName,
          lastName,
          organizationId: current.organizationId,
          // Invite link sent to this email proves control; skip separate verification.
          isEmailVerified: true,
          emailVerified: new Date(),
          // School Admin invitation is the approval boundary (DEC-037).
          isApproved: true,
        },
      });

      if (role === "STUDENT") {
        if (current.studentId) {
          const linkedStudent = await tx.student.findFirst({
            where: {
              id: current.studentId,
              organizationId: current.organizationId,
            },
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
            },
          });

          if (!linkedStudent) {
            throw new Error("INVITATION_ACCEPT_student_record_not_found");
          }

          if (linkedStudent.userId) {
            throw new Error("INVITATION_ACCEPT_student_already_linked");
          }

          await tx.student.update({
            where: { id: linkedStudent.id },
            data: {
              userId: user.id,
              appAccessMode: "APP_USER",
              email,
              ...(linkedStudent.firstName?.trim() ? {} : { firstName }),
              ...(linkedStudent.lastName?.trim() ? {} : { lastName }),
            },
          });
        } else {
          await tx.student.create({
            data: {
              userId: user.id,
              organizationId: current.organizationId,
            },
          });
        }
      } else {
        const licenseNumber = normalizeInstructorLicenseNumber(
          current.instructorLicenseNumber ?? "",
        );
        const licenseExpiry = current.instructorLicenseExpiry;

        if (!licenseNumber || !licenseExpiry) {
          throw new Error("INVITATION_ACCEPT_instructor_license_missing");
        }

        const conflictingInstructor = await tx.instructor.findFirst({
          where: { instructorLicenseNumber: licenseNumber },
          select: { id: true },
        });

        if (conflictingInstructor) {
          throw new Error("INVITATION_ACCEPT_instructor_license_exists");
        }

        await tx.instructor.create({
          data: {
            userId: user.id,
            organizationId: current.organizationId,
            instructorLicenseNumber: licenseNumber,
            instructorLicenseExpiry: licenseExpiry,
            instructorIdNumber: `INS-${Date.now()}`,
            employmentType: "FULL_TIME",
            hourlyRate: 45.0,
          },
        });
      }

      const updatedCount = await tx.userInvitation.updateMany({
        where: { id: current.id, status: "PENDING" },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedUserId: user.id,
        },
      });

      if (updatedCount.count !== 1) {
        throw new Error("INVITATION_ACCEPT_invitation_not_pending");
      }

      const acceptedInvitation = await tx.userInvitation.findUniqueOrThrow({
        where: { id: current.id },
        include: INVITATION_LIST_INCLUDE,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: role as InvitableUserRole,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        organizationId: current.organizationId,
        organizationName: current.organization.name,
        invitation: mapInvitationDto(acceptedInvitation),
      };
    });

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVITATION_ACCEPT_INVALID") {
        return acceptError("invalid_token", 404, "Invalid invitation");
      }
      if (error.message.startsWith("INVITATION_ACCEPT_")) {
        const code = error.message.replace(
          "INVITATION_ACCEPT_",
          "",
        ) as InvitationAcceptErrorCode;
        const messages: Record<InvitationAcceptErrorCode, string> = {
          invitation_already_accepted:
            "This invitation has already been accepted",
          invitation_revoked: "This invitation has been revoked",
          invitation_expired: "This invitation has expired",
          invitation_not_pending: "This invitation is no longer valid",
          invalid_token: "Invalid invitation",
          user_already_exists: "An account with this email already exists",
          invalid_invitation_role: "This invitation cannot be accepted",
          student_already_linked:
            "This student record is already linked to an account.",
          student_record_not_found: "This invitation is no longer valid",
          instructor_license_missing:
            "This invitation is missing instructor license details. Ask your school admin to revoke it and create a new invitation with license number and expiration date.",
          instructor_license_exists:
            "An instructor with this license number already exists. Ask your school admin for a new invitation.",
        };
        const status =
          code === "invitation_already_accepted" ||
          code === "student_already_linked" ||
          code === "instructor_license_exists"
            ? 409
            : code === "invitation_expired" || code === "invitation_revoked"
              ? 410
              : 400;
        return acceptError(
          code,
          status,
          messages[code] ?? "This invitation is no longer valid",
        );
      }
    }
    throw error;
  }
}
