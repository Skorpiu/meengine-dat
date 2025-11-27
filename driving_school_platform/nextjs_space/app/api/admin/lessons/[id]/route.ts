/**
 * Lesson Management API Routes
 * Handles individual lesson operations (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  verifyAuth,
  withErrorHandling,
} from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';

function isInstructor(user: any) {
  return user?.role === USER_ROLES.INSTRUCTOR;
}

function assertInstructorOwnsLesson(user: any, lesson: any) {
  if (!isInstructor(user)) return null;
  if (!lesson?.instructor?.userId) return errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
  if (lesson.instructor.userId !== user.id) return errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN);
  return null;
}

/**
 * GET handler - Fetch a single lesson by ID
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN, USER_ROLES.INSTRUCTOR]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const { id } = params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      student: { include: { user: true } },
      instructor: { include: { user: true } }, // includes instructor.userId too
      vehicle: true,
      category: true,
    },
  });

  if (!lesson) {
    return errorResponse('Lesson not found', HTTP_STATUS.NOT_FOUND);
  }

  const forbidden = assertInstructorOwnsLesson(user, lesson);
  if (forbidden) return forbidden;

  return successResponse(lesson);
});

/**
 * PUT handler - Update a lesson
 */
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN, USER_ROLES.INSTRUCTOR]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const { id } = params;

  // Permission check (must exist + ownership if instructor)
  const existingLesson = await prisma.lesson.findUnique({
    where: { id },
    include: { instructor: true },
  });

  if (!existingLesson) {
    return errorResponse('Lesson not found', HTTP_STATUS.NOT_FOUND);
  }

  const forbidden = assertInstructorOwnsLesson(user, existingLesson);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { lessonDate, startTime, endTime, status, vehicleId } = body;

  // Calculate duration if times are provided
  let durationMinutes: number | undefined;
  if (startTime && endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    durationMinutes = endInMinutes - startInMinutes;

    if (durationMinutes <= 0) {
      return errorResponse('End time must be after start time', HTTP_STATUS.BAD_REQUEST);
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
    message: 'Lesson updated successfully',
    lesson,
  });
});

/**
 * DELETE handler - Delete a lesson
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN, USER_ROLES.INSTRUCTOR]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const { id } = params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { instructor: true },
  });

  if (!lesson) {
    return errorResponse('Lesson not found', HTTP_STATUS.NOT_FOUND);
  }

  const forbidden = assertInstructorOwnsLesson(user, lesson);
  if (forbidden) return forbidden;

  await prisma.lesson.delete({ where: { id } });

  return successResponse({
    message: 'Lesson deleted successfully',
  });
});
