import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, verifyAuth, withErrorHandling } from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';
import { startOfDay, addDays } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await verifyAuth(USER_ROLES.STUDENT);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return errorResponse('Missing "from" and/or "to" query params', HTTP_STATUS.BAD_REQUEST);
  }

  // Implement robust day range filtering: lessonDate >= startOfDay(from) AND lessonDate < startOfDay(to) + 1 day
  const fromDate = startOfDay(new Date(from));
  const toDate = addDays(startOfDay(new Date(to)), 1);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return errorResponse('Invalid "from" or "to" date', HTTP_STATUS.BAD_REQUEST);
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!student) {
    return errorResponse('Student profile not found', HTTP_STATUS.NOT_FOUND);
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: student.id,
      lessonDate: { gte: fromDate, lt: toDate },
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