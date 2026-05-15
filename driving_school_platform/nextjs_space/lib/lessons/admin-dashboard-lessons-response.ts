/**
 * Client-side parsing for GET /api/admin/lessons?view=* (dashboard mode).
 * API returns successResponse: `{ success: true, data: { recent, current, upcoming } }`.
 */

export type AdminDashboardLessonsSlices<T = unknown> = {
  recent: T[];
  current: T[];
  upcoming: T[];
};

/** Canonical API envelope for admin dashboard lessons GET. */
export type AdminDashboardLessonsApiResponse<T = unknown> = {
  success: boolean;
  data: {
    recent?: T[];
    current?: T[];
    upcoming?: T[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Unwraps dashboard lesson slices from a JSON payload.
 * Prefers `data.{recent,current,upcoming}`; falls back to root slices for legacy clients.
 */
export function parseAdminDashboardLessonsPayload<T = unknown>(
  raw: unknown,
): AdminDashboardLessonsSlices<T> {
  if (!isRecord(raw)) {
    return { recent: [], current: [], upcoming: [] };
  }

  const dashboardData = isRecord(raw.data) ? raw.data : raw;

  return {
    recent: asArray<T>(dashboardData.recent),
    current: asArray<T>(dashboardData.current),
    upcoming: asArray<T>(dashboardData.upcoming),
  };
}
