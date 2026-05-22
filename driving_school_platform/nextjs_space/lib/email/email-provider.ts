import { noopEmailProvider } from "./providers/noop-provider";
import type { EmailProvider, EmailProviderId } from "./types";

const PLANNED_PROVIDER_IDS: ReadonlySet<string> = new Set([
  "resend",
  "postmark",
  "smtp",
]);

export function normalizeEmailProviderEnv(
  raw: string | undefined,
): string | undefined {
  const trimmed = raw?.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function isPlannedEmailProviderId(
  normalized: string,
): normalized is Exclude<EmailProviderId, "noop"> {
  return PLANNED_PROVIDER_IDS.has(normalized.toLowerCase());
}

export function resolvePlannedProviderId(
  normalized: string,
): Exclude<EmailProviderId, "noop"> | null {
  const id = normalized.toLowerCase();
  if (id === "resend" || id === "postmark" || id === "smtp") return id;
  return null;
}

/**
 * Active adapter for send. Only noop is wired; reads env at call time via caller.
 */
export function getNoopEmailProvider(): EmailProvider {
  return noopEmailProvider;
}
