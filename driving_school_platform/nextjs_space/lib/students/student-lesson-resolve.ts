import { prisma } from "@/lib/db";

/** Resolve an operational Student row scoped to the organization (for lesson create). */
export async function findOperationalStudentInOrg(input: {
  organizationId: string;
  studentId: string;
}): Promise<{ id: string } | null> {
  return prisma.student.findFirst({
    where: {
      id: input.studentId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });
}

/** Resolve multiple operational Students in one query (for multi-student lesson create). */
export async function findOperationalStudentsInOrg(input: {
  organizationId: string;
  studentIds: string[];
}): Promise<{ id: string }[]> {
  const uniqueIds = [...new Set(input.studentIds)];
  if (uniqueIds.length === 0) return [];

  return prisma.student.findMany({
    where: {
      id: { in: uniqueIds },
      organizationId: input.organizationId,
    },
    select: { id: true },
  });
}
