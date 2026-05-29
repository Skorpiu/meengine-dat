import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { findExistingSchoolStudentIdsInOrg } from "@/lib/students/student-record-queries";
import {
  buildStudentImportDryRunReport,
  collectSchoolStudentIdsForDuplicateLookup,
  normalizeStudentImportRows,
  parseStudentImportCsv,
  parseStudentImportJson,
  validateStudentImportRows,
} from "@/lib/import-export/student-record-import-dry-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMPORT_FORMATS = ["csv", "json"] as const;

const studentImportDryRunBodySchema = z
  .object({
    format: z.enum(IMPORT_FORMATS),
    content: z.string().optional(),
    rows: z.array(z.record(z.unknown())).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.format === "csv") {
      if (!data.content?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "content_required_for_csv",
          path: ["content"],
        });
      }
      return;
    }
    const hasRows = Array.isArray(data.rows) && data.rows.length > 0;
    const hasContent = Boolean(data.content?.trim());
    if (!hasRows && !hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rows_or_content_required_for_json",
        path: ["rows"],
      });
    }
  });

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(studentImportDryRunBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const { format, content, rows } = validation.data;

    const parsed =
      format === "csv"
        ? parseStudentImportCsv(content ?? "")
        : parseStudentImportJson({ content, rows });

    if (!parsed.ok) {
      return successResponse(
        buildStudentImportDryRunReport([], parsed.fileErrors),
      );
    }

    const normalizedRows = normalizeStudentImportRows(parsed.rows);
    const idsToLookup =
      collectSchoolStudentIdsForDuplicateLookup(normalizedRows);
    const existingIds = await findExistingSchoolStudentIdsInOrg({
      organizationId: auth.organizationId,
      schoolStudentIds: idsToLookup,
    });
    const existingSet = new Set(existingIds);

    const validations = validateStudentImportRows({
      rows: normalizedRows,
      existingSchoolStudentIds: existingSet,
    });

    return successResponse(
      buildStudentImportDryRunReport(validations),
      HTTP_STATUS.OK,
    );
  } catch (error) {
    console.error("Admin students import dry-run POST error:", error);
    return errorResponse(
      "Failed to run student import dry-run",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
