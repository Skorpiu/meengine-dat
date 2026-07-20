/**
 * Application-level inspect-only reconciliation inspection for the DAT
 * technical production smoke tenant (`DAT Production Smoke`).
 *
 * Does not claim PostgreSQL read-only enforcement.
 * Does not inspect or reconcile embedded Platform Admin.
 * Does not query commercial catalogue models.
 */

import { redactEmailRecipient } from "@/lib/email/redaction";
import { isInstructorLicenseExpiryTodayOrFuture } from "@/lib/instructors/instructor-license-utils";
import { PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME } from "@/lib/ops/rename-production-smoke-organization";

export const CANONICAL_SMOKE_ORGANIZATION_NAME =
  PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME;

export const EXPECTED_SMOKE_TENANT_HOST = "www.meengine.io";

export const REQUIRED_SMOKE_FEATURE_KEYS = [
  "LESSON_MANAGEMENT",
  "VEHICLE_MANAGEMENT",
  "STUDENT_ACCESS",
] as const;

export type RequiredSmokeFeatureKey =
  (typeof REQUIRED_SMOKE_FEATURE_KEYS)[number];

export const SAFE_ID_PREFIX_LEN = 8;

/** Narrow findUnique — application-level inspect-only. */
export type InspectFindUnique<TWhere, TSelect, TResult> = (args: {
  where: TWhere;
  select: TSelect;
}) => Promise<TResult | null>;

/** Narrow findFirst — application-level inspect-only. */
export type InspectFindFirst<TWhere, TSelect, TResult> = (args: {
  where: TWhere;
  select: TSelect;
}) => Promise<TResult | null>;

/** Narrow findMany — application-level inspect-only. */
export type InspectFindMany<TWhere, TSelect, TResult> = (args: {
  where: TWhere;
  select: TSelect;
}) => Promise<TResult[]>;

/** Narrow count — application-level inspect-only. */
export type InspectCount<TWhere> = (args?: {
  where?: TWhere;
}) => Promise<number>;

export type ProductionSmokeInspectionDb = {
  organization: {
    findMany: InspectFindMany<
      { name: string },
      {
        id: true;
        name: true;
        email: true;
        subscriptionTier: true;
        subscriptionStatus: true;
        isActive: true;
        isDemo: true;
      },
      {
        id: string;
        name: string;
        email: string | null;
        subscriptionTier: string;
        subscriptionStatus: string;
        isActive: boolean;
        isDemo: boolean;
      }
    >;
    count: InspectCount<{ name?: { not: string } }>;
  };
  organizationDomain: {
    findMany: InspectFindMany<
      { organizationId: string },
      { host: true; isPrimary: true },
      { host: string; isPrimary: boolean }
    >;
  };
  organizationFeature: {
    findMany: InspectFindMany<
      { organizationId: string },
      { featureKey: true; isEnabled: true },
      { featureKey: string; isEnabled: boolean }
    >;
  };
  user: {
    findMany: InspectFindMany<
      { organizationId: string; role?: "SUPER_ADMIN" },
      {
        id: true;
        email: true;
        role: true;
        firstName: true;
        lastName: true;
        isApproved: true;
        isEmailVerified: true;
      },
      {
        id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
        isApproved: boolean;
        isEmailVerified: boolean;
      }
    >;
    count: InspectCount<{ organizationId: string; role?: "SUPER_ADMIN" }>;
  };
  category: {
    findMany: InspectFindMany<
      { name: string },
      {
        id: true;
        name: true;
        isActive: true;
        transmissionType: { select: { id: true; name: true; code: true } };
      },
      {
        id: number;
        name: string;
        isActive: boolean;
        transmissionType: {
          id: number;
          name: string;
          code: string;
        } | null;
      }
    >;
  };
  instructor: {
    findMany: InspectFindMany<
      { organizationId: string },
      {
        id: true;
        userId: true;
        isAvailableForBooking: true;
        instructorLicenseExpiry: true;
        user: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
            isApproved: true;
            isEmailVerified: true;
            role: true;
          };
        };
        qualifiedCategories: { select: { id: true; name: true } };
      },
      {
        id: string;
        userId: string;
        isAvailableForBooking: boolean;
        instructorLicenseExpiry: Date;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          isApproved: boolean;
          isEmailVerified: boolean;
          role: string;
        };
        qualifiedCategories: Array<{ id: number; name: string }>;
      }
    >;
    count: InspectCount<{ organizationId: string }>;
  };
  student: {
    findMany: InspectFindMany<
      { organizationId: string },
      {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        appAccessMode: true;
        userId: true;
        category: { select: { id: true; name: true } };
        user: {
          select: {
            id: true;
            email: true;
            isApproved: true;
            isEmailVerified: true;
          };
        };
      },
      {
        id: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        appAccessMode: string;
        userId: string | null;
        category: { id: number; name: string } | null;
        user: {
          id: string;
          email: string;
          isApproved: boolean;
          isEmailVerified: boolean;
        } | null;
      }
    >;
    count: InspectCount<{ organizationId: string }>;
  };
  vehicle: {
    findMany: InspectFindMany<
      { organizationId: string },
      {
        id: true;
        registrationNumber: true;
        status: true;
        isActive: true;
        underMaintenance: true;
        category: { select: { id: true; name: true } };
      },
      {
        id: number;
        registrationNumber: string;
        status: string;
        isActive: boolean;
        underMaintenance: boolean;
        category: { id: number; name: string } | null;
      }
    >;
    count: InspectCount<{ organizationId: string }>;
  };
  lesson: { count: InspectCount<{ organizationId: string }> };
  lessonRequest: { count: InspectCount<{ organizationId: string }> };
  exam: { count: InspectCount<{ organizationId: string }> };
  examRegistration: {
    count: InspectCount<{ exam: { organizationId: string } }>;
  };
  auditLog: { count: InspectCount<{ organizationId: string }> };
  payment: {
    count: InspectCount<{ user: { organizationId: string } }>;
  };
  notification: {
    count: InspectCount<{ user: { organizationId: string } }>;
  };
  billingEvent: { count: InspectCount<{ organizationId: null }> };
  verificationToken: { count: InspectCount<Record<string, never>> };
  rateLimitBucket: { count: InspectCount<Record<string, never>> };
};

export type SafeIdPrefix = string;

export function toSafeIdPrefix(id: string | number): SafeIdPrefix {
  const raw = String(id);
  if (raw.length <= SAFE_ID_PREFIX_LEN) {
    return `${raw}…`;
  }
  return `${raw.slice(0, SAFE_ID_PREFIX_LEN)}…`;
}

export type FeatureReadinessState = "enabled" | "disabled" | "missing";

export type FeatureReadinessRow = {
  featureKey: RequiredSmokeFeatureKey | string;
  state: FeatureReadinessState;
};

export type SchoolAdminCandidate = {
  userIdPrefix: SafeIdPrefix;
  emailRedacted: string;
  role: string;
  isApproved: boolean;
  isEmailVerified: boolean;
  /** School Admin deactivation is represented by isApproved=false. */
  activeState: "active" | "deactivated";
  displayName: string;
};

export type InstructorCandidate = {
  instructorIdPrefix: SafeIdPrefix;
  userIdPrefix: SafeIdPrefix;
  emailRedacted: string;
  displayName: string;
  isAvailableForBooking: boolean;
  licenseValid: boolean;
  qualifiedForCategoryB: boolean;
  eligible: boolean;
  ineligibilityReasons: string[];
};

export type StudentCandidate = {
  studentIdPrefix: SafeIdPrefix;
  emailRedacted: string;
  displayName: string;
  categoryName: string | null;
  appAccessMode: string;
  hasLinkedUser: boolean;
  linkedUserApproved: boolean | null;
  linkedUserVerified: boolean | null;
  eligible: boolean;
  suitability: "eligible" | "ineligible";
  reasons: string[];
};

export type VehicleCandidate = {
  vehicleIdPrefix: SafeIdPrefix;
  registrationNumber: string;
  categoryName: string | null;
  status: string;
  isActive: boolean;
  underMaintenance: boolean;
  eligible: boolean;
  reasons: string[];
};

export type DomainInspection = {
  domainCount: number;
  hosts: Array<{ host: string; isPrimary: boolean }>;
  primaryHosts: string[];
  hasExpectedSmokeHost: boolean;
  duplicatePrimary: boolean;
  domainReady: boolean;
  warnings: string[];
};

export type CategoryBInspection = {
  found: boolean;
  ambiguous: boolean;
  categoryIdPrefix: SafeIdPrefix | null;
  name: string | null;
  isActive: boolean | null;
  transmissionName: string | null;
  transmissionCode: string | null;
  ready: boolean;
  blockers: string[];
};

export type TenantScopedCounts = {
  users: number;
  schoolAdmins: number;
  instructors: number;
  students: number;
  vehicles: number;
  lessons: number;
  lessonRequests: number;
  exams: number;
  examRegistrations: number;
  auditLogs: number;
  payments: number;
  notifications: number;
};

export type AnomalyCounts = {
  organizationsNamedDatProductionSmoke: number;
  organizationsOtherThanCanonicalSmoke: number;
  billingEventsWithNullOrganizationId: number;
  verificationTokens: number;
  rateLimitBuckets: number;
};

export type ProductionSmokeInspectionResult = {
  inspectionMode: "application-level-inspect-only";
  organizationStatus:
    | "smoke_organization_missing"
    | "smoke_organization_ok"
    | "smoke_organization_ambiguous";
  organization: {
    idPrefix: SafeIdPrefix | null;
    name: string | null;
    emailRedacted: string | null;
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    isActive: boolean | null;
    isDemo: boolean | null;
  };
  domains: DomainInspection | null;
  schoolAdminCandidates: SchoolAdminCandidate[];
  categoryB: CategoryBInspection;
  instructorCandidates: InstructorCandidate[];
  studentCandidates: StudentCandidate[];
  vehicleCandidates: VehicleCandidate[];
  features: FeatureReadinessRow[];
  counts: TenantScopedCounts | null;
  anomalies: AnomalyCounts;
  readiness: {
    organizationReady: boolean;
    domainReady: boolean;
    schoolAdminCandidateCount: number;
    categoryBReady: boolean;
    eligibleInstructorCandidateCount: number;
    eligibleStudentCandidateCount: number;
    eligibleVehicleCandidateCount: number;
    requiredFeaturesReady: boolean;
    readOnlySmokePotentiallyReady: boolean;
    mutationSmokePotentiallyReady: boolean;
    blockers: string[];
    warnings: string[];
    humanDecisionsRequired: string[];
  };
};

function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ") || "(unnamed)";
}

function classifyFeatureState(
  rows: Array<{ featureKey: string; isEnabled: boolean }>,
  key: RequiredSmokeFeatureKey,
): FeatureReadinessState {
  const matches = rows.filter((row) => row.featureKey === key);
  if (matches.length === 0) return "missing";
  if (matches.some((row) => row.isEnabled)) return "enabled";
  return "disabled";
}

export function classifyInstructorEligibility(input: {
  isAvailableForBooking: boolean;
  userApproved: boolean;
  userVerified: boolean;
  linkedUserRole: string;
  qualifiedCategoryNames: string[];
  licenseExpiryIsoDate: string;
}): {
  eligible: boolean;
  licenseValid: boolean;
  qualifiedForCategoryB: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const qualifiedForCategoryB = input.qualifiedCategoryNames.some(
    (name) => name.trim().toUpperCase() === "B",
  );
  const licenseValid = isInstructorLicenseExpiryTodayOrFuture(
    input.licenseExpiryIsoDate,
  );

  if (input.linkedUserRole !== "INSTRUCTOR") {
    reasons.push("linked_user_role_not_instructor");
  }
  if (!input.isAvailableForBooking) {
    reasons.push("not_available_for_booking");
  }
  if (!input.userApproved) {
    reasons.push("linked_user_not_approved");
  }
  if (!input.userVerified) {
    reasons.push("linked_user_not_verified");
  }
  if (!qualifiedForCategoryB) {
    reasons.push("missing_category_b_qualification");
  }
  if (!licenseValid) {
    reasons.push("license_expired_or_invalid");
  }

  return {
    eligible: reasons.length === 0,
    licenseValid,
    qualifiedForCategoryB,
    reasons,
  };
}

export function classifyStudentEligibility(input: {
  categoryName: string | null;
  appAccessMode: string;
  hasLinkedUser: boolean;
  linkedUserApproved: boolean | null;
  linkedUserVerified: boolean | null;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.categoryName || input.categoryName.trim().toUpperCase() !== "B") {
    reasons.push("category_not_b");
  }

  // Hosted smoke admin APIs operate on Student.id; APP_USER + linked user is preferred.
  if (input.appAccessMode === "APP_USER") {
    if (!input.hasLinkedUser) {
      reasons.push("app_user_missing_linked_user");
    } else {
      if (input.linkedUserApproved === false) {
        reasons.push("linked_user_not_approved");
      }
      if (input.linkedUserVerified === false) {
        reasons.push("linked_user_not_verified");
      }
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

export function classifyVehicleEligibility(input: {
  categoryName: string | null;
  isActive: boolean;
  underMaintenance: boolean;
  status: string;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.categoryName || input.categoryName.trim().toUpperCase() !== "B") {
    reasons.push("category_not_b");
  }
  if (!input.isActive) {
    reasons.push("inactive");
  }
  if (input.underMaintenance) {
    reasons.push("under_maintenance");
  }
  if (input.status !== "AVAILABLE") {
    reasons.push(`status_not_available:${input.status}`);
  }
  return { eligible: reasons.length === 0, reasons };
}

export function buildDomainInspection(
  domains: Array<{ host: string; isPrimary: boolean }>,
): DomainInspection {
  const primaryHosts = domains.filter((d) => d.isPrimary).map((d) => d.host);
  const duplicatePrimary = primaryHosts.length > 1;
  const hasExpectedSmokeHost = domains.some(
    (d) => d.host.trim().toLowerCase() === EXPECTED_SMOKE_TENANT_HOST,
  );
  const warnings: string[] = [];
  if (duplicatePrimary) {
    warnings.push("multiple_primary_domains");
  }
  if (primaryHosts.length === 0 && domains.length > 0) {
    warnings.push("no_primary_domain");
  }
  if (!hasExpectedSmokeHost) {
    warnings.push(`missing_expected_host:${EXPECTED_SMOKE_TENANT_HOST}`);
  }

  const domainReady =
    domains.length > 0 &&
    hasExpectedSmokeHost &&
    !duplicatePrimary &&
    primaryHosts.length === 1;

  return {
    domainCount: domains.length,
    hosts: domains.map((d) => ({ host: d.host, isPrimary: d.isPrimary })),
    primaryHosts,
    hasExpectedSmokeHost,
    duplicatePrimary,
    domainReady,
    warnings,
  };
}

export async function inspectProductionSmokeReconciliation(
  db: ProductionSmokeInspectionDb,
): Promise<ProductionSmokeInspectionResult> {
  const namedOrgs = await db.organization.findMany({
    where: { name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      isActive: true,
      isDemo: true,
    },
  });

  const otherOrgCount = await db.organization.count({
    where: { name: { not: CANONICAL_SMOKE_ORGANIZATION_NAME } },
  });

  const billingEventsWithNullOrganizationId = await db.billingEvent.count({
    where: { organizationId: null },
  });
  const verificationTokens = await db.verificationToken.count();
  const rateLimitBuckets = await db.rateLimitBucket.count();

  const anomalies: AnomalyCounts = {
    organizationsNamedDatProductionSmoke: namedOrgs.length,
    organizationsOtherThanCanonicalSmoke: otherOrgCount,
    billingEventsWithNullOrganizationId,
    verificationTokens,
    rateLimitBuckets,
  };

  const emptyCategoryB: CategoryBInspection = {
    found: false,
    ambiguous: false,
    categoryIdPrefix: null,
    name: null,
    isActive: null,
    transmissionName: null,
    transmissionCode: null,
    ready: false,
    blockers: ["category_b_missing"],
  };

  if (namedOrgs.length === 0) {
    return {
      inspectionMode: "application-level-inspect-only",
      organizationStatus: "smoke_organization_missing",
      organization: {
        idPrefix: null,
        name: null,
        emailRedacted: null,
        subscriptionTier: null,
        subscriptionStatus: null,
        isActive: null,
        isDemo: null,
      },
      domains: null,
      schoolAdminCandidates: [],
      categoryB: emptyCategoryB,
      instructorCandidates: [],
      studentCandidates: [],
      vehicleCandidates: [],
      features: REQUIRED_SMOKE_FEATURE_KEYS.map((featureKey) => ({
        featureKey,
        state: "missing" as const,
      })),
      counts: null,
      anomalies,
      readiness: {
        organizationReady: false,
        domainReady: false,
        schoolAdminCandidateCount: 0,
        categoryBReady: false,
        eligibleInstructorCandidateCount: 0,
        eligibleStudentCandidateCount: 0,
        eligibleVehicleCandidateCount: 0,
        requiredFeaturesReady: false,
        readOnlySmokePotentiallyReady: false,
        mutationSmokePotentiallyReady: false,
        blockers: ["smoke_organization_missing"],
        warnings: [],
        humanDecisionsRequired: [
          "Confirm whether the technical smoke tenant must be recreated or repaired.",
        ],
      },
    };
  }

  if (namedOrgs.length > 1) {
    return {
      inspectionMode: "application-level-inspect-only",
      organizationStatus: "smoke_organization_ambiguous",
      organization: {
        idPrefix: null,
        name: CANONICAL_SMOKE_ORGANIZATION_NAME,
        emailRedacted: null,
        subscriptionTier: null,
        subscriptionStatus: null,
        isActive: null,
        isDemo: null,
      },
      domains: null,
      schoolAdminCandidates: [],
      categoryB: {
        ...emptyCategoryB,
        blockers: ["smoke_organization_ambiguous_fixtures_not_recommended"],
      },
      instructorCandidates: [],
      studentCandidates: [],
      vehicleCandidates: [],
      features: REQUIRED_SMOKE_FEATURE_KEYS.map((featureKey) => ({
        featureKey,
        state: "missing" as const,
      })),
      counts: null,
      anomalies,
      readiness: {
        organizationReady: false,
        domainReady: false,
        schoolAdminCandidateCount: 0,
        categoryBReady: false,
        eligibleInstructorCandidateCount: 0,
        eligibleStudentCandidateCount: 0,
        eligibleVehicleCandidateCount: 0,
        requiredFeaturesReady: false,
        readOnlySmokePotentiallyReady: false,
        mutationSmokePotentiallyReady: false,
        blockers: ["smoke_organization_ambiguous"],
        warnings: namedOrgs.map(
          (org) => `ambiguous_org_prefix:${toSafeIdPrefix(org.id)}`,
        ),
        humanDecisionsRequired: [
          "Resolve duplicate DAT Production Smoke organizations before recommending fixtures.",
        ],
      },
    };
  }

  const org = namedOrgs[0]!;
  const organizationId = org.id;

  const [
    domains,
    featureRows,
    schoolAdmins,
    categoriesB,
    instructors,
    students,
    vehicles,
    userCount,
    instructorCount,
    studentCount,
    vehicleCount,
    lessonCount,
    lessonRequestCount,
    examCount,
    examRegistrationCount,
    auditLogCount,
    paymentCount,
    notificationCount,
  ] = await Promise.all([
    db.organizationDomain.findMany({
      where: { organizationId },
      select: { host: true, isPrimary: true },
    }),
    db.organizationFeature.findMany({
      where: { organizationId },
      select: { featureKey: true, isEnabled: true },
    }),
    db.user.findMany({
      where: { organizationId, role: "SUPER_ADMIN" },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isApproved: true,
        isEmailVerified: true,
      },
    }),
    db.category.findMany({
      where: { name: "B" },
      select: {
        id: true,
        name: true,
        isActive: true,
        transmissionType: { select: { id: true, name: true, code: true } },
      },
    }),
    db.instructor.findMany({
      where: { organizationId },
      select: {
        id: true,
        userId: true,
        isAvailableForBooking: true,
        instructorLicenseExpiry: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isApproved: true,
            isEmailVerified: true,
            role: true,
          },
        },
        qualifiedCategories: { select: { id: true, name: true } },
      },
    }),
    db.student.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        appAccessMode: true,
        userId: true,
        category: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            email: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
      },
    }),
    db.vehicle.findMany({
      where: { organizationId },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        isActive: true,
        underMaintenance: true,
        category: { select: { id: true, name: true } },
      },
    }),
    db.user.count({ where: { organizationId } }),
    db.instructor.count({ where: { organizationId } }),
    db.student.count({ where: { organizationId } }),
    db.vehicle.count({ where: { organizationId } }),
    db.lesson.count({ where: { organizationId } }),
    db.lessonRequest.count({ where: { organizationId } }),
    db.exam.count({ where: { organizationId } }),
    db.examRegistration.count({
      where: { exam: { organizationId } },
    }),
    db.auditLog.count({ where: { organizationId } }),
    db.payment.count({ where: { user: { organizationId } } }),
    db.notification.count({ where: { user: { organizationId } } }),
  ]);

  const domainInspection = buildDomainInspection(domains);

  const schoolAdminCandidates: SchoolAdminCandidate[] = schoolAdmins.map(
    (admin) => ({
      userIdPrefix: toSafeIdPrefix(admin.id),
      emailRedacted: redactEmailRecipient(admin.email),
      role: admin.role,
      isApproved: admin.isApproved,
      isEmailVerified: admin.isEmailVerified,
      activeState: admin.isApproved ? "active" : "deactivated",
      displayName: displayName(admin.firstName, admin.lastName),
    }),
  );

  let categoryB: CategoryBInspection;
  if (categoriesB.length === 0) {
    categoryB = emptyCategoryB;
  } else if (categoriesB.length > 1) {
    categoryB = {
      found: true,
      ambiguous: true,
      categoryIdPrefix: null,
      name: "B",
      isActive: null,
      transmissionName: null,
      transmissionCode: null,
      ready: false,
      blockers: ["category_b_ambiguous"],
    };
  } else {
    const cat = categoriesB[0]!;
    const ready = cat.isActive === true;
    categoryB = {
      found: true,
      ambiguous: false,
      categoryIdPrefix: toSafeIdPrefix(cat.id),
      name: cat.name,
      isActive: cat.isActive,
      transmissionName: cat.transmissionType?.name ?? null,
      transmissionCode: cat.transmissionType?.code ?? null,
      ready,
      blockers: ready ? [] : ["category_b_inactive"],
    };
  }

  const instructorCandidates: InstructorCandidate[] = instructors.map((row) => {
    const expiryIso = row.instructorLicenseExpiry.toISOString().slice(0, 10);
    const classification = classifyInstructorEligibility({
      isAvailableForBooking: row.isAvailableForBooking,
      userApproved: row.user.isApproved,
      userVerified: row.user.isEmailVerified,
      linkedUserRole: row.user.role,
      qualifiedCategoryNames: row.qualifiedCategories.map((c) => c.name),
      licenseExpiryIsoDate: expiryIso,
    });

    const reasons = [...classification.reasons];
    if (!categoryB.ready) {
      reasons.push("category_b_not_ready");
    }

    return {
      instructorIdPrefix: toSafeIdPrefix(row.id),
      userIdPrefix: toSafeIdPrefix(row.userId),
      emailRedacted: redactEmailRecipient(row.user.email),
      displayName: displayName(row.user.firstName, row.user.lastName),
      isAvailableForBooking: row.isAvailableForBooking,
      licenseValid: classification.licenseValid,
      qualifiedForCategoryB: classification.qualifiedForCategoryB,
      eligible: classification.eligible && categoryB.ready,
      ineligibilityReasons: reasons,
    };
  });

  const studentCandidates: StudentCandidate[] = students.map((row) => {
    const emailSource = row.email ?? row.user?.email ?? "";
    const classification = classifyStudentEligibility({
      categoryName: row.category?.name ?? null,
      appAccessMode: row.appAccessMode,
      hasLinkedUser: Boolean(row.userId && row.user),
      linkedUserApproved: row.user?.isApproved ?? null,
      linkedUserVerified: row.user?.isEmailVerified ?? null,
    });
    const reasons = [...classification.reasons];
    if (!categoryB.ready) {
      reasons.push("category_b_not_ready");
    }
    const eligible = classification.eligible && categoryB.ready;

    return {
      studentIdPrefix: toSafeIdPrefix(row.id),
      emailRedacted: emailSource
        ? redactEmailRecipient(emailSource)
        : "[missing-email]",
      displayName: displayName(row.firstName, row.lastName),
      categoryName: row.category?.name ?? null,
      appAccessMode: row.appAccessMode,
      hasLinkedUser: Boolean(row.userId && row.user),
      linkedUserApproved: row.user?.isApproved ?? null,
      linkedUserVerified: row.user?.isEmailVerified ?? null,
      eligible,
      suitability: eligible ? "eligible" : "ineligible",
      reasons,
    };
  });

  const vehicleCandidates: VehicleCandidate[] = vehicles.map((row) => {
    const classification = classifyVehicleEligibility({
      categoryName: row.category?.name ?? null,
      isActive: row.isActive,
      underMaintenance: row.underMaintenance,
      status: row.status,
    });
    const reasons = [...classification.reasons];
    if (!categoryB.ready) {
      reasons.push("category_b_not_ready");
    }
    const eligible = classification.eligible && categoryB.ready;

    return {
      vehicleIdPrefix: toSafeIdPrefix(String(row.id)),
      registrationNumber: row.registrationNumber,
      categoryName: row.category?.name ?? null,
      status: row.status,
      isActive: row.isActive,
      underMaintenance: row.underMaintenance,
      eligible,
      reasons,
    };
  });

  const features: FeatureReadinessRow[] = REQUIRED_SMOKE_FEATURE_KEYS.map(
    (featureKey) => ({
      featureKey,
      state: classifyFeatureState(featureRows, featureKey),
    }),
  );

  const requiredFeaturesReady = features.every((f) => f.state === "enabled");

  const blockers: string[] = [];
  const warnings: string[] = [...domainInspection.warnings];
  const humanDecisionsRequired: string[] = [];

  if (!categoryB.ready) {
    blockers.push(...categoryB.blockers);
  }

  for (const feature of features) {
    if (feature.state === "disabled") {
      blockers.push(`feature_disabled:${feature.featureKey}`);
    }
    if (feature.state === "missing") {
      blockers.push(`feature_missing:${feature.featureKey}`);
    }
  }

  if (
    featureRows.some(
      (f) => f.featureKey === "LESSON_MANAGEMENT" && !f.isEnabled,
    )
  ) {
    warnings.push(
      "LESSON_MANAGEMENT disabled blocks fixture-preflight hard-fail and mutation smoke UI paths",
    );
  }
  if (
    featureRows.some(
      (f) => f.featureKey === "VEHICLE_MANAGEMENT" && !f.isEnabled,
    )
  ) {
    warnings.push(
      "VEHICLE_MANAGEMENT disabled blocks fixture-preflight when reported false",
    );
  }

  if (schoolAdminCandidates.length === 0) {
    blockers.push("no_school_admin_candidates");
    humanDecisionsRequired.push(
      "Provision or identify a School Admin (SUPER_ADMIN) for the smoke tenant.",
    );
  } else if (schoolAdminCandidates.length > 1) {
    warnings.push("multiple_school_admin_candidates_unselected");
    humanDecisionsRequired.push(
      "Choose which School Admin credential to place in the operator vault for DAT_SMOKE_ADMIN_*.",
    );
  }

  const eligibleInstructors = instructorCandidates.filter((c) => c.eligible);
  const eligibleStudents = studentCandidates.filter((c) => c.eligible);
  const eligibleVehicles = vehicleCandidates.filter((c) => c.eligible);

  if (eligibleInstructors.length === 0) {
    blockers.push("no_eligible_instructor_candidates");
  } else if (eligibleInstructors.length > 1) {
    humanDecisionsRequired.push(
      "Choose one eligible instructor User.id for DAT_SMOKE_INSTRUCTOR_USER_ID (full ID retrieval is a later approved operation).",
    );
  }

  if (eligibleStudents.length === 0) {
    blockers.push("no_eligible_student_candidates");
  } else if (eligibleStudents.length > 1) {
    humanDecisionsRequired.push(
      "Choose one eligible student for DAT_SMOKE_STUDENT_ID (full ID retrieval is a later approved operation).",
    );
  }

  if (eligibleVehicles.length === 0) {
    blockers.push("no_eligible_vehicle_candidates");
  } else if (eligibleVehicles.length > 1) {
    humanDecisionsRequired.push(
      "Choose one eligible vehicle for DAT_SMOKE_VEHICLE_ID (full ID retrieval is a later approved operation).",
    );
  }

  if (anomalies.billingEventsWithNullOrganizationId > 0) {
    warnings.push(
      `orphan_billing_events_null_org:${anomalies.billingEventsWithNullOrganizationId}`,
    );
  }

  const organizationReady = true;
  const domainReady = domainInspection.domainReady;
  if (!domainReady) {
    blockers.push("domain_not_ready");
  }

  const hasSchoolAdmin = schoolAdminCandidates.length >= 1;
  const readOnlySmokePotentiallyReady =
    organizationReady && domainReady && hasSchoolAdmin && requiredFeaturesReady;

  const mutationSmokePotentiallyReady =
    readOnlySmokePotentiallyReady &&
    categoryB.ready &&
    eligibleInstructors.length >= 1 &&
    eligibleStudents.length >= 1 &&
    eligibleVehicles.length >= 1;

  if (!readOnlySmokePotentiallyReady) {
    humanDecisionsRequired.push(
      "Do not run hosted smoke suites until blockers are resolved and credentials are rotated in the operator vault.",
    );
  }

  return {
    inspectionMode: "application-level-inspect-only",
    organizationStatus: "smoke_organization_ok",
    organization: {
      idPrefix: toSafeIdPrefix(org.id),
      name: org.name,
      emailRedacted: org.email ? redactEmailRecipient(org.email) : null,
      subscriptionTier: org.subscriptionTier,
      subscriptionStatus: org.subscriptionStatus,
      isActive: org.isActive,
      isDemo: org.isDemo,
    },
    domains: domainInspection,
    schoolAdminCandidates,
    categoryB,
    instructorCandidates,
    studentCandidates,
    vehicleCandidates,
    features,
    counts: {
      users: userCount,
      schoolAdmins: schoolAdmins.length,
      instructors: instructorCount,
      students: studentCount,
      vehicles: vehicleCount,
      lessons: lessonCount,
      lessonRequests: lessonRequestCount,
      exams: examCount,
      examRegistrations: examRegistrationCount,
      auditLogs: auditLogCount,
      payments: paymentCount,
      notifications: notificationCount,
    },
    anomalies,
    readiness: {
      organizationReady,
      domainReady,
      schoolAdminCandidateCount: schoolAdminCandidates.length,
      categoryBReady: categoryB.ready,
      eligibleInstructorCandidateCount: eligibleInstructors.length,
      eligibleStudentCandidateCount: eligibleStudents.length,
      eligibleVehicleCandidateCount: eligibleVehicles.length,
      requiredFeaturesReady,
      readOnlySmokePotentiallyReady,
      mutationSmokePotentiallyReady,
      blockers,
      warnings,
      humanDecisionsRequired,
    },
  };
}
