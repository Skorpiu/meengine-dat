import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateRequest } from "@/lib/api-utils";
import {
  changeInvitationEmail,
  INVITATION_EMAIL_UPDATE_CODE,
} from "@/lib/invitations/invitation-email-update-service";
import { changeInvitationEmailBodySchema } from "@/lib/invitations/invitation-email-update-validation";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId || !session.user.id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantDenied = await assertUserTenantHost(request, orgId);
    if (tenantDenied) {
      return tenantDenied;
    }

    const demoDenied = await rejectDemoUserManagementMutation(orgId);
    if (demoDenied) {
      return demoDenied;
    }

    const invitationId = context.params.id?.trim();
    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation id is required" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateRequest(changeInvitationEmailBodySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid email address.",
          code: INVITATION_EMAIL_UPDATE_CODE.INVALID_EMAIL,
        },
        { status: 400 },
      );
    }

    const result = await changeInvitationEmail({
      organizationId: orgId,
      invitationId,
      newEmail: validation.data.newEmail,
      baseUrl: new URL(request.url).origin,
    });

    if (!result.ok) {
      if (result.notFound) {
        return NextResponse.json(
          {
            error: "Invitation not found",
            code: INVITATION_EMAIL_UPDATE_CODE.INVITATION_NOT_FOUND,
          },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json({
      invitation: result.invitation,
      inviteLink: result.inviteLink,
    });
  } catch (error) {
    console.error("Admin invitation change-email error:", error);
    return NextResponse.json(
      {
        error: "Failed to update invitation email.",
        code: INVITATION_EMAIL_UPDATE_CODE.INVITATION_EMAIL_UPDATE_FAILED,
      },
      { status: 500 },
    );
  }
}
