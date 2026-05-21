import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revokeInvitation } from "@/lib/invitations/invitation-service";
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

    const result = await revokeInvitation({
      organizationId: orgId,
      invitationId,
      revokedByUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json({ invitation: result.invitation });
  } catch (error) {
    console.error("Admin invitation revoke error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
