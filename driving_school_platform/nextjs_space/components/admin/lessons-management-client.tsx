"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Car,
  ChevronDown,
  Download,
  FileText,
  Clock,
  RefreshCw,
  Upload,
} from "lucide-react";
import { FeatureGate } from "@/components/license/feature-gate";
import { useToast } from "@/hooks/use-toast";
import { PracticalLessonsImportDialog } from "@/components/admin/practical-lessons-import-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchPracticalLessonsExport,
  type PracticalLessonsExportFormat,
} from "@/lib/lessons/practical-lessons-export-client";
import { parseAdminDashboardLessonsPayload } from "@/lib/lessons/admin-dashboard-lessons-response";
import { ADMIN_DASHBOARD_LESSONS_LIST_LIMIT } from "@/lib/lessons/admin-dashboard-lessons-truncation";
import {
  getExamLessonTypeLabel,
  getLessonDateLabel,
  getLessonInstructorName,
  getLessonLocationLabel,
  getLessonParticipantName,
  getLessonVehicleLabel,
  getLessonStatusDisplayLabel,
  getPracticalLessonNumberLabel,
  getLessonVehicleWarning,
  isLessonInstructorInactive,
  LESSON_INACTIVE_INSTRUCTOR_WARNING,
} from "@/lib/lessons/lesson-display";
import {
  getLessonManagementTabActiveClass,
  getLessonTypeDotColorClass,
} from "@/lib/lessons/lesson-type-ui-theme";
import { LESSON_TYPES } from "@/lib/constants";
import { SMOKE_TESTIDS } from "@/lib/smoke/smoke-testids";

async function tryReadJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type LessonView = "CODE" | "DRIVING" | "EXAMS";

/** Dashboard list row — same minimized list DTO as GET /api/admin/lessons (`LESSON_LIST_SELECT`). */
type LessonListItem = {
  id: string | number;
  lessonDate?: string | Date | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  lessonType?: string | null;
  practicalLessonNumber?: number | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;

  category?: { name?: string | null } | null;
  vehicle?: {
    registrationNumber?: string | null;
    make?: string | null;
    model?: string | null;
    isActive?: boolean | null;
    underMaintenance?: boolean | null;
    status?: string | null;
  } | null;

  student?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    schoolStudentId?: string | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
  instructor?: {
    isAvailableForBooking?: boolean | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

export function LessonsManagementClient() {
  const [selectedView, setSelectedView] = useState<LessonView>("DRIVING");
  const [recentLessons, setRecentLessons] = useState<LessonListItem[]>([]);
  const [currentLessons, setCurrentLessons] = useState<LessonListItem[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<LessonListItem[]>([]);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [upcomingHasMore, setUpcomingHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [exportingFormat, setExportingFormat] =
    useState<PracticalLessonsExportFormat | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/lessons?view=${selectedView}&t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch lessons");
      }

      const raw = await tryReadJson<unknown>(response);
      if (!raw) throw new Error("Failed to parse lessons response");

      const {
        recent,
        current,
        upcoming,
        recentHasMore: hasMoreRecent,
        upcomingHasMore: hasMoreUpcoming,
      } = parseAdminDashboardLessonsPayload<LessonListItem>(raw);

      setRecentLessons(recent);
      setCurrentLessons(current);
      setUpcomingLessons(upcoming);
      setRecentHasMore(hasMoreRecent);
      setUpcomingHasMore(hasMoreUpcoming);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching lessons:", error);
      toast({
        title: "Error",
        description: "Failed to fetch lessons. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedView, toast]);

  const handleRefresh = () => {
    fetchLessons();
    toast({
      title: "Refreshed",
      description: "Lesson data has been updated.",
    });
  };

  const handleExport = async (format: PracticalLessonsExportFormat) => {
    setExportingFormat(format);
    try {
      const result = await fetchPracticalLessonsExport(format);
      if (!result.ok) {
        toast({
          title: "Export failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Download started",
        description: result.filename,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    void fetchLessons();
  }, [fetchLessons]);

  // Poll for new data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLessons();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLessons]);

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLessons();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also listen for focus events
    const handleFocus = () => {
      fetchLessons();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLessons]);

  const listNoun = selectedView === "EXAMS" ? "exams" : "lessons";

  const renderTruncationNotice = (hasMore: boolean) => {
    if (!hasMore) return null;

    return (
      <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
        Showing first {ADMIN_DASHBOARD_LESSONS_LIST_LIMIT} {listNoun} in this
        window.{" "}
        <Link href="/admin" className="underline hover:text-foreground">
          Open Schedule Map
        </Link>{" "}
        for full calendar.
      </p>
    );
  };

  const renderLesson = (lesson: LessonListItem) => {
    const isExamsTab = selectedView === "EXAMS";
    const studentName = getLessonParticipantName(lesson.student);
    const instructorName = getLessonInstructorName(lesson.instructor);
    const instructorInactive = isLessonInstructorInactive(lesson.instructor);
    const vehicleWarning = getLessonVehicleWarning(lesson.vehicle);
    const locationLabel = getLessonLocationLabel(lesson);
    const vehicleLabel = getLessonVehicleLabel(lesson.vehicle);
    const practicalLabel = getPracticalLessonNumberLabel(lesson);

    return (
      <div
        key={lesson.id}
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
      >
        <div className="flex items-center space-x-4">
          <div className="text-center min-w-[80px]">
            <div className="text-sm font-medium">
              {getLessonDateLabel(lesson.lessonDate)}
            </div>
            <div className="text-xs text-gray-500">{lesson.startTime}</div>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${getLessonTypeDotColorClass(
              isExamsTab
                ? lesson.lessonType
                : selectedView === "CODE"
                  ? LESSON_TYPES.THEORY
                  : LESSON_TYPES.DRIVING,
            )}`}
          />
          <div>
            {isExamsTab ? (
              <>
                <div className="font-medium">
                  {getExamLessonTypeLabel(lesson.lessonType)}
                  {lesson.category?.name ? ` — ${lesson.category.name}` : ""}
                </div>
                {studentName ? (
                  <div className="text-sm text-gray-600">{studentName}</div>
                ) : null}
                {instructorName ? (
                  <div className="text-sm text-gray-600">
                    Instructor: {instructorName}
                    {instructorInactive ? (
                      <span className="ml-2 text-xs font-medium text-red-700">
                        ({LESSON_INACTIVE_INSTRUCTOR_WARNING})
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {locationLabel ? (
                  <div className="text-sm text-gray-500">
                    Location: {locationLabel}
                  </div>
                ) : null}
                {vehicleLabel ? (
                  <div className="text-sm text-gray-500">
                    Vehicle: {vehicleLabel}
                    {vehicleWarning ? (
                      <span className="ml-2 text-xs font-medium text-red-700">
                        ({vehicleWarning})
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="font-medium">
                  {studentName}
                  {practicalLabel ? (
                    <span className="ml-2 text-sm font-normal text-blue-700">
                      {practicalLabel}
                    </span>
                  ) : null}
                </div>
                {instructorName ? (
                  <div className="text-sm text-gray-600">
                    with {instructorName}
                    {instructorInactive ? (
                      <span className="ml-2 text-xs font-medium text-red-700">
                        ({LESSON_INACTIVE_INSTRUCTOR_WARNING})
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="text-sm text-gray-500">
                  {selectedView === "DRIVING" && vehicleLabel ? (
                    <>
                      Vehicle: {vehicleLabel}
                      {vehicleWarning ? (
                        <span className="ml-2 text-xs font-medium text-red-700">
                          ({vehicleWarning})
                        </span>
                      ) : null}
                      {" • "}
                    </>
                  ) : null}
                  {lesson.category?.name}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedView === "DRIVING" && lesson.vehicle && (
            <div className="text-right text-sm">
              <div className="font-medium">
                {lesson.vehicle.make} {lesson.vehicle.model}
              </div>
            </div>
          )}

          <Badge
            variant={
              lesson.status === "SCHEDULED"
                ? "default"
                : lesson.status === "COMPLETED"
                  ? "secondary"
                  : lesson.status === "IN_PROGRESS"
                    ? "default"
                    : lesson.status === "CANCELLED"
                      ? "destructive"
                      : "outline"
            }
          >
            {getLessonStatusDisplayLabel(lesson.status)}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <FeatureGate
      featureKey="LESSON_MANAGEMENT"
      fallback={
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Premium Feature
            </CardTitle>
            <CardDescription>
              Lesson Management is a premium feature. Please contact your
              administrator to enable this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <>
        {/* Header */}
        <div className="mb-8" data-testid={SMOKE_TESTIDS.lessonManagement}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Lesson Management
              </h1>
              <p className="text-gray-600 mt-2">
                Track recent and upcoming lessons across all categories.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedView === "DRIVING" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading || exportingFormat !== null}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {exportingFormat ? "Exporting…" : "Export"}
                        <ChevronDown className="w-4 h-4 ml-2 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={exportingFormat !== null}
                        onSelect={() => void handleExport("csv")}
                      >
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={exportingFormat !== null}
                        onSelect={() => void handleExport("json")}
                      >
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <div className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
          {selectedView === "DRIVING" ? (
            <p className="text-xs text-gray-500 mt-3">
              Export includes all practical (driving) lessons in your
              organization, not only the lessons shown on this dashboard.
            </p>
          ) : null}
        </div>

        {/* View Switcher */}
        <div className="flex space-x-2 mb-8">
          <Button
            variant={selectedView === "CODE" ? "default" : "outline"}
            onClick={() => setSelectedView("CODE")}
            className={
              selectedView === "CODE"
                ? getLessonManagementTabActiveClass("CODE")
                : ""
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            Code Lessons
          </Button>
          <Button
            variant={selectedView === "DRIVING" ? "default" : "outline"}
            onClick={() => setSelectedView("DRIVING")}
            data-testid={SMOKE_TESTIDS.lessonManagementDrivingTab}
            className={
              selectedView === "DRIVING"
                ? getLessonManagementTabActiveClass("DRIVING")
                : ""
            }
          >
            <Car className="w-4 h-4 mr-2" />
            Driving Lessons
          </Button>
          <Button
            variant={selectedView === "EXAMS" ? "default" : "outline"}
            onClick={() => setSelectedView("EXAMS")}
            className={
              selectedView === "EXAMS"
                ? getLessonManagementTabActiveClass("EXAMS")
                : ""
            }
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Exams
          </Button>
        </div>

        {/* Lessons Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Lessons/Exams */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedView === "EXAMS" ? "Recent Exams" : "Recent Lessons"}
              </CardTitle>
              <CardDescription>
                {selectedView === "EXAMS" ? "Exams" : "Lessons"} from yesterday
                and today that already occurred
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : recentLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No recent {selectedView === "EXAMS" ? "exams" : "lessons"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLessons.map(renderLesson)}
                  {renderTruncationNotice(recentHasMore)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Lessons/Exams */}
          <Card className="border-2 border-orange-300 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                {selectedView === "EXAMS" ? "Current Exams" : "Current Lessons"}
              </CardTitle>
              <CardDescription>
                {selectedView === "EXAMS" ? "Exams" : "Lessons"} happening right
                now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : currentLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No {selectedView === "EXAMS" ? "exams" : "lessons"} in
                    progress
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentLessons.map(renderLesson)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Lessons/Exams */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedView === "EXAMS"
                  ? "Upcoming Exams"
                  : "Upcoming Lessons"}
              </CardTitle>
              <CardDescription>
                {selectedView === "EXAMS" ? "Exams" : "Lessons"} scheduled for
                today (not yet occurred) and the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : upcomingLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No upcoming {selectedView === "EXAMS" ? "exams" : "lessons"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingLessons.map(renderLesson)}
                  {renderTruncationNotice(upcomingHasMore)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <PracticalLessonsImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onSuccess={() => {
            void fetchLessons();
          }}
        />
      </>
    </FeatureGate>
  );
}
