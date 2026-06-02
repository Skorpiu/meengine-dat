import { NextRequest, NextResponse } from "next/server";
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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteStudentRecordIfEligible } from "@/lib/students/student-record-delete";
import {
  findStudentBySchoolIdInOrg,
  findStudentRecordById,
  isStudentSchoolIdConflict,
  updateStudentRecord,
} from "@/lib/students/student-record-queries";
import {
  normalizeStudentRecordEmail,
  normalizeStudentRecordPhone,
  parseEnrollmentDateForPatch,
  patchStudentRecordBodySchema,
  resolveSchoolStudentIdFromParts,
} from "@/lib/students/student-record-validation";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function requireSuperAdminTenant(
  request: NextRequest,
): Promise<
  { ok: true; organizationId: string } | { ok: false; response: NextResponse }
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

  return { ok: true, organizationId: orgId };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const student = await findStudentRecordById({
      organizationId: auth.organizationId,
      studentId: context.params.id,
    });

    if (!student) {
      return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
    }

    return successResponse({ student });
  } catch (error) {
    console.error("Admin student GET error:", error);
    return errorResponse(
      "Failed to fetch student",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
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
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(patchStudentRecordBodySchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const data = validation.data;
    const updateData: Prisma.StudentUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }
    if (data.phoneNumber !== undefined) {
      updateData.phoneNumber = normalizeStudentRecordPhone(data.phoneNumber);
    }
    if (data.email !== undefined) {
      const email = normalizeStudentRecordEmail(data.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("invalid_email", HTTP_STATUS.BAD_REQUEST);
      }
      updateData.email = email;
    }
    if (data.enrollmentDate !== undefined) {
      const enrollment = parseEnrollmentDateForPatch(data.enrollmentDate);
      if (!enrollment.ok) {
        return NextResponse.json(
          { error: enrollment.error, code: enrollment.error },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }
      if (enrollment.value !== undefined) {
        updateData.enrollmentDate = enrollment.value;
      }
    }

    if (data.yearSuffix !== undefined && data.sequenceNumber !== undefined) {
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

      const duplicate = await findStudentBySchoolIdInOrg({
        organizationId: auth.organizationId,
        schoolStudentId: schoolId.parts.schoolStudentId,
        excludeStudentId: context.params.id,
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

      updateData.schoolStudentId = schoolId.parts.schoolStudentId;
      updateData.schoolStudentYearSuffix = schoolId.parts.yearSuffix;
      updateData.schoolStudentSequence = schoolId.parts.sequenceNumber;
      updateData.schoolStudentIdSource = "MANUAL";
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const student = await updateStudentRecord({
        organizationId: auth.organizationId,
        studentId: context.params.id,
        data: updateData,
      });

      if (!student) {
        return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
      }

      return successResponse({ student });
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
    console.error("Admin student PATCH error:", error);
    return errorResponse(
      "Failed to update student",
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

    const result = await deleteStudentRecordIfEligible({
      organizationId: auth.organizationId,
      studentId: context.params.id,
    });

    if (!result.ok) {
      if (result.notFound) {
        return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
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
    console.error("Admin student DELETE error:", error);
    return errorResponse(
      "Failed to delete student",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
