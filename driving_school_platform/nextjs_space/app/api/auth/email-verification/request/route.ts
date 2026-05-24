import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/api-utils";
import {
  EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE,
  requestEmailVerification,
} from "@/lib/email-verification/email-verification-service";
import { getEmailVerificationRequestBaseUrl } from "@/lib/email-verification/request-base-url";
import { emailVerificationRequestBodySchema } from "@/lib/email-verification/email-verification-validation";

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

    const validation = validateRequest(
      emailVerificationRequestBodySchema,
      body,
    );
    if (!validation.success) {
      return validation.error;
    }

    const result = await requestEmailVerification({
      email: validation.data.email,
      baseUrl: getEmailVerificationRequestBaseUrl(request),
    });

    return NextResponse.json({
      success: true,
      message: result.message ?? EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE,
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE,
    });
  }
}
