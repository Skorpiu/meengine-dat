import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  changeStudentEmail,
  STUDENT_EMAIL_CHANGE_CODE,
} from "@/lib/students/student-email-change-service";
import { changeStudentEmailBodySchema } from "@/lib/students/student-email-change-validation";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeStudentEmailChangeAuditEvent } from "@/lib/audit/student-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

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

    const validation = validateRequest(changeStudentEmailBodySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid email address.",
          code: STUDENT_EMAIL_CHANGE_CODE.INVALID_EMAIL,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await changeStudentEmail({
      organizationId: auth.organizationId,
      studentId: context.params.id,
      newEmail: validation.data.newEmail,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    await writeStudentEmailChangeAuditEvent({
      organizationId: auth.organizationId,
      actor: auth.actor,
      studentId: context.params.id,
      policyMode: result.audit.policyMode,
      hasLinkedUser: result.audit.hasLinkedUser,
      invitationRevoked: result.audit.invitationRevoked,
      linkedUserId: result.student.userId,
      requestContext: extractAuditRequestContext(request),
    });

    return successResponse({ student: result.student });
  } catch (error) {
    console.error("Admin student change-email POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to change student email.",
        code: STUDENT_EMAIL_CHANGE_CODE.STUDENT_CHANGE_EMAIL_FAILED,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
