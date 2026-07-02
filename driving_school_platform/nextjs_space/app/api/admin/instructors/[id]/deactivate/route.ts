import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deactivateInstructorRecord } from "@/lib/instructors/instructor-record-deactivate";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeInstructorDeactivateAuditEvent } from "@/lib/audit/people-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function requireSuperAdminTenant(request: NextRequest): Promise<
  | {
      ok: true;
      organizationId: string;
      currentUserId: string;
      actorRole: "SUPER_ADMIN";
      actorEmail: string | null | undefined;
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
    currentUserId: session.user.id,
    actorRole: session.user.role,
    actorEmail: session.user.email,
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

    const result = await deactivateInstructorRecord({
      organizationId: auth.organizationId,
      instructorId: context.params.id,
      currentUserId: auth.currentUserId,
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

    await writeInstructorDeactivateAuditEvent({
      organizationId: auth.organizationId,
      actor: {
        userId: auth.currentUserId,
        role: auth.actorRole,
        email: auth.actorEmail,
      },
      instructorId: context.params.id,
      alreadyInactive: result.alreadyInactive,
      warningCodes: result.warningCodes,
      futureLessonsCount: result.futureLessonsCount,
      requestContext: extractAuditRequestContext(request),
    });

    return successResponse({
      deactivated: true,
      alreadyInactive: result.alreadyInactive,
      warningCodes: result.warningCodes,
      futureLessonsCount: result.futureLessonsCount,
    });
  } catch (error) {
    console.error("Admin instructor deactivate error:", error);
    return errorResponse(
      "Failed to deactivate instructor",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
