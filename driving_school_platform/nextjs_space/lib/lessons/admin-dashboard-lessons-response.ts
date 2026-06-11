/**
 * Client-side parsing for GET /api/admin/lessons?view=* (dashboard mode).
 * API returns successResponse:
 * `{ success: true, data: { recent, current, upcoming, recentHasMore?, upcomingHasMore? } }`.
 */

export type AdminDashboardLessonsSlices<T = unknown> = {
  recent: T[];
  current: T[];
  upcoming: T[];
  recentHasMore: boolean;
  upcomingHasMore: boolean;
};

/** Canonical API envelope for admin dashboard lessons GET. */
export type AdminDashboardLessonsApiResponse<T = unknown> = {
  success: boolean;
  data: {
    recent?: T[];
    current?: T[];
    upcoming?: T[];
    recentHasMore?: boolean;
    upcomingHasMore?: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * Unwraps dashboard lesson slices from a JSON payload.
 * Prefers `data.{recent,current,upcoming}`; falls back to root slices for legacy clients.
 * `recentHasMore` / `upcomingHasMore` default to false when absent (backward-compatible).
 */
export function parseAdminDashboardLessonsPayload<T = unknown>(
  raw: unknown,
): AdminDashboardLessonsSlices<T> {
  if (!isRecord(raw)) {
    return {
      recent: [],
      current: [],
      upcoming: [],
      recentHasMore: false,
      upcomingHasMore: false,
    };
  }

  const dashboardData = isRecord(raw.data) ? raw.data : raw;

  return {
    recent: asArray<T>(dashboardData.recent),
    current: asArray<T>(dashboardData.current),
    upcoming: asArray<T>(dashboardData.upcoming),
    recentHasMore: asBoolean(dashboardData.recentHasMore),
    upcomingHasMore: asBoolean(dashboardData.upcomingHasMore),
  };
}
