/**
 * Read-only operator report: tenant operational organizationId NULL counts and conflicts.
 *
 * Usage (Preview first — choose DATABASE_URL explicitly):
 *   pnpm tenant:org-null-report
 *
 * No writes, updates, deletes, migrations, or schema changes.
 * Exits non-zero when high-risk conflicts are detected (data unchanged).
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  assertSelectOnlySql,
  computeAmbiguousRowCount,
  countOperationalNulls,
  evaluateBackfillReadiness,
  formatTenantOrganizationNullScopeReport,
  shouldExitNonZero,
  type ConflictCounts,
  type ConflictSamples,
  type DualScopeTableKey,
  type OperationalTableKey,
  type TableNullCount,
  type TenantOrganizationNullScopeReportData,
  type UserNullByRoleRow,
} from "@/lib/tenant-organization-null-scope-report";

loadEnvConfig(process.cwd());

const MAX_CONFLICT_SAMPLES = 20;

const DUPLICATE_SCHOOL_STUDENT_ID_SQL = `
SELECT "schoolStudentId"::text AS "schoolStudentId", COUNT(*)::bigint AS cnt
FROM students
WHERE "organizationId" IS NULL AND "schoolStudentId" IS NOT NULL
GROUP BY "schoolStudentId"
HAVING COUNT(*) > 1
`;

const STUDENTS_MULTIPLE_LESSON_ORGS_SQL = `
SELECT s.id::text AS id
FROM students s
INNER JOIN lessons l ON l."studentId" = s.id
WHERE s."organizationId" IS NULL AND l."organizationId" IS NOT NULL
GROUP BY s.id
HAVING COUNT(DISTINCT l."organizationId") > 1
`;

const LESSONS_CONFLICTING_SOURCES_SQL = `
SELECT l.id::text AS id
FROM lessons l
LEFT JOIN students s ON s.id = l."studentId"
LEFT JOIN instructors i ON i.id = l."instructorId"
LEFT JOIN vehicles v ON v.id = l."vehicleId"
WHERE l."organizationId" IS NULL
  AND (
    SELECT COUNT(DISTINCT o) FROM (
      SELECT s."organizationId" AS o WHERE s."organizationId" IS NOT NULL
      UNION
      SELECT i."organizationId" WHERE i."organizationId" IS NOT NULL
      UNION
      SELECT v."organizationId" WHERE v."organizationId" IS NOT NULL
    ) src
  ) > 1
`;

const EXAMS_CONFLICTING_SOURCES_SQL = `
SELECT e.id::text AS id
FROM exams e
LEFT JOIN vehicles v ON v.id = e."vehicleId"
LEFT JOIN instructors i ON i.id = e."examinerId"
WHERE e."organizationId" IS NULL
  AND (
    SELECT COUNT(DISTINCT o) FROM (
      SELECT v."organizationId" AS o WHERE v."organizationId" IS NOT NULL
      UNION
      SELECT i."organizationId" WHERE i."organizationId" IS NOT NULL
    ) src
  ) > 1
`;

const VEHICLES_CONFLICTING_SOURCES_SQL = `
SELECT v.id::text AS id
FROM vehicles v
WHERE v."organizationId" IS NULL
  AND (
    SELECT COUNT(DISTINCT o) FROM (
      SELECT l."organizationId" AS o
      FROM lessons l
      WHERE l."vehicleId" = v.id AND l."organizationId" IS NOT NULL
      UNION
      SELECT e."organizationId" AS o
      FROM exams e
      WHERE e."vehicleId" = v.id AND e."organizationId" IS NOT NULL
    ) src
  ) > 1
`;

async function runSelectRaw<T>(prisma: PrismaClient, sql: string): Promise<T> {
  assertSelectOnlySql(sql);
  return prisma.$queryRawUnsafe<T>(sql);
}

async function countNullAndTotal(
  nullCountPromise: Promise<number>,
  totalCountPromise: Promise<number>,
): Promise<TableNullCount> {
  const [nullCount, totalCount] = await Promise.all([
    nullCountPromise,
    totalCountPromise,
  ]);
  return { nullCount, totalCount };
}

async function gatherOperationalCounts(
  prisma: PrismaClient,
): Promise<Record<OperationalTableKey, TableNullCount>> {
  const [student, instructor, vehicle, lesson, exam, lessonRequest] =
    await Promise.all([
      countNullAndTotal(
        prisma.student.count({ where: { organizationId: null } }),
        prisma.student.count(),
      ),
      countNullAndTotal(
        prisma.instructor.count({ where: { organizationId: null } }),
        prisma.instructor.count(),
      ),
      countNullAndTotal(
        prisma.vehicle.count({ where: { organizationId: null } }),
        prisma.vehicle.count(),
      ),
      countNullAndTotal(
        prisma.lesson.count({ where: { organizationId: null } }),
        prisma.lesson.count(),
      ),
      countNullAndTotal(
        prisma.exam.count({ where: { organizationId: null } }),
        prisma.exam.count(),
      ),
      countNullAndTotal(
        prisma.lessonRequest.count({ where: { organizationId: null } }),
        prisma.lessonRequest.count(),
      ),
    ]);

  return { student, instructor, vehicle, lesson, exam, lessonRequest };
}

async function gatherDualScopeCounts(
  prisma: PrismaClient,
): Promise<Record<DualScopeTableKey, TableNullCount>> {
  const [user, billingEvent, systemSetting, featureFlag, configurationHistory] =
    await Promise.all([
      countNullAndTotal(
        prisma.user.count({ where: { organizationId: null } }),
        prisma.user.count(),
      ),
      countNullAndTotal(
        prisma.billingEvent.count({ where: { organizationId: null } }),
        prisma.billingEvent.count(),
      ),
      countNullAndTotal(
        prisma.systemSetting.count({ where: { organizationId: null } }),
        prisma.systemSetting.count(),
      ),
      countNullAndTotal(
        prisma.featureFlag.count({ where: { organizationId: null } }),
        prisma.featureFlag.count(),
      ),
      countNullAndTotal(
        prisma.configurationHistory.count({ where: { organizationId: null } }),
        prisma.configurationHistory.count(),
      ),
    ]);

  return {
    user,
    billingEvent,
    systemSetting,
    featureFlag,
    configurationHistory,
  };
}

async function gatherUserNullByRole(
  prisma: PrismaClient,
): Promise<UserNullByRoleRow[]> {
  const rows = await prisma.user.groupBy({
    by: ["role"],
    where: { organizationId: null },
    _count: { _all: true },
    orderBy: { role: "asc" },
  });

  return rows.map((row) => ({
    role: row.role,
    nullCount: row._count._all,
  }));
}

async function gatherConflicts(
  prisma: PrismaClient,
): Promise<{ counts: ConflictCounts; samples: ConflictSamples }> {
  const [
    duplicateRows,
    studentsMultipleLessonOrgRows,
    lessonConflictRows,
    examConflictRows,
    vehicleConflictRows,
    studentsNullOrgUserHasOrg,
    instructorsNullOrgUserHasOrg,
    lessonRequestsNullOrgStudentMissingOrg,
  ] = await Promise.all([
    runSelectRaw<{ schoolStudentId: string; cnt: bigint }[]>(
      prisma,
      DUPLICATE_SCHOOL_STUDENT_ID_SQL,
    ),
    runSelectRaw<{ id: string }[]>(prisma, STUDENTS_MULTIPLE_LESSON_ORGS_SQL),
    runSelectRaw<{ id: string }[]>(prisma, LESSONS_CONFLICTING_SOURCES_SQL),
    runSelectRaw<{ id: string }[]>(prisma, EXAMS_CONFLICTING_SOURCES_SQL),
    runSelectRaw<{ id: string }[]>(prisma, VEHICLES_CONFLICTING_SOURCES_SQL),
    prisma.student.count({
      where: {
        organizationId: null,
        user: { organizationId: { not: null } },
      },
    }),
    prisma.instructor.count({
      where: {
        organizationId: null,
        user: { organizationId: { not: null } },
      },
    }),
    prisma.lessonRequest.count({
      where: {
        organizationId: null,
        student: { organizationId: null },
      },
    }),
  ]);

  const counts: ConflictCounts = {
    duplicateSchoolStudentIdNullOrg: duplicateRows.length,
    studentsNullOrgUserHasOrg,
    studentsMultipleDistinctLessonOrgs: studentsMultipleLessonOrgRows.length,
    instructorsNullOrgUserHasOrg,
    lessonsNullOrgConflictingSources: lessonConflictRows.length,
    lessonRequestsNullOrgStudentMissingOrg,
    examsNullOrgConflictingSources: examConflictRows.length,
    vehiclesNullOrgConflictingSources: vehicleConflictRows.length,
  };

  const samples: ConflictSamples = {
    duplicateSchoolStudentIds: duplicateRows
      .slice(0, MAX_CONFLICT_SAMPLES)
      .map((r) => r.schoolStudentId),
    studentIdsMultipleLessonOrgs: studentsMultipleLessonOrgRows
      .slice(0, MAX_CONFLICT_SAMPLES)
      .map((r) => r.id),
    lessonIdsConflictingSources: lessonConflictRows
      .slice(0, MAX_CONFLICT_SAMPLES)
      .map((r) => r.id),
    examIdsConflictingSources: examConflictRows
      .slice(0, MAX_CONFLICT_SAMPLES)
      .map((r) => r.id),
    vehicleIdsConflictingSources: vehicleConflictRows
      .slice(0, MAX_CONFLICT_SAMPLES)
      .map((r) => r.id),
  };

  return { counts, samples };
}

async function gatherReport(
  prisma: PrismaClient,
): Promise<TenantOrganizationNullScopeReportData> {
  const [
    operational,
    dualScope,
    userNullByRole,
    activeOrganizations,
    conflictBundle,
  ] = await Promise.all([
    gatherOperationalCounts(prisma),
    gatherDualScopeCounts(prisma),
    gatherUserNullByRole(prisma),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, isDemo: true },
    }),
    gatherConflicts(prisma),
  ]);

  const conflicts = conflictBundle.counts;
  const ambiguousRowCount = computeAmbiguousRowCount(conflicts);

  return {
    generatedAtIso: new Date().toISOString(),
    operational,
    dualScope,
    userNullByRole,
    activeOrganizationCount: activeOrganizations.length,
    activeOrganizations,
    conflicts,
    conflictSamples: conflictBundle.samples,
    ambiguousRowCount,
  };
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const report = await gatherReport(prisma);
    const operationalNullTotal = countOperationalNulls(report.operational);
    const readiness = evaluateBackfillReadiness({
      activeOrganizationCount: report.activeOrganizationCount,
      operationalNullTotal,
      conflicts: report.conflicts,
    });

    const output = formatTenantOrganizationNullScopeReport(report, readiness);
    console.log(output);

    return shouldExitNonZero({ readiness, conflicts: report.conflicts })
      ? 1
      : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
