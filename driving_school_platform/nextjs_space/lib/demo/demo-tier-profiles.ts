/**
 * Pure demo tier definitions for operator tooling (no Prisma / Next).
 * Keys in `featureKeys` must match `OrganizationFeature.featureKey` values the app
 * actually honours — see `lib/config/license-features.ts`.
 *
 * When new licensed surfaces ship, extend each profile’s `featureKeys` here; do not
 * add placeholder keys the runtime does not check.
 */

export type DemoTierProfileId = "basic" | "premium" | "full-showcase";

export type DemoTierProfile = {
  id: DemoTierProfileId;
  label: string;
  description: string;
  /** Catalog feature keys to enable for this tier via operator scripts. */
  featureKeys: string[];
};

/** Vehicle management — only premium-style module wired through feature gating today. */
const VEHICLE_MANAGEMENT_KEY = "VEHICLE_MANAGEMENT" as const;

export const DEMO_TIER_PROFILES: Record<DemoTierProfileId, DemoTierProfile> = {
  basic: {
    id: "basic",
    label: "Basic demo",
    description:
      "Core scheduling and user experience without enabling extra licensed modules for showcase.",
    featureKeys: [],
  },
  premium: {
    id: "premium",
    label: "Premium demo",
    description:
      "Adds vehicle management as a premium operational surface (matches current licensed vehicle module).",
    // Future: append more keys from license-features as they are demo-safe and gated.
    featureKeys: [VEHICLE_MANAGEMENT_KEY],
  },
  "full-showcase": {
    id: "full-showcase",
    label: "Full showcase demo",
    description:
      "Enables every showcase-safe licensed feature currently implemented in the product catalog.",
    // Today identical to premium: only VEHICLE_MANAGEMENT is used as an extra gated module.
    // Future: extend when additional keys are production-ready for curated demos.
    featureKeys: [VEHICLE_MANAGEMENT_KEY],
  },
};

export function getDemoTierProfile(id: DemoTierProfileId): DemoTierProfile {
  return DEMO_TIER_PROFILES[id];
}

export function parseDemoTierProfileId(
  value: string,
): DemoTierProfileId | null {
  const v = value.trim().toLowerCase();
  if (v === "basic" || v === "premium" || v === "full-showcase") {
    return v;
  }
  return null;
}
