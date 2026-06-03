import { describe, it, expect } from "vitest";
import {
  assertSelectOnlySql,
  countOperationalNulls,
  evaluateBackfillReadiness,
  formatTenantOrganizationNullScopeReport,
  shouldExitNonZero,
  sumConflictCounts,
  type ConflictCounts,
  type OperationalTableKey,
  type TableNullCount,
  type TenantOrganizationNullScopeReportData,
} from "@/lib/tenant-organization-null-scope-report";

function emptyOperational(): Record<OperationalTableKey, TableNullCount> {
  return {
    student: { nullCount: 0, totalCount: 0 },
    instructor: { nullCount: 0, totalCount: 0 },
    vehicle: { nullCount: 0, totalCount: 0 },
    lesson: { nullCount: 0, totalCount: 0 },
    exam: { nullCount: 0, totalCount: 0 },
    lessonRequest: { nullCount: 0, totalCount: 0 },
  };
}

function emptyConflicts(): ConflictCounts {
  return {
    duplicateSchoolStudentIdNullOrg: 0,
    studentsNullOrgUserHasOrg: 0,
    studentsMultipleDistinctLessonOrgs: 0,
    instructorsNullOrgUserHasOrg: 0,
    lessonsNullOrgConflictingSources: 0,
    lessonRequestsNullOrgStudentMissingOrg: 0,
    examsNullOrgConflictingSources: 0,
    vehiclesNullOrgConflictingSources: 0,
  };
}

function minimalReport(
  overrides: Partial<TenantOrganizationNullScopeReportData> = {},
): TenantOrganizationNullScopeReportData {
  return {
    generatedAtIso: "2026-06-03T12:00:00.000Z",
    operational: emptyOperational(),
    dualScope: {
      user: { nullCount: 0, totalCount: 0 },
      billingEvent: { nullCount: 0, totalCount: 0 },
      systemSetting: { nullCount: 0, totalCount: 0 },
      featureFlag: { nullCount: 0, totalCount: 0 },
      configurationHistory: { nullCount: 0, totalCount: 0 },
    },
    userNullByRole: [],
    activeOrganizationCount: 1,
    activeOrganizations: [{ id: "org-1", name: "School A", isDemo: false }],
    conflicts: emptyConflicts(),
    conflictSamples: {
      duplicateSchoolStudentIds: [],
      studentIdsMultipleLessonOrgs: [],
      lessonIdsConflictingSources: [],
      examIdsConflictingSources: [],
      vehicleIdsConflictingSources: [],
    },
    ambiguousRowCount: 0,
    ...overrides,
  };
}

describe("assertSelectOnlySql", () => {
  it("accepts SELECT queries", () => {
    expect(() =>
      assertSelectOnlySql(
        'SELECT COUNT(*) FROM students WHERE "organizationId" IS NULL',
      ),
    ).not.toThrow();
  });

  it("rejects non-SELECT statements", () => {
    expect(() => assertSelectOnlySql("UPDATE students SET x = 1")).toThrow(
      /SELECT/,
    );
  });

  it("rejects SELECT containing UPDATE keyword", () => {
    expect(() =>
      assertSelectOnlySql("SELECT * FROM students; UPDATE students SET x = 1"),
    ).toThrow(/forbidden/i);
  });
});

describe("evaluateBackfillReadiness", () => {
  it("returns SAFE_TO_DRY_RUN when single org and no conflicts", () => {
    const result = evaluateBackfillReadiness({
      activeOrganizationCount: 1,
      operationalNullTotal: 5,
      conflicts: emptyConflicts(),
    });
    expect(result.status).toBe("SAFE_TO_DRY_RUN");
    expect(result.blockingReasons).toHaveLength(0);
  });

  it("blocks on duplicate schoolStudentId conflicts", () => {
    const result = evaluateBackfillReadiness({
      activeOrganizationCount: 1,
      operationalNullTotal: 2,
      conflicts: {
        ...emptyConflicts(),
        duplicateSchoolStudentIdNullOrg: 1,
      },
    });
    expect(result.status).toBe("BLOCKED");
    expect(
      result.blockingReasons.some((r) => r.includes("schoolStudentId")),
    ).toBe(true);
  });

  it("adds multi-org review reason when operational nulls exist", () => {
    const result = evaluateBackfillReadiness({
      activeOrganizationCount: 2,
      operationalNullTotal: 3,
      conflicts: emptyConflicts(),
    });
    expect(result.status).toBe("BLOCKED");
    expect(
      result.blockingReasons.some((r) => r.includes("Multiple active")),
    ).toBe(true);
  });
});

describe("shouldExitNonZero", () => {
  it("exits non-zero when high-risk conflicts exist", () => {
    expect(
      shouldExitNonZero({
        readiness: { status: "SAFE_TO_DRY_RUN", blockingReasons: [] },
        conflicts: {
          ...emptyConflicts(),
          lessonsNullOrgConflictingSources: 2,
        },
      }),
    ).toBe(true);
  });

  it("exits zero when safe and no high-risk conflicts", () => {
    expect(
      shouldExitNonZero({
        readiness: { status: "SAFE_TO_DRY_RUN", blockingReasons: [] },
        conflicts: emptyConflicts(),
      }),
    ).toBe(false);
  });
});

describe("formatTenantOrganizationNullScopeReport", () => {
  it("includes readiness status and operational section", () => {
    const data = minimalReport({
      operational: {
        ...emptyOperational(),
        student: { nullCount: 2, totalCount: 10 },
      },
    });
    const text = formatTenantOrganizationNullScopeReport(data, {
      status: "SAFE_TO_DRY_RUN",
      blockingReasons: [],
    });
    expect(text).toContain("READ-ONLY");
    expect(text).toContain("Student (students)");
    expect(text).toContain("null=2 total=10");
    expect(text).toContain("SAFE_TO_DRY_RUN");
  });
});

describe("countOperationalNulls", () => {
  it("sums null counts across operational tables", () => {
    const operational = emptyOperational();
    operational.student.nullCount = 1;
    operational.lesson.nullCount = 2;
    expect(countOperationalNulls(operational)).toBe(3);
  });
});

describe("sumConflictCounts", () => {
  it("counts only high-risk conflict buckets", () => {
    expect(
      sumConflictCounts({
        ...emptyConflicts(),
        duplicateSchoolStudentIdNullOrg: 1,
        studentsNullOrgUserHasOrg: 5,
        lessonsNullOrgConflictingSources: 2,
      }),
    ).toBe(3);
  });
});
