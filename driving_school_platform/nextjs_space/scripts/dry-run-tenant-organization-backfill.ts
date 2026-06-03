/**
 * Dry-run only: plan tenant operational organizationId backfill (no writes).
 *
 * Usage (Preview first — choose DATABASE_URL explicitly):
 *   pnpm tenant:org-backfill:dry-run
 *
 * Rejects --apply / --write. Exits non-zero on conflict/ambiguous rows.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  buildDryRunReport,
  effectiveOrganizationId,
  formatDryRunReport,
  planExamBackfill,
  planInstructorBackfill,
  planLessonBackfill,
  planLessonRequestBackfill,
  planStudentBackfill,
  planVehicleBackfill,
  proposalsByTable,
  rejectApplyFlag,
  shouldExitDryRunNonZero,
  type BackfillPlanRow,
} from "@/lib/tenant-organization-backfill-dry-run";

loadEnvConfig(process.cwd());

async function gatherDryRunPlan(
  prisma: PrismaClient,
): Promise<BackfillPlanRow[]> {
  const rows: BackfillPlanRow[] = [];

  const instructors = await prisma.instructor.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      user: { select: { organizationId: true } },
    },
  });

  for (const row of instructors) {
    rows.push(
      planInstructorBackfill({
        id: row.id,
        organizationId: row.organizationId,
        userOrganizationId: row.user.organizationId,
      }),
    );
  }

  const instructorProposals = proposalsByTable(rows).instructor;

  const students = await prisma.student.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      user: { select: { organizationId: true } },
      lessons: {
        where: { organizationId: { not: null } },
        select: { organizationId: true },
      },
    },
  });

  for (const row of students) {
    rows.push(
      planStudentBackfill({
        id: row.id,
        organizationId: row.organizationId,
        userOrganizationId: row.user?.organizationId ?? null,
        lessonOrganizationIds: row.lessons.map((l) => l.organizationId!),
      }),
    );
  }

  const studentProposals = proposalsByTable(rows).student;

  const lessons = await prisma.lesson.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      studentId: true,
      instructorId: true,
      vehicleId: true,
      student: { select: { organizationId: true } },
      instructor: { select: { organizationId: true } },
      vehicle: { select: { organizationId: true } },
    },
  });

  for (const row of lessons) {
    const studentOrg = effectiveOrganizationId(
      row.student?.organizationId ?? null,
      row.studentId ? studentProposals.get(row.studentId) : undefined,
    );
    const instructorOrg = effectiveOrganizationId(
      row.instructor.organizationId,
      instructorProposals.get(row.instructorId),
    );
    const vehicleOrg = row.vehicle?.organizationId ?? null;

    rows.push(
      planLessonBackfill({
        id: row.id,
        organizationId: row.organizationId,
        studentOrganizationId: studentOrg,
        instructorOrganizationId: instructorOrg,
        vehicleOrganizationId: vehicleOrg,
      }),
    );
  }

  const lessonProposals = proposalsByTable(rows).lesson;

  const lessonRequests = await prisma.lessonRequest.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      studentId: true,
      student: { select: { organizationId: true } },
    },
  });

  for (const row of lessonRequests) {
    const studentOrg = effectiveOrganizationId(
      row.student.organizationId,
      studentProposals.get(row.studentId),
    );
    rows.push(
      planLessonRequestBackfill({
        id: row.id,
        organizationId: row.organizationId,
        studentOrganizationId: studentOrg,
      }),
    );
  }

  const exams = await prisma.exam.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      vehicleId: true,
      examinerId: true,
      vehicle: { select: { organizationId: true } },
      examiner: { select: { organizationId: true } },
    },
  });

  for (const row of exams) {
    const examinerOrg = effectiveOrganizationId(
      row.examiner?.organizationId ?? null,
      row.examinerId ? instructorProposals.get(row.examinerId) : undefined,
    );
    rows.push(
      planExamBackfill({
        id: row.id,
        organizationId: row.organizationId,
        vehicleOrganizationId: row.vehicle?.organizationId ?? null,
        examinerOrganizationId: examinerOrg,
      }),
    );
  }

  const examProposals = proposalsByTable(rows).exam;

  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      organizationId: true,
      lessons: { select: { id: true, organizationId: true } },
      exams: { select: { id: true, organizationId: true } },
    },
  });

  for (const row of vehicles) {
    const relatedIds: string[] = [];
    for (const lesson of row.lessons) {
      const org = effectiveOrganizationId(
        lesson.organizationId,
        lessonProposals.get(lesson.id),
      );
      if (org) {
        relatedIds.push(org);
      }
    }
    for (const exam of row.exams) {
      const org = effectiveOrganizationId(
        exam.organizationId,
        examProposals.get(exam.id),
      );
      if (org) {
        relatedIds.push(org);
      }
    }

    rows.push(
      planVehicleBackfill({
        id: row.id,
        organizationId: row.organizationId,
        relatedOrganizationIds: relatedIds,
      }),
    );
  }

  return rows;
}

async function main(): Promise<number> {
  rejectApplyFlag(process.argv.slice(2));

  const prisma = new PrismaClient();
  try {
    const planRows = await gatherDryRunPlan(prisma);
    const report = buildDryRunReport(planRows);
    console.log(formatDryRunReport(report));
    return shouldExitDryRunNonZero(report) ? 1 : 0;
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
