
/**
 * API utility functions for consistent error handling and responses
 * @module lib/api-utils
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { HTTP_STATUS, API_MESSAGES } from './constants';
import { z } from 'zod';
import { formatValidationErrors } from './validation';
import type { ApiResponse, ApiErrorResponse, SessionUser } from './types';
import { logger, measurePerformance } from './logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from './rate-limit';
import { sanitizeObject } from './sanitization';

/**
 * Create a successful API response
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param headers - Additional headers
 * @returns Next.js JSON response
 */
export function successResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK,
  headers?: Record<string, string>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { 
      status,
      headers,
    }
  );
}

/**
 * Create an error API response
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 * @param details - Optional error details
 * @returns Next.js JSON response
 */
export function errorResponse(
  error: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: Record<string, string>
): NextResponse<ApiErrorResponse> {
  // Log error
  logger.error('API Error', new Error(error), { status, details });
  
  return NextResponse.json(
    {
      error,
      details,
      statusCode: status,
    },
    { status }
  );
}

/**
 * Verify user authentication and authorization
 * @param requiredRole - Optional required role (if not provided, any authenticated user is allowed)
 * @returns Session user or null
 */
export async function verifyAuth(
  requiredRole?: string | string[]
): Promise<any | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn('Unauthorized access attempt - No session');
      return null;
    }

    if (requiredRole) {
      const userRole = (session.user as any).role;
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Unauthorized access attempt - Insufficient permissions', {
          userRole,
          requiredRole: allowedRoles,
        });
        return null;
      }
    }

    return session.user;
  } catch (error) {
    logger.error('Auth verification error', error as Error);
    return null;
  }
}

/**
 * Validate request body against a Zod schema with automatic sanitization
 * @param schema - Zod schema
 * @param data - Data to validate
 * @param sanitize - Whether to sanitize string inputs (default: true)
 * @returns Validation result
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  sanitize: boolean = true
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    // Sanitize input if enabled
    const sanitizedData = sanitize && typeof data === 'object' && data !== null
      ? sanitizeObject(data as Record<string, any>)
      : data;
    
    const parsed = schema.parse(sanitizedData);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = formatValidationErrors(error);
      logger.warn('Validation error', { errors: formattedErrors });
      return {
        success: false,
        error: errorResponse(
          'Validation failed',
          HTTP_STATUS.BAD_REQUEST,
          formattedErrors
        ),
      };
    }
    return {
      success: false,
      error: errorResponse('Invalid request data', HTTP_STATUS.BAD_REQUEST),
    };
  }
}

/**
 * Wrap async API route handlers with error handling, logging, and performance tracking
 * @param handler - Async handler function
 * @param options - Configuration options
 * @returns Wrapped handler with error catching
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  options?: {
    /** Rate limit configuration */
    rateLimit?: typeof RATE_LIMITS[keyof typeof RATE_LIMITS];
    /** Log performance metrics */
    trackPerformance?: boolean;
  }
): T {
  return (async (...args: any[]) => {
    const request = args[0] as NextRequest;
    const url = new URL(request.url);
    const method = request.method;
    const perf = options?.trackPerformance ? measurePerformance(`${method} ${url.pathname}`) : null;
    
    try {
      // Check rate limit if configured
      if (options?.rateLimit) {
        const identifier = getClientIdentifier(request);
        const rateLimitResult = checkRateLimit(identifier, options.rateLimit);
        
        if (!rateLimitResult.allowed) {
          logger.warn('Rate limit exceeded', {
            identifier,
            endpoint: url.pathname,
          });
          
          return NextResponse.json(
            {
              error: rateLimitResult.message || 'Too many requests',
              retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              },
            }
          );
        }
      }
      
      const response = await handler(...args);
      
      // Log successful request
      const duration = perf?.end();
      logger.info(`${method} ${url.pathname}`, {
        status: response.status,
        duration,
      });
      
      return response;
    } catch (error) {
      // Log error with full context
      logger.error(`API Route Error: ${method} ${url.pathname}`, error as Error, {
        url: url.href,
        method,
      });
      
      if (perf) perf.end();
      
      if (error instanceof Error) {
        return errorResponse(
          error.message || 'An unexpected error occurred',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
      
      return errorResponse(
        'An unexpected error occurred',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }) as T;
}

/**
 * Log API errors with context (deprecated - use logger directly)
 * @deprecated Use logger.error() instead
 * @param context - Context description
 * @param error - Error object
 * @param additionalData - Additional data for logging
 */
export function logApiError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  logger.error(context, error as Error, additionalData);
}

/**
 * Parse and validate query parameters
 * @param searchParams - URL search params
 * @param paramName - Parameter name
 * @param defaultValue - Default value if not present
 * @returns Parsed value or default
 */
export function getQueryParam(
  searchParams: URLSearchParams,
  paramName: string,
  defaultValue: string = ''
): string {
  return searchParams.get(paramName) || defaultValue;
}

/**
 * Calculate time range for queries (today, yesterday, etc.)
 * @returns Object with date ranges
 */
export function getTimeRanges(): {
  yesterday: Date;
  today: Date;
  tomorrow: Date;
  currentTime: string;
} {
  const now = new Date();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return { yesterday, today, tomorrow, currentTime };
}

/**
 * Calculate duration in minutes between two time strings
 * @param startTime - Start time (HH:mm)
 * @param endTime - End time (HH:mm)
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

/**
 * Check if a record exists in the database
 * @param model - Prisma model
 * @param id - Record ID
 * @returns True if exists, false otherwise
 */
export async function recordExists(
  model: any,
  id: string
): Promise<boolean> {
  try {
    const record = await model.findUnique({ where: { id } });
    return !!record;
  } catch (error) {
    logApiError('Record existence check', error, { id });
    return false;
  }
}
