import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteInstructorRecordIfEligible } from "@/lib/instructors/instructor-record-delete";
import { normalizeInstructorQualifiedCategoryNames } from "@/lib/instructors/instructor-qualified-categories";
import { updateInstructorQualifiedCategories } from "@/lib/instructors/instructor-record-qualified-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function requireSuperAdminTenant(
  request: NextRequest,
): Promise<
  | { ok: true; organizationId: string; currentUserId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
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
    currentUserId: session.user.id,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const demoDenied = await rejectDemoUserManagementMutation(
      auth.organizationId,
    );
    if (demoDenied) return demoDenied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("invalid_request_body", HTTP_STATUS.BAD_REQUEST);
    }

    const qualifiedCategoryNames = normalizeInstructorQualifiedCategoryNames(
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as { qualifiedCategoryNames?: unknown }).qualifiedCategoryNames
        : undefined,
    );

    if (qualifiedCategoryNames === null) {
      return errorResponse("invalid_request_body", HTTP_STATUS.BAD_REQUEST);
    }

    const result = await updateInstructorQualifiedCategories({
      organizationId: auth.organizationId,
      instructorId: context.params.id,
      qualifiedCategoryNames,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Instructor not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        {
          error: result.error,
          code: result.error,
          categoryName: result.categoryName,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    return successResponse({ instructor: result.instructor });
  } catch (error) {
    console.error("Admin instructor PATCH error:", error);
    return errorResponse(
      "Failed to update instructor qualified categories",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const demoDenied = await rejectDemoUserManagementMutation(
      auth.organizationId,
    );
    if (demoDenied) return demoDenied;

    const result = await deleteInstructorRecordIfEligible({
      organizationId: auth.organizationId,
      instructorId: context.params.id,
      currentUserId: auth.currentUserId,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Instructor not found", HTTP_STATUS.NOT_FOUND);
      }
      return NextResponse.json(
        {
          error: result.code,
          code: result.code,
          codes: result.codes,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Admin instructor DELETE error:", error);
    return errorResponse(
      "Failed to delete instructor",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
