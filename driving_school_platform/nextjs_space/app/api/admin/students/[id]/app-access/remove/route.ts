import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { removeStudentAppAccess } from "@/lib/students/student-app-access-lifecycle-service";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeStudentAppAccessRemoveAuditEvent } from "@/lib/audit/student-audit";

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

    const result = await removeStudentAppAccess({
      organizationId: auth.organizationId,
      studentId: context.params.id,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    await writeStudentAppAccessRemoveAuditEvent({
      organizationId: auth.organizationId,
      actor: auth.actor,
      studentId: context.params.id,
      appAccessMode: result.student.appAccessMode,
      requestContext: extractAuditRequestContext(request),
    });

    return successResponse({ student: result.student });
  } catch (error) {
    console.error("Admin student app-access remove POST error:", error);
    return errorResponse(
      "Failed to remove app access",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
