/**
 * Pure policy for optional demo write sandbox (no Prisma, no Next).
 * When disabled or quota exceeded, routes return stable 403 payloads.
 */

export type DemoWriteSandboxCategory =
  | "lesson_theory"
  | "lesson_driving"
  | "lesson_theory_exam"
  | "lesson_practical_exam"
  | "vehicle";

export type DemoWriteSandboxDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "demo_write_sandbox_disabled" | "demo_write_quota_exceeded";
    };

const DEFAULT_MAX = 1;

export function isDemoWriteSandboxEnabled(
  env?: NodeJS.ProcessEnv | { DEMO_WRITE_SANDBOX_ENABLED?: string },
): boolean {
  const raw = (env ?? process.env).DEMO_WRITE_SANDBOX_ENABLED;
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}

export function decideDemoWriteSandbox(input: {
  isDemoOrganization: boolean;
  sandboxEnabled: boolean;
  category: DemoWriteSandboxCategory;
  currentCount: number;
  maxCount?: number;
  /** Rows this request would add (e.g. one EXAM booking per student). Default 1. */
  pendingCreates?: number;
}): DemoWriteSandboxDecision {
  if (!input.isDemoOrganization) {
    return { allowed: true };
  }

  if (!input.sandboxEnabled) {
    return { allowed: false, reason: "demo_write_sandbox_disabled" };
  }

  const max = input.maxCount ?? DEFAULT_MAX;
  const pending = input.pendingCreates ?? 1;
  if (input.currentCount + pending > max) {
    return { allowed: false, reason: "demo_write_quota_exceeded" };
  }

  return { allowed: true };
}
