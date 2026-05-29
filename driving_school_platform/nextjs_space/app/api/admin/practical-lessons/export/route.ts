import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import {
  buildPracticalLessonExportPayload,
  mapPracticalLessonToExportRow,
  serializePracticalLessonExportRowsToCsv,
} from "@/lib/import-export/practical-lesson-export";
import { listPracticalLessonsForExport } from "@/lib/lessons/practical-lesson-export-queries";
import type { LessonSource } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_FORMATS = ["csv", "json"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

const LESSON_SOURCES = ["SYSTEM", "MANUAL", "IMPORT"] as const;

function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

function isLessonSource(value: string): value is LessonSource {
  return (LESSON_SOURCES as readonly string[]).includes(value);
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

    const sourceParam = searchParams.get("source");
    const source =
      sourceParam && isLessonSource(sourceParam) ? sourceParam : undefined;
    if (sourceParam && !source) {
      return errorResponse("invalid_lesson_source", HTTP_STATUS.BAD_REQUEST);
    }

    const result = await listPracticalLessonsForExport({
      organizationId: auth.organizationId,
      studentId: searchParams.get("studentId") ?? undefined,
      schoolStudentId: searchParams.get("schoolStudentId") ?? undefined,
      source,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!result.ok) {
      if (result.error.code === "invalid_school_student_id") {
        return errorResponse(
          "invalid_school_student_id",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      return errorResponse("invalid_date_range", HTTP_STATUS.BAD_REQUEST);
    }

    const exportRows = result.rows.map(mapPracticalLessonToExportRow);
    const exportedAt = new Date();

    if (formatParam === "json") {
      return NextResponse.json(
        buildPracticalLessonExportPayload(exportRows, exportedAt),
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const csv = serializePracticalLessonExportRowsToCsv(exportRows);
    const filenameDate = exportedAt.toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: HTTP_STATUS.OK,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="practical-lessons-export-${filenameDate}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin practical lessons export GET error:", error);
    return errorResponse(
      "Failed to export practical lessons",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
