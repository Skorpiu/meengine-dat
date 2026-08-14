import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  changeInstructorEmail,
  INSTRUCTOR_EMAIL_CHANGE_CODE,
} from "@/lib/instructors/instructor-email-change-service";
import { changeInstructorEmailBodySchema } from "@/lib/instructors/instructor-email-change-validation";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeInstructorEmailChangeAuditEvent } from "@/lib/audit/people-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireSuperAdminTenant(request: NextRequest): Promise<
  | {
      ok: true;
      organizationId: string;
      actor: { userId: string; role: UserRole; email?: string | null };
    }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return {
      ok: false,
      response: errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
    };
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return {
      ok: false,
      response: errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST),
    };
  }

  const tenantDenied = await assertUserTenantHost(request, orgId);
  if (tenantDenied) {
    return { ok: false, response: tenantDenied };
  }

  return {
    ok: true,
    organizationId: orgId,
    actor: {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
    },
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const demoDenied = await rejectDemoUserManagementMutation(
      auth.organizationId,
    );
    if (demoDenied) return demoDenied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(changeInstructorEmailBodySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid email address.",
          code: INSTRUCTOR_EMAIL_CHANGE_CODE.INVALID_EMAIL,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await changeInstructorEmail({
      organizationId: auth.organizationId,
      instructorId: (await context.params).id,
      newEmail: validation.data.newEmail,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Instructor not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    await writeInstructorEmailChangeAuditEvent({
      organizationId: auth.organizationId,
      actor: auth.actor,
      instructorId: (await context.params).id,
      linkedUserId: result.audit.linkedUserId,
      hasLinkedUser: result.audit.hasLinkedUser,
      emailChanged: result.audit.emailChanged,
      pendingInvitationBlocked: result.audit.pendingInvitationBlocked,
      userEmailUpdated: result.audit.userEmailUpdated,
      instructorEmailUpdated: result.audit.instructorEmailUpdated,
      invitationRevoked: result.audit.invitationRevoked,
      requestContext: extractAuditRequestContext(request),
    });

    return successResponse({ user: result.user });
  } catch (error) {
    console.error("Admin instructor change-email POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to change instructor email.",
        code: INSTRUCTOR_EMAIL_CHANGE_CODE.INSTRUCTOR_CHANGE_EMAIL_FAILED,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
