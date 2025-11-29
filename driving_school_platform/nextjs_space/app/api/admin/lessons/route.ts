/**
 * Admin Lessons API Route
 * Handles fetching and creating lessons for administrators
 * @module app/api/admin/lessons
 */

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cleanupOldLessons } from '@/lib/cleanup';
import {
  successResponse,
  errorResponse,
  verifyAuth,
  validateRequest,
  withErrorHandling,
  logApiError,
  getQueryParam,
  getTimeRanges,
  calculateDuration,
} from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES, LESSON_STATUS, VALIDATION_RULES } from '@/lib/constants';
import { lessonCreationSchema } from '@/lib/validation';
import { startOfDay, addDays } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET handler - Fetch lessons based on view type (DRIVING, CODE, EXAMS)
 * @param request - Next.js request object
 * @returns JSON response with recent and upcoming lessons/exams
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  const user = await verifyAuth([
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.INSTRUCTOR,
  ]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Automatically cleanup old lessons (older than 30 days)
  try {
    await cleanupOldLessons();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to cleanup old lessons:', error);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Calendar mode → used by ScheduleMap (day / week / month)
  if (from && to) {
    // Implement robust day range filtering: lessonDate >= startOfDay(from) AND lessonDate < startOfDay(to) + 1 day
    const fromDate = startOfDay(new Date(from));
    const toDate = addDays(startOfDay(new Date(to)), 1);

    // If you want to limit organization in the future, here's the place:
    // where: { lessonDate: { gte: fromDate, lt: toDate }, organizationId: user.organizationId }

    const lessons = await prisma.lesson.findMany({
      where: {
        lessonDate: {
          gte: fromDate,
          lt: toDate,
        },
        // Later we can filter by organizationId: user.organizationId
      },
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } },
        vehicle: true,
        category: true,
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    });

    // IMPORTANT: Simple format for the ScheduleMap with Cache-Control header
    return NextResponse.json(
      { lessons },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  const view = getQueryParam(searchParams, 'view', 'DRIVING');
  const { yesterday, today, tomorrow, currentTime } = getTimeRanges();

  if (view === 'EXAMS') {
    // Note: Exams are stored as lessons with lessonType = 'EXAM'
    // Fetch exams from lessons table
    const [recentExams, currentExams, upcomingExams] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          lessonType: 'EXAM',
          OR: [
            {
              lessonDate: yesterday,
            },
            {
              lessonDate: today,
              startTime: { lt: currentTime },
            },
          ],
        },
        include: {
          student: { include: { user: true } },
          instructor: { include: { user: true } },
          vehicle: true,
          category: true,
        },
        orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
        take: 50, // Limit to recent 50
      }),
      // Current exams: happening right now (started but not yet ended)
      prisma.lesson.findMany({
        where: {
          lessonType: 'EXAM',
          lessonDate: today,
          startTime: { lte: currentTime },
          endTime: { gt: currentTime },
        },
        include: {
          student: { include: { user: true } },
          instructor: { include: { user: true } },
          vehicle: true,
          category: true,
        },
        orderBy: [{ startTime: 'asc' }],
      }),
      prisma.lesson.findMany({
        where: {
          lessonType: 'EXAM',
          OR: [
            { lessonDate: today, startTime: { gte: currentTime } },
            { lessonDate: { gt: today, lte: tomorrow } },
          ],
        },
        include: {
          student: { include: { user: true } },
          instructor: { include: { user: true } },
          vehicle: true,
          category: true,
        },
        orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
        take: 50, // Limit to next 50
      }),
    ]);

    return successResponse({ recent: recentExams, current: currentExams, upcoming: upcomingExams });
  }

  // Fetch lessons (DRIVING or THEORY)
  const lessonType = view === 'CODE' ? 'THEORY' : 'DRIVING';

  const [recentLessons, currentLessons, upcomingLessons] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        lessonType,
        OR: [
          {
            lessonDate: yesterday,
          },
          {
            lessonDate: today,
            startTime: { lt: currentTime },
          },
        ],
      },
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } },
        vehicle: true,
        category: true,
      },
      orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
      take: 50, // Limit to recent 50
    }),
    // Current lessons: happening right now (started but not yet ended)
    prisma.lesson.findMany({
      where: {
        lessonType,
        lessonDate: today,
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
      },
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } },
        vehicle: true,
        category: true,
      },
      orderBy: [{ startTime: 'asc' }],
    }),
    prisma.lesson.findMany({
      where: {
        lessonType,
        OR: [
          { lessonDate: today, startTime: { gte: currentTime } },
          { lessonDate: { gt: today, lte: tomorrow } },
        ],
      },
      include: {
        student: { include: { user: true } },
        instructor: { include: { user: true } },
        vehicle: true,
        category: true,
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
      take: 50, // Limit to next 50
    }),
  ]);

  return successResponse({ recent: recentLessons, current: currentLessons, upcoming: upcomingLessons });
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

  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(lessonCreationSchema, body);

  if (!validation.success) {
    return validation.error;
  }

  const { lessonType, instructorId, studentId, studentIds, vehicleId, lessonDate, startTime, endTime } =
    validation.data;

  // Calculate duration
  const durationMinutes = calculateDuration(startTime, endTime);

  if (durationMinutes <= 0) {
    return errorResponse('End time must be after start time', HTTP_STATUS.BAD_REQUEST);
  }

  // Get instructor and verify qualified categories
  const instructor = await prisma.instructor.findUnique({
    where: { userId: instructorId },
    include: { qualifiedCategories: true },
  });

  if (!instructor) {
    return errorResponse('Instructor not found', HTTP_STATUS.NOT_FOUND);
  }

  // Determine categoryId based on lesson type
  let categoryId: number;

  if (lessonType === 'THEORY') {
    // For THEORY lessons (code classes), use the instructor's first category if available
    // Otherwise, use a default category (B - Car, the most common)
    if (instructor.qualifiedCategories.length > 0) {
      categoryId = instructor.qualifiedCategories[0].id;
    } else {
      // Get the default "B" category as fallback
      const defaultCategory = await prisma.category.findFirst({
        where: { name: 'B' },
      });
      
      if (!defaultCategory) {
        // If no B category exists, get any active category
        const anyCategory = await prisma.category.findFirst({
          where: { isActive: true },
        });
        
        if (!anyCategory) {
          return errorResponse(
            'No active categories found in the system',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }
        
        categoryId = anyCategory.id;
      } else {
        categoryId = defaultCategory.id;
      }
    }
  } else {
    // For DRIVING and EXAM lessons, instructor must have qualified categories
    if (instructor.qualifiedCategories.length === 0) {
      return errorResponse(
        'Instructor has no qualified categories for driving lessons. Please assign categories to this instructor first.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    
    categoryId = instructor.qualifiedCategories[0].id;
  }

  // Handle EXAM type (can have multiple students)
  if (lessonType === 'EXAM') {
    if (!studentIds || studentIds.length === 0) {
      return errorResponse(
        'At least one student is required for an exam',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (studentIds.length > VALIDATION_RULES.MAX_STUDENTS_PER_EXAM) {
      return errorResponse(
        `Maximum ${VALIDATION_RULES.MAX_STUDENTS_PER_EXAM} students per exam`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Create lessons for each student
    const lessons = await Promise.all(
      studentIds.map(async (sid) => {
        const student = await prisma.student.findUnique({
          where: { userId: sid },
        });

        if (!student) {
          throw new Error(`Student ${sid} not found`);
        }

        return prisma.lesson.create({
          data: {
            studentId: student.id,
            instructorId: instructor.id,
            vehicleId: vehicleId || null,
            lessonDate: new Date(lessonDate),
            startTime,
            endTime,
            durationMinutes,
            lessonType,
            categoryId,
            status: LESSON_STATUS.SCHEDULED,
          },
        });
      })
    );

    return successResponse(
      {
        message: `Exam booked successfully for ${lessons.length} student(s)`,
        lessons,
      },
      HTTP_STATUS.CREATED
    );
  }

  // Handle THEORY or DRIVING type (single student)
  // THEORY lessons can be group classes (no specific student required)
  // DRIVING lessons require a specific student
  
  if (lessonType === 'THEORY' && !studentId) {
    // For THEORY lessons (group classes) without a specific student
    // Create a generic "group class" lesson entry without a student reference
    const lesson = await prisma.lesson.create({
      data: {
        studentId: null, // No specific student for group classes
        instructorId: instructor.id,
        vehicleId: null, // Theory lessons don't require vehicles
        lessonDate: new Date(lessonDate),
        startTime,
        endTime,
        durationMinutes,
        lessonType,
        categoryId,
        status: LESSON_STATUS.SCHEDULED,
      },
    });

    return successResponse(
      {
        message: 'Theory group class created successfully',
        lesson,
      },
      HTTP_STATUS.CREATED
    );
  }
  
  if (!studentId) {
    return errorResponse(
      'Student is required for driving lessons',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const student = await prisma.student.findUnique({
    where: { userId: studentId },
  });

  if (!student) {
    return errorResponse('Student not found', HTTP_STATUS.NOT_FOUND);
  }

  // Create the lesson
  const lesson = await prisma.lesson.create({
    data: {
      studentId: student.id,
      instructorId: instructor.id,
      vehicleId: vehicleId || null,
      lessonDate: new Date(lessonDate),
      startTime,
      endTime,
      durationMinutes,
      lessonType,
      categoryId,
      status: LESSON_STATUS.SCHEDULED,
    },
  });

  return successResponse(
    {
      message: 'Lesson booked successfully',
      lesson,
    },
    HTTP_STATUS.CREATED
  );
});
