import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CANONICAL_SMOKE_ORGANIZATION_NAME,
  classifyInstructorEligibility,
  classifyStudentEligibility,
  classifyVehicleEligibility,
  inspectProductionSmokeReconciliation,
  toSafeIdPrefix,
  type ProductionSmokeInspectionDb,
} from "@/lib/ops/production-smoke-reconciliation-inspection";
import {
  assertSanitizedInspectionPayload,
  formatProductionSmokeInspectionFailureMessage,
  formatProductionSmokeInspectionText,
} from "@/lib/ops/production-smoke-reconciliation-output";
import {
  adaptPrismaToInspectionDb,
  isProductionSmokeReconciliationInspectDirectExecution,
  parseProductionSmokeReconciliationInspectArgs,
} from "../../scripts/inspect-production-smoke-reconciliation";

function makeDb(
  overrides: Partial<ProductionSmokeInspectionDb> = {},
): ProductionSmokeInspectionDb {
  const emptyFindMany = vi.fn().mockResolvedValue([]);
  const zeroCount = vi.fn().mockResolvedValue(0);

  return {
    organization: {
      findMany: vi.fn().mockResolvedValue([]),
      count: zeroCount,
    },
    organizationDomain: { findMany: emptyFindMany },
    organizationFeature: { findMany: emptyFindMany },
    user: { findMany: emptyFindMany, count: zeroCount },
    category: { findMany: emptyFindMany },
    instructor: { findMany: emptyFindMany, count: zeroCount },
    student: { findMany: emptyFindMany, count: zeroCount },
    vehicle: { findMany: emptyFindMany, count: zeroCount },
    lesson: { count: zeroCount },
    lessonRequest: { count: zeroCount },
    exam: { count: zeroCount },
    examRegistration: { count: zeroCount },
    auditLog: { count: zeroCount },
    payment: { count: zeroCount },
    notification: { count: zeroCount },
    billingEvent: { count: zeroCount },
    verificationToken: { count: zeroCount },
    rateLimitBucket: { count: zeroCount },
    userInvitation: { findMany: emptyFindMany },
    ...overrides,
  };
}

const ORG_ID = "orgsmoke1abcdefghijklmnop";

function baseOrg() {
  return {
    id: ORG_ID,
    name: CANONICAL_SMOKE_ORGANIZATION_NAME,
    email: "smoke@meengine.io",
    subscriptionTier: "BASE",
    subscriptionStatus: "ACTIVE",
    isActive: true,
    isDemo: false,
  };
}

describe("production-smoke-reconciliation-inspection", () => {
  it("reports smoke organization missing", async () => {
    const result = await inspectProductionSmokeReconciliation(makeDb());
    expect(result.organizationStatus).toBe("smoke_organization_missing");
    expect(result.readiness.organizationReady).toBe(false);
    expect(result.readiness.blockers).toContain("smoke_organization_missing");
  });

  it("continues for one canonical organization", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue([
          { featureKey: "LESSON_MANAGEMENT", isEnabled: true },
          { featureKey: "VEHICLE_MANAGEMENT", isEnabled: true },
          { featureKey: "STUDENT_ACCESS", isEnabled: true },
        ]),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 2,
            name: "B",
            isActive: true,
            transmissionType: { id: 1, name: "Manual", code: "MT" },
          },
        ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "adminsmokeuser0001",
            email: "admin@example.com",
            role: "SUPER_ADMIN",
            firstName: "Smoke",
            lastName: "Admin",
            isApproved: true,
            isEmailVerified: true,
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
    });

    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.organizationStatus).toBe("smoke_organization_ok");
    expect(result.organization.idPrefix).toBe(toSafeIdPrefix(ORG_ID));
    expect(result.organization.idPrefix).not.toBe(ORG_ID);
    expect(result.organization.emailRedacted).toBe("s***@meengine.io");
    expect(result.domains?.domainReady).toBe(true);
  });

  it("reports duplicate canonical organizations and does not recommend fixtures", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([
          { ...baseOrg(), id: "orgaaaaaa11111111" },
          { ...baseOrg(), id: "orgbbbbbb22222222" },
        ]),
        count: vi.fn().mockResolvedValue(0),
      },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.organizationStatus).toBe("smoke_organization_ambiguous");
    expect(result.instructorCandidates).toEqual([]);
    expect(result.readiness.blockers).toContain("smoke_organization_ambiguous");
  });

  it("classifies domains and primary-domain conditions", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi.fn().mockResolvedValue([
          { host: "www.meengine.io", isPrimary: true },
          { host: "meengine-dat.vercel.app", isPrimary: true },
        ]),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 2,
            name: "B",
            isActive: true,
            transmissionType: null,
          },
        ]),
      },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.domains?.duplicatePrimary).toBe(true);
    expect(result.domains?.domainReady).toBe(false);
    expect(result.domains?.warnings).toContain("multiple_primary_domains");
  });

  it("reports zero School Admin candidates", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue([
          { featureKey: "LESSON_MANAGEMENT", isEnabled: true },
          { featureKey: "VEHICLE_MANAGEMENT", isEnabled: true },
          { featureKey: "STUDENT_ACCESS", isEnabled: true },
        ]),
      },
      category: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 2, name: "B", isActive: true, transmissionType: null },
          ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.schoolAdminCandidates).toEqual([]);
    expect(result.readiness.blockers).toContain(
      "canonical_school_admin_missing",
    );
  });

  it("leaves multiple School Admin candidates unselected", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue([
          { featureKey: "LESSON_MANAGEMENT", isEnabled: true },
          { featureKey: "VEHICLE_MANAGEMENT", isEnabled: true },
          { featureKey: "STUDENT_ACCESS", isEnabled: true },
        ]),
      },
      category: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 2, name: "B", isActive: true, transmissionType: null },
          ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "adminone000000001",
            email: "one@example.com",
            role: "SUPER_ADMIN",
            firstName: "Smoke",
            lastName: "Admin",
            isApproved: true,
            isEmailVerified: true,
          },
          {
            id: "admintwo000000002",
            email: "two@example.com",
            role: "SUPER_ADMIN",
            firstName: "Two",
            lastName: "Admin",
            isApproved: true,
            isEmailVerified: true,
          },
        ]),
        count: vi.fn().mockResolvedValue(2),
      },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.schoolAdminCandidates).toHaveLength(2);
    expect(result.readiness.canonicalSchoolAdminFound).toBe(true);
    expect(result.readiness.warnings).toContain(
      "additional_school_admins_informative_only",
    );
  });

  it("reports category B missing", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      category: { findMany: vi.fn().mockResolvedValue([]) },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.categoryB.found).toBe(false);
    expect(result.categoryB.ready).toBe(false);
    expect(result.readiness.categoryBReady).toBe(false);
  });

  it("filters eligible and ineligible instructors", () => {
    const eligible = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "INSTRUCTOR",
      qualifiedCategoryNames: ["B", "B+E"],
      licenseExpiryIsoDate: "2099-12-31",
    });
    expect(eligible.eligible).toBe(true);

    const noCategory = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "INSTRUCTOR",
      qualifiedCategoryNames: ["C"],
      licenseExpiryIsoDate: "2099-12-31",
    });
    expect(noCategory.eligible).toBe(false);
    expect(noCategory.reasons).toContain("missing_category_b_qualification");

    const expired = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "INSTRUCTOR",
      qualifiedCategoryNames: ["B"],
      licenseExpiryIsoDate: "2020-01-01",
    });
    expect(expired.eligible).toBe(false);
    expect(expired.reasons).toContain("license_expired_or_invalid");
  });

  it("requires linked user role INSTRUCTOR", () => {
    const ok = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "INSTRUCTOR",
      qualifiedCategoryNames: ["B"],
      licenseExpiryIsoDate: "2099-12-31",
    });
    expect(ok.eligible).toBe(true);

    const superAdminLinked = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "SUPER_ADMIN",
      qualifiedCategoryNames: ["B"],
      licenseExpiryIsoDate: "2099-12-31",
    });
    expect(superAdminLinked.eligible).toBe(false);
    expect(superAdminLinked.reasons).toContain(
      "linked_user_role_not_instructor",
    );

    const studentLinked = classifyInstructorEligibility({
      isAvailableForBooking: true,
      userApproved: true,
      userVerified: true,
      linkedUserRole: "STUDENT",
      qualifiedCategoryNames: ["B"],
      licenseExpiryIsoDate: "2099-12-31",
    });
    expect(studentLinked.eligible).toBe(false);
    expect(studentLinked.reasons).toContain("linked_user_role_not_instructor");
  });

  it("classifies students and vehicles", () => {
    expect(
      classifyStudentEligibility({
        categoryName: "B",
        appAccessMode: "APP_USER",
        hasLinkedUser: true,
        linkedUserApproved: true,
        linkedUserVerified: true,
      }).eligible,
    ).toBe(true);

    expect(
      classifyStudentEligibility({
        categoryName: "A1",
        appAccessMode: "APP_USER",
        hasLinkedUser: true,
        linkedUserApproved: true,
        linkedUserVerified: true,
      }).reasons,
    ).toContain("category_not_b");

    expect(
      classifyVehicleEligibility({
        categoryName: "B",
        isActive: true,
        underMaintenance: false,
        status: "AVAILABLE",
      }).eligible,
    ).toBe(true);

    expect(
      classifyVehicleEligibility({
        categoryName: "B",
        isActive: true,
        underMaintenance: true,
        status: "AVAILABLE",
      }).reasons,
    ).toContain("under_maintenance");
  });

  it("reports disabled/missing required features", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      organizationFeature: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { featureKey: "LESSON_MANAGEMENT", isEnabled: false },
          ]),
      },
      category: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 2, name: "B", isActive: true, transmissionType: null },
          ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "adminsmokeuser0001",
            email: "admin@example.com",
            role: "SUPER_ADMIN",
            firstName: "Smoke",
            lastName: "Admin",
            isApproved: true,
            isEmailVerified: true,
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const result = await inspectProductionSmokeReconciliation(db);
    expect(
      result.features.find((f) => f.featureKey === "LESSON_MANAGEMENT")?.state,
    ).toBe("disabled");
    expect(
      result.features.find((f) => f.featureKey === "VEHICLE_MANAGEMENT")?.state,
    ).toBe("missing");
    expect(result.readiness.requiredFeaturesReady).toBe(false);
    expect(result.readiness.blockers).toContain(
      "feature_disabled:LESSON_MANAGEMENT",
    );
  });

  it("returns tenant-scoped counts and orphan BillingEvent count", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(3),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      category: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 2, name: "B", isActive: true, transmissionType: null },
          ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(5),
      },
      instructor: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(2),
      },
      student: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(3),
      },
      vehicle: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(4),
      },
      lesson: { count: vi.fn().mockResolvedValue(10) },
      lessonRequest: { count: vi.fn().mockResolvedValue(1) },
      exam: { count: vi.fn().mockResolvedValue(0) },
      examRegistration: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { count: vi.fn().mockResolvedValue(7) },
      payment: { count: vi.fn().mockResolvedValue(2) },
      notification: { count: vi.fn().mockResolvedValue(8) },
      billingEvent: { count: vi.fn().mockResolvedValue(4) },
      verificationToken: { count: vi.fn().mockResolvedValue(1) },
      rateLimitBucket: { count: vi.fn().mockResolvedValue(9) },
    });

    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.counts).toMatchObject({
      users: 5,
      instructors: 2,
      students: 3,
      vehicles: 4,
      lessons: 10,
      auditLogs: 7,
      payments: 2,
      notifications: 8,
    });
    expect(result.anomalies.billingEventsWithNullOrganizationId).toBe(4);
    expect(result.anomalies.organizationsOtherThanCanonicalSmoke).toBe(3);
    expect(result.anomalies.verificationTokens).toBe(1);
    expect(result.anomalies.rateLimitBuckets).toBe(9);
  });

  it("does not query commercial models or PLATFORM_ADMIN", async () => {
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      category: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 2, name: "B", isActive: true, transmissionType: null },
          ]),
      },
      user: {
        findMany: vi
          .fn()
          .mockImplementation(async (args: { where: { role?: string } }) => {
            expect(args.where.role).toBe("SUPER_ADMIN");
            expect(args.where.role).not.toBe("PLATFORM_ADMIN");
            return [];
          }),
        count: vi.fn().mockResolvedValue(0),
      },
    });

    await inspectProductionSmokeReconciliation(db);
    expect(db).not.toHaveProperty("commercialProduct");
    expect(db).not.toHaveProperty("plan");
    expect(db).not.toHaveProperty("catalogueVersion");
  });

  it("sanitized output never includes full emails, full org IDs, or raw category IDs", async () => {
    const categorySourceId = 987654321;
    const db = makeDb({
      organization: {
        findMany: vi.fn().mockResolvedValue([baseOrg()]),
        count: vi.fn().mockResolvedValue(0),
      },
      organizationDomain: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ host: "www.meengine.io", isPrimary: true }]),
      },
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue([
          { featureKey: "LESSON_MANAGEMENT", isEnabled: true },
          { featureKey: "VEHICLE_MANAGEMENT", isEnabled: true },
          { featureKey: "STUDENT_ACCESS", isEnabled: true },
        ]),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: categorySourceId,
            name: "B",
            isActive: true,
            transmissionType: null,
          },
        ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "adminsmokeuser0001",
            email: "admin@example.com",
            role: "SUPER_ADMIN",
            firstName: "Smoke",
            lastName: "Admin",
            isApproved: true,
            isEmailVerified: true,
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
    });

    const result = await inspectProductionSmokeReconciliation(db);
    expect(result.categoryB.categoryIdPrefix).toBe(
      toSafeIdPrefix(categorySourceId),
    );
    expect(result.categoryB.categoryIdPrefix).not.toBe(
      String(categorySourceId),
    );

    const text = formatProductionSmokeInspectionText({
      target: {
        host: "aws-0-eu-central-1.pooler.supabase.com",
        port: "6543",
        database: "postgres",
        projectRefPrefix: "abcd…",
        validationStatus: "authorized",
      },
      result,
    });

    expect(text).not.toContain("admin@example.com");
    expect(text).not.toContain(ORG_ID);
    expect(text).not.toContain("smoke@meengine.io");
    expect(text).not.toContain(String(categorySourceId));
    expect(text).toContain("categoryIdPrefix=");
    assertSanitizedInspectionPayload(text);
  });
});

describe("production-smoke-reconciliation CLI source contract", () => {
  it("rejects --apply and write-mode flags", () => {
    const parsed = parseProductionSmokeReconciliationInspectArgs(["--apply"]);
    expect(parsed.unknownFlags).toContain("--apply");
  });

  it("ignores standalone -- separator equivalently", () => {
    expect(parseProductionSmokeReconciliationInspectArgs(["--json"])).toEqual(
      parseProductionSmokeReconciliationInspectArgs(["--", "--json"]),
    );
    expect(parseProductionSmokeReconciliationInspectArgs(["--text"])).toEqual(
      parseProductionSmokeReconciliationInspectArgs(["--", "--text"]),
    );
  });

  it("resolves output from injected env without reading process.env", () => {
    const previous = process.env.DAT_OPS_INSPECT_OUTPUT;
    try {
      process.env.DAT_OPS_INSPECT_OUTPUT = "json";
      const fromArgvOnly = parseProductionSmokeReconciliationInspectArgs([
        "--text",
      ]);
      expect(fromArgvOnly.output).toBe("text");

      const fromInjectedEnv = parseProductionSmokeReconciliationInspectArgs(
        ["--text"],
        { envOutput: "json" },
      );
      expect(fromInjectedEnv.output).toBe("json");

      const envOverridesJsonFlag =
        parseProductionSmokeReconciliationInspectArgs(["--json"], {
          envOutput: "text",
        });
      expect(envOverridesJsonFlag.output).toBe("text");
    } finally {
      if (previous === undefined) {
        delete process.env.DAT_OPS_INSPECT_OUTPUT;
      } else {
        process.env.DAT_OPS_INSPECT_OUTPUT = previous;
      }
    }
  });

  it("safe failure message never leaks synthetic secrets", () => {
    const synthetic = new Error(
      "Prisma query failed postgresql://postgres.projrefsecret:P@ssw0rdLeak@host/db for operator@example.com",
    );
    const formatted = formatProductionSmokeInspectionFailureMessage();
    expect(formatted).toContain("code=inspection_failed");
    expect(formatted).toContain("No database writes were attempted.");
    expect(formatted).not.toContain(synthetic.message);
    expect(formatted).not.toContain("postgresql://");
    expect(formatted).not.toContain("P@ssw0rdLeak");
    expect(formatted).not.toContain("operator@example.com");
    expect(formatted).not.toContain("projrefsecret");
  });

  it("supports Windows-safe direct-execution comparison", () => {
    const fakePath = join(
      process.cwd(),
      "scripts",
      "inspect-production-smoke-reconciliation.ts",
    );
    expect(
      isProductionSmokeReconciliationInspectDirectExecution(
        fakePath,
        "file:///not-the-same",
      ),
    ).toBe(false);
  });

  it("CLI source validates target before Prisma and uses explicit read wrappers", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "scripts",
        "inspect-production-smoke-reconciliation.ts",
      ),
      "utf8",
    );
    expect(source).toContain("assertRemoteOperatorTargetAllowed");
    expect(source).toContain('await import("@prisma/client")');
    expect(source.indexOf("assertRemoteOperatorTargetAllowed")).toBeLessThan(
      source.indexOf('await import("@prisma/client")'),
    );
    expect(source).toContain("pathToFileURL");
    expect(source).toContain("path.resolve");
    expect(source).toContain("import.meta.url");
    expect(source).toMatch(/No --apply/);
    expect(source).not.toMatch(/process\.argv.*--apply/);
    expect(source).not.toContain("DAT_SMOKE_RENAME_APPLY");
    expect(source).not.toMatch(/role:\s*"PLATFORM_ADMIN"/);
    expect(source).not.toContain("commercialProduct");
    expect(source).not.toContain("as unknown as ProductionSmokeInspectionDb");
    expect(source).not.toMatch(/organization:\s*prisma\.organization\b/);
    expect(source).not.toMatch(/user:\s*prisma\.user\b/);
    expect(source).not.toMatch(/instructor:\s*prisma\.instructor\b/);
    expect(source).toContain(
      "findMany: (args) => prisma.organization.findMany(args)",
    );
    expect(source).toContain(
      "count: (args) => prisma.organization.count(args)",
    );
    expect(source).toContain("formatProductionSmokeInspectionFailureMessage");
    expect(source).not.toMatch(/error\.message/);
    expect(source).not.toMatch(
      /parseProductionSmokeReconciliationInspectArgs\([^)]*\)[\s\S]*?process\.env\.DAT_OPS_INSPECT_OUTPUT/,
    );
    expect(source).toContain("env.DAT_OPS_INSPECT_OUTPUT");
  });

  it("adaptPrismaToInspectionDb exposes only read methods", () => {
    const fakePrisma = {
      organization: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      organizationDomain: { findMany: vi.fn(), create: vi.fn() },
      organizationFeature: { findMany: vi.fn(), create: vi.fn() },
      user: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
      category: { findMany: vi.fn(), create: vi.fn() },
      instructor: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
      student: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
      vehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
      lesson: { count: vi.fn(), create: vi.fn() },
      lessonRequest: { count: vi.fn(), create: vi.fn() },
      exam: { count: vi.fn(), create: vi.fn() },
      examRegistration: { count: vi.fn(), create: vi.fn() },
      auditLog: { count: vi.fn(), create: vi.fn() },
      payment: { count: vi.fn(), create: vi.fn() },
      notification: { count: vi.fn(), create: vi.fn() },
      billingEvent: { count: vi.fn(), create: vi.fn() },
      verificationToken: { count: vi.fn(), create: vi.fn() },
      rateLimitBucket: { count: vi.fn(), create: vi.fn() },
      userInvitation: { findMany: vi.fn(), create: vi.fn() },
    };

    const adapted = adaptPrismaToInspectionDb(
      fakePrisma as unknown as import("@prisma/client").PrismaClient,
    );

    expect(Object.keys(adapted.organization).sort()).toEqual([
      "count",
      "findMany",
    ]);
    expect(Object.keys(adapted.user).sort()).toEqual(["count", "findMany"]);
    expect(Object.keys(adapted.lesson).sort()).toEqual(["count"]);
    expect(Object.keys(adapted.userInvitation).sort()).toEqual(["findMany"]);
    expect(adapted.organization).not.toHaveProperty("create");
    expect(adapted.organization).not.toHaveProperty("update");
    expect(adapted.organization).not.toHaveProperty("delete");
    expect(adapted.user).not.toHaveProperty("create");
  });

  it("inspection service source selects no sensitive fields and no write delegates", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "lib",
        "ops",
        "production-smoke-reconciliation-inspection.ts",
      ),
      "utf8",
    );
    expect(source).not.toContain("passwordHash");
    expect(source).not.toMatch(/role:\s*"PLATFORM_ADMIN"/);
    expect(source).toContain('role: "SUPER_ADMIN"');
    expect(source).not.toContain("commercialProduct");
    expect(source).not.toContain("create:");
    expect(source).not.toContain("update:");
    expect(source).not.toContain("deleteMany");
    expect(source).not.toContain("$executeRaw");
    expect(source).not.toContain("$queryRaw");
    expect(source).toContain("categoryIdPrefix");
    expect(source).not.toMatch(/categoryId:\s*cat\.id/);
    expect(source).toContain("linked_user_role_not_instructor");
  });
});
