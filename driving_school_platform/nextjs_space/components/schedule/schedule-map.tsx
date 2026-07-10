"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Edit,
  Trash2,
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  subDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LESSON_INACTIVE_INSTRUCTOR_WARNING } from "@/lib/lessons/lesson-display";
import {
  getScheduleMapChipLines,
  getScheduleMapLessonColorClasses,
  getScheduleMapLessonVehicleWarning,
  isScheduleMapLessonInstructorInactive,
  isScheduleMapLessonVehicleProblematic,
} from "@/lib/schedule/schedule-map-card";
import { SMOKE_TESTIDS } from "@/lib/smoke/smoke-testids";
import { getStudentDisplayName } from "@/lib/students/student-display";
import type { ScheduleMapStudentPayload } from "@/lib/students/schedule-lesson-student";
import {
  SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS,
  SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS,
  SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS,
  SCHEDULE_MAP_NAV_ICON_BUTTON_CLASS,
  SCHEDULE_MAP_NARROW_VIEW_HELPER,
  coerceScheduleMapViewTypeForViewport,
  shouldRenderScheduleMapWideGrid,
} from "@/lib/schedule/schedule-map-responsive";
import { useScheduleMapWideViewport } from "@/hooks/use-schedule-map-wide-viewport";

type ViewType = "day" | "week" | "month";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeGetArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const isLikelyJson = contentType.toLowerCase().includes("application/json");

  const text = await response.text();
  if (!text) return {};

  if (!isLikelyJson) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { message: text };
    }
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

export interface Lesson {
  id: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  lessonType: string;
  status: string;
  student?: ScheduleMapStudentPayload;
  instructor?: {
    isAvailableForBooking?: boolean;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  vehicle?: {
    registrationNumber?: string;
    make?: string;
    model?: string;
    isActive?: boolean;
    underMaintenance?: boolean;
    status?: string;
  } | null;
  category?: {
    name: string;
  };
}

export type ScheduleMapRefetchOptions = {
  focusDate?: Date | string;
};

export type ScheduleMapRefetch = (
  options?: ScheduleMapRefetchOptions,
) => Promise<void>;

interface ScheduleMapProps {
  lessons: Lesson[];
  showPrintButton?: boolean;
  userRole?: "admin" | "instructor" | "student";
  /** Called after delete or other in-map mutations; should refetch calendar data. */
  onLessonsUpdate?: () => void | Promise<void>;
  /** Parent can call this to refetch immediately after booking (e.g. lesson create). */
  onRegisterRefetch?: (refetch: ScheduleMapRefetch) => void;
  /** When provided, opens edit in parent (e.g. modal) instead of navigating away. */
  onEditLesson?: (lessonId: string) => void;
  refreshKey?: number;
  /** When set (e.g. after booking), moves the calendar to that lesson date before refetch. */
  focusLessonDate?: string | null;
}

function ScheduleMapExpandedOperationalWarnings({
  lesson,
}: {
  lesson: Lesson;
}) {
  const instructorWarning = isScheduleMapLessonInstructorInactive(lesson)
    ? LESSON_INACTIVE_INSTRUCTOR_WARNING
    : null;
  const vehicleWarning = getScheduleMapLessonVehicleWarning(lesson);

  if (!instructorWarning && !vehicleWarning) return null;

  return (
    <div className="space-y-1">
      {instructorWarning ? (
        <div className="text-xs font-medium text-red-700">
          {instructorWarning}
        </div>
      ) : null}
      {vehicleWarning ? (
        <div className="text-xs font-medium text-red-700">{vehicleWarning}</div>
      ) : null}
    </div>
  );
}

function ScheduleLessonChipBody({
  lesson,
  preferInstructor = false,
}: {
  lesson: Lesson;
  preferInstructor?: boolean;
}) {
  const lines = getScheduleMapChipLines(lesson, { preferInstructor });
  return (
    <div className="min-h-0 space-y-0.5 overflow-hidden">
      {lines.map((line) => (
        <div key={line} className="truncate leading-tight">
          {line}
        </div>
      ))}
    </div>
  );
}

// Updated role logic - Admin and Instructor share same scheduling logic, only print is admin-exclusive
export function ScheduleMap({
  lessons: initialLessons,
  showPrintButton = false,
  userRole = "student",
  onLessonsUpdate,
  onRegisterRefetch,
  onEditLesson,
  refreshKey = 0,
  focusLessonDate = null,
}: ScheduleMapProps) {
  const [viewType, setViewType] = useState<ViewType>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<
    "portrait" | "landscape"
  >("landscape");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null); // For click-based interaction

  // Fixed data persistence - Seed local state from props and fetch client-side
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [_isLoadingLessons, setIsLoadingLessons] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const isWideViewportMeasured = useScheduleMapWideViewport();
  const isNarrowViewport = isWideViewportMeasured === false;
  const canRenderWideCalendarGrid = isWideViewportMeasured !== false;

  useEffect(() => {
    if (!isNarrowViewport) return;
    setViewType((current) =>
      coerceScheduleMapViewTypeForViewport(current, false),
    );
  }, [isNarrowViewport]);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

  const fetchLessons = useCallback(
    async (options?: ScheduleMapRefetchOptions) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoadingLessons(true);

      try {
        let rangeAnchor = currentDate;
        if (options?.focusDate) {
          const parsed =
            options.focusDate instanceof Date
              ? options.focusDate
              : new Date(options.focusDate);
          if (!Number.isNaN(parsed.getTime())) {
            rangeAnchor = parsed;
          }
        }

        let fromDate: Date;
        let toDate: Date;

        if (viewType === "day") {
          fromDate = rangeAnchor;
          toDate = rangeAnchor;
        } else if (viewType === "week") {
          fromDate = startOfWeek(rangeAnchor, { weekStartsOn: 1 });
          toDate = endOfWeek(rangeAnchor, { weekStartsOn: 1 });
        } else {
          fromDate = startOfMonth(rangeAnchor);
          toDate = endOfMonth(rangeAnchor);
        }

        const fromStr = format(fromDate, "yyyy-MM-dd");
        const toStr = format(toDate, "yyyy-MM-dd");

        const response = await fetch(
          `/api/${userRole}/lessons?from=${fromStr}&to=${toStr}&t=${Date.now()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch lessons");
        }

        const data = await safeReadJson(response);
        const payloadObj = isRecord(data) ? data : {};
        const dataObj = isRecord(payloadObj.data) ? payloadObj.data : {};
        const fetchedLessons = safeGetArray(
          dataObj.lessons ?? payloadObj.lessons,
        );

        const processedLessons: Lesson[] = (fetchedLessons as unknown[]).map(
          (lesson) => {
            const l = isRecord(lesson) ? lesson : {};
            return {
              ...l,
              lessonDate: new Date(String(l.lessonDate ?? "")),
            } as Lesson;
          },
        );

        setLessons(processedLessons);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching lessons:", error);
        }
      } finally {
        setIsLoadingLessons(false);
      }
    },
    [viewType, currentDate, userRole],
  );

  useEffect(() => {
    if (!focusLessonDate) return;
    const focused = new Date(focusLessonDate);
    if (!Number.isNaN(focused.getTime())) {
      setCurrentDate(focused);
    }
  }, [focusLessonDate]);

  useEffect(() => {
    void fetchLessons();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLessons, refreshKey]);

  useEffect(() => {
    onRegisterRefetch?.(fetchLessons);
  }, [fetchLessons, onRegisterRefetch]);

  // Update current time every minute for the time indicator (Lisbon GMT/UTC)
  useEffect(() => {
    const updateCurrentTime = () => {
      // Get current time in Lisbon timezone (Europe/Lisbon)
      const lisbonTime = toZonedTime(new Date(), "Europe/Lisbon");
      setCurrentTime(lisbonTime);
    };

    updateCurrentTime(); // Initial update
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch all instructors (not just those with lessons)
  const [allInstructors, setAllInstructors] = useState<
    { id: string; name: string; userId: string }[]
  >([]);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);

  // Fetch all instructors on component mount
  useEffect(() => {
    // Only the SUPER_ADMIN needs the list of instructors (for the filter).
    if (userRole !== "admin") return;

    const fetchInstructors = async () => {
      try {
        setIsLoadingInstructors(true);
        const res = await fetch("/api/admin/instructors/all", {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await safeReadJson(res);
        const payloadObj = isRecord(data) ? data : {};
        const instructorsList = safeGetArray(payloadObj.instructors);
        setAllInstructors(
          instructorsList.filter(isRecord).map((instructor) => ({
            id: String(instructor.id ?? ""),
            name: String(instructor.name ?? ""),
            userId: String(instructor.userId ?? ""),
          })),
        );
      } catch (e) {
        // optional: console.error(e);
      } finally {
        setIsLoadingInstructors(false);
      }
    };

    fetchInstructors();
  }, [userRole]);

  const instructors = allInstructors;

  // Filter lessons by selected instructor
  const filteredLessons = useMemo(() => {
    if (selectedInstructor === "all") {
      return lessons;
    }

    return lessons.filter((lesson) => {
      if (!lesson.instructor?.user) return false;
      // Match by instructor user ID
      return lesson.instructor.user.id === selectedInstructor;
    });
  }, [lessons, selectedInstructor]);

  const handlePrint = () => {
    // Create a style element to set print orientation
    const styleId = "dynamic-print-orientation";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Set the orientation-specific CSS
    styleElement.textContent = `
      @media print {
        @page {
          size: ${printOrientation};
          margin: 1cm;
        }
      }
    `;

    window.print();
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (viewType === "day") {
      setCurrentDate(
        direction === "prev"
          ? subDays(currentDate, 1)
          : addDays(currentDate, 1),
      );
    } else if (viewType === "week") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1),
      );
    } else {
      setCurrentDate(
        direction === "prev"
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1),
      );
    }
  };

  const handleEditLesson = (lessonId: string) => {
    if (onEditLesson) {
      onEditLesson(lessonId);
      return;
    }

    router.push(`/admin/lessons/edit/${lessonId}`);
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete lesson");
      }

      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });

      if (onLessonsUpdate) {
        await onLessonsUpdate();
      } else {
        await fetchLessons();
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setLessonToDelete(null);
    }
  };

  // Convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Check if two time ranges overlap
  const timesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ) => {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  };

  // Check if the class has already ended in relation to the currentTime
  const isLessonPast = (lesson: Lesson): boolean => {
    if (!lesson.lessonDate || !lesson.endTime) return false;

    const lessonDate =
      lesson.lessonDate instanceof Date
        ? lesson.lessonDate
        : new Date(lesson.lessonDate);

    const [endHour, endMin] = lesson.endTime.split(":").map(Number);
    const lessonEnd = new Date(lessonDate);
    lessonEnd.setHours(endHour, endMin, 0, 0);

    // If it's already marked as completed/cancelled, it also counts as "past"
    if (lesson.status === "COMPLETED" || lesson.status === "CANCELLED") {
      return true;
    }

    return currentTime > lessonEnd;
  };

  const canModifyLesson = (lesson: Lesson): boolean => {
    // Only admins and instructors can make changes
    if (userRole !== "admin" && userRole !== "instructor") return false;

    // If it's already passed, you can't change it
    if (isLessonPast(lesson)) return false;

    return true;
  };

  const lessonPendingDelete = useMemo(
    () => lessons.find((l) => l.id === lessonToDelete) ?? null,
    [lessons, lessonToDelete],
  );

  const canOpenDeleteDialog =
    !!lessonPendingDelete && canModifyLesson(lessonPendingDelete);

  useEffect(() => {
    // Hardening: if for any reason you try to open the delete section for the unmodifiable class,
    // we cleaned up the state and didn't open any dialogue.
    if (lessonToDelete && !canOpenDeleteDialog) {
      setLessonToDelete(null);
    }
  }, [lessonToDelete, canOpenDeleteDialog]);

  // Calculate lesson positions for continuous timeline
  const calculateLessonPosition = (lesson: Lesson, allDayLessons: Lesson[]) => {
    const startMinutes = timeToMinutes(lesson.startTime);
    const endMinutes = timeToMinutes(lesson.endTime);

    // Calculate top position and height (7:00 = 0, each hour = 5rem)
    const topPosition = ((startMinutes - 7 * 60) / 60) * 5; // in rem
    const height = ((endMinutes - startMinutes) / 60) * 5; // in rem

    // Find all lessons that overlap with this one
    const overlappingLessons = allDayLessons.filter((other) =>
      timesOverlap(
        lesson.startTime,
        lesson.endTime,
        other.startTime,
        other.endTime,
      ),
    );

    // Sort by start time, then by end time (longer lessons first)
    const sortedOverlapping = overlappingLessons.sort((a, b) => {
      const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (startDiff !== 0) return startDiff;
      return timeToMinutes(b.endTime) - timeToMinutes(a.endTime); // Longer lessons first
    });

    // Assign column index
    const columnIndex = sortedOverlapping.findIndex((l) => l.id === lesson.id);
    const totalColumns = sortedOverlapping.length;

    // Calculate width and left offset
    const widthPercent = 100 / totalColumns;
    const leftPercent = columnIndex * widthPercent;

    return {
      top: topPosition,
      height: height,
      left: leftPercent,
      width: widthPercent,
      columnIndex,
      totalColumns,
    };
  };

  // Get all lessons for a specific date
  const getLessonsForDate = (date: Date) => {
    return filteredLessons.filter((lesson) => {
      const lessonDate = new Date(lesson.lessonDate);
      return isSameDay(lessonDate, date);
    });
  };

  const getDateRange = () => {
    if (viewType === "day") {
      return [currentDate];
    } else if (viewType === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const getLessonColor = (lesson: Lesson) =>
    getScheduleMapLessonColorClasses({
      lessonType: lesson.lessonType,
      status: lesson.status,
      instructorInactive: isScheduleMapLessonInstructorInactive(lesson),
      vehicleProblematic: isScheduleMapLessonVehicleProblematic(lesson),
    });

  const dates = getDateRange();

  // Calculate current time indicator position for day/week view
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    // Only show if within schedule hours (7h-20h)
    if (hours < 7 || hours >= 20) return null;

    // Calculate position: each hour row is 5rem (80px)
    const hoursSince7am = hours - 7;
    const minutesFraction = minutes / 60;
    const totalHours = hoursSince7am + minutesFraction;
    const topPosition = totalHours * 5; // 5rem per hour

    return topPosition;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <>
      <Card
        className="schedule-map-container"
        data-testid={SMOKE_TESTIDS.scheduleMap}
        onClick={() => setSelectedLesson(null)}
      >
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Schedule Map</span>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Navigation controls - All views */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("prev")}
                  className={SCHEDULE_MAP_NAV_ICON_BUTTON_CLASS}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(new Date())}
                  className="h-11 sm:h-8 text-sm"
                >
                  Today
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("next")}
                  className={SCHEDULE_MAP_NAV_ICON_BUTTON_CLASS}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Instructor Filter - Available for admin only */}
              {userRole === "admin" && (
                <Select
                  value={selectedInstructor}
                  onValueChange={setSelectedInstructor}
                  disabled={isLoadingInstructors}
                >
                  <SelectTrigger className="w-48 h-11 sm:h-8">
                    <SelectValue
                      placeholder={
                        isLoadingInstructors ? "Loading..." : "All Instructors"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Instructors</SelectItem>
                    {!isLoadingInstructors && instructors.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No instructors found
                      </div>
                    )}
                    {!isLoadingInstructors &&
                      instructors.map((instructor) => (
                        <SelectItem
                          key={instructor.id}
                          value={instructor.userId}
                        >
                          {instructor.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={viewType}
                onValueChange={(value: ViewType) => setViewType(value)}
              >
                <SelectTrigger className="w-28 h-11 sm:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week" disabled={isNarrowViewport}>
                    Week
                  </SelectItem>
                  <SelectItem value="month" disabled={isNarrowViewport}>
                    Month
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Print button - Admin or showPrintButton */}
              {(userRole === "admin" || showPrintButton) &&
                (viewType === "week" || viewType === "month") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 print:hidden"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setPrintOrientation("landscape");
                          setTimeout(handlePrint, 100);
                        }}
                      >
                        Print Landscape
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setPrintOrientation("portrait");
                          setTimeout(handlePrint, 100);
                        }}
                      >
                        Print Portrait
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            {viewType === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
            {viewType === "week" &&
              `${format(dates[0], "MMM d")} - ${format(dates[dates.length - 1], "MMM d, yyyy")}`}
            {viewType === "month" && format(currentDate, "MMMM yyyy")}
          </p>
          {isNarrowViewport ? (
            <p className="text-xs text-muted-foreground mt-2">
              {SCHEDULE_MAP_NARROW_VIEW_HELPER}
            </p>
          ) : null}
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto max-w-full">
            <div className="min-w-0 w-full relative">
              {shouldRenderScheduleMapWideGrid(
                "month",
                canRenderWideCalendarGrid,
              ) && viewType === "month" ? (
                // Month view - Calendar grid
                <div className="grid grid-cols-7 gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center font-semibold text-sm p-2 bg-gray-100 border"
                      >
                        {day}
                      </div>
                    ),
                  )}
                  {dates.map((date, idx) => {
                    const dayLessons = filteredLessons.filter((lesson) =>
                      isSameDay(new Date(lesson.lessonDate), date),
                    );
                    const isToday = isSameDay(date, new Date());

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCurrentDate(date);
                          setViewType("day");
                        }}
                        className={`min-h-24 p-2 border cursor-pointer hover:bg-gray-50 transition-colors ${
                          isToday ? "bg-blue-50 border-blue-300" : "bg-white"
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isToday ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          {format(date, "d")}
                        </div>
                        <div className="space-y-1">
                          {dayLessons.slice(0, 3).map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`relative text-xs p-1 rounded border overflow-hidden ${getLessonColor(lesson)} transition-shadow duration-200 cursor-pointer ${
                                selectedLesson === lesson.id
                                  ? "z-50 shadow-md"
                                  : "hover:shadow-sm"
                              }`}
                              title={`${lesson.startTime} - ${getStudentDisplayName(lesson.student)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLesson(
                                  selectedLesson === lesson.id
                                    ? null
                                    : lesson.id,
                                );
                              }}
                            >
                              <div className="truncate">{lesson.startTime}</div>

                              {/* Expanded click card for month view */}
                              {selectedLesson === lesson.id && (
                                <div className="absolute left-0 top-full mt-1 p-3 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 min-w-[200px]">
                                  <div className="text-sm space-y-2">
                                    <div className="font-semibold border-b pb-1">
                                      {lesson.startTime} - {lesson.endTime}
                                    </div>
                                    {lesson.student && (
                                      <div>
                                        <span className="font-medium">
                                          Student:
                                        </span>{" "}
                                        {getStudentDisplayName(lesson.student)}
                                      </div>
                                    )}
                                    {lesson.instructor && (
                                      <div>
                                        <span className="font-medium">
                                          Instructor:
                                        </span>{" "}
                                        {lesson.instructor.user.firstName}{" "}
                                        {lesson.instructor.user.lastName}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Type:</span>{" "}
                                      {lesson.lessonType}
                                    </div>
                                    {lesson.vehicle && (
                                      <div>
                                        <span className="font-medium">
                                          Vehicle:
                                        </span>{" "}
                                        {lesson.vehicle.registrationNumber}
                                      </div>
                                    )}
                                    <ScheduleMapExpandedOperationalWarnings
                                      lesson={lesson}
                                    />
                                    {lesson.category && (
                                      <div>
                                        <span className="font-medium">
                                          Category:
                                        </span>{" "}
                                        {lesson.category.name}
                                      </div>
                                    )}
                                    {/* Edit/Delete buttons - Available for admin and instructor */}
                                    {(userRole === "admin" ||
                                      userRole === "instructor") && (
                                      <div className="flex gap-2 sm:gap-1 pt-2 border-t justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson))
                                              return;
                                            handleEditLesson(lesson.id);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className={
                                            SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS
                                          }
                                          title="Edit lesson"
                                          aria-label="Edit lesson"
                                        >
                                          <Edit
                                            className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-blue-600`}
                                          />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson))
                                              return;
                                            setLessonToDelete(lesson.id);
                                            setSelectedLesson(null);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className={
                                            SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS
                                          }
                                          title="Delete lesson"
                                          aria-label="Delete lesson"
                                        >
                                          <Trash2
                                            className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-red-600`}
                                          />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {dayLessons.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{dayLessons.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : shouldRenderScheduleMapWideGrid(
                  "week",
                  canRenderWideCalendarGrid,
                ) && viewType === "week" ? (
                // Week view - 7-column grid with compact lesson chips (similar to month view)
                <div className="grid grid-cols-7 gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center font-semibold text-sm p-2 bg-gray-100 border"
                      >
                        {day}
                      </div>
                    ),
                  )}
                  {dates.map((date, idx) => {
                    const dayLessons = filteredLessons.filter((lesson) =>
                      isSameDay(new Date(lesson.lessonDate), date),
                    );
                    const isToday = isSameDay(date, new Date());

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCurrentDate(date);
                          setViewType("day");
                        }}
                        className={`min-h-32 p-2 border cursor-pointer hover:bg-gray-50 transition-colors ${
                          isToday ? "bg-blue-50 border-blue-300" : "bg-white"
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isToday ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          {format(date, "EEE d")}
                        </div>
                        <div className="space-y-1">
                          {dayLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`relative text-xs p-1 rounded border overflow-hidden ${getLessonColor(lesson)} transition-shadow duration-200 cursor-pointer ${
                                selectedLesson === lesson.id
                                  ? "z-50 shadow-md"
                                  : "hover:shadow-sm"
                              }`}
                              title={`${lesson.startTime} - ${getStudentDisplayName(lesson.student)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLesson(
                                  selectedLesson === lesson.id
                                    ? null
                                    : lesson.id,
                                );
                              }}
                            >
                              <div className="truncate font-medium">
                                {lesson.startTime}
                              </div>
                              <div className="truncate text-[10px]">
                                {lesson.student
                                  ? getStudentDisplayName(lesson.student)
                                  : "N/A"}
                              </div>

                              {/* Expanded click card for week view */}
                              {selectedLesson === lesson.id && (
                                <div className="absolute left-0 top-full mt-1 p-3 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 min-w-[200px]">
                                  <div className="text-sm space-y-2">
                                    <div className="font-semibold border-b pb-1">
                                      {lesson.startTime} - {lesson.endTime}
                                    </div>
                                    {lesson.student && (
                                      <div>
                                        <span className="font-medium">
                                          Student:
                                        </span>{" "}
                                        {getStudentDisplayName(lesson.student)}
                                      </div>
                                    )}
                                    {lesson.instructor && (
                                      <div>
                                        <span className="font-medium">
                                          Instructor:
                                        </span>{" "}
                                        {lesson.instructor.user.firstName}{" "}
                                        {lesson.instructor.user.lastName}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Type:</span>{" "}
                                      {lesson.lessonType}
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Status:
                                      </span>{" "}
                                      {lesson.status}
                                    </div>
                                    {lesson.vehicle && (
                                      <div>
                                        <span className="font-medium">
                                          Vehicle:
                                        </span>{" "}
                                        {lesson.vehicle.registrationNumber}
                                      </div>
                                    )}
                                    <ScheduleMapExpandedOperationalWarnings
                                      lesson={lesson}
                                    />
                                    {lesson.category && (
                                      <div>
                                        <span className="font-medium">
                                          Category:
                                        </span>{" "}
                                        {lesson.category.name}
                                      </div>
                                    )}
                                    {/* Edit/Delete buttons - Available for admin and instructor */}
                                    {(userRole === "admin" ||
                                      userRole === "instructor") && (
                                      <div className="flex gap-2 sm:gap-1 pt-2 border-t justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson))
                                              return;
                                            handleEditLesson(lesson.id);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className={
                                            SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS
                                          }
                                          title="Edit lesson"
                                          aria-label="Edit lesson"
                                        >
                                          <Edit
                                            className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-blue-600`}
                                          />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson))
                                              return;
                                            setLessonToDelete(lesson.id);
                                            setSelectedLesson(null);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className={
                                            SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS
                                          }
                                          title="Delete lesson"
                                          aria-label="Delete lesson"
                                        >
                                          <Trash2
                                            className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-red-600`}
                                          />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Day view - Google Calendar style with expandable slots
                <div className="relative">
                  <div className="flex border-t">
                    {/* Time column */}
                    <div className="w-20 flex-shrink-0 border-r bg-gray-50 sticky left-0 z-10">
                      <div className="h-12 border-b bg-gray-100 flex items-center justify-center text-sm font-semibold">
                        Time
                      </div>
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="h-20 border-b flex items-start justify-center pt-1 text-sm font-medium text-gray-600"
                        >
                          {`${hour}:00`}
                        </div>
                      ))}
                    </div>

                    {/* Date columns */}
                    {dates.map((date, dateIdx) => {
                      const dayLessons = getLessonsForDate(date);
                      const isToday = isSameDay(date, new Date());

                      return (
                        <div
                          key={dateIdx}
                          className="flex-1 min-w-40 border-r relative"
                        >
                          {/* Date header - Updated for Week view consistency */}
                          <div
                            onClick={() => {
                              setCurrentDate(date);
                              setViewType("day");
                            }}
                            className={`h-12 border-b flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors ${
                              isToday ? "bg-blue-100" : "bg-gray-100"
                            }`}
                          >
                            <div className="text-xs font-semibold truncate max-w-full px-1">
                              {format(date, "EEE")}
                            </div>
                            <div className="text-sm font-bold">
                              {format(date, "d")}
                            </div>
                            <div className="text-xs font-normal truncate max-w-full px-1">
                              {format(date, "MMM")}
                            </div>
                          </div>

                          {/* Hour grid lines */}
                          <div className="absolute inset-0 top-12 pointer-events-none">
                            {hours.map((hour) => (
                              <div
                                key={hour}
                                className="h-20 border-b"
                                style={{ position: "relative" }}
                              />
                            ))}
                          </div>

                          {/* Lessons container with absolute positioning */}
                          <div className="absolute inset-0 top-12 overflow-hidden">
                            {dayLessons.map((lesson) => {
                              const position = calculateLessonPosition(
                                lesson,
                                dayLessons,
                              );
                              const isExpanded = selectedLesson === lesson.id;
                              const preferInstructor = userRole === "student";

                              return (
                                <div
                                  key={lesson.id}
                                  className={`absolute rounded border cursor-pointer transition-shadow duration-200 ${getLessonColor(lesson)} ${
                                    isExpanded
                                      ? "z-50 shadow-lg border-2"
                                      : "hover:shadow-md overflow-hidden"
                                  }`}
                                  style={{
                                    top: `${position.top}rem`,
                                    height: isExpanded
                                      ? "auto"
                                      : `${Math.max(position.height, 2)}rem`,
                                    minHeight: `${Math.max(position.height, 2)}rem`,
                                    maxHeight: isExpanded
                                      ? "12rem"
                                      : `${Math.max(position.height, 2)}rem`,
                                    left: `${position.left}%`,
                                    width: `calc(${position.width}% - 4px)`,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLesson(
                                      isExpanded ? null : lesson.id,
                                    );
                                  }}
                                >
                                  {viewType === "day" && !isExpanded && (
                                    <div className="h-full min-h-0 p-1 text-[10px]">
                                      <ScheduleLessonChipBody
                                        lesson={lesson}
                                        preferInstructor={preferInstructor}
                                      />
                                    </div>
                                  )}

                                  {viewType === "day" && isExpanded && (
                                    <div className="relative p-2 max-h-48 overflow-y-auto overflow-x-hidden">
                                      {/* Edit/Remove buttons - Top-right corner, icon-only */}
                                      {(userRole === "admin" ||
                                        userRole === "instructor") && (
                                        <div className="absolute top-2 right-2 flex gap-2 sm:gap-1 print:hidden z-10">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canModifyLesson(lesson))
                                                return;
                                              handleEditLesson(lesson.id);
                                            }}
                                            disabled={!canModifyLesson(lesson)}
                                            className={
                                              SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS
                                            }
                                            title="Edit lesson"
                                            aria-label="Edit lesson"
                                          >
                                            <Edit
                                              className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-blue-600`}
                                            />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canModifyLesson(lesson))
                                                return;
                                              setLessonToDelete(lesson.id);
                                              setSelectedLesson(null);
                                            }}
                                            disabled={!canModifyLesson(lesson)}
                                            className={
                                              SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS
                                            }
                                            title="Delete lesson"
                                            aria-label="Delete lesson"
                                          >
                                            <Trash2
                                              className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-red-600`}
                                            />
                                          </Button>
                                        </div>
                                      )}

                                      {/* Content with fixed text size (text-xs) */}
                                      <div className="pr-28 sm:pr-16 text-xs space-y-1">
                                        <div className="font-semibold text-xs border-b pb-1 mb-2">
                                          {lesson.startTime} - {lesson.endTime}
                                        </div>
                                        {lesson.student && (
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Student:
                                            </span>{" "}
                                            {getStudentDisplayName(
                                              lesson.student,
                                            )}
                                          </div>
                                        )}
                                        {lesson.instructor && (
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Instructor:
                                            </span>{" "}
                                            {lesson.instructor.user.firstName}{" "}
                                            {lesson.instructor.user.lastName}
                                          </div>
                                        )}
                                        <div className="text-xs">
                                          <span className="font-medium">
                                            Type:
                                          </span>{" "}
                                          {lesson.lessonType}
                                        </div>
                                        <div className="text-xs">
                                          <span className="font-medium">
                                            Status:
                                          </span>{" "}
                                          {lesson.status}
                                        </div>
                                        {lesson.vehicle && (
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Vehicle:
                                            </span>{" "}
                                            {lesson.vehicle.registrationNumber}{" "}
                                            ({lesson.vehicle.make}{" "}
                                            {lesson.vehicle.model})
                                          </div>
                                        )}
                                        <ScheduleMapExpandedOperationalWarnings
                                          lesson={lesson}
                                        />
                                        {lesson.category && (
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Category:
                                            </span>{" "}
                                            {lesson.category.name}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Week view - Aligned with Month (Google Calendar consistency) */}
                                  {(viewType as ViewType) === "week" &&
                                    !isExpanded && (
                                      // Collapsed state - Time and instructor
                                      <div className="p-1 text-xs overflow-hidden">
                                        <div className="font-semibold text-xs truncate">
                                          {lesson.startTime}
                                        </div>
                                        <div className="truncate text-xs">
                                          {lesson.instructor?.user.firstName}{" "}
                                          {lesson.instructor?.user.lastName}
                                        </div>
                                      </div>
                                    )}

                                  {(viewType as ViewType) === "week" &&
                                    isExpanded && (
                                      // Expanded state with all details
                                      <div className="relative p-2 max-h-[400px] overflow-y-auto">
                                        {/* Edit/Remove buttons - Top-right corner, icon-only */}
                                        {(userRole === "admin" ||
                                          userRole === "instructor") && (
                                          <div className="absolute top-2 right-2 flex gap-2 sm:gap-1 print:hidden z-10">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!canModifyLesson(lesson))
                                                  return;
                                                handleEditLesson(lesson.id);
                                              }}
                                              disabled={
                                                !canModifyLesson(lesson)
                                              }
                                              className={
                                                SCHEDULE_MAP_LESSON_ACTION_EDIT_CLASS
                                              }
                                              title="Edit lesson"
                                              aria-label="Edit lesson"
                                            >
                                              <Edit
                                                className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-blue-600`}
                                              />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!canModifyLesson(lesson))
                                                  return;
                                                setLessonToDelete(lesson.id);
                                                setSelectedLesson(null);
                                              }}
                                              disabled={
                                                !canModifyLesson(lesson)
                                              }
                                              className={
                                                SCHEDULE_MAP_LESSON_ACTION_DELETE_CLASS
                                              }
                                              title="Delete lesson"
                                              aria-label="Delete lesson"
                                            >
                                              <Trash2
                                                className={`${SCHEDULE_MAP_LESSON_ACTION_ICON_CLASS} text-red-600`}
                                              />
                                            </Button>
                                          </div>
                                        )}

                                        <div className="pr-28 sm:pr-16 text-xs space-y-1">
                                          <div className="font-semibold text-xs border-b pb-1 mb-2">
                                            {lesson.startTime} -{" "}
                                            {lesson.endTime}
                                          </div>
                                          {lesson.student && (
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                Student:
                                              </span>{" "}
                                              {getStudentDisplayName(
                                                lesson.student,
                                              )}
                                            </div>
                                          )}
                                          {lesson.instructor && (
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                Instructor:
                                              </span>{" "}
                                              {lesson.instructor.user.firstName}{" "}
                                              {lesson.instructor.user.lastName}
                                            </div>
                                          )}
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Type:
                                            </span>{" "}
                                            {lesson.lessonType}
                                          </div>
                                          <div className="text-xs">
                                            <span className="font-medium">
                                              Status:
                                            </span>{" "}
                                            {lesson.status}
                                          </div>
                                          {lesson.vehicle && (
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                Vehicle:
                                              </span>{" "}
                                              {
                                                lesson.vehicle
                                                  .registrationNumber
                                              }{" "}
                                              ({lesson.vehicle.make}{" "}
                                              {lesson.vehicle.model})
                                            </div>
                                          )}
                                          <ScheduleMapExpandedOperationalWarnings
                                            lesson={lesson}
                                          />
                                          {lesson.category && (
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                Category:
                                              </span>{" "}
                                              {lesson.category.name}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Current Time Indicator for this date */}
                          {currentTimePosition !== null && isToday && (
                            <div
                              className="absolute left-0 right-0 h-0.5 bg-orange-500 pointer-events-none z-20 print:hidden"
                              style={{
                                top: `${currentTimePosition + 3}rem`, // Offset for header height (3rem)
                              }}
                            >
                              {/* Orange circle marker on the left */}
                              <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-orange-500 rounded-full" />
                              {/* Time label - only show on first column to avoid duplicates */}
                              {dateIdx === 0 && (
                                <div className="absolute left-2 -top-3 bg-orange-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                  {format(currentTime, "HH:mm")} Lisbon
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs print:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-blue-50 border border-blue-300"></div>
              <span>Driving Lesson</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-50 border border-green-300"></div>
              <span>Theory Lesson</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-400"></div>
              <span>Theoretical Exam</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-400"></div>
              <span>Practical Exam</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-100 border-green-300"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-100 border-red-300"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={canOpenDeleteDialog}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
              disabled={isDeleting || !canOpenDeleteDialog}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
