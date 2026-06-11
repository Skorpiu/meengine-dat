import { addDays, endOfDay } from "date-fns";

/** Max lessons shown per Recent/Upcoming column on `/admin/lessons`. */
export const ADMIN_DASHBOARD_LESSONS_LIST_LIMIT = 50;

/**
 * Calendar days after today included in the Upcoming column on `/admin/lessons`.
 * Today remaining (startTime >= now) is always included; future days run through today + this count.
 */
export const ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS = 7;

/** End of day at `today` + {@link ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS}. */
export function getAdminDashboardUpcomingHorizonEnd(today: Date): Date {
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  return endOfDay(addDays(dayStart, ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS));
}

/**
 * Fetches use `limit + 1` rows; returns at most `limit` items and whether more exist.
 */
export function sliceAdminDashboardLessonsWithHasMore<T>(
  rows: T[],
  limit: number = ADMIN_DASHBOARD_LESSONS_LIST_LIMIT,
): { items: T[]; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, hasMore };
}
