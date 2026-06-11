/**
 * Read-only Prisma queries for lesson list/calendar endpoints.
 * No HTTP, auth, or validation — callers pass resolved scope and dates.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  ADMIN_DASHBOARD_LESSONS_LIST_LIMIT,
  sliceAdminDashboardLessonsWithHasMore,
} from "@/lib/lessons/admin-dashboard-lessons-truncation";
import { EXAM_DASHBOARD_LESSON_TYPES } from "@/lib/lessons/lesson-display";
import { LESSON_NESTED_USER_SELECT } from "@/lib/users/user-public-select";
import { STUDENT_LESSON_OPERATIONAL_SELECT } from "@/lib/students/student-lesson-select";

export { EXAM_DASHBOARD_LESSON_TYPES };

/** Minimal nested selects for list/calendar/dashboard reads (LD-004–LD-006). */
export const LESSON_LIST_STUDENT_SELECT = {
  ...STUDENT_LESSON_OPERATIONAL_SELECT,
} satisfies Prisma.StudentSelect;

export const LESSON_LIST_INSTRUCTOR_SELECT = {
  id: true,
  isAvailableForBooking: true,
  user: { select: LESSON_NESTED_USER_SELECT },
} satisfies Prisma.InstructorSelect;

export const LESSON_LIST_VEHICLE_SELECT = {
  id: true,
  registrationNumber: true,
  make: true,
  model: true,
} satisfies Prisma.VehicleSelect;

export const LESSON_LIST_CATEGORY_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

/**
 * Prisma `select` for admin/instructor/student calendar and admin dashboard lists.
 * Omits unused Lesson scalars and full Student/Instructor/Vehicle/Category rows.
 */
export const LESSON_LIST_SELECT = {
  id: true,
  lessonType: true,
  status: true,
  lessonDate: true,
  startTime: true,
  endTime: true,
  pickupLocation: true,
  dropoffLocation: true,
  practicalLessonNumber: true,
  student: { select: LESSON_LIST_STUDENT_SELECT },
  instructor: { select: LESSON_LIST_INSTRUCTOR_SELECT },
  vehicle: { select: LESSON_LIST_VEHICLE_SELECT },
  category: { select: LESSON_LIST_CATEGORY_SELECT },
} satisfies Prisma.LessonSelect;

/** Nested selects for admin lesson detail GET / PUT response (edit form). */
export const LESSON_DETAIL_STUDENT_SELECT = {
  ...STUDENT_LESSON_OPERATIONAL_SELECT,
} satisfies Prisma.StudentSelect;

export const LESSON_DETAIL_INSTRUCTOR_SELECT = {
  id: true,
  userId: true,
  user: { select: LESSON_NESTED_USER_SELECT },
} satisfies Prisma.InstructorSelect;

/**
 * Prisma `select` for GET/PUT `/api/admin/lessons/[id]`.
 * Includes edit-form scalars and nested relations; omits payment, feedback, and full profile rows.
 */
export const LESSON_DETAIL_SELECT = {
  id: true,
  lessonType: true,
  status: true,
  lessonDate: true,
  startTime: true,
  endTime: true,
  vehicleId: true,
  studentId: true,
  instructorId: true,
  practicalLessonNumber: true,
  student: { select: LESSON_DETAIL_STUDENT_SELECT },
  instructor: { select: LESSON_DETAIL_INSTRUCTOR_SELECT },
  vehicle: { select: LESSON_LIST_VEHICLE_SELECT },
} satisfies Prisma.LessonSelect;

/** Minimal read for instructor access + past-lesson checks on update/delete. */
export const LESSON_DETAIL_ACCESS_SELECT = {
  id: true,
  lessonDate: true,
  endTime: true,
  instructor: { select: { userId: true } },
} satisfies Prisma.LessonSelect;

export type LessonDetailItem = Prisma.LessonGetPayload<{
  select: typeof LESSON_DETAIL_SELECT;
}>;

const CALENDAR_ORDER_BY: Prisma.LessonOrderByWithRelationInput[] = [
  { lessonDate: "asc" },
  { startTime: "asc" },
];

export type AdminDashboardView = "DRIVING" | "CODE" | "EXAMS";

export type AdminDashboardTimeWindow = {
  yesterday: Date;
  today: Date;
  tomorrow: Date;
  currentTime: string;
};

export async function getAdminCalendarLessons(input: {
  organizationId: string;
  fromDate: Date;
  toDateExclusive: Date;
}) {
  return prisma.lesson.findMany({
    where: {
      organizationId: input.organizationId,
      lessonDate: {
        gte: input.fromDate,
        lt: input.toDateExclusive,
      },
    },
    select: LESSON_LIST_SELECT,
    orderBy: CALENDAR_ORDER_BY,
  });
}

const DASHBOARD_TRUNCATED_LIST_TAKE = ADMIN_DASHBOARD_LESSONS_LIST_LIMIT + 1;

type DashboardLessonListRow = Prisma.LessonGetPayload<{
  select: typeof LESSON_LIST_SELECT;
}>;

export type AdminDashboardLessonsQueryResult = {
  recent: DashboardLessonListRow[];
  current: DashboardLessonListRow[];
  upcoming: DashboardLessonListRow[];
  recentHasMore: boolean;
  upcomingHasMore: boolean;
};

function mapTruncatedDashboardLists(
  recentRaw: AdminDashboardLessonsQueryResult["recent"],
  current: AdminDashboardLessonsQueryResult["current"],
  upcomingRaw: AdminDashboardLessonsQueryResult["upcoming"],
): AdminDashboardLessonsQueryResult {
  const recentSlice = sliceAdminDashboardLessonsWithHasMore(recentRaw);
  const upcomingSlice = sliceAdminDashboardLessonsWithHasMore(upcomingRaw);

  return {
    recent: recentSlice.items,
    current,
    upcoming: upcomingSlice.items,
    recentHasMore: recentSlice.hasMore,
    upcomingHasMore: upcomingSlice.hasMore,
  };
}

export async function getAdminDashboardLessons(input: {
  organizationId: string;
  view: AdminDashboardView;
  time: AdminDashboardTimeWindow;
}): Promise<AdminDashboardLessonsQueryResult> {
  const { organizationId, view, time } = input;
  const { yesterday, today, tomorrow, currentTime } = time;

  if (view === "EXAMS") {
    const [recentRaw, current, upcomingRaw] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          organizationId,
          lessonType: { in: [...EXAM_DASHBOARD_LESSON_TYPES] },
          OR: [
            { lessonDate: yesterday },
            { lessonDate: today, startTime: { lt: currentTime } },
          ],
        },
        select: LESSON_LIST_SELECT,
        orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
        take: DASHBOARD_TRUNCATED_LIST_TAKE,
      }),
      prisma.lesson.findMany({
        where: {
          organizationId,
          lessonType: { in: [...EXAM_DASHBOARD_LESSON_TYPES] },
          lessonDate: today,
          startTime: { lte: currentTime },
          endTime: { gt: currentTime },
        },
        select: LESSON_LIST_SELECT,
        orderBy: [{ startTime: "asc" }],
      }),
      prisma.lesson.findMany({
        where: {
          organizationId,
          lessonType: { in: [...EXAM_DASHBOARD_LESSON_TYPES] },
          OR: [
            { lessonDate: today, startTime: { gte: currentTime } },
            { lessonDate: { gt: today, lte: tomorrow } },
          ],
        },
        select: LESSON_LIST_SELECT,
        orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
        take: DASHBOARD_TRUNCATED_LIST_TAKE,
      }),
    ]);
    return mapTruncatedDashboardLists(recentRaw, current, upcomingRaw);
  }

  const lessonType = view === "CODE" ? "THEORY" : "DRIVING";

  const [recentRaw, current, upcomingRaw] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        organizationId,
        lessonType,
        OR: [
          { lessonDate: yesterday },
          { lessonDate: today, startTime: { lt: currentTime } },
        ],
      },
      select: LESSON_LIST_SELECT,
      orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
      take: DASHBOARD_TRUNCATED_LIST_TAKE,
    }),
    prisma.lesson.findMany({
      where: {
        organizationId,
        lessonType,
        lessonDate: today,
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
      },
      select: LESSON_LIST_SELECT,
      orderBy: [{ startTime: "asc" }],
    }),
    prisma.lesson.findMany({
      where: {
        organizationId,
        lessonType,
        OR: [
          { lessonDate: today, startTime: { gte: currentTime } },
          { lessonDate: { gt: today, lte: tomorrow } },
        ],
      },
      select: LESSON_LIST_SELECT,
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: DASHBOARD_TRUNCATED_LIST_TAKE,
    }),
  ]);

  return mapTruncatedDashboardLists(recentRaw, current, upcomingRaw);
}

export async function getInstructorCalendarLessons(input: {
  organizationId: string;
  instructorId: string;
  fromDate: Date;
  toDateExclusive: Date;
}) {
  return prisma.lesson.findMany({
    where: {
      organizationId: input.organizationId,
      instructorId: input.instructorId,
      lessonDate: { gte: input.fromDate, lt: input.toDateExclusive },
    },
    select: LESSON_LIST_SELECT,
    orderBy: CALENDAR_ORDER_BY,
  });
}

export async function getStudentCalendarLessons(input: {
  organizationId: string;
  studentId: string;
  fromDate: Date;
  toDateExclusive: Date;
}) {
  return prisma.lesson.findMany({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      lessonDate: { gte: input.fromDate, lt: input.toDateExclusive },
    },
    select: LESSON_LIST_SELECT,
    orderBy: CALENDAR_ORDER_BY,
  });
}
