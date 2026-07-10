import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { parseAuditLogExportQueryFromSearchParams } from "@/lib/audit/audit-log-query-params";
import { exportTenantAuditLogs } from "@/lib/audit/audit-log-query-service";
import {
  defaultAuditLogExportFilename,
  serializeAuditLogExportRowsToCsv,
} from "@/lib/audit/audit-log-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs/export
 * Tenant-scoped privacy-minimal CSV export (SUPER_ADMIN).
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

    const parsed = parseAuditLogExportQueryFromSearchParams(
      new URL(request.url).searchParams,
    );
    if (!parsed.success) {
      return errorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
    }

    const exportedAt = new Date();
    const result = await exportTenantAuditLogs({
      organizationId,
      filters: parsed.data,
    });

    const csv = serializeAuditLogExportRowsToCsv(result.items);
    const filename = defaultAuditLogExportFilename(exportedAt);

    return new NextResponse(csv, {
      status: HTTP_STATUS.OK,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Audit-Log-Export-Count": String(result.exportedCount),
        "X-Audit-Log-Export-Truncated": result.truncated ? "true" : "false",
        "X-Audit-Log-Export-Max-Rows": String(result.maxRows),
      },
    });
  } catch (error) {
    console.error("Admin audit logs export GET error:", error);
    return errorResponse(
      "Failed to export audit logs",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
