import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { attemptInvitationEmailDelivery } from "@/lib/invitations/invitation-email-delivery";
import { inviteExistingStudentRecord } from "@/lib/students/student-record-invite-service";
import { inviteStudentRecordBodySchema } from "@/lib/students/student-record-invite-validation";
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
  | { ok: true; organizationId: string; userId: string }
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

  return { ok: true, organizationId: orgId, userId: session.user.id };
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

    const validation = validateRequest(inviteStudentRecordBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const result = await inviteExistingStudentRecord({
      organizationId: auth.organizationId,
      createdByUserId: auth.userId,
      studentId: context.params.id,
      email: validation.data.email,
      baseUrl: new URL(request.url).origin,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    const emailDelivery = await attemptInvitationEmailDelivery({
      inviteLink: result.inviteLink,
      invitation: result.invitation,
      organizationName: result.organizationName,
    });

    return successResponse(
      {
        invitation: result.invitation,
        inviteLink: result.inviteLink,
        emailDelivery,
      },
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    console.error("Admin student invite POST error:", error);
    return errorResponse(
      "Failed to send student invitation",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
