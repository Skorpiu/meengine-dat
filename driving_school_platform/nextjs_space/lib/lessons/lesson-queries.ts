/**
 * Read-only Prisma queries for lesson list/calendar endpoints.
 * No HTTP, auth, or validation — callers pass resolved scope and dates.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { EXAM_DASHBOARD_LESSON_TYPES } from "@/lib/lessons/lesson-display";
import {
  LESSON_NESTED_USER_RELATION,
  LESSON_NESTED_USER_SELECT,
} from "@/lib/users/user-public-select";

export { EXAM_DASHBOARD_LESSON_TYPES };

/** Minimal nested selects for list/calendar/dashboard reads (LD-004–LD-006). */
export const LESSON_LIST_STUDENT_SELECT = {
  id: true,
  user: { select: LESSON_NESTED_USER_SELECT },
} satisfies Prisma.StudentSelect;

export const LESSON_LIST_INSTRUCTOR_SELECT = {
  id: true,
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
  student: { select: LESSON_LIST_STUDENT_SELECT },
  instructor: { select: LESSON_LIST_INSTRUCTOR_SELECT },
  vehicle: { select: LESSON_LIST_VEHICLE_SELECT },
  category: { select: LESSON_LIST_CATEGORY_SELECT },
} satisfies Prisma.LessonSelect;

/** Full relation graph for GET/PUT lesson-by-id (detail/edit — not minimized in this batch). */
export const LESSON_DETAIL_INCLUDE = {
  student: LESSON_NESTED_USER_RELATION,
  instructor: LESSON_NESTED_USER_RELATION,
  vehicle: true,
  category: true,
} satisfies Prisma.LessonInclude;

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

export async function getAdminDashboardLessons(input: {
  organizationId: string;
  view: AdminDashboardView;
  time: AdminDashboardTimeWindow;
}) {
  const { organizationId, view, time } = input;
  const { yesterday, today, tomorrow, currentTime } = time;

  if (view === "EXAMS") {
    const [recent, current, upcoming] = await Promise.all([
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
        take: 50,
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
        take: 50,
      }),
    ]);
    return { recent, current, upcoming };
  }

  const lessonType = view === "CODE" ? "THEORY" : "DRIVING";

  const [recent, current, upcoming] = await Promise.all([
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
      take: 50,
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
      take: 50,
    }),
  ]);

  return { recent, current, upcoming };
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
