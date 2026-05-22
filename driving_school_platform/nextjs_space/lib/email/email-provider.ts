import { noopEmailProvider } from "./providers/noop-provider";
import type { EmailProvider } from "./types";

const NOT_IMPLEMENTED_PROVIDER_IDS: ReadonlySet<string> = new Set([
  "resend",
  "smtp",
]);

export function normalizeEmailProviderEnv(
  raw: string | undefined,
): string | undefined {
  const trimmed = raw?.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function isNotImplementedEmailProviderId(normalized: string): boolean {
  return NOT_IMPLEMENTED_PROVIDER_IDS.has(normalized.toLowerCase());
}

export function resolveNotImplementedProviderId(
  normalized: string,
): "resend" | "smtp" | null {
  const id = normalized.toLowerCase();
  if (id === "resend" || id === "smtp") return id;
  return null;
}

/**
 * Active noop adapter; reads env at call time via caller.
 */
export function getNoopEmailProvider(): EmailProvider {
  return noopEmailProvider;
}
