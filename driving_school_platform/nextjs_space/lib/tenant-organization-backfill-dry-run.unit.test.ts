import { describe, it, expect } from "vitest";
import {
  BACKFILL_EXCLUDED_TABLE_NAMES,
  BACKFILL_OPERATIONAL_ALLOWLIST,
  buildDryRunReport,
  deriveFromSources,
  formatDryRunReport,
  isTableExcludedFromBackfill,
  planInstructorBackfill,
  planLessonBackfill,
  planStudentBackfill,
  planVehicleBackfill,
  rejectApplyFlag,
  shouldExitDryRunNonZero,
  summarizeDryRunRows,
} from "@/lib/tenant-organization-backfill-dry-run";

describe("rejectApplyFlag", () => {
  it("rejects --apply", () => {
    expect(() => rejectApplyFlag(["--apply"])).toThrow(/dry-run only/i);
  });

  it("allows default argv", () => {
    expect(() => rejectApplyFlag([])).not.toThrow();
  });
});

describe("deriveFromSources", () => {
  it("returns ambiguous when no sources", () => {
    const r = deriveFromSources([]);
    expect(r.status).toBe("ambiguous");
    expect(r.proposedOrganizationId).toBeNull();
  });

  it("proposes when single source", () => {
    const r = deriveFromSources([
      { label: "User.organizationId", organizationId: "org-a" },
    ]);
    expect(r.status).toBe("proposed");
    expect(r.proposedOrganizationId).toBe("org-a");
  });

  it("conflicts when sources disagree", () => {
    const r = deriveFromSources([
      { label: "Student.organizationId", organizationId: "org-a" },
      { label: "Instructor.organizationId", organizationId: "org-b" },
    ]);
    expect(r.status).toBe("conflict");
  });
});

describe("planInstructorBackfill", () => {
  it("derives from linked user org", () => {
    const row = planInstructorBackfill({
      id: "inst-1",
      organizationId: null,
      userOrganizationId: "org-a",
    });
    expect(row.status).toBe("proposed");
    expect(row.proposedOrganizationId).toBe("org-a");
    expect(row.derivationSource).toContain("User");
  });
});

describe("planStudentBackfill", () => {
  it("derives from linked user org", () => {
    const row = planStudentBackfill({
      id: "stu-1",
      organizationId: null,
      userOrganizationId: "org-a",
      lessonOrganizationIds: [],
    });
    expect(row.status).toBe("proposed");
    expect(row.proposedOrganizationId).toBe("org-a");
  });

  it("conflicts when lesson orgs disagree", () => {
    const row = planStudentBackfill({
      id: "stu-1",
      organizationId: null,
      userOrganizationId: null,
      lessonOrganizationIds: ["org-a", "org-b"],
    });
    expect(row.status).toBe("conflict");
  });

  it("ambiguous when no sources", () => {
    const row = planStudentBackfill({
      id: "stu-1",
      organizationId: null,
      userOrganizationId: null,
      lessonOrganizationIds: [],
    });
    expect(row.status).toBe("ambiguous");
  });
});

describe("planLessonBackfill", () => {
  it("proposes when sources agree", () => {
    const row = planLessonBackfill({
      id: "les-1",
      organizationId: null,
      studentOrganizationId: "org-a",
      instructorOrganizationId: "org-a",
      vehicleOrganizationId: null,
    });
    expect(row.status).toBe("proposed");
    expect(row.proposedOrganizationId).toBe("org-a");
  });

  it("conflicts when sources disagree", () => {
    const row = planLessonBackfill({
      id: "les-1",
      organizationId: null,
      studentOrganizationId: "org-a",
      instructorOrganizationId: "org-b",
      vehicleOrganizationId: null,
    });
    expect(row.status).toBe("conflict");
  });
});

describe("planVehicleBackfill", () => {
  it("conflicts when related lesson/exam orgs disagree", () => {
    const row = planVehicleBackfill({
      id: 7,
      organizationId: null,
      relatedOrganizationIds: ["org-a", "org-b"],
    });
    expect(row.status).toBe("conflict");
  });

  it("ambiguous when no related orgs", () => {
    const row = planVehicleBackfill({
      id: 7,
      organizationId: null,
      relatedOrganizationIds: [],
    });
    expect(row.status).toBe("ambiguous");
  });
});

describe("allowlist and exclusions", () => {
  it("includes only operational tables", () => {
    expect(BACKFILL_OPERATIONAL_ALLOWLIST).toEqual([
      "student",
      "instructor",
      "vehicle",
      "lesson",
      "exam",
      "lessonRequest",
    ]);
  });

  it("excludes users and billing", () => {
    expect(isTableExcludedFromBackfill("users")).toBe(true);
    expect(isTableExcludedFromBackfill("billing_events")).toBe(true);
    expect(isTableExcludedFromBackfill("students")).toBe(false);
  });

  it("does not include single-org fallback helpers", () => {
    const moduleText = BACKFILL_EXCLUDED_TABLE_NAMES.join(" ");
    expect(moduleText).not.toContain("TARGET_ORG");
    expect(moduleText).not.toContain("findFirst");
  });
});

describe("dry-run summary with zero NULL rows", () => {
  it("produces zero proposed changes", () => {
    const report = buildDryRunReport([]);
    expect(report.summary.proposedCount).toBe(0);
    expect(report.summary.conflictCount).toBe(0);
    expect(report.summary.ambiguousCount).toBe(0);
    expect(shouldExitDryRunNonZero(report)).toBe(false);
  });
});

describe("formatDryRunReport", () => {
  it("includes summary headings", () => {
    const report = buildDryRunReport([
      planInstructorBackfill({
        id: "i1",
        organizationId: null,
        userOrganizationId: "org-x",
      }),
    ]);
    const text = formatDryRunReport(report);
    expect(text).toContain("DRY-RUN");
    expect(text).toContain("Proposed changes: 1");
  });
});

describe("shouldExitDryRunNonZero", () => {
  it("exits non-zero on ambiguous rows", () => {
    const report = buildDryRunReport([
      planStudentBackfill({
        id: "s1",
        organizationId: null,
        userOrganizationId: null,
        lessonOrganizationIds: [],
      }),
    ]);
    expect(report.summary.ambiguousCount).toBe(1);
    expect(shouldExitDryRunNonZero(report)).toBe(true);
  });
});

describe("summarizeDryRunRows", () => {
  it("counts by status", () => {
    const summary = summarizeDryRunRows([
      planInstructorBackfill({
        id: "i1",
        organizationId: null,
        userOrganizationId: "org-a",
      }),
      planStudentBackfill({
        id: "s1",
        organizationId: null,
        userOrganizationId: null,
        lessonOrganizationIds: [],
      }),
    ]);
    expect(summary.proposedCount).toBe(1);
    expect(summary.ambiguousCount).toBe(1);
  });
});
