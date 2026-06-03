/**
 * Pure helpers for the read-only tenant organizationId null-scope operator report.
 * No database access — safe for unit tests.
 */

export const OPERATIONAL_TABLE_KEYS = [
  "student",
  "instructor",
  "vehicle",
  "lesson",
  "exam",
  "lessonRequest",
] as const;

export type OperationalTableKey = (typeof OPERATIONAL_TABLE_KEYS)[number];

export const OPERATIONAL_TABLE_LABELS: Record<OperationalTableKey, string> = {
  student: "Student (students)",
  instructor: "Instructor (instructors)",
  vehicle: "Vehicle (vehicles)",
  lesson: "Lesson (lessons)",
  exam: "Exam (exams)",
  lessonRequest: "LessonRequest (lesson_requests)",
};

export const DUAL_SCOPE_TABLE_KEYS = [
  "user",
  "billingEvent",
  "systemSetting",
  "featureFlag",
  "configurationHistory",
] as const;

export type DualScopeTableKey = (typeof DUAL_SCOPE_TABLE_KEYS)[number];

export const DUAL_SCOPE_TABLE_LABELS: Record<DualScopeTableKey, string> = {
  user: "User (users)",
  billingEvent: "BillingEvent (billing_events)",
  systemSetting: "SystemSetting (system_settings)",
  featureFlag: "FeatureFlag (feature_flags)",
  configurationHistory: "ConfigurationHistory (configuration_history)",
};

export const APPLY_V1_EXCLUDED_TABLES: readonly {
  table: string;
  reason: string;
}[] = [
  {
    table: "users",
    reason:
      "PLATFORM_ADMIN and platform-global rows may legitimately have NULL organizationId",
  },
  {
    table: "billing_events",
    reason: "Billing-internal; org resolution is provider-driven",
  },
  {
    table: "system_settings",
    reason: "Global defaults use NULL organizationId by design",
  },
  {
    table: "feature_flags",
    reason: "Global flags use NULL organizationId by design",
  },
  {
    table: "configuration_history",
    reason: "Platform/global history rows may omit organizationId",
  },
  {
    table: "payments, notifications, exam_registrations, lesson_counters",
    reason:
      "No organizationId column; scope via parent entities after parent backfill",
  },
];

export type BackfillReadinessStatus = "SAFE_TO_DRY_RUN" | "BLOCKED";

export interface BackfillReadinessResult {
  status: BackfillReadinessStatus;
  blockingReasons: string[];
}

export interface TableNullCount {
  nullCount: number;
  totalCount: number;
}

export interface UserNullByRoleRow {
  role: string;
  nullCount: number;
}

export interface ActiveOrganizationSummary {
  id: string;
  name: string;
  isDemo: boolean;
}

export interface ConflictCounts {
  duplicateSchoolStudentIdNullOrg: number;
  studentsNullOrgUserHasOrg: number;
  studentsMultipleDistinctLessonOrgs: number;
  instructorsNullOrgUserHasOrg: number;
  lessonsNullOrgConflictingSources: number;
  lessonRequestsNullOrgStudentMissingOrg: number;
  examsNullOrgConflictingSources: number;
  vehiclesNullOrgConflictingSources: number;
}

export interface ConflictSamples {
  duplicateSchoolStudentIds: string[];
  studentIdsMultipleLessonOrgs: string[];
  lessonIdsConflictingSources: string[];
  examIdsConflictingSources: string[];
  vehicleIdsConflictingSources: string[];
}

export interface TenantOrganizationNullScopeReportData {
  generatedAtIso: string;
  operational: Record<OperationalTableKey, TableNullCount>;
  dualScope: Record<DualScopeTableKey, TableNullCount>;
  userNullByRole: UserNullByRoleRow[];
  activeOrganizationCount: number;
  activeOrganizations: ActiveOrganizationSummary[];
  conflicts: ConflictCounts;
  conflictSamples: ConflictSamples;
  ambiguousRowCount: number;
}

const FORBIDDEN_SQL_KEYWORD =
  /\b(UPDATE|DELETE|INSERT|ALTER|CREATE|DROP|TRUNCATE)\b/i;

/** Fail fast if raw SQL is not a single SELECT statement. */
export function assertSelectOnlySql(sql: string): void {
  const normalized = sql.trim().replace(/\s+/g, " ");
  if (!/^SELECT\b/i.test(normalized)) {
    throw new Error("Raw SQL must start with SELECT");
  }
  if (FORBIDDEN_SQL_KEYWORD.test(normalized)) {
    throw new Error("Raw SQL contains a forbidden write/DDL keyword");
  }
}

export function countOperationalNulls(
  operational: Record<OperationalTableKey, TableNullCount>,
): number {
  return OPERATIONAL_TABLE_KEYS.reduce(
    (sum, key) => sum + operational[key].nullCount,
    0,
  );
}

export function sumConflictCounts(conflicts: ConflictCounts): number {
  return (
    conflicts.duplicateSchoolStudentIdNullOrg +
    conflicts.studentsMultipleDistinctLessonOrgs +
    conflicts.lessonsNullOrgConflictingSources +
    conflicts.examsNullOrgConflictingSources +
    conflicts.vehiclesNullOrgConflictingSources
  );
}

export function evaluateBackfillReadiness(input: {
  activeOrganizationCount: number;
  operationalNullTotal: number;
  conflicts: ConflictCounts;
}): BackfillReadinessResult {
  const blockingReasons: string[] = [];

  if (input.activeOrganizationCount === 0) {
    blockingReasons.push("No active organizations found in database");
  }

  if (input.conflicts.duplicateSchoolStudentIdNullOrg > 0) {
    blockingReasons.push(
      `${input.conflicts.duplicateSchoolStudentIdNullOrg} duplicate schoolStudentId value(s) among students with NULL organizationId`,
    );
  }

  if (input.conflicts.studentsMultipleDistinctLessonOrgs > 0) {
    blockingReasons.push(
      `${input.conflicts.studentsMultipleDistinctLessonOrgs} student(s) with NULL organizationId linked to lessons with multiple distinct organizationId values`,
    );
  }

  if (input.conflicts.lessonsNullOrgConflictingSources > 0) {
    blockingReasons.push(
      `${input.conflicts.lessonsNullOrgConflictingSources} lesson(s) with NULL organizationId and conflicting non-null source organizationId values (student/instructor/vehicle)`,
    );
  }

  if (input.conflicts.examsNullOrgConflictingSources > 0) {
    blockingReasons.push(
      `${input.conflicts.examsNullOrgConflictingSources} exam(s) with NULL organizationId and conflicting non-null source organizationId values (vehicle/examiner)`,
    );
  }

  if (input.conflicts.vehiclesNullOrgConflictingSources > 0) {
    blockingReasons.push(
      `${input.conflicts.vehiclesNullOrgConflictingSources} vehicle(s) with NULL organizationId and conflicting non-null organizationId values from linked lessons/exams`,
    );
  }

  if (
    input.activeOrganizationCount > 1 &&
    input.operationalNullTotal > 0 &&
    sumConflictCounts(input.conflicts) === 0
  ) {
    blockingReasons.push(
      `Multiple active organizations (${input.activeOrganizationCount}) with ${input.operationalNullTotal} operational NULL organizationId row(s) — per-row derivation review required before apply (dry-run may still be used after human review)`,
    );
  }

  const highRiskConflictTotal = sumConflictCounts(input.conflicts);
  const status: BackfillReadinessStatus =
    blockingReasons.length > 0 || highRiskConflictTotal > 0
      ? "BLOCKED"
      : "SAFE_TO_DRY_RUN";

  return { status, blockingReasons };
}

export function shouldExitNonZero(input: {
  readiness: BackfillReadinessResult;
  conflicts: ConflictCounts;
}): boolean {
  if (sumConflictCounts(input.conflicts) > 0) {
    return true;
  }
  return input.readiness.status === "BLOCKED";
}

function formatCountRow(label: string, row: TableNullCount): string {
  return `  ${label}: null=${row.nullCount} total=${row.totalCount}`;
}

export function formatTenantOrganizationNullScopeReport(
  data: TenantOrganizationNullScopeReportData,
  readiness: BackfillReadinessResult,
): string {
  const lines: string[] = [];

  lines.push("=".repeat(72));
  lines.push("DAT Tenant organizationId null-scope report (READ-ONLY)");
  lines.push(`Generated at: ${data.generatedAtIso}`);
  lines.push("=".repeat(72));
  lines.push("");

  lines.push("--- Environment sanity ---");
  lines.push(`Active organizations: ${data.activeOrganizationCount}`);
  if (data.activeOrganizations.length === 0) {
    lines.push("  (none)");
  } else {
    for (const org of data.activeOrganizations) {
      lines.push(
        `  id=${org.id} isDemo=${org.isDemo} name=${truncateField(org.name, 80)}`,
      );
    }
  }
  lines.push("");

  lines.push("--- Operational nullable organizationId counts ---");
  for (const key of OPERATIONAL_TABLE_KEYS) {
    lines.push(
      formatCountRow(OPERATIONAL_TABLE_LABELS[key], data.operational[key]),
    );
  }
  lines.push(
    `  Operational NULL total: ${countOperationalNulls(data.operational)}`,
  );
  lines.push("");

  lines.push("--- Dual-scope / intentionally nullable counts ---");
  for (const key of DUAL_SCOPE_TABLE_KEYS) {
    lines.push(
      formatCountRow(DUAL_SCOPE_TABLE_LABELS[key], data.dualScope[key]),
    );
  }
  lines.push("  User NULL organizationId by role:");
  if (data.userNullByRole.length === 0) {
    lines.push("    (no users with NULL organizationId)");
  } else {
    for (const row of data.userNullByRole) {
      lines.push(`    role=${row.role}: null=${row.nullCount}`);
    }
  }
  lines.push("");

  lines.push("--- Conflict detection (high-risk) ---");
  const c = data.conflicts;
  lines.push(
    `  duplicate schoolStudentId (NULL org students): ${c.duplicateSchoolStudentIdNullOrg}`,
  );
  lines.push(
    `  students NULL org, linked user has org (derivable): ${c.studentsNullOrgUserHasOrg}`,
  );
  lines.push(
    `  students NULL org, multiple distinct lesson orgs: ${c.studentsMultipleDistinctLessonOrgs}`,
  );
  lines.push(
    `  instructors NULL org, linked user has org (derivable): ${c.instructorsNullOrgUserHasOrg}`,
  );
  lines.push(
    `  lessons NULL org, conflicting student/instructor/vehicle orgs: ${c.lessonsNullOrgConflictingSources}`,
  );
  lines.push(
    `  lesson_requests NULL org, student missing org (ambiguous): ${c.lessonRequestsNullOrgStudentMissingOrg}`,
  );
  lines.push(
    `  exams NULL org, conflicting vehicle/examiner orgs: ${c.examsNullOrgConflictingSources}`,
  );
  lines.push(
    `  vehicles NULL org, conflicting lesson/exam orgs: ${c.vehiclesNullOrgConflictingSources}`,
  );
  lines.push(`  Ambiguous rows (aggregate): ${data.ambiguousRowCount}`);
  lines.push(`  High-risk conflict rows: ${sumConflictCounts(c)}`);
  lines.push("");

  lines.push("--- Conflict samples (ids only, capped) ---");
  lines.push(
    formatSampleList(
      "duplicate schoolStudentId",
      data.conflictSamples.duplicateSchoolStudentIds,
    ),
  );
  lines.push(
    formatSampleList(
      "studentId (multiple lesson orgs)",
      data.conflictSamples.studentIdsMultipleLessonOrgs,
    ),
  );
  lines.push(
    formatSampleList(
      "lessonId (conflicting sources)",
      data.conflictSamples.lessonIdsConflictingSources,
    ),
  );
  lines.push(
    formatSampleList(
      "examId (conflicting sources)",
      data.conflictSamples.examIdsConflictingSources,
    ),
  );
  lines.push(
    formatSampleList(
      "vehicleId (conflicting sources)",
      data.conflictSamples.vehicleIdsConflictingSources,
    ),
  );
  lines.push("");

  lines.push("--- Tables excluded from backfill apply v1 ---");
  for (const row of APPLY_V1_EXCLUDED_TABLES) {
    lines.push(`  ${row.table}: ${row.reason}`);
  }
  lines.push("");

  lines.push("--- Backfill readiness summary ---");
  lines.push(`  Status: ${readiness.status}`);
  if (readiness.blockingReasons.length === 0) {
    lines.push("  Blocking reasons: (none)");
  } else {
    lines.push("  Blocking reasons:");
    for (const reason of readiness.blockingReasons) {
      lines.push(`    - ${reason}`);
    }
  }
  lines.push("");
  lines.push(
    "Next step (human-controlled): review this report on Preview, then approve",
  );
  lines.push(
    "  APPROVED TO IMPLEMENT: tenant-operational-organization-id-backfill-dry-run-v1",
  );
  lines.push("=".repeat(72));

  return lines.join("\n");
}

export function truncateField(value: string, maxLen: number): string {
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen - 3)}...`;
}

function formatSampleList(label: string, values: string[]): string {
  if (values.length === 0) {
    return `  ${label}: (none)`;
  }
  return `  ${label}: ${values.join(", ")}`;
}

export function computeAmbiguousRowCount(conflicts: ConflictCounts): number {
  return (
    conflicts.lessonRequestsNullOrgStudentMissingOrg +
    conflicts.studentsNullOrgUserHasOrg +
    conflicts.instructorsNullOrgUserHasOrg
  );
}
