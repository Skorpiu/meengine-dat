/**
 * Raw SQL helpers for operational organizationId NULL checks and backfill.
 * Used by operator scripts when Prisma schema marks organizationId required
 * but pre-migration rows may still be NULL at the database level.
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import type { OperationalTableKey } from "@/lib/tenant-organization-null-scope-report";

export const OPERATIONAL_PHYSICAL_TABLE: Record<OperationalTableKey, string> = {
  student: "students",
  instructor: "instructors",
  vehicle: "vehicles",
  lesson: "lessons",
  exam: "exams",
  lessonRequest: "lesson_requests",
};

type SqlClient = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

export async function countSqlNullOrganizationId(
  prisma: SqlClient,
  tableKey: OperationalTableKey,
): Promise<number> {
  const table = OPERATIONAL_PHYSICAL_TABLE[tableKey];
  const rows = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS count FROM ${Prisma.raw(`"${table}"`)} WHERE "organizationId" IS NULL`,
  );
  return Number(rows[0]?.count ?? 0n);
}

export async function executeSqlBackfillNullOrganizationId(
  prisma: SqlClient,
  tableKey: OperationalTableKey,
  organizationId: string,
): Promise<number> {
  const table = OPERATIONAL_PHYSICAL_TABLE[tableKey];
  return prisma.$executeRaw(
    Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)} SET "organizationId" = ${organizationId} WHERE "organizationId" IS NULL`,
  );
}

export async function countSqlStudentsNullOrgUserHasOrg(
  prisma: SqlClient,
): Promise<number> {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM students s
      INNER JOIN users u ON s."userId" = u.id
      WHERE s."organizationId" IS NULL AND u."organizationId" IS NOT NULL
    `,
  );
  return Number(rows[0]?.count ?? 0n);
}

export async function countSqlInstructorsNullOrgUserHasOrg(
  prisma: SqlClient,
): Promise<number> {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM instructors i
      INNER JOIN users u ON i."userId" = u.id
      WHERE i."organizationId" IS NULL AND u."organizationId" IS NOT NULL
    `,
  );
  return Number(rows[0]?.count ?? 0n);
}

export async function countSqlLessonRequestsNullOrgStudentMissingOrg(
  prisma: SqlClient,
): Promise<number> {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM lesson_requests lr
      INNER JOIN students s ON lr."studentId" = s.id
      WHERE lr."organizationId" IS NULL AND s."organizationId" IS NULL
    `,
  );
  return Number(rows[0]?.count ?? 0n);
}
