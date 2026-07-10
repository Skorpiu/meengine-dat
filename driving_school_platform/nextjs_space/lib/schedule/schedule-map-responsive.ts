export type ScheduleMapViewType = "day" | "week" | "month";

/** Tailwind `lg` — week/month grids need ~1024px to remain readable. */
export const SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX = 1024;

export const SCHEDULE_MAP_WIDE_VIEW_MEDIA_QUERY = `(min-width: ${SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX}px)`;

export const SCHEDULE_MAP_WIDE_VIEW_UNAVAILABLE_TITLE =
  "Week and Month views need a wider screen";

export const SCHEDULE_MAP_WIDE_VIEW_UNAVAILABLE_DESCRIPTION =
  "Use Day view on this screen, or switch to desktop or tablet landscape for Week and Month.";

export const SCHEDULE_MAP_NARROW_VIEW_HELPER =
  "Day view on small screens. Week and Month require desktop or tablet landscape.";

/** Minimum touch target (~44px) on narrow viewports; compact on `sm+`. */
export const SCHEDULE_MAP_LESSON_ACTION_BUTTON_CLASS =
  "h-11 w-11 p-0 sm:h-6 sm:w-6 bg-white disabled:opacity-50 disabled:cursor-not-allowed";

export const SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS = `${SCHEDULE_MAP_LESSON_ACTION_BUTTON_CLASS} hover:bg-blue-50 border border-blue-300 rounded`;

export const SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS = `${SCHEDULE_MAP_LESSON_ACTION_BUTTON_CLASS} hover:bg-red-50 border border-red-300 rounded`;

export const SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS = "h-4 w-4 sm:h-3 sm:w-3";

export const SCHEDULE_MAP_NAV_ICON_BUTTON_CLASS = "h-11 w-11 sm:h-8 sm:w-8";

export function isScheduleMapWideViewport(widthPx: number): boolean {
  return widthPx >= SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX;
}

export function isScheduleMapWideViewType(
  viewType: ScheduleMapViewType,
): boolean {
  return viewType === "week" || viewType === "month";
}

/** Whether week/month grid markup should render (wide viewport only). */
export function shouldRenderScheduleMapWideGrid(
  viewType: ScheduleMapViewType,
  isWideViewport: boolean,
): boolean {
  if (!isScheduleMapWideViewType(viewType)) return false;
  return isWideViewport;
}

/** Coerce week/month to day when the viewport is too narrow (e.g. after resize). */
export function coerceScheduleMapViewTypeForViewport(
  viewType: ScheduleMapViewType,
  isWideViewport: boolean,
): ScheduleMapViewType {
  if (isWideViewport) return viewType;
  return isScheduleMapWideViewType(viewType) ? "day" : viewType;
}

export function isScheduleMapWideViewSelectDisabled(
  viewType: ScheduleMapViewType,
  isWideViewport: boolean,
): boolean {
  return !isWideViewport && isScheduleMapWideViewType(viewType);
}
