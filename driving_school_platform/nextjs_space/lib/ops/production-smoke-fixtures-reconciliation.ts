/**
 * Application-level reconcile planner/applier for DAT Production Smoke fixtures.
 *
 * Dry-run by default. Writes only when apply=true.
 * Does not claim PostgreSQL read-only enforcement.
 * Does not touch commercial catalogue, Platform Admin, or non-smoke tenants.
 */

import type { FeatureKey } from "@/lib/config/license-features";
import { redactEmailRecipient } from "@/lib/email/redaction";
import { buildAuditLogCreateData } from "@/lib/audit/audit-log-service";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import { LicenseService } from "@/lib/services/license-service";
import {
  CANONICAL_SMOKE_ADMIN,
  CANONICAL_SMOKE_INSTRUCTORS,
  CANONICAL_SMOKE_STUDENTS,
  CANONICAL_SMOKE_VEHICLES,
  DAT_SMOKE_EXPECTED_ADMIN_EMAIL_ENV,
  PRESERVED_ADDITIONAL_INSTRUCTOR,
  PRESERVED_ADDITIONAL_STUDENT,
  PRESERVED_EXTRA_ADMIN,
  SMOKE_REQUIRED_FEATURE_KEYS,
  displayNameOf,
  namesMatch,
  type SmokeFixtureProvenance,
  type SmokeRequiredFeatureKey,
} from "@/lib/ops/production-smoke-fixtures-canonical";
import {
  CANONICAL_SMOKE_ORGANIZATION_NAME,
  toSafeIdPrefix,
  type SafeIdPrefix,
} from "@/lib/ops/production-smoke-reconciliation-inspection";

export type SmokeFixturesReconcileDb = {
  organization: {
    findMany: (args: {
      where?: { name?: string | { not: string } };
      select: {
        id: true;
        name: true;
        isActive: true;
        isDemo: true;
      };
    }) => Promise<
      Array<{
        id: string;
        name: string;
        isActive: boolean;
        isDemo: boolean;
      }>
    >;
    count: (args?: { where?: { name?: { not: string } } }) => Promise<number>;
  };
  organizationFeature: {
    findMany: (args: {
      where: { organizationId: string };
      select: { featureKey: true; isEnabled: true };
    }) => Promise<Array<{ featureKey: string; isEnabled: boolean }>>;
    upsert: (args: {
      where: {
        organizationId_featureKey: {
          organizationId: string;
          featureKey: string;
        };
      };
      create: {
        organizationId: string;
        featureKey: string;
        isEnabled: boolean;
        enabledAt: Date;
        enabledBy?: string;
      };
      update: {
        isEnabled: boolean;
        enabledAt: Date;
        enabledBy?: string;
      };
    }) => Promise<unknown>;
  };
  user: {
    findMany: (args: {
      where: { organizationId: string; role?: "SUPER_ADMIN" | "INSTRUCTOR" };
      select: {
        id: true;
        email: true;
        role: true;
        firstName: true;
        lastName: true;
        isApproved: true;
        isEmailVerified: true;
      };
    }) => Promise<
      Array<{
        id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
        isApproved: boolean;
        isEmailVerified: boolean;
      }>
    >;
    update: (args: {
      where: { id: string };
      data: { firstName?: string; lastName?: string };
    }) => Promise<unknown>;
  };
  instructor: {
    findMany: (args: {
      where: { organizationId: string };
      select: {
        id: true;
        userId: true;
        instructorLicenseNumber: true;
        isAvailableForBooking: true;
        instructorLicenseExpiry: true;
        user: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
            role: true;
            isApproved: true;
            isEmailVerified: true;
          };
        };
        qualifiedCategories: { select: { id: true; name: true } };
      };
    }) => Promise<
      Array<{
        id: string;
        userId: string;
        instructorLicenseNumber: string;
        isAvailableForBooking: boolean;
        instructorLicenseExpiry: Date;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
          isApproved: boolean;
          isEmailVerified: boolean;
        };
        qualifiedCategories: Array<{ id: number; name: string }>;
      }>
    >;
  };
  student: {
    findMany: (args: {
      where: { organizationId: string };
      select: {
        id: true;
        userId: true;
        firstName: true;
        lastName: true;
        email: true;
        studentIdNumber: true;
        appAccessMode: true;
        category: { select: { id: true; name: true } };
        user: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
            role: true;
            isApproved: true;
            isEmailVerified: true;
          };
        };
      };
    }) => Promise<
      Array<{
        id: string;
        userId: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        studentIdNumber: string | null;
        appAccessMode: string;
        category: { id: number; name: string } | null;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
          isApproved: boolean;
          isEmailVerified: boolean;
        } | null;
      }>
    >;
    update: (args: {
      where: { id: string };
      data: { firstName?: string; lastName?: string };
    }) => Promise<unknown>;
  };
  vehicle: {
    findMany: (args: {
      where: { organizationId: string };
      select: {
        id: true;
        registrationNumber: true;
        status: true;
        isActive: true;
        underMaintenance: true;
        category: { select: { id: true; name: true } };
      };
    }) => Promise<
      Array<{
        id: number;
        registrationNumber: string;
        status: string;
        isActive: boolean;
        underMaintenance: boolean;
        category: { id: number; name: string } | null;
      }>
    >;
    update: (args: {
      where: { id: number };
      data: { registrationNumber: string };
    }) => Promise<unknown>;
  };
  userInvitation: {
    findMany: (args: {
      where: {
        organizationId: string;
        status?: "ACCEPTED" | "PENDING" | "REVOKED" | "EXPIRED";
      };
      select: {
        id: true;
        email: true;
        role: true;
        status: true;
        acceptedUserId: true;
        studentId: true;
        acceptedAt: true;
      };
    }) => Promise<
      Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        acceptedUserId: string | null;
        studentId: string | null;
        acceptedAt: Date | null;
      }>
    >;
  };
  auditLog: {
    create: (args: { data: unknown }) => Promise<{ id: string }>;
  };
  $transaction: <T>(
    fn: (tx: SmokeFixturesReconcileDb) => Promise<T>,
  ) => Promise<T>;
};

export type NameChangePlan = {
  entity: "user" | "student";
  idPrefix: SafeIdPrefix;
  fromDisplayName: string;
  toDisplayName: string;
  emailRedacted: string;
  alreadyCanonical: boolean;
};

export type VehiclePlateChangePlan = {
  vehicleIdPrefix: SafeIdPrefix;
  fromRegistration: string;
  toRegistration: string;
  categoryName: string | null;
  negative: boolean;
  alreadyCanonical: boolean;
};

export type FeatureEnablePlan = {
  featureKey: SmokeRequiredFeatureKey;
  currentlyEnabled: boolean;
  action: "enable" | "noop";
};

export type ResolvedFixtureRow = {
  key: string;
  displayName: string;
  idPrefix: SafeIdPrefix;
  emailRedacted: string;
  intendedProvenance: SmokeFixtureProvenance;
  observedProvenance: SmokeFixtureProvenance;
  alreadyCanonical: boolean;
  notes: string[];
};

export type SmokeFixturesReconcilePlan = {
  mode: "dry-run" | "apply";
  organization: {
    idPrefix: SafeIdPrefix;
    name: string;
    isActive: boolean;
    isDemo: boolean;
  };
  otherOrganizationCount: number;
  canonicalSchoolAdmin: {
    found: boolean;
    userIdPrefix: SafeIdPrefix | null;
    emailRedacted: string | null;
    displayName: string | null;
    matchedByExpectedEmail: boolean;
  };
  additionalSchoolAdmins: Array<{
    userIdPrefix: SafeIdPrefix;
    emailRedacted: string;
    displayName: string;
    preserved: boolean;
  }>;
  additionalInstructors: Array<{
    idPrefix: SafeIdPrefix;
    emailRedacted: string;
    displayName: string;
    kind: "additionalInstructor";
    preserved: boolean;
  }>;
  additionalStudents: Array<{
    idPrefix: SafeIdPrefix;
    emailRedacted: string;
    displayName: string;
    kind: "additionalStudent";
    preserved: boolean;
  }>;
  humanDecisionsRequired: string[];
  features: FeatureEnablePlan[];
  instructors: ResolvedFixtureRow[];
  students: ResolvedFixtureRow[];
  vehicles: VehiclePlateChangePlan[];
  nameChanges: NameChangePlan[];
  blockers: string[];
  warnings: string[];
  provenanceLimitation: string;
};

export type SmokeFixturesReconcileRefusal = {
  ok: false;
  code:
    | "smoke_organization_missing"
    | "smoke_organization_ambiguous"
    | "unexpected_additional_organizations"
    | "canonical_admin_missing"
    | "canonical_admin_ambiguous"
    | "fixture_resolution_failed"
    | "apply_failed";
  message: string;
  plan?: SmokeFixturesReconcilePlan;
};

export type SmokeFixturesReconcileSuccess = {
  ok: true;
  plan: SmokeFixturesReconcilePlan;
  applied: boolean;
  changesApplied: number;
};

export type SmokeFixturesReconcileResult =
  | SmokeFixturesReconcileSuccess
  | SmokeFixturesReconcileRefusal;

type InstructorRow = Awaited<
  ReturnType<SmokeFixturesReconcileDb["instructor"]["findMany"]>
>[number];

type StudentRow = Awaited<
  ReturnType<SmokeFixturesReconcileDb["student"]["findMany"]>
>[number];

type InvitationRow = Awaited<
  ReturnType<SmokeFixturesReconcileDb["userInvitation"]["findMany"]>
>[number];

type LegacyInstructorSpec =
  | typeof CANONICAL_SMOKE_INSTRUCTORS.instructor1
  | typeof CANONICAL_SMOKE_INSTRUCTORS.instructorNonB;

type LegacyStudentSpec =
  | typeof CANONICAL_SMOKE_STUDENTS.student1
  | typeof CANONICAL_SMOKE_STUDENTS.studentA1;

type InvitedInstructorSpec = typeof CANONICAL_SMOKE_INSTRUCTORS.instructor2;

type InvitedStudentSpec = typeof CANONICAL_SMOKE_STUDENTS.student2;

function emailMatchesHint(email: string, hint: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return local.includes(hint.toLowerCase());
}

/**
 * Remote observation only: ACCEPTED invitation ⇒ `invite`, else `unknown`.
 * Never invents `manual` from absence of invite rows.
 */
function observeInviteProvenance(input: {
  userId: string | null | undefined;
  email: string | null | undefined;
  studentId?: string | null;
  invitations: Array<{
    status: string;
    acceptedUserId: string | null;
    studentId: string | null;
    email: string;
    role: string;
  }>;
  expectedRole: "INSTRUCTOR" | "STUDENT";
}): SmokeFixtureProvenance {
  const matches = input.invitations.filter((inv) => {
    if (inv.status !== "ACCEPTED") return false;
    if (inv.role !== input.expectedRole) return false;
    if (input.userId && inv.acceptedUserId === input.userId) return true;
    if (input.studentId && inv.studentId === input.studentId) return true;
    if (
      input.email &&
      normalizeInvitationEmail(inv.email) ===
        normalizeInvitationEmail(input.email)
    ) {
      return true;
    }
    return false;
  });
  return matches.length > 0 ? "invite" : "unknown";
}

/**
 * Prefer stable legacy identifiers, then legacy names/email, then canonical name.
 * Legacy specs only — never resolves invite-canonical instructor2.
 */
export function resolveInstructor(
  rows: InstructorRow[],
  spec: LegacyInstructorSpec,
): { ok: true; row: InstructorRow } | { ok: false; reason: string } {
  const byLicense = rows.filter(
    (r) => r.instructorLicenseNumber === spec.legacyLicenseNumber,
  );
  if (byLicense.length === 1) return { ok: true, row: byLicense[0]! };
  if (byLicense.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_license:${spec.legacyLicenseNumber}`,
    };
  }

  const byLegacyName = rows.filter((r) =>
    namesMatch(
      r.user.firstName,
      r.user.lastName,
      spec.legacyFirstName,
      spec.legacyLastName,
    ),
  );
  if (byLegacyName.length === 1) return { ok: true, row: byLegacyName[0]! };
  if (byLegacyName.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_legacy_name:${spec.legacyFirstName} ${spec.legacyLastName}`,
    };
  }

  const byEmail = rows.filter((r) =>
    emailMatchesHint(r.user.email, spec.legacyEmailLocalHint),
  );
  if (byEmail.length === 1) return { ok: true, row: byEmail[0]! };
  if (byEmail.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_email_hint:${spec.legacyEmailLocalHint}`,
    };
  }

  const byCanonical = rows.filter((r) =>
    namesMatch(
      r.user.firstName,
      r.user.lastName,
      spec.firstName,
      spec.lastName,
    ),
  );
  if (byCanonical.length === 1) return { ok: true, row: byCanonical[0]! };
  if (byCanonical.length > 1) {
    return { ok: false, reason: `ambiguous_canonical:${spec.displayName}` };
  }

  return { ok: false, reason: `missing:${spec.displayName}` };
}

function findCoherentAcceptedInstructorInvite(
  instructor: InstructorRow,
  invitations: InvitationRow[],
): InvitationRow | null {
  const matches = invitations.filter(
    (inv) =>
      inv.status === "ACCEPTED" &&
      inv.role === "INSTRUCTOR" &&
      inv.acceptedUserId === instructor.userId &&
      normalizeInvitationEmail(inv.email) ===
        normalizeInvitationEmail(instructor.user.email),
  );
  if (matches.length === 1) return matches[0]!;
  return null;
}

function validateInvitedInstructorRow(
  row: InstructorRow,
  spec: InvitedInstructorSpec,
  expectedEmail: string,
): { ok: true } | { ok: false; reason: string } {
  if (row.user.role !== "INSTRUCTOR") {
    return { ok: false, reason: "invited_instructor_wrong_user_role" };
  }
  if (
    normalizeInvitationEmail(row.user.email) !==
    normalizeInvitationEmail(expectedEmail)
  ) {
    return { ok: false, reason: "invited_instructor_email_mismatch" };
  }
  const hasB = row.qualifiedCategories.some(
    (c) => c.name.trim().toUpperCase() === "B",
  );
  if (spec.requiresCategoryB && !hasB) {
    return {
      ok: false,
      reason: `instructor_missing_category_b:${spec.displayName}`,
    };
  }
  if (!row.isAvailableForBooking) {
    return {
      ok: false,
      reason: "invited_instructor_not_available_for_booking",
    };
  }
  if (row.instructorLicenseExpiry.getTime() <= Date.now()) {
    return { ok: false, reason: "invited_instructor_license_expired" };
  }
  return { ok: true };
}

/**
 * Resolve Smoke Instructor 2 only via operator-only exact email + coherent
 * ACCEPTED invitation. Never matches Sarah Williams / INS-002-2024.
 */
export function resolveInvitedInstructor(
  rows: InstructorRow[],
  invitations: InvitationRow[],
  spec: InvitedInstructorSpec,
  options: { invitedInstructorEmail?: string },
):
  | { ok: true; row: InstructorRow; observedProvenance: "invite" }
  | { ok: false; reason: string } {
  const expectedEmail = options.invitedInstructorEmail?.trim() ?? "";

  if (!expectedEmail) {
    const byCanonical = rows.filter((r) =>
      namesMatch(
        r.user.firstName,
        r.user.lastName,
        spec.firstName,
        spec.lastName,
      ),
    );
    if (byCanonical.length !== 1) {
      return { ok: false, reason: "invited_instructor_email_env_missing" };
    }
    const row = byCanonical[0]!;
    const invite = findCoherentAcceptedInstructorInvite(row, invitations);
    if (!invite) {
      return { ok: false, reason: "invited_instructor_email_env_missing" };
    }
    const valid = validateInvitedInstructorRow(row, spec, row.user.email);
    if (!valid.ok) return valid;
    return { ok: true, row, observedProvenance: "invite" };
  }

  const normalizedExpected = normalizeInvitationEmail(expectedEmail);
  const acceptedMatches = invitations.filter(
    (inv) =>
      inv.status === "ACCEPTED" &&
      inv.role === "INSTRUCTOR" &&
      normalizeInvitationEmail(inv.email) === normalizedExpected,
  );
  if (acceptedMatches.length === 0) {
    return { ok: false, reason: "canonical_invited_instructor_missing" };
  }
  if (acceptedMatches.length > 1) {
    return { ok: false, reason: "ambiguous_accepted_invitation:instructor" };
  }

  const invite = acceptedMatches[0]!;
  const row = rows.find((r) => r.userId === invite.acceptedUserId);
  if (!row) {
    return { ok: false, reason: "canonical_invited_instructor_missing" };
  }
  if (invite.acceptedUserId !== row.userId) {
    return { ok: false, reason: "invited_instructor_accepted_user_mismatch" };
  }
  const valid = validateInvitedInstructorRow(row, spec, expectedEmail);
  if (!valid.ok) return valid;
  return { ok: true, row, observedProvenance: "invite" };
}

export function resolveStudent(
  rows: StudentRow[],
  spec: LegacyStudentSpec,
): { ok: true; row: StudentRow } | { ok: false; reason: string } {
  const byStudentId = rows.filter(
    (r) => r.studentIdNumber === spec.legacyStudentIdNumber,
  );
  if (byStudentId.length === 1) return { ok: true, row: byStudentId[0]! };
  if (byStudentId.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_student_id:${spec.legacyStudentIdNumber}`,
    };
  }

  const byLegacyName = rows.filter((r) =>
    namesMatch(
      r.user?.firstName,
      r.user?.lastName,
      spec.legacyFirstName,
      spec.legacyLastName,
    ),
  );
  if (byLegacyName.length === 1) return { ok: true, row: byLegacyName[0]! };
  if (byLegacyName.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_legacy_name:${spec.legacyFirstName} ${spec.legacyLastName}`,
    };
  }

  const byEmail = rows.filter((r) => {
    const email = r.email ?? r.user?.email ?? "";
    return emailMatchesHint(email, spec.legacyEmailLocalHint);
  });
  if (byEmail.length === 1) return { ok: true, row: byEmail[0]! };
  if (byEmail.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_email_hint:${spec.legacyEmailLocalHint}`,
    };
  }

  const byCanonical = rows.filter((r) => {
    const first = r.firstName ?? r.user?.firstName;
    const last = r.lastName ?? r.user?.lastName;
    return namesMatch(first, last, spec.firstName, spec.lastName);
  });
  if (byCanonical.length === 1) return { ok: true, row: byCanonical[0]! };
  if (byCanonical.length > 1) {
    return { ok: false, reason: `ambiguous_canonical:${spec.displayName}` };
  }

  return { ok: false, reason: `missing:${spec.displayName}` };
}

function findCoherentAcceptedStudentInvite(
  student: StudentRow,
  invitations: InvitationRow[],
): InvitationRow | null {
  const email = student.email ?? student.user?.email ?? "";
  const matches = invitations.filter(
    (inv) =>
      inv.status === "ACCEPTED" &&
      inv.role === "STUDENT" &&
      inv.acceptedUserId === student.userId &&
      inv.studentId === student.id &&
      normalizeInvitationEmail(inv.email) === normalizeInvitationEmail(email),
  );
  if (matches.length === 1) return matches[0]!;
  return null;
}

function validateInvitedStudentRow(
  row: StudentRow,
  spec: InvitedStudentSpec,
  expectedEmail: string,
): { ok: true } | { ok: false; reason: string } {
  if (!row.userId || !row.user) {
    return { ok: false, reason: "invited_student_missing_user" };
  }
  if (row.user.role !== "STUDENT") {
    return { ok: false, reason: "invited_student_wrong_user_role" };
  }
  const email = row.email ?? row.user.email;
  if (
    normalizeInvitationEmail(email) !== normalizeInvitationEmail(expectedEmail)
  ) {
    return { ok: false, reason: "invited_student_email_mismatch" };
  }
  if (row.appAccessMode !== "APP_USER") {
    return { ok: false, reason: "invited_student_not_app_user" };
  }
  const categoryName = row.category?.name ?? null;
  if (
    categoryName?.trim().toUpperCase() !==
    spec.categoryName.trim().toUpperCase()
  ) {
    return {
      ok: false,
      reason: `student_category_mismatch:${spec.displayName}:expected_${spec.categoryName}:got_${categoryName ?? "none"}`,
    };
  }
  return { ok: true };
}

/**
 * Resolve Smoke Student 2 only via operator-only exact email + coherent
 * ACCEPTED invitation. Never matches Bob Wilson / STU-002-2024.
 */
export function resolveInvitedStudent(
  rows: StudentRow[],
  invitations: InvitationRow[],
  spec: InvitedStudentSpec,
  options: { invitedStudentEmail?: string },
):
  | { ok: true; row: StudentRow; observedProvenance: "invite" }
  | { ok: false; reason: string } {
  const expectedEmail = options.invitedStudentEmail?.trim() ?? "";

  if (!expectedEmail) {
    const byCanonical = rows.filter((r) => {
      const first = r.firstName ?? r.user?.firstName;
      const last = r.lastName ?? r.user?.lastName;
      return namesMatch(first, last, spec.firstName, spec.lastName);
    });
    if (byCanonical.length !== 1) {
      return { ok: false, reason: "invited_student_email_env_missing" };
    }
    const row = byCanonical[0]!;
    const invite = findCoherentAcceptedStudentInvite(row, invitations);
    if (!invite) {
      return { ok: false, reason: "invited_student_email_env_missing" };
    }
    const valid = validateInvitedStudentRow(
      row,
      spec,
      row.email ?? row.user?.email ?? "",
    );
    if (!valid.ok) return valid;
    return { ok: true, row, observedProvenance: "invite" };
  }

  const normalizedExpected = normalizeInvitationEmail(expectedEmail);
  const acceptedMatches = invitations.filter(
    (inv) =>
      inv.status === "ACCEPTED" &&
      inv.role === "STUDENT" &&
      normalizeInvitationEmail(inv.email) === normalizedExpected,
  );
  if (acceptedMatches.length === 0) {
    return { ok: false, reason: "canonical_invited_student_missing" };
  }
  if (acceptedMatches.length > 1) {
    return { ok: false, reason: "ambiguous_accepted_invitation:student" };
  }

  const invite = acceptedMatches[0]!;
  const row = rows.find((r) => r.id === invite.studentId);
  if (!row) {
    return { ok: false, reason: "canonical_invited_student_missing" };
  }
  if (invite.studentId !== row.id) {
    return { ok: false, reason: "invited_student_student_id_mismatch" };
  }
  if (invite.acceptedUserId !== row.userId) {
    return { ok: false, reason: "invited_student_accepted_user_mismatch" };
  }
  const valid = validateInvitedStudentRow(row, spec, expectedEmail);
  if (!valid.ok) return valid;
  return { ok: true, row, observedProvenance: "invite" };
}

function resolveVehicle(
  rows: Awaited<ReturnType<SmokeFixturesReconcileDb["vehicle"]["findMany"]>>,
  spec: (typeof CANONICAL_SMOKE_VEHICLES)[number],
): { ok: true; row: (typeof rows)[number] } | { ok: false; reason: string } {
  const byLegacy = rows.filter(
    (r) => r.registrationNumber === spec.legacyRegistrationNumber,
  );
  if (byLegacy.length === 1) return { ok: true, row: byLegacy[0]! };
  if (byLegacy.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_legacy_plate:${spec.legacyRegistrationNumber}`,
    };
  }

  const byCanonical = rows.filter(
    (r) => r.registrationNumber === spec.registrationNumber,
  );
  if (byCanonical.length === 1) return { ok: true, row: byCanonical[0]! };
  if (byCanonical.length > 1) {
    return {
      ok: false,
      reason: `ambiguous_plate:${spec.registrationNumber}`,
    };
  }

  return {
    ok: false,
    reason: `missing_vehicle:${spec.registrationNumber}`,
  };
}

/**
 * Refuse apply when a destination name/plate is held by a row other than the
 * resolved canonical fixture. Does not merge, overwrite, or pick the first hit.
 */
export function collectSmokeFixtureDestinationCollisions(input: {
  instructors: Array<{
    id: string;
    user: { firstName: string; lastName: string };
  }>;
  students: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    user: { firstName: string; lastName: string } | null;
  }>;
  vehicles: Array<{ id: number; registrationNumber: string }>;
  resolvedInstructors: Array<{
    rowId: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }>;
  resolvedStudents: Array<{
    rowId: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }>;
  resolvedVehicles: Array<{ rowId: number; registrationNumber: string }>;
}): string[] {
  const blockers: string[] = [];

  for (const resolved of input.resolvedInstructors) {
    const holders = input.instructors.filter((r) =>
      namesMatch(
        r.user.firstName,
        r.user.lastName,
        resolved.firstName,
        resolved.lastName,
      ),
    );
    for (const holder of holders) {
      if (holder.id !== resolved.rowId) {
        blockers.push(
          `destination_name_collision:instructor:${resolved.displayName}`,
        );
      }
    }
  }

  for (const resolved of input.resolvedStudents) {
    const holders = input.students.filter((r) => {
      const f = r.firstName ?? r.user?.firstName;
      const l = r.lastName ?? r.user?.lastName;
      return namesMatch(f, l, resolved.firstName, resolved.lastName);
    });
    for (const holder of holders) {
      if (holder.id !== resolved.rowId) {
        blockers.push(
          `destination_name_collision:student:${resolved.displayName}`,
        );
      }
    }
  }

  for (const resolved of input.resolvedVehicles) {
    const holders = input.vehicles.filter(
      (r) => r.registrationNumber === resolved.registrationNumber,
    );
    for (const holder of holders) {
      if (holder.id !== resolved.rowId) {
        blockers.push(
          `destination_plate_collision:${resolved.registrationNumber}`,
        );
      }
    }
  }

  return [...new Set(blockers)];
}

/**
 * Pure argv parser for the reconcile CLI.
 *
 * Behaviour:
 * - `[]` / `["--"]` → dry-run
 * - `["--apply"]` / `["--", "--apply"]` → apply (pnpm forwards `-- --apply`)
 * - standalone `--` is ignored (POSIX end-of-options)
 * - duplicate `--apply` → rejected
 * - any other arg → unknownFlags (fail closed before Prisma)
 */
export function parseSmokeFixturesReconcileArgs(argv: readonly string[]): {
  apply: boolean;
  unknownFlags: string[];
} {
  let apply = false;
  const unknownFlags: string[] = [];
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--apply") {
      if (apply) {
        unknownFlags.push("--apply(duplicate)");
        continue;
      }
      apply = true;
      continue;
    }
    unknownFlags.push(arg);
  }
  return { apply, unknownFlags };
}

/**
 * Tenant-scoped feature enable for smoke reconcile apply.
 *
 * Delegates to LicenseService.enableFeature with an injected transaction client
 * and throwOnError so the upsert participates in the same Prisma transaction
 * and domain upsert shape stays single-sourced. Direct LicenseService calls
 * without a client use the global Prisma singleton and cannot join this tx.
 */
export async function enableSmokeOrganizationFeature(
  db: Pick<SmokeFixturesReconcileDb, "organizationFeature">,
  input: {
    organizationId: string;
    featureKey: SmokeRequiredFeatureKey;
    enabledBy?: string;
  },
): Promise<void> {
  await LicenseService.enableFeature(
    input.organizationId,
    input.featureKey as FeatureKey,
    input.enabledBy,
    { client: db, throwOnError: true },
  );
}

export async function planProductionSmokeFixturesReconciliation(
  db: SmokeFixturesReconcileDb,
  options: {
    apply: boolean;
    expectedAdminEmail?: string;
    invitedInstructorEmail?: string;
    invitedStudentEmail?: string;
  },
): Promise<SmokeFixturesReconcileResult> {
  const namedOrgs = await db.organization.findMany({
    where: { name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    select: { id: true, name: true, isActive: true, isDemo: true },
  });

  if (namedOrgs.length === 0) {
    return {
      ok: false,
      code: "smoke_organization_missing",
      message:
        "Canonical smoke organization DAT Production Smoke was not found. No writes performed.",
    };
  }
  if (namedOrgs.length > 1) {
    return {
      ok: false,
      code: "smoke_organization_ambiguous",
      message:
        "Multiple organizations named DAT Production Smoke found. No writes performed.",
    };
  }

  const org = namedOrgs[0]!;
  const otherOrganizationCount = await db.organization.count({
    where: { name: { not: CANONICAL_SMOKE_ORGANIZATION_NAME } },
  });

  if (otherOrganizationCount > 0) {
    return {
      ok: false,
      code: "unexpected_additional_organizations",
      message:
        "Unexpected additional organizations exist on this target. Smoke fixture reconcile refuses to proceed. No writes performed.",
    };
  }

  const [
    featureRows,
    schoolAdmins,
    instructors,
    students,
    vehicles,
    allInvitations,
  ] = await Promise.all([
    db.organizationFeature.findMany({
      where: { organizationId: org.id },
      select: { featureKey: true, isEnabled: true },
    }),
    db.user.findMany({
      where: { organizationId: org.id, role: "SUPER_ADMIN" },
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
    db.instructor.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        userId: true,
        instructorLicenseNumber: true,
        isAvailableForBooking: true,
        instructorLicenseExpiry: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
        qualifiedCategories: { select: { id: true, name: true } },
      },
    }),
    db.student.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        studentIdNumber: true,
        appAccessMode: true,
        category: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
      },
    }),
    db.vehicle.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        isActive: true,
        underMaintenance: true,
        category: { select: { id: true, name: true } },
      },
    }),
    db.userInvitation.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        acceptedUserId: true,
        studentId: true,
        acceptedAt: true,
      },
    }),
  ]);

  const acceptedInvitations = allInvitations.filter(
    (inv) => inv.status === "ACCEPTED",
  );

  const blockers: string[] = [];
  const warnings: string[] = [];
  const humanDecisionsRequired: string[] = [];
  const nameChanges: NameChangePlan[] = [];

  const expectedEmail = options.expectedAdminEmail?.trim();
  let canonicalAdmins = schoolAdmins.filter((a) =>
    namesMatch(
      a.firstName,
      a.lastName,
      CANONICAL_SMOKE_ADMIN.firstName,
      CANONICAL_SMOKE_ADMIN.lastName,
    ),
  );
  let matchedByExpectedEmail = false;
  if (expectedEmail) {
    const normalized = normalizeInvitationEmail(expectedEmail);
    const byEmail = schoolAdmins.filter(
      (a) => normalizeInvitationEmail(a.email) === normalized,
    );
    if (byEmail.length === 1) {
      canonicalAdmins = byEmail;
      matchedByExpectedEmail = true;
      if (
        !namesMatch(
          byEmail[0]!.firstName,
          byEmail[0]!.lastName,
          CANONICAL_SMOKE_ADMIN.firstName,
          CANONICAL_SMOKE_ADMIN.lastName,
        )
      ) {
        warnings.push(
          "expected_admin_email_matched_but_display_name_not_canonical",
        );
      }
    } else if (byEmail.length === 0) {
      blockers.push("expected_admin_email_not_found");
    } else {
      return {
        ok: false,
        code: "canonical_admin_ambiguous",
        message: `${DAT_SMOKE_EXPECTED_ADMIN_EMAIL_ENV} matched multiple School Admins. No writes performed.`,
      };
    }
  }

  if (canonicalAdmins.length === 0) {
    return {
      ok: false,
      code: "canonical_admin_missing",
      message:
        "Canonical School Admin (Smoke Admin) was not found by exact identity. No writes performed.",
    };
  }
  if (canonicalAdmins.length > 1) {
    return {
      ok: false,
      code: "canonical_admin_ambiguous",
      message:
        "Multiple Smoke Admin School Admin candidates found. No writes performed.",
    };
  }

  const canonicalAdmin = canonicalAdmins[0]!;
  const additionalSchoolAdmins = schoolAdmins
    .filter((a) => a.id !== canonicalAdmin.id)
    .map((a) => ({
      userIdPrefix: toSafeIdPrefix(a.id),
      emailRedacted: redactEmailRecipient(a.email),
      displayName: displayNameOf(a.firstName, a.lastName),
      preserved: namesMatch(
        a.firstName,
        a.lastName,
        PRESERVED_EXTRA_ADMIN.firstName,
        PRESERVED_EXTRA_ADMIN.lastName,
      ),
    }));

  const features: FeatureEnablePlan[] = SMOKE_REQUIRED_FEATURE_KEYS.map(
    (featureKey) => {
      const row = featureRows.find((f) => f.featureKey === featureKey);
      const currentlyEnabled = row?.isEnabled === true;
      return {
        featureKey,
        currentlyEnabled,
        action: currentlyEnabled ? "noop" : "enable",
      };
    },
  );

  const additionalInstructors = instructors
    .filter(
      (row) =>
        row.instructorLicenseNumber ===
          PRESERVED_ADDITIONAL_INSTRUCTOR.legacyLicenseNumber ||
        namesMatch(
          row.user.firstName,
          row.user.lastName,
          PRESERVED_ADDITIONAL_INSTRUCTOR.firstName,
          PRESERVED_ADDITIONAL_INSTRUCTOR.lastName,
        ),
    )
    .map((row) => ({
      idPrefix: toSafeIdPrefix(row.id),
      emailRedacted: redactEmailRecipient(row.user.email),
      displayName: displayNameOf(row.user.firstName, row.user.lastName),
      kind: "additionalInstructor" as const,
      preserved: true,
    }));

  const additionalStudents = students
    .filter(
      (row) =>
        row.studentIdNumber ===
          PRESERVED_ADDITIONAL_STUDENT.legacyStudentIdNumber ||
        namesMatch(
          row.firstName ?? row.user?.firstName,
          row.lastName ?? row.user?.lastName,
          PRESERVED_ADDITIONAL_STUDENT.firstName,
          PRESERVED_ADDITIONAL_STUDENT.lastName,
        ),
    )
    .map((row) => ({
      idPrefix: toSafeIdPrefix(row.id),
      emailRedacted: redactEmailRecipient(
        row.email ?? row.user?.email ?? "[missing-email]",
      ),
      displayName: displayNameOf(
        row.firstName ?? row.user?.firstName ?? "",
        row.lastName ?? row.user?.lastName ?? "",
      ),
      kind: "additionalStudent" as const,
      preserved: true,
    }));

  const instructorPlans: ResolvedFixtureRow[] = [];
  const resolvedInstructorRefs: Array<{
    rowId: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }> = [];
  for (const spec of Object.values(CANONICAL_SMOKE_INSTRUCTORS)) {
    if (spec.resolution === "invite") {
      const resolved = resolveInvitedInstructor(
        instructors,
        allInvitations,
        spec,
        { invitedInstructorEmail: options.invitedInstructorEmail },
      );
      if (!resolved.ok) {
        blockers.push(resolved.reason);
        if (
          resolved.reason === "canonical_invited_instructor_missing" ||
          resolved.reason === "invited_instructor_email_env_missing"
        ) {
          humanDecisionsRequired.push(
            "Send INSTRUCTOR invite to operator-only email (DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL); accept invite and complete profile; re-run dry-run.",
          );
        }
        continue;
      }
      const row = resolved.row;
      resolvedInstructorRefs.push({
        rowId: row.id,
        firstName: spec.firstName,
        lastName: spec.lastName,
        displayName: spec.displayName,
      });

      const alreadyCanonical = namesMatch(
        row.user.firstName,
        row.user.lastName,
        spec.firstName,
        spec.lastName,
      );
      if (!alreadyCanonical) {
        nameChanges.push({
          entity: "user",
          idPrefix: toSafeIdPrefix(row.userId),
          fromDisplayName: displayNameOf(row.user.firstName, row.user.lastName),
          toDisplayName: spec.displayName,
          emailRedacted: redactEmailRecipient(row.user.email),
          alreadyCanonical: false,
        });
      }

      instructorPlans.push({
        key: spec.key,
        displayName: spec.displayName,
        idPrefix: toSafeIdPrefix(row.id),
        emailRedacted: redactEmailRecipient(row.user.email),
        intendedProvenance: spec.intendedProvenance,
        observedProvenance: resolved.observedProvenance,
        alreadyCanonical,
        notes: [],
      });
      continue;
    }

    const resolved = resolveInstructor(instructors, spec);
    if (!resolved.ok) {
      blockers.push(resolved.reason);
      continue;
    }
    const row = resolved.row;
    resolvedInstructorRefs.push({
      rowId: row.id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      displayName: spec.displayName,
    });
    const hasB = row.qualifiedCategories.some(
      (c) => c.name.trim().toUpperCase() === "B",
    );
    if (spec.requiresCategoryB && !hasB) {
      blockers.push(`instructor_missing_category_b:${spec.displayName}`);
    }
    if (!spec.requiresCategoryB && hasB) {
      warnings.push(
        `negative_instructor_unexpectedly_has_category_b:${spec.displayName}`,
      );
    }

    const observedProvenance = observeInviteProvenance({
      userId: row.userId,
      email: row.user.email,
      invitations: acceptedInvitations,
      expectedRole: "INSTRUCTOR",
    });
    const notes: string[] = [];
    if (observedProvenance === "unknown") {
      notes.push("provenance_unknown_no_accepted_invitation");
      warnings.push(`provenance_unknown:${spec.displayName}`);
    }

    const alreadyCanonical = namesMatch(
      row.user.firstName,
      row.user.lastName,
      spec.firstName,
      spec.lastName,
    );
    if (!alreadyCanonical) {
      nameChanges.push({
        entity: "user",
        idPrefix: toSafeIdPrefix(row.userId),
        fromDisplayName: displayNameOf(row.user.firstName, row.user.lastName),
        toDisplayName: spec.displayName,
        emailRedacted: redactEmailRecipient(row.user.email),
        alreadyCanonical: false,
      });
    }

    instructorPlans.push({
      key: spec.key,
      displayName: spec.displayName,
      idPrefix: toSafeIdPrefix(row.id),
      emailRedacted: redactEmailRecipient(row.user.email),
      intendedProvenance: spec.intendedProvenance,
      observedProvenance,
      alreadyCanonical,
      notes,
    });
  }

  const studentPlans: ResolvedFixtureRow[] = [];
  const resolvedStudentRefs: Array<{
    rowId: string;
    firstName: string;
    lastName: string;
    displayName: string;
  }> = [];
  for (const spec of Object.values(CANONICAL_SMOKE_STUDENTS)) {
    if (spec.resolution === "invite") {
      const resolved = resolveInvitedStudent(students, allInvitations, spec, {
        invitedStudentEmail: options.invitedStudentEmail,
      });
      if (!resolved.ok) {
        blockers.push(resolved.reason);
        if (
          resolved.reason === "canonical_invited_student_missing" ||
          resolved.reason === "invited_student_email_env_missing"
        ) {
          humanDecisionsRequired.push(
            "Send STUDENT invite to operator-only email (DAT_SMOKE_INVITED_STUDENT_EMAIL); accept invite and complete profile; re-run dry-run.",
          );
        }
        continue;
      }
      const row = resolved.row;
      resolvedStudentRefs.push({
        rowId: row.id,
        firstName: spec.firstName,
        lastName: spec.lastName,
        displayName: spec.displayName,
      });

      const email = row.email ?? row.user?.email ?? "";
      const currentFirst = row.firstName ?? row.user?.firstName ?? "";
      const currentLast = row.lastName ?? row.user?.lastName ?? "";
      const alreadyCanonical = namesMatch(
        currentFirst,
        currentLast,
        spec.firstName,
        spec.lastName,
      );
      if (!alreadyCanonical) {
        if (row.userId) {
          nameChanges.push({
            entity: "user",
            idPrefix: toSafeIdPrefix(row.userId),
            fromDisplayName: displayNameOf(
              row.user?.firstName ?? "",
              row.user?.lastName ?? "",
            ),
            toDisplayName: spec.displayName,
            emailRedacted: email
              ? redactEmailRecipient(email)
              : "[missing-email]",
            alreadyCanonical: false,
          });
        }
        nameChanges.push({
          entity: "student",
          idPrefix: toSafeIdPrefix(row.id),
          fromDisplayName: displayNameOf(currentFirst, currentLast),
          toDisplayName: spec.displayName,
          emailRedacted: email
            ? redactEmailRecipient(email)
            : "[missing-email]",
          alreadyCanonical: false,
        });
      }

      studentPlans.push({
        key: spec.key,
        displayName: spec.displayName,
        idPrefix: toSafeIdPrefix(row.id),
        emailRedacted: email ? redactEmailRecipient(email) : "[missing-email]",
        intendedProvenance: spec.intendedProvenance,
        observedProvenance: resolved.observedProvenance,
        alreadyCanonical,
        notes: [],
      });
      continue;
    }

    const resolved = resolveStudent(students, spec);
    if (!resolved.ok) {
      blockers.push(resolved.reason);
      continue;
    }
    const row = resolved.row;
    resolvedStudentRefs.push({
      rowId: row.id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      displayName: spec.displayName,
    });
    const categoryName = row.category?.name ?? null;
    if (
      categoryName?.trim().toUpperCase() !==
      spec.categoryName.trim().toUpperCase()
    ) {
      blockers.push(
        `student_category_mismatch:${spec.displayName}:expected_${spec.categoryName}:got_${categoryName ?? "none"}`,
      );
    }

    const email = row.email ?? row.user?.email ?? "";
    const observedProvenance = observeInviteProvenance({
      userId: row.userId,
      email,
      studentId: row.id,
      invitations: acceptedInvitations,
      expectedRole: "STUDENT",
    });
    const notes: string[] = [];
    if (observedProvenance === "unknown") {
      notes.push("provenance_unknown_no_accepted_invitation");
      warnings.push(`provenance_unknown:${spec.displayName}`);
    }

    const currentFirst = row.firstName ?? row.user?.firstName ?? "";
    const currentLast = row.lastName ?? row.user?.lastName ?? "";
    const alreadyCanonical = namesMatch(
      currentFirst,
      currentLast,
      spec.firstName,
      spec.lastName,
    );
    if (!alreadyCanonical) {
      if (row.userId) {
        nameChanges.push({
          entity: "user",
          idPrefix: toSafeIdPrefix(row.userId),
          fromDisplayName: displayNameOf(
            row.user?.firstName ?? "",
            row.user?.lastName ?? "",
          ),
          toDisplayName: spec.displayName,
          emailRedacted: email
            ? redactEmailRecipient(email)
            : "[missing-email]",
          alreadyCanonical: false,
        });
      }
      nameChanges.push({
        entity: "student",
        idPrefix: toSafeIdPrefix(row.id),
        fromDisplayName: displayNameOf(currentFirst, currentLast),
        toDisplayName: spec.displayName,
        emailRedacted: email ? redactEmailRecipient(email) : "[missing-email]",
        alreadyCanonical: false,
      });
    }

    studentPlans.push({
      key: spec.key,
      displayName: spec.displayName,
      idPrefix: toSafeIdPrefix(row.id),
      emailRedacted: email ? redactEmailRecipient(email) : "[missing-email]",
      intendedProvenance: spec.intendedProvenance,
      observedProvenance,
      alreadyCanonical,
      notes,
    });
  }

  const vehiclePlans: VehiclePlateChangePlan[] = [];
  const resolvedVehicleRefs: Array<{
    rowId: number;
    registrationNumber: string;
  }> = [];
  for (const spec of CANONICAL_SMOKE_VEHICLES) {
    const resolved = resolveVehicle(vehicles, spec);
    if (!resolved.ok) {
      blockers.push(resolved.reason);
      continue;
    }
    const row = resolved.row;
    resolvedVehicleRefs.push({
      rowId: row.id,
      registrationNumber: spec.registrationNumber,
    });
    const alreadyCanonical = row.registrationNumber === spec.registrationNumber;
    vehiclePlans.push({
      vehicleIdPrefix: toSafeIdPrefix(String(row.id)),
      fromRegistration: row.registrationNumber,
      toRegistration: spec.registrationNumber,
      categoryName: row.category?.name ?? null,
      negative: spec.negative,
      alreadyCanonical,
    });
  }

  blockers.push(
    ...collectSmokeFixtureDestinationCollisions({
      instructors,
      students,
      vehicles,
      resolvedInstructors: resolvedInstructorRefs,
      resolvedStudents: resolvedStudentRefs,
      resolvedVehicles: resolvedVehicleRefs,
    }),
  );

  const provenanceLimitation =
    "Invited fixtures (Smoke Instructor 2, Smoke Student 2) require a coherent ACCEPTED UserInvitation matched by operator-only exact email (DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL / DAT_SMOKE_INVITED_STUDENT_EMAIL). Absence is a blocker. Sarah Williams and Bob Wilson are preserved as additional fixtures and are never renamed into invite-canonical names. Reconcile does not fabricate invitations or send email.";

  const plan: SmokeFixturesReconcilePlan = {
    mode: options.apply ? "apply" : "dry-run",
    organization: {
      idPrefix: toSafeIdPrefix(org.id),
      name: org.name,
      isActive: org.isActive,
      isDemo: org.isDemo,
    },
    otherOrganizationCount,
    canonicalSchoolAdmin: {
      found: true,
      userIdPrefix: toSafeIdPrefix(canonicalAdmin.id),
      emailRedacted: redactEmailRecipient(canonicalAdmin.email),
      displayName: displayNameOf(
        canonicalAdmin.firstName,
        canonicalAdmin.lastName,
      ),
      matchedByExpectedEmail,
    },
    additionalSchoolAdmins,
    additionalInstructors,
    additionalStudents,
    humanDecisionsRequired,
    features,
    instructors: instructorPlans,
    students: studentPlans,
    vehicles: vehiclePlans,
    nameChanges,
    blockers,
    warnings,
    provenanceLimitation,
  };

  if (blockers.length > 0) {
    return {
      ok: false,
      code: "fixture_resolution_failed",
      message:
        "One or more canonical fixtures could not be resolved safely. No writes performed.",
      plan,
    };
  }

  if (!options.apply) {
    return { ok: true, plan, applied: false, changesApplied: 0 };
  }

  try {
    const changesApplied = await db.$transaction(async (tx) => {
      let count = 0;

      for (const feature of features) {
        if (feature.action === "enable") {
          await enableSmokeOrganizationFeature(tx, {
            organizationId: org.id,
            featureKey: feature.featureKey,
            enabledBy: "ops:reconcile-production-smoke-fixtures",
          });
          count += 1;
        }
      }

      for (const spec of Object.values(CANONICAL_SMOKE_INSTRUCTORS)) {
        if (spec.resolution === "invite") {
          const resolved = resolveInvitedInstructor(
            instructors,
            allInvitations,
            spec,
            { invitedInstructorEmail: options.invitedInstructorEmail },
          );
          if (!resolved.ok) throw new Error(resolved.reason);
          const row = resolved.row;
          if (
            !namesMatch(
              row.user.firstName,
              row.user.lastName,
              spec.firstName,
              spec.lastName,
            )
          ) {
            await tx.user.update({
              where: { id: row.userId },
              data: { firstName: spec.firstName, lastName: spec.lastName },
            });
            count += 1;
          }
          continue;
        }

        const resolved = resolveInstructor(instructors, spec);
        if (!resolved.ok) throw new Error(resolved.reason);
        const row = resolved.row;
        if (
          !namesMatch(
            row.user.firstName,
            row.user.lastName,
            spec.firstName,
            spec.lastName,
          )
        ) {
          await tx.user.update({
            where: { id: row.userId },
            data: { firstName: spec.firstName, lastName: spec.lastName },
          });
          count += 1;
        }
      }

      for (const spec of Object.values(CANONICAL_SMOKE_STUDENTS)) {
        if (spec.resolution === "invite") {
          const resolved = resolveInvitedStudent(
            students,
            allInvitations,
            spec,
            { invitedStudentEmail: options.invitedStudentEmail },
          );
          if (!resolved.ok) throw new Error(resolved.reason);
          const row = resolved.row;
          const currentFirst = row.firstName ?? row.user?.firstName ?? "";
          const currentLast = row.lastName ?? row.user?.lastName ?? "";
          if (
            !namesMatch(
              currentFirst,
              currentLast,
              spec.firstName,
              spec.lastName,
            )
          ) {
            if (row.userId) {
              await tx.user.update({
                where: { id: row.userId },
                data: { firstName: spec.firstName, lastName: spec.lastName },
              });
              count += 1;
            }
            await tx.student.update({
              where: { id: row.id },
              data: { firstName: spec.firstName, lastName: spec.lastName },
            });
            count += 1;
          }
          continue;
        }

        const resolved = resolveStudent(students, spec);
        if (!resolved.ok) throw new Error(resolved.reason);
        const row = resolved.row;
        const currentFirst = row.firstName ?? row.user?.firstName ?? "";
        const currentLast = row.lastName ?? row.user?.lastName ?? "";
        if (
          !namesMatch(currentFirst, currentLast, spec.firstName, spec.lastName)
        ) {
          if (row.userId) {
            await tx.user.update({
              where: { id: row.userId },
              data: { firstName: spec.firstName, lastName: spec.lastName },
            });
            count += 1;
          }
          await tx.student.update({
            where: { id: row.id },
            data: { firstName: spec.firstName, lastName: spec.lastName },
          });
          count += 1;
        }
      }

      for (const spec of CANONICAL_SMOKE_VEHICLES) {
        const resolved = resolveVehicle(vehicles, spec);
        if (!resolved.ok) throw new Error(resolved.reason);
        const row = resolved.row;
        if (row.registrationNumber !== spec.registrationNumber) {
          await tx.vehicle.update({
            where: { id: row.id },
            data: { registrationNumber: spec.registrationNumber },
          });
          count += 1;
        }
      }

      // Audit only when domain writes actually occurred (idempotent second apply = zero writes).
      if (count > 0) {
        await tx.auditLog.create({
          data: buildAuditLogCreateData({
            organizationId: org.id,
            actorUserId: canonicalAdmin.id,
            actorRole: "SUPER_ADMIN",
            actorEmail: null,
            action: "smoke.fixtures.reconcile",
            entityType: "Organization",
            entityId: org.id,
            metadata: {
              featuresEnabled: features
                .filter((f) => f.action === "enable")
                .map((f) => f.featureKey),
              nameChangeCount: nameChanges.filter((n) => !n.alreadyCanonical)
                .length,
              vehiclePlateChangeCount: vehiclePlans.filter(
                (v) => !v.alreadyCanonical,
              ).length,
              mode: "apply",
            },
            status: "SUCCESS",
          }),
        });
        count += 1;
      }

      return count;
    });

    return {
      ok: true,
      plan: { ...plan, mode: "apply" },
      applied: true,
      changesApplied,
    };
  } catch {
    return {
      ok: false,
      code: "apply_failed",
      message:
        "Smoke fixture reconcile apply failed and was rolled back. No partial writes retained.",
      plan,
    };
  }
}

/** Type-only re-export for FeatureKey usage in CLI docs. */
export type { FeatureKey };
