import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reactivateInstructorRecord } from "@/lib/instructors/instructor-record-reactivate";

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

  return {
    ok: true,
    organizationId: orgId,
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

    const result = await reactivateInstructorRecord({
      organizationId: auth.organizationId,
      instructorId: context.params.id,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Instructor not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        {
          error: result.code,
          code: result.code,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    return successResponse({
      reactivated: true,
      alreadyActive: result.alreadyActive,
    });
  } catch (error) {
    console.error("Admin instructor reactivate error:", error);
    return errorResponse(
      "Failed to reactivate instructor",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
