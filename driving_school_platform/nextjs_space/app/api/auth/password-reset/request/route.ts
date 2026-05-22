import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/api-utils";
import {
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  requestPasswordReset,
} from "@/lib/password-reset/password-reset-service";
import { getPasswordResetRequestBaseUrl } from "@/lib/password-reset/request-base-url";
import { passwordResetRequestBodySchema } from "@/lib/password-reset/password-reset-validation";

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

    const validation = validateRequest(passwordResetRequestBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const result = await requestPasswordReset({
      email: validation.data.email,
      baseUrl: getPasswordResetRequestBaseUrl(request),
    });

    return NextResponse.json({
      success: true,
      message: result.message ?? PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    });
  }
}
