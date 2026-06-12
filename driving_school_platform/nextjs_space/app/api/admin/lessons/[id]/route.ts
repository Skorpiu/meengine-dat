/**
 * Lesson Management API Routes
 * Handles individual lesson operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  verifyAuth,
  withErrorHandling,
} from "@/lib/api-utils";
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from "@/lib/constants";
import type { UpdateAdminLessonPayload } from "@/lib/lessons/lesson-update-delete-service";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { assertInstructorCanMutateLesson } from "@/lib/lessons/lesson-access";
import {
  deleteAdminLesson,
  updateAdminLesson,
} from "@/lib/lessons/lesson-update-delete-service";
import { LESSON_DETAIL_SELECT } from "@/lib/lessons/lesson-queries";

type OrgScopedUser = {
  id: string;
  role?: string | null;
  organizationId?: string | null;
};

function instructorForbiddenResponse(
  user: OrgScopedUser,
  lesson: { instructor?: { userId?: string | null } | null },
) {
  const access = assertInstructorCanMutateLesson(user, lesson);
  if (!access.allowed) {
    return errorResponse(access.error, access.status);
  }
  return null;
}

/**
 * GET handler - Fetch a single lesson by ID
 */
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const user = await verifyAuth([
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.INSTRUCTOR,
    ]);
    if (!user) {
      return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const orgId = (user as OrgScopedUser).organizationId;
    if (!orgId) {
      return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
    if (!tenantGuard.allowed) {
      return errorResponse(tenantGuard.error, tenantGuard.status);
    }

    const { id } = params;

    const lesson = await prisma.lesson.findFirst({
      where: { id, organizationId: orgId },
      select: LESSON_DETAIL_SELECT,
    });

    if (!lesson) {
      return errorResponse("Lesson not found", HTTP_STATUS.NOT_FOUND);
    }

    const forbidden = instructorForbiddenResponse(user, lesson);
    if (forbidden) return forbidden;

    return successResponse(lesson);
  },
);

/**
 * PUT handler - Update a lesson
 */
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const user = await verifyAuth([
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.INSTRUCTOR,
    ]);
    if (!user) {
      return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const orgId = (user as OrgScopedUser).organizationId;
    if (!orgId) {
      return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
    if (!tenantGuard.allowed) {
      return errorResponse(tenantGuard.error, tenantGuard.status);
    }

    const demoDecision = await decideDemoRouteMutation({
      organizationId: orgId,
      category: "lesson_management",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    const body = await request.json();
    const {
      lessonDate,
      startTime,
      endTime,
      status,
      vehicleId,
      instructorId: bodyInstructorId,
      studentId,
    } = body;

    if (
      user.role === USER_ROLES.INSTRUCTOR &&
      bodyInstructorId &&
      bodyInstructorId !== user.id
    ) {
      return errorResponse("Forbidden", HTTP_STATUS.FORBIDDEN);
    }

    const updatePayload: UpdateAdminLessonPayload = {
      lessonDate,
      startTime,
      endTime,
      status,
      vehicleId,
      studentId,
    };

    if (bodyInstructorId) {
      updatePayload.instructorId = bodyInstructorId;
    }

    if (vehicleId) {
      const featureCheck = await checkFeatureAccess(
        "VEHICLE_MANAGEMENT",
        request,
      );
      if (!featureCheck.allowed) {
        return errorResponse(
          "Vehicles feature not enabled",
          HTTP_STATUS.FORBIDDEN,
        );
      }
    }

    const result = await updateAdminLesson({
      organizationId: orgId,
      lessonId: params.id,
      actor: { id: user.id, role: user.role },
      payload: updatePayload,
    });

    if (!result.ok) {
      return errorResponse(result.error, result.status);
    }

    return successResponse({
      message: "Lesson updated successfully",
      lesson: result.lesson,
    });
  },
);

/**
 * DELETE handler - Delete a lesson
 */
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const user = await verifyAuth([
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.INSTRUCTOR,
    ]);
    if (!user) {
      return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    const orgId = (user as OrgScopedUser).organizationId;
    if (!orgId) {
      return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
    if (!tenantGuard.allowed) {
      return errorResponse(tenantGuard.error, tenantGuard.status);
    }

    const demoDecision = await decideDemoRouteMutation({
      organizationId: orgId,
      category: "lesson_management",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    const result = await deleteAdminLesson({
      organizationId: orgId,
      lessonId: params.id,
      actor: { id: user.id, role: user.role },
    });

    if (!result.ok) {
      return errorResponse(result.error, result.status);
    }

    return successResponse({
      message: "Lesson deleted successfully",
    });
  },
);
