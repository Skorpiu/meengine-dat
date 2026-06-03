/**
 * Pure helpers for tenant operational organizationId backfill dry-run planning.
 * No database access — safe for unit tests.
 */

import {
  OPERATIONAL_TABLE_KEYS,
  OPERATIONAL_TABLE_LABELS,
  type OperationalTableKey,
} from "@/lib/tenant-organization-null-scope-report";

export {
  OPERATIONAL_TABLE_KEYS,
  OPERATIONAL_TABLE_LABELS,
  type OperationalTableKey,
};

/** Operational tables eligible for backfill apply v1 (dry-run allowlist). */
export const BACKFILL_OPERATIONAL_ALLOWLIST: readonly OperationalTableKey[] =
  OPERATIONAL_TABLE_KEYS;

/** Tables intentionally excluded from backfill dry-run / apply v1. */
export const BACKFILL_EXCLUDED_TABLE_NAMES = [
  "users",
  "billing_events",
  "system_settings",
  "feature_flags",
  "configuration_history",
  "payments",
  "notifications",
  "exam_registrations",
  "lesson_counters",
  "accounts",
  "sessions",
  "verification_tokens",
  "password_reset_tokens",
  "email_verification_tokens",
  "rate_limit_buckets",
  "audit_logs",
] as const;

export type BackfillRowStatus =
  | "proposed"
  | "skipped"
  | "conflict"
  | "ambiguous";

export interface OrganizationSource {
  label: string;
  organizationId: string | null | undefined;
}

export interface BackfillPlanRow {
  table: OperationalTableKey;
  rowId: string;
  currentOrganizationId: string | null;
  proposedOrganizationId: string | null;
  derivationSource: string | null;
  status: BackfillRowStatus;
  reason: string;
}

export interface DryRunSummary {
  proposedCount: number;
  skippedCount: number;
  conflictCount: number;
  ambiguousCount: number;
  byTable: Record<
    OperationalTableKey,
    { proposed: number; skipped: number; conflict: number; ambiguous: number }
  >;
}

export interface DryRunReport {
  generatedAtIso: string;
  rows: BackfillPlanRow[];
  summary: DryRunSummary;
  applyReadiness: "READY_FOR_FUTURE_APPLY_BATCH" | "BLOCKED";
  blockingReasons: string[];
}

export function isTableExcludedFromBackfill(tableName: string): boolean {
  return (BACKFILL_EXCLUDED_TABLE_NAMES as readonly string[]).includes(
    tableName,
  );
}

export function rejectApplyFlag(argv: string[]): void {
  if (argv.some((a) => a === "--apply" || a === "--write")) {
    throw new Error(
      "Apply/write mode is not implemented. This operator is dry-run only. Use pnpm tenant:org-backfill:dry-run",
    );
  }
}

export function deriveFromSources(sources: OrganizationSource[]): {
  status: Exclude<BackfillRowStatus, "skipped">;
  proposedOrganizationId: string | null;
  derivationSource: string | null;
  reason: string;
} {
  const present = sources
    .map((s) => ({
      label: s.label,
      organizationId: s.organizationId ?? null,
    }))
    .filter((s): s is { label: string; organizationId: string } =>
      Boolean(s.organizationId),
    );

  if (present.length === 0) {
    return {
      status: "ambiguous",
      proposedOrganizationId: null,
      derivationSource: null,
      reason: "No non-null organizationId source available",
    };
  }

  const distinct = [...new Set(present.map((p) => p.organizationId))];
  if (distinct.length > 1) {
    const detail = present
      .map((p) => `${p.label}=${p.organizationId}`)
      .join(", ");
    return {
      status: "conflict",
      proposedOrganizationId: null,
      derivationSource: null,
      reason: `Conflicting organizationId sources: ${detail}`,
    };
  }

  const derivationSource = present.map((p) => p.label).join("+");
  return {
    status: "proposed",
    proposedOrganizationId: distinct[0] ?? null,
    derivationSource,
    reason: "Single deterministic organizationId source",
  };
}

export function skippedRow(
  table: OperationalTableKey,
  rowId: string,
  currentOrganizationId: string | null,
  reason: string,
): BackfillPlanRow {
  return {
    table,
    rowId,
    currentOrganizationId,
    proposedOrganizationId: currentOrganizationId,
    derivationSource: null,
    status: "skipped",
    reason,
  };
}

export function planInstructorBackfill(input: {
  id: string;
  organizationId: string | null;
  userOrganizationId: string | null;
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "instructor",
      input.id,
      input.organizationId,
      "organizationId already set",
    );
  }

  const derived = deriveFromSources([
    { label: "User.organizationId", organizationId: input.userOrganizationId },
  ]);

  return {
    table: "instructor",
    rowId: input.id,
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

export function planStudentBackfill(input: {
  id: string;
  organizationId: string | null;
  userOrganizationId: string | null;
  lessonOrganizationIds: string[];
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "student",
      input.id,
      input.organizationId,
      "organizationId already set",
    );
  }

  const lessonDistinct = [
    ...new Set(input.lessonOrganizationIds.filter(Boolean)),
  ];
  const sources: OrganizationSource[] = [
    { label: "User.organizationId", organizationId: input.userOrganizationId },
  ];

  if (lessonDistinct.length === 1) {
    sources.push({
      label: "Lesson.organizationId",
      organizationId: lessonDistinct[0],
    });
  } else if (lessonDistinct.length > 1) {
    return {
      table: "student",
      rowId: input.id,
      currentOrganizationId: null,
      proposedOrganizationId: null,
      derivationSource: null,
      status: "conflict",
      reason: `Multiple distinct Lesson.organizationId values: ${lessonDistinct.join(", ")}`,
    };
  }

  const derived = deriveFromSources(sources);
  return {
    table: "student",
    rowId: input.id,
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

export function planLessonBackfill(input: {
  id: string;
  organizationId: string | null;
  studentOrganizationId: string | null;
  instructorOrganizationId: string | null;
  vehicleOrganizationId: string | null;
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "lesson",
      input.id,
      input.organizationId,
      "organizationId already set",
    );
  }

  const derived = deriveFromSources([
    {
      label: "Student.organizationId",
      organizationId: input.studentOrganizationId,
    },
    {
      label: "Instructor.organizationId",
      organizationId: input.instructorOrganizationId,
    },
    {
      label: "Vehicle.organizationId",
      organizationId: input.vehicleOrganizationId,
    },
  ]);

  return {
    table: "lesson",
    rowId: input.id,
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

export function planLessonRequestBackfill(input: {
  id: string;
  organizationId: string | null;
  studentOrganizationId: string | null;
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "lessonRequest",
      input.id,
      input.organizationId,
      "organizationId already set",
    );
  }

  const derived = deriveFromSources([
    {
      label: "Student.organizationId",
      organizationId: input.studentOrganizationId,
    },
  ]);

  return {
    table: "lessonRequest",
    rowId: input.id,
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

export function planExamBackfill(input: {
  id: string;
  organizationId: string | null;
  vehicleOrganizationId: string | null;
  examinerOrganizationId: string | null;
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "exam",
      input.id,
      input.organizationId,
      "organizationId already set",
    );
  }

  const derived = deriveFromSources([
    {
      label: "Vehicle.organizationId",
      organizationId: input.vehicleOrganizationId,
    },
    {
      label: "Instructor.organizationId",
      organizationId: input.examinerOrganizationId,
    },
  ]);

  return {
    table: "exam",
    rowId: input.id,
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

export function planVehicleBackfill(input: {
  id: string | number;
  organizationId: string | null;
  relatedOrganizationIds: string[];
}): BackfillPlanRow {
  if (input.organizationId !== null) {
    return skippedRow(
      "vehicle",
      String(input.id),
      input.organizationId,
      "organizationId already set",
    );
  }

  const distinct = [...new Set(input.relatedOrganizationIds.filter(Boolean))];
  const sources: OrganizationSource[] = [];
  if (distinct.length === 1) {
    sources.push({
      label: "Lesson/Exam.organizationId",
      organizationId: distinct[0],
    });
  } else if (distinct.length > 1) {
    return {
      table: "vehicle",
      rowId: String(input.id),
      currentOrganizationId: null,
      proposedOrganizationId: null,
      derivationSource: null,
      status: "conflict",
      reason: `Conflicting Lesson/Exam organizationId values: ${distinct.join(", ")}`,
    };
  }

  const derived = deriveFromSources(sources);
  return {
    table: "vehicle",
    rowId: String(input.id),
    currentOrganizationId: null,
    proposedOrganizationId: derived.proposedOrganizationId,
    derivationSource: derived.derivationSource,
    status: derived.status,
    reason: derived.reason,
  };
}

/** Effective org: persisted value or dry-run proposal for the same entity. */
export function effectiveOrganizationId(
  persisted: string | null,
  proposed: string | null | undefined,
): string | null {
  if (persisted !== null) {
    return persisted;
  }
  return proposed ?? null;
}

export function summarizeDryRunRows(rows: BackfillPlanRow[]): DryRunSummary {
  const byTable = {} as DryRunSummary["byTable"];
  for (const key of OPERATIONAL_TABLE_KEYS) {
    byTable[key] = { proposed: 0, skipped: 0, conflict: 0, ambiguous: 0 };
  }

  let proposedCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;
  let ambiguousCount = 0;

  for (const row of rows) {
    byTable[row.table][row.status] += 1;
    switch (row.status) {
      case "proposed":
        proposedCount += 1;
        break;
      case "skipped":
        skippedCount += 1;
        break;
      case "conflict":
        conflictCount += 1;
        break;
      case "ambiguous":
        ambiguousCount += 1;
        break;
    }
  }

  return {
    proposedCount,
    skippedCount,
    conflictCount,
    ambiguousCount,
    byTable,
  };
}

export function evaluateApplyReadiness(summary: DryRunSummary): {
  applyReadiness: DryRunReport["applyReadiness"];
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];

  if (summary.conflictCount > 0) {
    blockingReasons.push(
      `${summary.conflictCount} row(s) with conflicting derivation sources`,
    );
  }
  if (summary.ambiguousCount > 0) {
    blockingReasons.push(
      `${summary.ambiguousCount} row(s) with ambiguous or missing derivation sources`,
    );
  }

  return {
    applyReadiness:
      blockingReasons.length > 0 ? "BLOCKED" : "READY_FOR_FUTURE_APPLY_BATCH",
    blockingReasons,
  };
}

export function buildDryRunReport(
  rows: BackfillPlanRow[],
  generatedAtIso: string = new Date().toISOString(),
): DryRunReport {
  const summary = summarizeDryRunRows(rows);
  const readiness = evaluateApplyReadiness(summary);
  return {
    generatedAtIso,
    rows,
    summary,
    applyReadiness: readiness.applyReadiness,
    blockingReasons: readiness.blockingReasons,
  };
}

export function shouldExitDryRunNonZero(report: DryRunReport): boolean {
  return report.summary.conflictCount > 0 || report.summary.ambiguousCount > 0;
}

export function formatDryRunReport(report: DryRunReport): string {
  const lines: string[] = [];
  lines.push("=".repeat(72));
  lines.push("DAT Tenant organizationId backfill DRY-RUN (no writes)");
  lines.push(`Generated at: ${report.generatedAtIso}`);
  lines.push("=".repeat(72));
  lines.push("");

  lines.push("--- Summary ---");
  lines.push(`  Proposed changes: ${report.summary.proposedCount}`);
  lines.push(`  Skipped rows:     ${report.summary.skippedCount}`);
  lines.push(`  Conflicts:        ${report.summary.conflictCount}`);
  lines.push(`  Ambiguous:        ${report.summary.ambiguousCount}`);
  lines.push(`  Apply readiness:  ${report.applyReadiness}`);
  if (report.blockingReasons.length === 0) {
    lines.push("  Blocking reasons: (none)");
  } else {
    lines.push("  Blocking reasons:");
    for (const reason of report.blockingReasons) {
      lines.push(`    - ${reason}`);
    }
  }
  lines.push("");

  lines.push("--- By table ---");
  for (const key of OPERATIONAL_TABLE_KEYS) {
    const t = report.summary.byTable[key];
    lines.push(
      `  ${OPERATIONAL_TABLE_LABELS[key]}: proposed=${t.proposed} skipped=${t.skipped} conflict=${t.conflict} ambiguous=${t.ambiguous}`,
    );
  }
  lines.push("");

  lines.push("--- Excluded from backfill v1 ---");
  for (const name of BACKFILL_EXCLUDED_TABLE_NAMES) {
    lines.push(`  ${name}`);
  }
  lines.push("");

  if (report.rows.length === 0) {
    lines.push("--- Row plan ---");
    lines.push("  (no rows with NULL organizationId in allowlisted tables)");
    lines.push("");
  } else {
    lines.push("--- Row plan ---");
    lines.push(
      "  table | rowId | currentOrg | proposedOrg | status | source | reason",
    );
    for (const row of report.rows) {
      lines.push(
        [
          row.table,
          row.rowId,
          row.currentOrganizationId ?? "NULL",
          row.proposedOrganizationId ?? "NULL",
          row.status,
          row.derivationSource ?? "-",
          row.reason,
        ].join(" | "),
      );
    }
    lines.push("");
  }

  lines.push(
    "Apply is not available in this batch. Future slice: tenant-operational-organization-id-backfill-apply-v1",
  );
  lines.push("=".repeat(72));
  return lines.join("\n");
}

/**
 * Merge planned proposals into maps for downstream effective-org resolution.
 */
export function proposalsByTable(
  rows: BackfillPlanRow[],
): Record<OperationalTableKey, Map<string, string>> {
  const maps = {} as Record<OperationalTableKey, Map<string, string>>;
  for (const key of OPERATIONAL_TABLE_KEYS) {
    maps[key] = new Map();
  }
  for (const row of rows) {
    if (row.status === "proposed" && row.proposedOrganizationId) {
      maps[row.table].set(row.rowId, row.proposedOrganizationId);
    }
  }
  return maps;
}
