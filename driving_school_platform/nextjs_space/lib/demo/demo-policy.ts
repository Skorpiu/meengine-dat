export type DemoMutationCategory =
  | "user_management"
  | "vehicle_management"
  | "lesson_management"
  | "settings_management"
  | "feature_flags"
  | "licensing"
  | "billing"
  | "cleanup"
  | "platform_onboarding"
  | "profile_preferences"
  | "read_only";

export type DemoMutationDecision =
  | { allowed: true }
  | { allowed: false; reason: "demo_restricted_action" };

const DEMO_ALLOWED_CATEGORIES: ReadonlySet<DemoMutationCategory> = new Set([
  "read_only",
  "profile_preferences",
]);

export function decideDemoMutation(input: {
  isDemoOrganization: boolean;
  category: DemoMutationCategory;
}): DemoMutationDecision {
  if (!input.isDemoOrganization) {
    return { allowed: true };
  }

  if (DEMO_ALLOWED_CATEGORIES.has(input.category)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "demo_restricted_action" };
}
