
/**
 * Rate Limiting Utilities
 * Implements in-memory rate limiting for API routes
 * @module lib/rate-limit
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitMap = new Map<string, RateLimitStore>();

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  /** Authentication endpoints (login, register) - 5 requests per 15 minutes */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many authentication attempts. Please try again later.',
  },
  /** General API endpoints - 100 requests per minute */
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    message: 'Too many requests. Please slow down.',
  },
  /** Data mutation endpoints (POST, PUT, DELETE) - 30 requests per minute */
  MUTATION: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    message: 'Too many requests. Please wait before trying again.',
  },
  /** File upload endpoints - 10 requests per hour */
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    message: 'Upload limit exceeded. Please try again later.',
  },
} as const;

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object indicating if request is allowed and retry information
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.API
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
} {
  const now = Date.now();
  const key = identifier;
  
  // Get or create rate limit entry
  let store = rateLimitMap.get(key);
  
  // If no entry or reset time passed, create new entry
  if (!store || now > store.resetTime) {
    store = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, store);
  }
  
  // Increment request count
  store.count++;
  
  // Check if limit exceeded
  const allowed = store.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - store.count);
  
  return {
    allowed,
    remaining,
    resetTime: store.resetTime,
    message: allowed ? undefined : config.message,
  };
}

/**
 * Get client identifier from request (IP address or user ID)
 * @param request - Next.js request object
 * @param userId - Optional user ID for authenticated requests
 * @returns Unique identifier for rate limiting
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Clean up expired entries from rate limit store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [key, store] of rateLimitMap.entries()) {
    if (now > store.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Middleware wrapper for rate limiting
 * @param config - Rate limit configuration
 * @param getUserId - Optional function to extract user ID from request
 * @returns Middleware function that checks rate limits
 */
export function withRateLimit(
  config: RateLimitConfig = RATE_LIMITS.API,
  getUserId?: (request: Request) => Promise<string | undefined>
) {
  return async (request: Request) => {
    // Get user ID if available
    const userId = getUserId ? await getUserId(request) : undefined;
    
    // Get client identifier
    const identifier = getClientIdentifier(request, userId);
    
    // Check rate limit
    const { allowed, remaining, resetTime, message } = checkRateLimit(identifier, config);
    
    if (!allowed) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: message || 'Rate limit exceeded',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(resetTime).toISOString(),
              'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            },
          }
        ),
      };
    }
    
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      },
    };
  };
}

// Clean up rate limit store every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
