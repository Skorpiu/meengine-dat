import { describe, it, expect } from "vitest";
import { decideDemoMutation, type DemoMutationCategory } from "./demo-policy";

const ALL_CATEGORIES: DemoMutationCategory[] = [
  "user_management",
  "vehicle_management",
  "lesson_management",
  "settings_management",
  "feature_flags",
  "licensing",
  "billing",
  "cleanup",
  "platform_onboarding",
  "profile_preferences",
  "read_only",
];

describe("decideDemoMutation", () => {
  describe("non-demo organization", () => {
    it.each(ALL_CATEGORIES)(
      "allows category %s",
      (category: DemoMutationCategory) => {
        expect(
          decideDemoMutation({
            isDemoOrganization: false,
            category,
          }),
        ).toEqual({ allowed: true });
      },
    );
  });

  describe("demo organization", () => {
    it('allows "read_only"', () => {
      expect(
        decideDemoMutation({
          isDemoOrganization: true,
          category: "read_only",
        }),
      ).toEqual({ allowed: true });
    });

    it('allows "profile_preferences"', () => {
      expect(
        decideDemoMutation({
          isDemoOrganization: true,
          category: "profile_preferences",
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      "user_management",
      "vehicle_management",
      "lesson_management",
      "settings_management",
      "feature_flags",
      "licensing",
      "billing",
      "cleanup",
      "platform_onboarding",
    ] as const)("blocks %s", (category) => {
      expect(
        decideDemoMutation({
          isDemoOrganization: true,
          category,
        }),
      ).toEqual({
        allowed: false,
        reason: "demo_restricted_action",
      });
    });
  });
});
