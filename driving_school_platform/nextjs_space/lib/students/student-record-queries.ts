import { prisma } from "@/lib/db";
import type { Prisma, StudentAppAccessMode } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { normalizeSchoolStudentIdSearchQuery } from "@/lib/students/student-school-id";
import {
  mapStudentRecordDto,
  mapStudentRecordLessonDto,
  STUDENT_RECORD_LESSON_SELECT,
  STUDENT_RECORD_SELECT,
  type StudentRecordDto,
  type StudentRecordLessonDto,
} from "@/lib/students/student-record-dto";
import type { StudentAppAccessModeParam } from "@/lib/students/student-record-validation";

export const STUDENT_RECORD_LIST_DEFAULT_LIMIT = 50;
export const STUDENT_RECORD_LIST_MAX_LIMIT = 100;

const LIST_ORDER_BY: Prisma.StudentOrderByWithRelationInput[] = [
  { schoolStudentId: { sort: "asc", nulls: "last" } },
  { createdAt: "desc" },
  { id: "asc" },
];

export function clampStudentListLimit(raw?: number): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 1) {
    return STUDENT_RECORD_LIST_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(raw), STUDENT_RECORD_LIST_MAX_LIMIT);
}

export function buildStudentRecordListWhere(input: {
  organizationId: string;
  search?: string;
  appAccessMode?: StudentAppAccessModeParam;
}): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {
    organizationId: input.organizationId,
  };

  if (input.appAccessMode) {
    where.appAccessMode = input.appAccessMode;
  }

  const search = input.search?.trim();
  if (!search) {
    return where;
  }

  const or: Prisma.StudentWhereInput[] = [
    { firstName: { contains: search, mode: "insensitive" } },
    { lastName: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
    { phoneNumber: { contains: search, mode: "insensitive" } },
    { schoolStudentId: { contains: search, mode: "insensitive" } },
  ];

  const normalized = normalizeSchoolStudentIdSearchQuery(search);
  if (normalized.ok) {
    or.push({ schoolStudentId: normalized.value });
  }

  where.OR = or;
  return where;
}

export type StudentRecordListVariant = "admin" | "lesson";

export const STUDENT_RECORD_EXPORT_SELECT = {
  schoolStudentId: true,
  schoolStudentYearSuffix: true,
  schoolStudentSequence: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  email: true,
  enrollmentDate: true,
  appAccessMode: true,
} satisfies Prisma.StudentSelect;

export type StudentRecordExportSourceRow = Prisma.StudentGetPayload<{
  select: typeof STUDENT_RECORD_EXPORT_SELECT;
}>;

export async function listStudentRecordsForExport(input: {
  organizationId: string;
  search?: string;
  appAccessMode?: StudentAppAccessModeParam;
}): Promise<StudentRecordExportSourceRow[]> {
  return prisma.student.findMany({
    where: buildStudentRecordListWhere(input),
    select: STUDENT_RECORD_EXPORT_SELECT,
    orderBy: LIST_ORDER_BY,
  });
}

export async function listStudentRecords(input: {
  organizationId: string;
  search?: string;
  appAccessMode?: StudentAppAccessModeParam;
  limit?: number;
  cursor?: string;
  variant?: StudentRecordListVariant;
}): Promise<{
  students: StudentRecordDto[] | StudentRecordLessonDto[];
  nextCursor: string | null;
}> {
  const limit = clampStudentListLimit(input.limit);
  const where = buildStudentRecordListWhere(input);
  const variant = input.variant ?? "admin";
  const select =
    variant === "lesson" ? STUDENT_RECORD_LESSON_SELECT : STUDENT_RECORD_SELECT;

  const rows = await prisma.student.findMany({
    where,
    select,
    orderBy: LIST_ORDER_BY,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  if (variant === "lesson") {
    return {
      students: (page as Parameters<typeof mapStudentRecordLessonDto>[0][]).map(
        mapStudentRecordLessonDto,
      ),
      nextCursor,
    };
  }

  return {
    students: (page as Parameters<typeof mapStudentRecordDto>[0][]).map(
      mapStudentRecordDto,
    ),
    nextCursor,
  };
}

export async function findStudentRecordById(input: {
  organizationId: string;
  studentId: string;
}): Promise<StudentRecordDto | null> {
  const row = await prisma.student.findFirst({
    where: {
      id: input.studentId,
      organizationId: input.organizationId,
    },
    select: STUDENT_RECORD_SELECT,
  });
  return row ? mapStudentRecordDto(row) : null;
}

export async function findExistingSchoolStudentIdsInOrg(input: {
  organizationId: string;
  schoolStudentIds: string[];
}): Promise<string[]> {
  if (input.schoolStudentIds.length === 0) {
    return [];
  }
  const rows = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      schoolStudentId: { in: input.schoolStudentIds },
    },
    select: { schoolStudentId: true },
  });
  return rows
    .map((row) => row.schoolStudentId)
    .filter((id): id is string => id != null);
}

export async function findStudentBySchoolIdInOrg(input: {
  organizationId: string;
  schoolStudentId: string;
  excludeStudentId?: string;
}): Promise<{ id: string } | null> {
  return prisma.student.findFirst({
    where: {
      organizationId: input.organizationId,
      schoolStudentId: input.schoolStudentId,
      ...(input.excludeStudentId
        ? { id: { not: input.excludeStudentId } }
        : {}),
    },
    select: { id: true },
  });
}

function isOrganizationSchoolStudentIdUniqueTarget(target: unknown): boolean {
  if (Array.isArray(target)) {
    return (
      target.includes("organizationId") && target.includes("schoolStudentId")
    );
  }
  if (typeof target === "string") {
    return (
      target.includes("organizationId") && target.includes("schoolStudentId")
    );
  }
  return false;
}

export function isStudentSchoolIdConflict(error: unknown): boolean {
  if (
    !(error instanceof PrismaNamespace.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  return isOrganizationSchoolStudentIdUniqueTarget(error.meta?.target);
}

export async function createManualStudentRecord(input: {
  organizationId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  schoolStudentId: string;
  schoolStudentYearSuffix: string;
  schoolStudentSequence: number;
  enrollmentDate: Date;
}): Promise<StudentRecordDto> {
  const row = await prisma.student.create({
    data: {
      organizationId: input.organizationId,
      userId: null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      address: input.address,
      schoolStudentId: input.schoolStudentId,
      schoolStudentYearSuffix: input.schoolStudentYearSuffix,
      schoolStudentSequence: input.schoolStudentSequence,
      schoolStudentIdSource: "MANUAL",
      appAccessMode: "MANUAL_ONLY" satisfies StudentAppAccessMode,
      enrollmentDate: input.enrollmentDate,
    },
    select: STUDENT_RECORD_SELECT,
  });
  return mapStudentRecordDto(row);
}

export async function updateStudentRecord(input: {
  organizationId: string;
  studentId: string;
  data: Prisma.StudentUpdateInput;
}): Promise<StudentRecordDto | null> {
  const existing = await prisma.student.findFirst({
    where: { id: input.studentId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.student.update({
    where: { id: input.studentId },
    data: input.data,
    select: STUDENT_RECORD_SELECT,
  });
  return mapStudentRecordDto(row);
}
