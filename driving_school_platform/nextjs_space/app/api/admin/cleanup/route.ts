/**
 * Admin Cleanup API Route
 * Handles cleanup of old lessons/exams
 * @module app/api/admin/cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { cleanupOldLessons } from "@/lib/cleanup";
import {
  successResponse,
  errorResponse,
  verifyAuth,
  withErrorHandling,
} from "@/lib/api-utils";
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from "@/lib/constants";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";

type UserWithOrganizationId = {
  organizationId?: string | null;
};

/**
 * POST handler - Trigger cleanup of old lessons/exams
 * @param request - Next.js request object
 * @returns JSON response with cleanup result
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  const user = await verifyAuth(USER_ROLES.SUPER_ADMIN);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const orgId = (user as UserWithOrganizationId).organizationId;
  if (!orgId) {
    return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
  }

  const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
  if (!tenantGuard.allowed) {
    return errorResponse(tenantGuard.error, tenantGuard.status);
  }

  const demoDecision = await decideDemoRouteMutation({
    organizationId: orgId,
    category: "cleanup",
  });
  if (!demoDecision.allowed) {
    return NextResponse.json(
      { error: demoDecision.message, code: demoDecision.reason },
      { status: demoDecision.status },
    );
  }

  const result = await cleanupOldLessons(orgId);

  return successResponse(
    {
      message: `Successfully cleaned up ${result.count} old lessons/exams`,
      count: result.count,
    },
    HTTP_STATUS.OK,
  );
});
