import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { listStudentRecordsForExport } from "@/lib/students/student-record-queries";
import { isStudentAppAccessModeParam } from "@/lib/students/student-record-validation";
import {
  buildStudentExportPayload,
  mapStudentToExportRow,
  serializeStudentExportRowsToCsv,
} from "@/lib/import-export/student-record-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_FORMATS = ["csv", "json"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

async function requireSuperAdminTenant(
  request: NextRequest,
): Promise<
  { ok: true; organizationId: string } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      ok: false,
      response: errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
    };
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return {
      ok: false,
      response: errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
    };
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return {
      ok: false,
      response: errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST),
    };
  }

  const tenantDenied = await assertUserTenantHost(request, orgId);
  if (tenantDenied) {
    return { ok: false, response: tenantDenied };
  }

  return { ok: true, organizationId: orgId };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format") ?? "csv";
    if (!isExportFormat(formatParam)) {
      return errorResponse("invalid_export_format", HTTP_STATUS.BAD_REQUEST);
    }

    const search = searchParams.get("search") ?? undefined;
    const appAccessModeParam = searchParams.get("appAccessMode");
    const appAccessMode =
      appAccessModeParam && isStudentAppAccessModeParam(appAccessModeParam)
        ? appAccessModeParam
        : undefined;

    if (appAccessModeParam && !appAccessMode) {
      return errorResponse("invalid_app_access_mode", HTTP_STATUS.BAD_REQUEST);
    }

    const rows = await listStudentRecordsForExport({
      organizationId: auth.organizationId,
      search,
      appAccessMode,
    });

    const exportRows = rows.map(mapStudentToExportRow);
    const exportedAt = new Date();

    if (formatParam === "json") {
      return NextResponse.json(
        buildStudentExportPayload(exportRows, exportedAt),
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const csv = serializeStudentExportRowsToCsv(exportRows);
    const filenameDate = exportedAt.toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: HTTP_STATUS.OK,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-export-${filenameDate}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin students export GET error:", error);
    return errorResponse(
      "Failed to export students",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
