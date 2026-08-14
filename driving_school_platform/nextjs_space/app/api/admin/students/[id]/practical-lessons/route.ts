import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  successResponse,
  validateRequest,
} from "@/lib/api-utils";
import { HTTP_STATUS, LESSON_TYPES } from "@/lib/constants";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { decideDemoLessonCreate } from "@/lib/demo/demo-write-sandbox-route-guard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import {
  MANUAL_PRACTICAL_LESSON_CREATE_VIA,
  writeLessonCreateAuditEvent,
} from "@/lib/audit/lesson-audit";
import { findOperationalStudentInOrg } from "@/lib/students/student-lesson-resolve";
import {
  createManualPracticalLesson,
  listStudentPracticalLessons,
} from "@/lib/lessons/manual-practical-lesson-service";
import { createManualPracticalLessonBodySchema } from "@/lib/lessons/manual-practical-lesson-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireSuperAdminTenant(request: NextRequest): Promise<
  | {
      ok: true;
      organizationId: string;
      actor: { userId: string; role: UserRole; email?: string | null };
    }
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
    actor: {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
    },
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const student = await findOperationalStudentInOrg({
      organizationId: auth.organizationId,
      studentId: (await context.params).id,
    });
    if (!student) {
      return errorResponse("Student not found", HTTP_STATUS.NOT_FOUND);
    }

    const lessons = await listStudentPracticalLessons({
      organizationId: auth.organizationId,
      studentId: student.id,
    });

    return successResponse({ lessons });
  } catch (error) {
    console.error("Admin student practical lessons GET error:", error);
    return errorResponse(
      "Failed to fetch practical lesson history",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdminTenant(request);
    if (!auth.ok) return auth.response;

    const sandboxDecision = await decideDemoLessonCreate({
      organizationId: auth.organizationId,
      lessonType: LESSON_TYPES.DRIVING,
      pendingCreates: 1,
    });
    if (!sandboxDecision.allowed) {
      return NextResponse.json(
        { error: sandboxDecision.message, code: sandboxDecision.code },
        { status: sandboxDecision.status },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateRequest(
      createManualPracticalLessonBodySchema,
      body,
    );
    if (!validation.success) {
      return validation.error;
    }

    const result = await createManualPracticalLesson({
      organizationId: auth.organizationId,
      studentId: (await context.params).id,
      body: validation.data,
    });

    if (!result.ok) {
      if (result.code) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.status },
        );
      }
      return errorResponse(result.error, result.status);
    }

    const { auditSnapshot } = result;

    await writeLessonCreateAuditEvent({
      organizationId: auth.organizationId,
      actor: auth.actor,
      lesson: {
        id: auditSnapshot.id,
        lessonType: auditSnapshot.lessonType,
        studentId: auditSnapshot.studentId,
        instructorId: auditSnapshot.instructorId,
        vehicleId: auditSnapshot.vehicleId,
        lessonSource: auditSnapshot.lessonSource,
        practicalLessonNumber: auditSnapshot.practicalLessonNumber,
      },
      metadataExtras: {
        createdVia: MANUAL_PRACTICAL_LESSON_CREATE_VIA,
        lessonDate: auditSnapshot.lessonDate,
      },
      requestContext: extractAuditRequestContext(request),
    });

    return successResponse({ lesson: result.lesson }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error("Admin student practical lessons POST error:", error);
    return errorResponse(
      "Failed to create manual practical lesson",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}
