import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hashInvitationToken } from "@/lib/invitations/invitation-token-service";

import {
  EMAIL_VERIFICATION_REQUEST_EMAIL_POLICY,
  EMAIL_VERIFICATION_REQUEST_IP_POLICY,
  INVITATION_ACCEPT_IP_POLICY,
  INVITATION_ACCEPT_TOKEN_POLICY,
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  PASSWORD_RESET_REQUEST_EMAIL_POLICY,
  PASSWORD_RESET_REQUEST_IP_POLICY,
  SIGNUP_IP_POLICY,
} from "./auth-rate-limit-policy";
import { getClientIpFromRequest } from "./client-ip";
import { checkRateLimits } from "./check-rate-limit";
import { normalizeEmailForRateLimit } from "./normalize-email";
import { rateLimitedResponse } from "./rate-limited-response";

async function enforceFromChecks(
  checks: Parameters<typeof checkRateLimits>[0],
): Promise<NextResponse | null> {
  const blocked = await checkRateLimits(checks);
  if (!blocked) {
    return null;
  }
  return rateLimitedResponse(blocked.retryAfterSeconds);
}

export async function enforceLoginRateLimits(
  request: NextRequest,
  email: string,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(request);
  const normalizedEmail = normalizeEmailForRateLimit(email);

  return enforceFromChecks([
    {
      ...LOGIN_IP_POLICY,
      keyParts: ["ip", ip],
    },
    {
      ...LOGIN_EMAIL_POLICY,
      keyParts: ["email", normalizedEmail],
    },
  ]);
}

export async function enforcePasswordResetRequestRateLimits(
  request: NextRequest,
  email: string,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(request);
  const normalizedEmail = normalizeEmailForRateLimit(email);

  return enforceFromChecks([
    {
      ...PASSWORD_RESET_REQUEST_IP_POLICY,
      keyParts: ["ip", ip],
    },
    {
      ...PASSWORD_RESET_REQUEST_EMAIL_POLICY,
      keyParts: ["email", normalizedEmail],
    },
  ]);
}

export async function enforceEmailVerificationRequestRateLimits(
  request: NextRequest,
  email: string,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(request);
  const normalizedEmail = normalizeEmailForRateLimit(email);

  return enforceFromChecks([
    {
      ...EMAIL_VERIFICATION_REQUEST_IP_POLICY,
      keyParts: ["ip", ip],
    },
    {
      ...EMAIL_VERIFICATION_REQUEST_EMAIL_POLICY,
      keyParts: ["email", normalizedEmail],
    },
  ]);
}

export async function enforceInvitationAcceptRateLimits(
  request: NextRequest,
  token: string,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(request);
  const tokenHash = hashInvitationToken(token);

  return enforceFromChecks([
    {
      ...INVITATION_ACCEPT_IP_POLICY,
      keyParts: ["ip", ip],
    },
    {
      ...INVITATION_ACCEPT_TOKEN_POLICY,
      keyParts: ["token", tokenHash],
    },
  ]);
}

export async function enforceSignupRateLimits(
  request: NextRequest,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest(request);

  return enforceFromChecks([
    {
      ...SIGNUP_IP_POLICY,
      keyParts: ["ip", ip],
    },
  ]);
}
