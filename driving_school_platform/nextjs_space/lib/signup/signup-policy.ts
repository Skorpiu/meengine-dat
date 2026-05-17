/**
 * Public signup availability policy (env + demo org).
 * @module lib/signup/signup-policy
 */

export const DEMO_SIGNUP_DISABLED_MESSAGE =
  "Public signup is disabled for demo organizations.";

export const PUBLIC_SIGNUP_DISABLED_MESSAGE =
  "Public signup is currently disabled.";

export type SignupPolicyEnv = {
  PUBLIC_SIGNUP_ENABLED?: string;
};

/**
 * True only when `PUBLIC_SIGNUP_ENABLED` is exactly `"true"` after trim (case-insensitive).
 * Undefined, empty, or any other value => disabled.
 */
export function isPublicSignupEnabled(env?: SignupPolicyEnv): boolean {
  const raw = env?.PUBLIC_SIGNUP_ENABLED ?? process.env.PUBLIC_SIGNUP_ENABLED;
  if (raw == null || raw === "") return false;
  return raw.trim().toLowerCase() === "true";
}

export type SignupAvailabilityDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: "demo_signup_disabled" | "public_signup_disabled";
      message: string;
    };

/**
 * Demo org block takes precedence over the global public-signup flag.
 */
export function decideSignupAvailability(input: {
  isDemoOrganization: boolean;
  env?: SignupPolicyEnv;
}): SignupAvailabilityDecision {
  if (input.isDemoOrganization) {
    return {
      allowed: false,
      code: "demo_signup_disabled",
      message: DEMO_SIGNUP_DISABLED_MESSAGE,
    };
  }

  if (!isPublicSignupEnabled(input.env)) {
    return {
      allowed: false,
      code: "public_signup_disabled",
      message: PUBLIC_SIGNUP_DISABLED_MESSAGE,
    };
  }

  return { allowed: true };
}
