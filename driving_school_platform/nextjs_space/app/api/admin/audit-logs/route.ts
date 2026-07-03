import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { parseAuditLogListQueryFromSearchParams } from "@/lib/audit/audit-log-query-params";
import { listTenantAuditLogs } from "@/lib/audit/audit-log-query-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs
 * Tenant-scoped read-only audit log list (SUPER_ADMIN).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(
      request,
      organizationId,
    );
    if (!tenantGuard.allowed) {
      return errorResponse(
        tenantGuard.error ?? "Forbidden",
        tenantGuard.status,
      );
    }

    const parsed = parseAuditLogListQueryFromSearchParams(
      new URL(request.url).searchParams,
    );
    if (!parsed.success) {
      return errorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
    }

    const result = await listTenantAuditLogs({
      organizationId,
      query: parsed.data,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Admin audit logs GET error:", error);
    return errorResponse(
      "Failed to fetch audit logs",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
