
/**
 * API endpoint to fetch all instructors for filtering purposes
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, verifyAuth, withErrorHandling } from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';

/**
 * GET handler - Fetch all instructors
 * Accessible by SUPER_ADMIN roles (unified schedule map)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication - Allow admin access
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const instructors = await prisma.instructor.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        firstName: 'asc',
      },
    },
  });

  return successResponse({ instructors });
});
