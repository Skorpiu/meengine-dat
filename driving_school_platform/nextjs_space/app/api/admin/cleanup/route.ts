/**
 * Admin Cleanup API Route
 * Handles cleanup of old lessons/exams
 * @module app/api/admin/cleanup
 */

import { NextRequest } from 'next/server';
import { cleanupOldLessons } from '@/lib/cleanup';
import {
  successResponse,
  errorResponse,
  verifyAuth,
  withErrorHandling,
} from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';

/**
 * POST handler - Trigger cleanup of old lessons/exams
 * @param request - Next.js request object
 * @returns JSON response with cleanup result
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  const user = await verifyAuth(USER_ROLES.SUPER_ADMIN);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const result = await cleanupOldLessons();

  return successResponse(
    {
      message: `Successfully cleaned up ${result.count} old lessons/exams`,
      count: result.count,
    },
    HTTP_STATUS.OK
  );
});
