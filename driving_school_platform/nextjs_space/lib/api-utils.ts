/**
 * API utility functions for consistent error handling and responses
 * @module lib/api-utils
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { z } from "zod";

import { authOptions } from "./auth";
import { HTTP_STATUS } from "./constants";
import { formatValidationErrors } from "./validation";
import type { ApiErrorResponse, ApiResponse, UserRole } from "./types";
import { logger, measurePerformance } from "./logger";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "./rate-limit";
import { sanitizeObject } from "./sanitization";

type AuthUser = Session["user"];

export function successResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK,
  headers?: Record<string, string>,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function errorResponse(
  error: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: Record<string, string>,
): NextResponse<ApiErrorResponse> {
  logger.error("API Error", new Error(error), { status, details });

  return NextResponse.json({ error, details, statusCode: status }, { status });
}

export async function verifyAuth(
  requiredRole?: UserRole | UserRole[],
): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("Unauthorized access attempt - No session");
      return null;
    }

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole];
      const userRole = session.user.role;

      if (!allowedRoles.includes(userRole)) {
        logger.warn("Unauthorized access attempt - Insufficient permissions", {
          userRole,
          requiredRole: allowedRoles,
        });
        return null;
      }
    }

    return session.user;
  } catch (error) {
    logger.error("Auth verification error", error as Error);
    return null;
  }
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  sanitize: boolean = true,
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const sanitizedData =
      sanitize && typeof data === "object" && data !== null
        ? sanitizeObject(data as Record<string, unknown>)
        : data;

    const parsed = schema.parse(sanitizedData);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = formatValidationErrors(error);
      logger.warn("Validation error", { errors: formattedErrors });

      return {
        success: false,
        error: errorResponse(
          "Validation failed",
          HTTP_STATUS.BAD_REQUEST,
          formattedErrors,
        ),
      };
    }

    return {
      success: false,
      error: errorResponse("Invalid request data", HTTP_STATUS.BAD_REQUEST),
    };
  }
}

export type RouteHandler<C = unknown> = (
  request: NextRequest,
  context: C,
) => Promise<NextResponse> | NextResponse;

// Wrapper that Next and tests can call with 1 or 2 args
export type WrappedRouteHandler<C = unknown> = (
  request: NextRequest,
  context?: C,
) => Promise<NextResponse> | NextResponse;

export function withErrorHandling<C = unknown>(
  handler: RouteHandler<C>,
  options?: {
    rateLimit?: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];
    trackPerformance?: boolean;
  },
): WrappedRouteHandler<C> {
  return async (request: NextRequest, context?: C) => {
    const ctx = context ?? ({} as C);
    const url = new URL(request.url);
    const method = request.method;
    const perf = options?.trackPerformance
      ? measurePerformance(`${method} ${url.pathname}`)
      : null;

    try {
      if (options?.rateLimit) {
        const identifier = getClientIdentifier(request);
        const rateLimitResult = checkRateLimit(identifier, options.rateLimit);

        if (!rateLimitResult.allowed) {
          logger.warn("Rate limit exceeded", {
            identifier,
            endpoint: url.pathname,
          });

          return NextResponse.json(
            {
              error: rateLimitResult.message || "Too many requests",
              retryAfter: Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000,
              ),
            },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": options.rateLimit.maxRequests.toString(),
                "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                "X-RateLimit-Reset": new Date(
                  rateLimitResult.resetTime,
                ).toISOString(),
                "Retry-After": Math.ceil(
                  (rateLimitResult.resetTime - Date.now()) / 1000,
                ).toString(),
              },
            },
          );
        }
      }

      const response = await handler(request, ctx);

      const duration = perf?.end();
      logger.info(`${method} ${url.pathname}`, {
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      logger.error(
        `API Route Error: ${method} ${url.pathname}`,
        error as Error,
        {
          url: url.href,
          method,
        },
      );

      if (perf) perf.end();

      const message =
        error instanceof Error && error.message
          ? error.message
          : "An unexpected error occurred";

      return errorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
}

/**
 * Deprecated: use logger.error() directly
 */
export function logApiError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>,
): void {
  logger.error(context, error as Error, additionalData);
}

export function getQueryParam(
  searchParams: URLSearchParams,
  paramName: string,
  defaultValue: string = "",
): string {
  return searchParams.get(paramName) || defaultValue;
}

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

  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return { yesterday, today, tomorrow, currentTime };
}

export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export async function recordExists(
  model: { findUnique(args: { where: { id: string } }): Promise<unknown> },
  id: string,
): Promise<boolean> {
  try {
    const record = await model.findUnique({ where: { id } });
    return !!record;
  } catch (error) {
    logApiError("Record existence check", error, { id });
    return false;
  }
}
