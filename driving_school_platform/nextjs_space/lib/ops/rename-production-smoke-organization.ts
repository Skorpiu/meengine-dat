/**
 * Pure helpers for the production smoke organization rename operator script.
 * No database access — safe for unit tests.
 */

export const PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME = "DAT Production Smoke";

export const ALLOWED_PRODUCTION_SMOKE_CURRENT_NAMES = [
  "A Conquistadora",
  "Conquistadora",
  PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
] as const;

export type ProductionSmokeRenameDecision =
  | { action: "refuse"; reason: string }
  | { action: "noop"; reason: string; currentName: string }
  | { action: "dry-run"; currentName: string; targetName: string }
  | { action: "apply"; currentName: string; targetName: string };

export function normalizeOrganizationHost(raw: string): string {
  let host = raw.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "");
  host = host.split("/")[0] ?? "";
  host = host.replace(/:\d+$/, "");
  return host;
}

export function isAllowedProductionSmokeCurrentName(
  currentName: string,
  explicitExpectedCurrentName?: string,
): boolean {
  const trimmed = currentName.trim();
  if (
    ALLOWED_PRODUCTION_SMOKE_CURRENT_NAMES.includes(
      trimmed as (typeof ALLOWED_PRODUCTION_SMOKE_CURRENT_NAMES)[number],
    )
  ) {
    return true;
  }

  const explicit = explicitExpectedCurrentName?.trim();
  return Boolean(explicit && trimmed === explicit);
}

export function decideProductionSmokeOrganizationRename(input: {
  organizationIdEnv: string | undefined;
  expectedHostEnv: string | undefined;
  explicitExpectedCurrentName?: string;
  applyMode: boolean;
  organization: {
    id: string;
    name: string;
    domains: Array<{ host: string }>;
    userCount: number;
  } | null;
}): ProductionSmokeRenameDecision {
  const orgId = input.organizationIdEnv?.trim();
  if (!orgId) {
    return {
      action: "refuse",
      reason: "DAT_SMOKE_ORG_ID is required",
    };
  }

  const expectedHostRaw = input.expectedHostEnv?.trim();
  if (!expectedHostRaw) {
    return {
      action: "refuse",
      reason: "DAT_SMOKE_EXPECTED_HOST is required",
    };
  }

  if (!input.organization) {
    return {
      action: "refuse",
      reason: `Organization not found for id ${orgId}`,
    };
  }

  if (input.organization.id !== orgId) {
    return {
      action: "refuse",
      reason: "Organization id mismatch",
    };
  }

  const expectedHost = normalizeOrganizationHost(expectedHostRaw);
  const matchedHost = input.organization.domains.find(
    (domain) => normalizeOrganizationHost(domain.host) === expectedHost,
  );

  if (!matchedHost) {
    return {
      action: "refuse",
      reason: `Expected host ${expectedHost} not found on organization`,
    };
  }

  const currentName = input.organization.name.trim();
  if (
    !isAllowedProductionSmokeCurrentName(
      currentName,
      input.explicitExpectedCurrentName,
    )
  ) {
    return {
      action: "refuse",
      reason: `Unexpected current organization name: ${currentName}`,
    };
  }

  if (currentName === PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME) {
    return {
      action: "noop",
      reason: "Organization already has the canonical smoke name",
      currentName,
    };
  }

  const targetName = PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME;
  if (input.applyMode) {
    return { action: "apply", currentName, targetName };
  }

  return { action: "dry-run", currentName, targetName };
}

export type ProductionSmokeRenameReport = {
  organizationId: string;
  currentName: string;
  targetName: string;
  matchedHost: string;
  domainCount: number;
  userCount: number;
  applyMode: boolean;
  decision: ProductionSmokeRenameDecision;
};

export function buildProductionSmokeRenameReport(input: {
  organizationIdEnv: string | undefined;
  expectedHostEnv: string | undefined;
  explicitExpectedCurrentName?: string;
  applyMode: boolean;
  organization: {
    id: string;
    name: string;
    domains: Array<{ host: string }>;
    userCount: number;
  } | null;
}): ProductionSmokeRenameReport | { error: string } {
  const decision = decideProductionSmokeOrganizationRename(input);
  if (decision.action === "refuse") {
    return { error: decision.reason };
  }

  const orgId = input.organizationIdEnv!.trim();
  const expectedHost = normalizeOrganizationHost(input.expectedHostEnv!.trim());
  const matchedHost =
    input.organization?.domains.find(
      (domain) => normalizeOrganizationHost(domain.host) === expectedHost,
    )?.host ?? expectedHost;

  return {
    organizationId: orgId,
    currentName:
      decision.action === "noop" ? decision.currentName : decision.currentName,
    targetName: PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
    matchedHost,
    domainCount: input.organization?.domains.length ?? 0,
    userCount: input.organization?.userCount ?? 0,
    applyMode: input.applyMode,
    decision,
  };
}
