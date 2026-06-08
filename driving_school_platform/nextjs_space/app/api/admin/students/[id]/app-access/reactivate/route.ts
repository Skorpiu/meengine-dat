import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { reactivateStudentAppAccess } from "@/lib/students/student-app-access-lifecycle-service";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function requireSuperAdminTenant(
  request: NextRequest,
): Promise<
  { ok: true; organizationId: string } | { ok: false; response: NextResponse }
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

  return { ok: true, organizationId: orgId };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const demoDenied = await rejectDemoUserManagementMutation(
      auth.organizationId,
    );
    if (demoDenied) return demoDenied;

    // v1: optional body reserved for future category/transmission updates; ignore safely.
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        await request.json();
      }
    } catch {
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const result = await reactivateStudentAppAccess({
      organizationId: auth.organizationId,
      studentId: context.params.id,
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

    return successResponse({ student: result.student });
  } catch (error) {
    console.error("Admin student app-access reactivate POST error:", error);
    return errorResponse(
      "Failed to reactivate app access",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
