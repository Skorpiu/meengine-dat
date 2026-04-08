/**
 * Lesson Management API Routes
 * Handles individual lesson operations (GET, PUT, DELETE)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  verifyAuth,
  withErrorHandling,
} from "@/lib/api-utils";
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from "@/lib/constants";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";

type RoleUser = {
  role?: string | null;
};

type OrgScopedUser = RoleUser & {
  id: string;
  organizationId?: string | null;
};

type LessonWithInstructorUserId = {
  instructor?: { userId?: string | null } | null;
};

type LessonWithEndTime = {
  lessonDate?: string | Date | null;
  endTime?: string | null;
};

function isInstructor(user: RoleUser) {
  return user?.role === USER_ROLES.INSTRUCTOR;
}

function assertInstructorOwnsLesson(
  user: OrgScopedUser,
  lesson: LessonWithInstructorUserId,
) {
  if (!isInstructor(user)) return null;
  if (!lesson?.instructor?.userId)
    return errorResponse("Forbidden", HTTP_STATUS.FORBIDDEN);
  if (lesson.instructor.userId !== user.id)
    return errorResponse("Forbidden", HTTP_STATUS.FORBIDDEN);
  return null;
}

function isPastLesson(lesson: LessonWithEndTime) {
  if (!lesson?.lessonDate || !lesson?.endTime) return false;

  const d = new Date(lesson.lessonDate);
  const [h, m] = String(lesson.endTime).split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);

  return d.getTime() < Date.now();
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

    const orgId = (user as OrgScopedUser).organizationId as
      | string
      | null
      | undefined;
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
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } }, // includes instructor.userId too
        vehicle: true,
        category: true,
      },
    });

    if (!lesson) {
      return errorResponse("Lesson not found", HTTP_STATUS.NOT_FOUND);
    }

    const forbidden = assertInstructorOwnsLesson(user, lesson);
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

    const orgId = (user as OrgScopedUser).organizationId as
      | string
      | null
      | undefined;
    if (!orgId) {
      return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
    if (!tenantGuard.allowed) {
      return errorResponse(tenantGuard.error, tenantGuard.status);
    }

    const { id } = params;

    // Permission check (must exist + ownership if instructor)
    const existingLesson = await prisma.lesson.findFirst({
      where: { id, organizationId: orgId },
      include: { instructor: true },
    });

    if (!existingLesson) {
      return errorResponse("Lesson not found", HTTP_STATUS.NOT_FOUND);
    }

    const forbidden = assertInstructorOwnsLesson(user, existingLesson);
    if (forbidden) return forbidden;

    if (isPastLesson(existingLesson)) {
      return errorResponse(
        "Cannot modify a lesson that already ended",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const body = await request.json();
    const { lessonDate, startTime, endTime, status, vehicleId } = body;

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

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, organizationId: orgId },
        select: { id: true },
      });

      if (!vehicle) {
        return errorResponse("Vehicle not found", HTTP_STATUS.NOT_FOUND);
      }
    }

    // Calculate duration if times are provided
    let durationMinutes: number | undefined;
    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const startInMinutes = startHour * 60 + startMin;
      const endInMinutes = endHour * 60 + endMin;
      durationMinutes = endInMinutes - startInMinutes;

      if (durationMinutes <= 0) {
        return errorResponse(
          "End time must be after start time",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(lessonDate && { lessonDate: new Date(lessonDate) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(durationMinutes && { durationMinutes }),
        ...(status && { status }),
        ...(vehicleId !== undefined && { vehicleId: vehicleId || null }),
      },
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } },
        vehicle: true,
        category: true,
      },
    });

    return successResponse({
      message: "Lesson updated successfully",
      lesson,
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

    const orgId = (user as OrgScopedUser).organizationId as
      | string
      | null
      | undefined;
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
      include: { instructor: true },
    });

    if (!lesson) {
      return errorResponse("Lesson not found", HTTP_STATUS.NOT_FOUND);
    }

    const forbidden = assertInstructorOwnsLesson(user, lesson);
    if (forbidden) return forbidden;

    if (isPastLesson(lesson)) {
      return errorResponse(
        "Cannot delete a lesson that already ended",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await prisma.lesson.deleteMany({ where: { id, organizationId: orgId } });

    return successResponse({
      message: "Lesson deleted successfully",
    });
  },
);
