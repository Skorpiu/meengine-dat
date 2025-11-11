
/**
 * Login API Route
 * Handles user authentication with rate limiting and logging
 * @module app/api/auth/login
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import {
  successResponse,
  errorResponse,
  validateRequest,
  withErrorHandling,
} from '@/lib/api-utils';
import { HTTP_STATUS } from '@/lib/constants';
import { userLoginSchema } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * 
 * @body {string} email - User email
 * @body {string} password - User password
 * 
 * @returns User data if authentication successful
 * @throws 401 if credentials invalid
 * @throws 400 if validation fails
 * @throws 429 if rate limit exceeded
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Parse and validate request body
  const body = await request.json();
  const validation = validateRequest(userLoginSchema, body);

  if (!validation.success) {
    return validation.error;
  }

  const { email, password } = validation.data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      student: true,
      instructor: true,
    },
  });

  // Check if user exists
  if (!user) {
    logger.warn('Login attempt with non-existent email', { email });
    return errorResponse(
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user has a password (might use OAuth only)
  if (!user.passwordHash) {
    logger.warn('Login attempt for OAuth-only user', { email });
    return errorResponse(
      'Please sign in using your OAuth provider',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn('Login attempt with invalid password', { email });
    return errorResponse(
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Check if user is approved (for non-admin users)
  if (user.role !== 'SUPER_ADMIN' && !user.isApproved) {
    logger.info('Login attempt for unapproved user', { email });
    return errorResponse(
      'Your account is pending approval. Please wait for an administrator to approve your account.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in successfully', {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user data (password hash excluded by Prisma selection)
  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isApproved: user.isApproved,
      isEmailVerified: user.isEmailVerified,
      profilePictureUrl: user.profilePictureUrl,
    },
    message: 'Login successful',
  });
}, {
  rateLimit: RATE_LIMITS.AUTH, // 5 attempts per 15 minutes
  trackPerformance: true,
});
