import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import {
  createManualStudentRecord,
  findStudentBySchoolIdInOrg,
  isStudentSchoolIdConflict,
  listStudentRecords,
} from "@/lib/students/student-record-queries";
import {
  createManualStudentBodySchema,
  isStudentAppAccessModeParam,
  normalizeStudentRecordEmail,
  normalizeStudentRecordPhone,
  parseOptionalEnrollmentDate,
  resolveSchoolStudentIdFromParts,
} from "@/lib/students/student-record-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireStudentRecordsAccess(
  request: NextRequest,
  options: { write: boolean },
): Promise<
  | { ok: true; organizationId: string; role: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      ok: false,
      response: errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
    };
  }

  const role = session.user.role;
  const allowedRead =
    role === "SUPER_ADMIN" || (!options.write && role === "INSTRUCTOR");
  const allowedWrite = role === "SUPER_ADMIN";

  if (options.write ? !allowedWrite : !allowedRead) {
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

  return { ok: true, organizationId: orgId, role };
}

async function requireSuperAdminTenant(
  request: NextRequest,
): Promise<
  { ok: true; organizationId: string } | { ok: false; response: NextResponse }
> {
  return requireStudentRecordsAccess(request, { write: true });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentRecordsAccess(request, { write: false });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const appAccessModeParam = searchParams.get("appAccessMode");
    const appAccessMode =
      appAccessModeParam && isStudentAppAccessModeParam(appAccessModeParam)
        ? appAccessModeParam
        : undefined;

    if (appAccessModeParam && !appAccessMode) {
      return errorResponse("invalid_app_access_mode", HTTP_STATUS.BAD_REQUEST);
    }

    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const cursor = searchParams.get("cursor") ?? undefined;

    const result = await listStudentRecords({
      organizationId: auth.organizationId,
      search,
      appAccessMode,
      limit,
      cursor,
      variant: auth.role === "INSTRUCTOR" ? "lesson" : "admin",
    });

    return successResponse({
      students: result.students,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error("Admin students GET error:", error);
    return errorResponse(
      "Failed to fetch students",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}

export async function POST(request: NextRequest) {
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
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(createManualStudentBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const data = validation.data;
    const emailRaw = data.email?.trim();
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json(
        { error: "invalid_email", code: "invalid_email" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    const email = normalizeStudentRecordEmail(data.email);

    const schoolId = resolveSchoolStudentIdFromParts(
      data.yearSuffix,
      data.sequenceNumber,
    );
    if (!schoolId.ok) {
      return NextResponse.json(
        { error: schoolId.error, code: schoolId.error },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const enrollment = parseOptionalEnrollmentDate(data.enrollmentDate);
    if (!enrollment.ok) {
      return NextResponse.json(
        { error: enrollment.error, code: enrollment.error },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const duplicate = await findStudentBySchoolIdInOrg({
      organizationId: auth.organizationId,
      schoolStudentId: schoolId.parts.schoolStudentId,
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: "school_student_id_already_exists",
          code: "school_student_id_already_exists",
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    try {
      const student = await createManualStudentRecord({
        organizationId: auth.organizationId,
        firstName: data.firstName,
        lastName: data.lastName?.trim() || null,
        email,
        phoneNumber: normalizeStudentRecordPhone(data.phoneNumber),
        schoolStudentId: schoolId.parts.schoolStudentId,
        schoolStudentYearSuffix: schoolId.parts.yearSuffix,
        schoolStudentSequence: schoolId.parts.sequenceNumber,
        enrollmentDate: enrollment.value,
      });

      return successResponse({ student }, HTTP_STATUS.CREATED);
    } catch (error) {
      if (isStudentSchoolIdConflict(error)) {
        return NextResponse.json(
          {
            error: "school_student_id_already_exists",
            code: "school_student_id_already_exists",
          },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Admin students POST error:", error);
    return errorResponse(
      "Failed to create student",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
