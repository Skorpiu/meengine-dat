/**
 * Sanitized text formatter for smoke fixtures reconcile plans.
 */

import type { SmokeFixturesReconcilePlan } from "@/lib/ops/production-smoke-fixtures-reconciliation";
import { assertSanitizedInspectionPayload } from "@/lib/ops/production-smoke-reconciliation-output";

export function formatSmokeFixturesReconcilePlanText(
  plan: SmokeFixturesReconcilePlan,
): string {
  const lines: string[] = [
    "DAT production smoke fixtures reconcile",
    `mode=${plan.mode}`,
    "note=Application-level reconcile; does not claim PostgreSQL read-only enforcement",
    "platformBoundary=no_PLATFORM_ADMIN; commercial catalogue untouched",
    "",
    "Organization",
    `  idPrefix=${plan.organization.idPrefix}`,
    `  name=${plan.organization.name}`,
    `  isActive=${String(plan.organization.isActive)}`,
    `  isDemo=${String(plan.organization.isDemo)}`,
    `  otherOrganizationCount=${plan.otherOrganizationCount}`,
    "",
    "Canonical School Admin",
    `  found=${String(plan.canonicalSchoolAdmin.found)}`,
    `  userIdPrefix=${plan.canonicalSchoolAdmin.userIdPrefix ?? "(none)"}`,
    `  email=${plan.canonicalSchoolAdmin.emailRedacted ?? "(none)"}`,
    `  displayName=${plan.canonicalSchoolAdmin.displayName ?? "(none)"}`,
    `  matchedByExpectedEmail=${String(plan.canonicalSchoolAdmin.matchedByExpectedEmail)}`,
    "",
    `Additional School Admins: ${plan.additionalSchoolAdmins.length}`,
  ];

  for (const admin of plan.additionalSchoolAdmins) {
    lines.push(
      `  userIdPrefix=${admin.userIdPrefix} email=${admin.emailRedacted} name=${admin.displayName} preserved=${String(admin.preserved)}`,
    );
  }

  lines.push("");
  lines.push(`Additional Instructors: ${plan.additionalInstructors.length}`);
  for (const row of plan.additionalInstructors) {
    lines.push(
      `  idPrefix=${row.idPrefix} email=${row.emailRedacted} name=${row.displayName} kind=${row.kind} preserved=${String(row.preserved)}`,
    );
  }

  lines.push("");
  lines.push(`Additional Students: ${plan.additionalStudents.length}`);
  for (const row of plan.additionalStudents) {
    lines.push(
      `  idPrefix=${row.idPrefix} email=${row.emailRedacted} name=${row.displayName} kind=${row.kind} preserved=${String(row.preserved)}`,
    );
  }

  lines.push("");
  lines.push(`Human decisions required: ${plan.humanDecisionsRequired.length}`);
  for (const decision of plan.humanDecisionsRequired) {
    lines.push(`  ${decision}`);
  }

  lines.push("");
  lines.push("Features (smoke tenant overrides only)");
  for (const feature of plan.features) {
    lines.push(
      `  ${feature.featureKey} enabled=${String(feature.currentlyEnabled)} action=${feature.action}`,
    );
  }

  lines.push("");
  lines.push("Instructors");
  for (const row of plan.instructors) {
    lines.push(
      `  ${row.displayName} idPrefix=${row.idPrefix} email=${row.emailRedacted} intended=${row.intendedProvenance} observed=${row.observedProvenance} canonical=${String(row.alreadyCanonical)} notes=${row.notes.join("|") || "(none)"}`,
    );
  }

  lines.push("");
  lines.push("Students");
  for (const row of plan.students) {
    lines.push(
      `  ${row.displayName} idPrefix=${row.idPrefix} email=${row.emailRedacted} intended=${row.intendedProvenance} observed=${row.observedProvenance} canonical=${String(row.alreadyCanonical)} notes=${row.notes.join("|") || "(none)"}`,
    );
  }

  lines.push("");
  lines.push("Vehicles");
  for (const row of plan.vehicles) {
    lines.push(
      `  ${row.fromRegistration} -> ${row.toRegistration} idPrefix=${row.vehicleIdPrefix} category=${row.categoryName ?? "(none)"} negative=${String(row.negative)} canonical=${String(row.alreadyCanonical)}`,
    );
  }

  lines.push("");
  lines.push(
    `Name changes planned: ${plan.nameChanges.filter((n) => !n.alreadyCanonical).length}`,
  );
  for (const change of plan.nameChanges.filter((n) => !n.alreadyCanonical)) {
    lines.push(
      `  ${change.entity} ${change.fromDisplayName} -> ${change.toDisplayName} idPrefix=${change.idPrefix} email=${change.emailRedacted}`,
    );
  }

  lines.push("");
  lines.push(`blockers=${plan.blockers.join("|") || "(none)"}`);
  lines.push(`warnings=${plan.warnings.join("|") || "(none)"}`);
  lines.push(`provenanceLimitation=${plan.provenanceLimitation}`);

  const text = lines.join("\n");
  assertSanitizedInspectionPayload(text);
  return text;
}

export function formatSmokeFixturesReconcileFailureMessage(
  code: string,
): string {
  return [
    "Production smoke fixtures reconcile failed.",
    `code=${code}`,
    "No database writes were retained.",
  ].join("\n");
}
