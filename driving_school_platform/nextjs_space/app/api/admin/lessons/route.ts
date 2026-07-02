/**
 * Admin Lessons API Route
 * Handles fetching and creating lessons for administrators
 * @module app/api/admin/lessons
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  errorResponse,
  verifyAuth,
  validateRequest,
  withErrorHandling,
  getQueryParam,
  getTimeRanges,
  calculateDuration,
} from "@/lib/api-utils";
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from "@/lib/constants";
import { lessonCreationSchema } from "@/lib/validation";
import { addDays } from "date-fns";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { decideDemoLessonCreate } from "@/lib/demo/demo-write-sandbox-route-guard";
import { validateLessonCalendarRange } from "@/lib/lessons/calendar-range";
import {
  getAdminCalendarLessons,
  getAdminDashboardLessons,
  type AdminDashboardView,
} from "@/lib/lessons/lesson-queries";
import {
  mapAdminDashboardLessonsResponse,
  mapLessonCalendarResponse,
} from "@/lib/lessons/lesson-mappers";
import { createAdminLesson } from "@/lib/lessons/lesson-create-service";
import { extractAuditRequestContext } from "@/lib/audit/audit-log-service";
import { writeLessonCreateAuditEvent } from "@/lib/audit/lesson-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET handler - Fetch lessons based on view type (DRIVING, CODE, EXAMS)
 * @param request - Next.js request object
 * @returns JSON response with recent and upcoming lessons/exams
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication - Admin only
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
  }

  const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
  if (!tenantGuard.allowed) {
    return errorResponse(tenantGuard.error, tenantGuard.status);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Calendar mode → used by ScheduleMap (day / week / month)
  if (from && to) {
    const range = validateLessonCalendarRange({ from, to });
    if (!range.ok) {
      return NextResponse.json(
        { error: range.message, code: range.code },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // lessonDate >= startOfDay(from) AND lessonDate < startOfDay(to) + 1 day
    const lessons = await getAdminCalendarLessons({
      organizationId: orgId,
      fromDate: range.from,
      toDateExclusive: addDays(range.to, 1),
    });

    return NextResponse.json(mapLessonCalendarResponse(lessons), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const view = getQueryParam(
    searchParams,
    "view",
    "DRIVING",
  ) as AdminDashboardView;
  const time = getTimeRanges();

  const dashboardLessons = await getAdminDashboardLessons({
    organizationId: orgId,
    view,
    time,
  });

  return successResponse(mapAdminDashboardLessonsResponse(dashboardLessons));
});

/**
 * POST handler - Create a new lesson
 * @param request - Next.js request object with lesson data
 * @returns JSON response with created lesson(s)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  const user = await verifyAuth([
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.INSTRUCTOR,
  ]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
  }

  const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
  if (!tenantGuard.allowed) {
    return errorResponse(tenantGuard.error, tenantGuard.status);
  }

  const body = await request.json();

  const rawLessonType =
    typeof body?.lessonType === "string" ? body.lessonType : "";
  let pendingCreates = 1;
  if (rawLessonType === "EXAM" || rawLessonType === "THEORY_EXAM") {
    const ids = body?.studentIds;
    pendingCreates = Array.isArray(ids) ? ids.length : 0;
  }

  const sandboxDecision = await decideDemoLessonCreate({
    organizationId: orgId,
    lessonType: rawLessonType,
    pendingCreates,
  });
  if (!sandboxDecision.allowed) {
    return NextResponse.json(
      { error: sandboxDecision.message, code: sandboxDecision.code },
      { status: sandboxDecision.status },
    );
  }

  const validation = validateRequest(lessonCreationSchema, body);

  if (!validation.success) {
    return validation.error;
  }

  const { instructorId: payloadInstructorId, ...validated } = validation.data;
  const instructorId =
    user.role === USER_ROLES.INSTRUCTOR ? user.id : payloadInstructorId;

  const { vehicleId, startTime, endTime } = validated;

  if (vehicleId) {
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: "Vehicles feature not enabled",
          message:
            "Vehicle Management feature is not enabled. Please upgrade to unlock this feature.",
          requiresUpgrade: true,
        },
        { status: 403 },
      );
    }
  }

  const durationMinutes = calculateDuration(startTime, endTime);

  const result = await createAdminLesson({
    organizationId: orgId,
    payload: { ...validated, instructorId },
    durationMinutes,
  });

  if (!result.ok) {
    return errorResponse(result.error, result.status);
  }

  const { data } = result;

  const auditActor = {
    userId: user.id,
    role: user.role,
    email: user.email,
  };
  const auditRequestContext = extractAuditRequestContext(request);

  const lessonsToAudit = data.kind === "exam" ? data.lessons : [data.lesson];

  for (const lesson of lessonsToAudit) {
    await writeLessonCreateAuditEvent({
      organizationId: orgId,
      actor: auditActor,
      lesson: {
        id: lesson.id,
        lessonType: lesson.lessonType,
        studentId: lesson.studentId,
        instructorId: lesson.instructorId,
        vehicleId: lesson.vehicleId,
        lessonSource: lesson.lessonSource,
        practicalLessonNumber: lesson.practicalLessonNumber,
      },
      requestContext: auditRequestContext,
    });
  }

  if (data.kind === "exam") {
    return successResponse(
      { message: data.message, lessons: data.lessons },
      HTTP_STATUS.CREATED,
    );
  }

  if (data.kind === "theory_group") {
    return successResponse(
      { message: data.message, lesson: data.lesson },
      HTTP_STATUS.CREATED,
    );
  }

  return successResponse(
    { message: data.message, lesson: data.lesson },
    HTTP_STATUS.CREATED,
  );
});
