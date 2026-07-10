"use client";

import { useEffect, useState } from "react";
import { SCHEDULE_MAP_WIDE_VIEW_MEDIA_QUERY } from "@/lib/schedule/schedule-map-responsive";

/**
 * `true` when viewport is wide enough for week/month grids (lg+).
 * `null` until the client has measured (SSR / first paint).
 */
export function useScheduleMapWideViewport(): boolean | null {
  const [isWide, setIsWide] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SCHEDULE_MAP_WIDE_VIEW_MEDIA_QUERY);

    const sync = () => setIsWide(mediaQuery.matches);
    sync();

    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return isWide;
}
