/**
 * Sanitized text/JSON formatters for production smoke reconciliation inspection.
 * Never emits passwords, hashes, full DB URLs, full project refs, or full emails.
 */

import type { ProductionSmokeInspectionResult } from "@/lib/ops/production-smoke-reconciliation-inspection";
import type { RemoteOperatorTargetSafeSummary } from "@/lib/ops/remote-operator-target-guard";

export const PRODUCTION_SMOKE_INSPECTION_FAILED_CODE = "inspection_failed";

/**
 * Safe public message for unexpected CLI/inspection failures.
 * Must never include raw Prisma messages, stack traces, URLs, or credentials.
 */
export function formatProductionSmokeInspectionFailureMessage(): string {
  return [
    "Production smoke reconciliation inspection failed.",
    `code=${PRODUCTION_SMOKE_INSPECTION_FAILED_CODE}`,
    "No database writes were attempted.",
  ].join("\n");
}

const SENSITIVE_SUBSTRINGS = [
  "password",
  "passwordHash",
  "postgresql://",
  "sessionToken",
  "tokenHash",
  "inviteLink",
] as const;

export function assertSanitizedInspectionPayload(text: string): void {
  const lower = text.toLowerCase();
  for (const needle of SENSITIVE_SUBSTRINGS) {
    if (lower.includes(needle.toLowerCase())) {
      throw new Error(
        `Inspection output contained forbidden substring: ${needle}`,
      );
    }
  }
  // Full emails typically contain @ with local-part longer than redaction pattern.
  // Redacted form is like a***@example.com — allow that; reject unredacted local parts
  // by requiring that any @ occurrence matches redaction heuristics when looking like emails.
  const emailLike = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const candidate of emailLike) {
    const at = candidate.indexOf("@");
    const local = candidate.slice(0, at);
    if (!local.includes("*") && local.length > 1) {
      throw new Error(
        "Inspection output contained an unredacted email address",
      );
    }
  }
}

export function formatProductionSmokeInspectionText(input: {
  target: RemoteOperatorTargetSafeSummary;
  result: ProductionSmokeInspectionResult;
}): string {
  const { target, result } = input;
  const lines: string[] = [
    "DAT production smoke reconciliation inspection",
    "mode=application-level-inspect-only",
    "note=Does not claim PostgreSQL read-only enforcement",
    "platformBoundary=embedded_/platform_is_transitional_non_authoritative; embedded_Platform_Admin_not_inspected",
    "",
    "Target (safe)",
    `  host=${target.host ?? "(unavailable)"}`,
    `  port=${target.port ?? "(default)"}`,
    `  database=${target.database ?? "(unavailable)"}`,
    `  projectRefPrefix=${target.projectRefPrefix ?? "(unavailable)"}`,
    `  validationStatus=${target.validationStatus}`,
    "",
    `Organization status: ${result.organizationStatus}`,
    `  idPrefix=${result.organization.idPrefix ?? "(none)"}`,
    `  name=${result.organization.name ?? "(none)"}`,
    `  email=${result.organization.emailRedacted ?? "(none)"}`,
    `  subscriptionTier=${result.organization.subscriptionTier ?? "(none)"}`,
    `  subscriptionStatus=${result.organization.subscriptionStatus ?? "(none)"}`,
    `  isActive=${String(result.organization.isActive)}`,
    `  isDemo=${String(result.organization.isDemo)}`,
    "",
  ];

  if (result.domains) {
    lines.push("Domains");
    lines.push(`  count=${result.domains.domainCount}`);
    lines.push(
      `  hasExpectedSmokeHost=${String(result.domains.hasExpectedSmokeHost)}`,
    );
    lines.push(`  duplicatePrimary=${String(result.domains.duplicatePrimary)}`);
    lines.push(`  domainReady=${String(result.domains.domainReady)}`);
    for (const host of result.domains.hosts) {
      lines.push(`  host=${host.host} primary=${String(host.isPrimary)}`);
    }
    lines.push("");
  }

  lines.push(`School Admin candidates: ${result.schoolAdminCandidates.length}`);
  for (const admin of result.schoolAdminCandidates) {
    lines.push(
      `  userIdPrefix=${admin.userIdPrefix} email=${admin.emailRedacted} role=${admin.role} approved=${String(admin.isApproved)} verified=${String(admin.isEmailVerified)} activeState=${admin.activeState} name=${admin.displayName} canonical=${String(admin.isCanonical)}`,
    );
  }
  lines.push("");

  lines.push("Category B");
  lines.push(`  found=${String(result.categoryB.found)}`);
  lines.push(`  ambiguous=${String(result.categoryB.ambiguous)}`);
  lines.push(
    `  categoryIdPrefix=${result.categoryB.categoryIdPrefix ?? "(none)"}`,
  );
  lines.push(`  name=${result.categoryB.name ?? "(none)"}`);
  lines.push(`  isActive=${String(result.categoryB.isActive)}`);
  lines.push(
    `  transmission=${result.categoryB.transmissionName ?? "(none)"}/${result.categoryB.transmissionCode ?? "(none)"}`,
  );
  lines.push(`  ready=${String(result.categoryB.ready)}`);
  lines.push("");

  lines.push(`Instructor candidates: ${result.instructorCandidates.length}`);
  for (const row of result.instructorCandidates) {
    lines.push(
      `  instructorIdPrefix=${row.instructorIdPrefix} userIdPrefix=${row.userIdPrefix} email=${row.emailRedacted} name=${row.displayName} available=${String(row.isAvailableForBooking)} licenseValid=${String(row.licenseValid)} categoryB=${String(row.qualifiedForCategoryB)} eligible=${String(row.eligible)} provenance=${row.observedProvenance} canonicalPositive=${String(row.isCanonicalPositive)} canonicalNegative=${String(row.isCanonicalNegative)} reasons=${row.ineligibilityReasons.join("|") || "(none)"}`,
    );
  }
  lines.push("");

  lines.push(`Student candidates: ${result.studentCandidates.length}`);
  for (const row of result.studentCandidates) {
    lines.push(
      `  studentIdPrefix=${row.studentIdPrefix} email=${row.emailRedacted} name=${row.displayName} category=${row.categoryName ?? "(none)"} appAccess=${row.appAccessMode} linkedUser=${String(row.hasLinkedUser)} eligible=${String(row.eligible)} provenance=${row.observedProvenance} canonicalPositive=${String(row.isCanonicalPositive)} canonicalNegative=${String(row.isCanonicalNegative)} reasons=${row.reasons.join("|") || "(none)"}`,
    );
  }
  lines.push("");

  lines.push(`Vehicle candidates: ${result.vehicleCandidates.length}`);
  for (const row of result.vehicleCandidates) {
    lines.push(
      `  vehicleIdPrefix=${row.vehicleIdPrefix} registration=${row.registrationNumber} category=${row.categoryName ?? "(none)"} status=${row.status} active=${String(row.isActive)} maintenance=${String(row.underMaintenance)} eligible=${String(row.eligible)} canonicalPositive=${String(row.isCanonicalPositive)} canonicalNegative=${String(row.isCanonicalNegative)} reasons=${row.reasons.join("|") || "(none)"}`,
    );
  }
  lines.push("");

  lines.push("Features");
  for (const feature of result.features) {
    lines.push(`  ${feature.featureKey}=${feature.state}`);
  }
  lines.push("");

  if (result.counts) {
    lines.push("Tenant-scoped counts");
    for (const [key, value] of Object.entries(result.counts)) {
      lines.push(`  ${key}=${value}`);
    }
    lines.push("");
  }

  lines.push("Anomaly counts");
  for (const [key, value] of Object.entries(result.anomalies)) {
    lines.push(`  ${key}=${value}`);
  }
  lines.push("");

  lines.push("Readiness");
  lines.push(
    `  organizationReady=${String(result.readiness.organizationReady)}`,
  );
  lines.push(`  domainReady=${String(result.readiness.domainReady)}`);
  lines.push(
    `  schoolAdminCandidates=${result.readiness.schoolAdminCandidateCount}`,
  );
  lines.push(
    `  canonicalSchoolAdminFound=${String(result.readiness.canonicalSchoolAdminFound)}`,
  );
  lines.push(`  categoryBReady=${String(result.readiness.categoryBReady)}`);
  lines.push(
    `  eligibleInstructorCandidates=${result.readiness.eligibleInstructorCandidateCount}`,
  );
  lines.push(
    `  eligibleStudentCandidates=${result.readiness.eligibleStudentCandidateCount}`,
  );
  lines.push(
    `  eligibleVehicleCandidates=${result.readiness.eligibleVehicleCandidateCount}`,
  );
  lines.push(
    `  requiredFeaturesReady=${String(result.readiness.requiredFeaturesReady)}`,
  );
  lines.push(
    `  canonicalPositiveInstructorsReady=${String(result.readiness.canonicalPositiveInstructorsReady)}`,
  );
  lines.push(
    `  canonicalPositiveStudentsReady=${String(result.readiness.canonicalPositiveStudentsReady)}`,
  );
  lines.push(
    `  canonicalPositiveVehiclesReady=${String(result.readiness.canonicalPositiveVehiclesReady)}`,
  );
  lines.push(
    `  readOnlySmokePotentiallyReady=${String(result.readiness.readOnlySmokePotentiallyReady)}`,
  );
  lines.push(
    `  mutationSmokePotentiallyReady=${String(result.readiness.mutationSmokePotentiallyReady)}`,
  );
  lines.push(
    `  fixturesPotentiallyReady=${String(result.readiness.fixturesPotentiallyReady)}`,
  );
  lines.push(`  blockers=${result.readiness.blockers.join("|") || "(none)"}`);
  lines.push(`  warnings=${result.readiness.warnings.join("|") || "(none)"}`);
  lines.push(
    `  humanDecisionsRequired=${result.readiness.humanDecisionsRequired.join("|") || "(none)"}`,
  );
  lines.push("");
  lines.push(
    "Reminder: fixturesPotentiallyReady does not mean smoke has run. Full fixture IDs are not exported in this phase.",
  );

  const text = lines.join("\n");
  assertSanitizedInspectionPayload(text);
  return text;
}

export function formatProductionSmokeInspectionJson(input: {
  target: RemoteOperatorTargetSafeSummary;
  result: ProductionSmokeInspectionResult;
}): string {
  const payload = {
    target: input.target,
    result: input.result,
  };
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  assertSanitizedInspectionPayload(text);
  return text;
}
