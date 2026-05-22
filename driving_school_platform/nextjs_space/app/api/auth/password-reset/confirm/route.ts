import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/api-utils";
import { confirmPasswordReset } from "@/lib/password-reset/password-reset-service";
import { passwordResetConfirmBodySchema } from "@/lib/password-reset/password-reset-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateRequest(passwordResetConfirmBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const result = await confirmPasswordReset({
      token: validation.data.token,
      newPassword: validation.data.newPassword,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
