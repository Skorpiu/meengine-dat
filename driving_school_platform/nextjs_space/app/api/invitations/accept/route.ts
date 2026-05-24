import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/api-utils";
import {
  acceptInvitation,
  getInvitationByToken,
} from "@/lib/invitations/invitation-accept-service";
import { acceptInvitationBodySchema } from "@/lib/invitations/invitation-accept-validation";
import { enforceInvitationAcceptRateLimits } from "@/lib/rate-limit/enforce-auth-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        {
          error: "Invitation token is required",
          code: "missing_invitation_token",
        },
        { status: 400 },
      );
    }

    const rateLimitResponse = await enforceInvitationAcceptRateLimits(
      request,
      token,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const result = await getInvitationByToken({ token });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json({ invitation: result.invitation });
  } catch (error) {
    console.error("Invitation accept GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateRequest(acceptInvitationBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const { token, firstName, lastName, password } = validation.data;

    const rateLimitResponse = await enforceInvitationAcceptRateLimits(
      request,
      token,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const result = await acceptInvitation({
      token,
      firstName,
      lastName,
      password,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: result.user,
        organizationId: result.organizationId,
        organizationName: result.organizationName,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Invitation accept POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
