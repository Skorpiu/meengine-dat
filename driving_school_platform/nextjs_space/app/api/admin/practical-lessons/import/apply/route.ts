import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeLessonImportApplyAuditEvent } from "@/lib/audit/lesson-audit";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { runPracticalLessonImportApply } from "@/lib/import-export/practical-lesson-import-apply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMPORT_FORMATS = ["csv", "json"] as const;
const IMPORT_APPLY_MODES = ["createOnly"] as const;

const practicalLessonImportApplyBodySchema = z
  .object({
    format: z.enum(IMPORT_FORMATS),
    content: z.string().optional(),
    rows: z.array(z.record(z.unknown())).optional(),
    mode: z.enum(IMPORT_APPLY_MODES).optional(),
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

async function requireSuperAdminTenant(request: NextRequest): Promise<
  | {
      ok: true;
      organizationId: string;
      actor: { userId: string; role: UserRole; email?: string | null };
    }
  | { ok: false; response: NextResponse }
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

  return {
    ok: true,
    organizationId: orgId,
    actor: {
      userId: session.user.id,
      role: session.user.role as UserRole,
      email: session.user.email,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const demoDecision = await decideDemoRouteMutation({
      organizationId: auth.organizationId,
      category: "lesson_management",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(
      practicalLessonImportApplyBodySchema,
      body,
    );
    if (!validation.success) {
      return validation.error;
    }

    const { format, content, rows } = validation.data;

    const result = await runPracticalLessonImportApply({
      organizationId: auth.organizationId,
      format,
      content,
      rows,
    });

    if (result.applied) {
      await writeLessonImportApplyAuditEvent({
        organizationId: auth.organizationId,
        actor: auth.actor,
        format,
        totalRows: result.report.totalRows,
        createdCount: result.createdCount,
        skippedCount: result.skippedCount,
        requestContext: extractAuditRequestContext(request),
      });
    }

    return successResponse(result, HTTP_STATUS.OK);
  } catch (error) {
    console.error("Admin practical lessons import apply POST error:", error);
    return errorResponse(
      "Failed to apply practical lesson import",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
