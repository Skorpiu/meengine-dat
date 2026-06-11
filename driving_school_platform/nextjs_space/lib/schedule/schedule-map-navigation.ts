/** Query param: calendar day to focus after returning from lesson edit (YYYY-MM-DD). */
export const SCHEDULE_FOCUS_DATE_QUERY = "focusDate";

/** Query param: trigger Schedule Map client refetch on dashboard mount. */
export const SCHEDULE_REFRESH_QUERY = "scheduleRefresh";

const FOCUS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ScheduleReturnParams = {
  focusDate: string | null;
  shouldRefresh: boolean;
};

export function isValidScheduleFocusDate(value: string): boolean {
  if (!FOCUS_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseScheduleReturnParams(
  searchParams: URLSearchParams | null | undefined,
): ScheduleReturnParams {
  if (!searchParams) {
    return { focusDate: null, shouldRefresh: false };
  }

  const rawFocus = searchParams.get(SCHEDULE_FOCUS_DATE_QUERY)?.trim() ?? "";
  const focusDate =
    rawFocus && isValidScheduleFocusDate(rawFocus) ? rawFocus : null;

  const refreshFlag = searchParams.get(SCHEDULE_REFRESH_QUERY)?.trim() ?? "";
  const shouldRefresh = refreshFlag === "1" || refreshFlag === "true";

  return { focusDate, shouldRefresh };
}

function appendScheduleRefreshQuery(href: string): string {
  const url = new URL(href, "http://local");
  url.searchParams.set(SCHEDULE_REFRESH_QUERY, "1");
  return `${url.pathname}${url.search}`;
}

/** Build dashboard return URL after a successful lesson edit. */
export function buildScheduleReturnHref(
  baseHref: string,
  lessonDate: string,
): string {
  if (!isValidScheduleFocusDate(lessonDate)) {
    return appendScheduleRefreshQuery(baseHref);
  }

  const url = new URL(baseHref, "http://local");
  url.searchParams.set(SCHEDULE_FOCUS_DATE_QUERY, lessonDate);
  url.searchParams.set(SCHEDULE_REFRESH_QUERY, "1");
  return `${url.pathname}${url.search}`;
}
