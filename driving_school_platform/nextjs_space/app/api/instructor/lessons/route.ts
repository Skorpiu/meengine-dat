import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, verifyAuth, withErrorHandling } from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await verifyAuth(USER_ROLES.INSTRUCTOR);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return errorResponse('Missing "from" and/or "to" query params', HTTP_STATUS.BAD_REQUEST);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return errorResponse('Invalid "from" or "to" date', HTTP_STATUS.BAD_REQUEST);
  }

  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!instructor) {
    return errorResponse('Instructor profile not found', HTTP_STATUS.NOT_FOUND);
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      instructorId: instructor.id,
      lessonDate: { gte: fromDate, lte: toDate },
    },
    include: {
      student: { include: { user: true } },
      instructor: { include: { user: true } },
      vehicle: true,
      category: true,
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  });

  return NextResponse.json(
    { lessons },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
});