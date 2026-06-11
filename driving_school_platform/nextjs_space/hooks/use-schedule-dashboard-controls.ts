"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ScheduleMapRefetch } from "@/components/schedule/schedule-map";
import type { LessonBookingSuccessMeta } from "@/components/lessons/lesson-booking-meta";
import { parseScheduleReturnParams } from "@/lib/schedule/schedule-map-navigation";

export function useScheduleDashboardControls() {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusLessonDate, setFocusLessonDate] = useState<string | null>(null);
  const scheduleRefetchRef = useRef<ScheduleMapRefetch | null>(null);
  const urlReturnHandledRef = useRef(false);

  const registerScheduleRefetch = useCallback((refetch: ScheduleMapRefetch) => {
    scheduleRefetchRef.current = refetch;
  }, []);

  const refreshSchedule = useCallback(
    async (meta?: LessonBookingSuccessMeta) => {
      if (meta?.lessonDate) {
        setFocusLessonDate(meta.lessonDate);
      }
      setRefreshKey((k) => k + 1);
      await scheduleRefetchRef.current?.(
        meta?.lessonDate ? { focusDate: meta.lessonDate } : undefined,
      );
    },
    [],
  );

  useEffect(() => {
    if (urlReturnHandledRef.current) return;

    const parsed = parseScheduleReturnParams(
      new URLSearchParams(window.location.search),
    );
    if (!parsed.shouldRefresh && !parsed.focusDate) return;

    urlReturnHandledRef.current = true;

    void refreshSchedule(
      parsed.focusDate ? { lessonDate: parsed.focusDate } : undefined,
    );

    router.replace(pathname, { scroll: false });
  }, [pathname, refreshSchedule, router]);

  const handleLessonBooked = useCallback(
    async (meta?: LessonBookingSuccessMeta) => {
      await refreshSchedule(meta);
    },
    [refreshSchedule],
  );

  return {
    refreshKey,
    focusLessonDate,
    registerScheduleRefetch,
    refreshSchedule,
    handleLessonBooked,
  };
}
