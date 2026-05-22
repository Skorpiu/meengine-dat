import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateRequest } from "@/lib/api-utils";
import { attemptInvitationEmailDelivery } from "@/lib/invitations/invitation-email-delivery";
import {
  createInvitation,
  listInvitations,
} from "@/lib/invitations/invitation-service";
import { createInvitationBodySchema } from "@/lib/invitations/invitation-validation";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { invitations } = await listInvitations({ organizationId: orgId });
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Admin invitations GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateRequest(createInvitationBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const result = await createInvitation({
      organizationId: orgId,
      createdByUserId: session.user.id,
      email: validation.data.email,
      role: validation.data.role,
      baseUrl: new URL(request.url).origin,
      expiresInDays: validation.data.expiresInDays,
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

    return NextResponse.json(
      {
        invitation: result.invitation,
        inviteLink: result.inviteLink,
        emailDelivery,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin invitations POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
