/**
 * Read-only Prisma queries for lesson list/calendar endpoints.
 * No HTTP, auth, or validation — callers pass resolved scope and dates.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const LESSON_LIST_INCLUDE = {
  student: { include: { user: true } },
  instructor: { include: { user: true } },
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
    include: LESSON_LIST_INCLUDE,
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
          lessonType: "EXAM",
          OR: [
            { lessonDate: yesterday },
            { lessonDate: today, startTime: { lt: currentTime } },
          ],
        },
        include: LESSON_LIST_INCLUDE,
        orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
        take: 50,
      }),
      prisma.lesson.findMany({
        where: {
          organizationId,
          lessonType: "EXAM",
          lessonDate: today,
          startTime: { lte: currentTime },
          endTime: { gt: currentTime },
        },
        include: LESSON_LIST_INCLUDE,
        orderBy: [{ startTime: "asc" }],
      }),
      prisma.lesson.findMany({
        where: {
          organizationId,
          lessonType: "EXAM",
          OR: [
            { lessonDate: today, startTime: { gte: currentTime } },
            { lessonDate: { gt: today, lte: tomorrow } },
          ],
        },
        include: LESSON_LIST_INCLUDE,
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
      include: LESSON_LIST_INCLUDE,
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
      include: LESSON_LIST_INCLUDE,
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
      include: LESSON_LIST_INCLUDE,
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
    include: LESSON_LIST_INCLUDE,
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
    include: LESSON_LIST_INCLUDE,
    orderBy: CALENDAR_ORDER_BY,
  });
}
