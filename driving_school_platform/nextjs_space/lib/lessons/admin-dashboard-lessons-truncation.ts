/** Max lessons shown per Recent/Upcoming column on `/admin/lessons`. */
export const ADMIN_DASHBOARD_LESSONS_LIST_LIMIT = 50;

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
