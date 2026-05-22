import {
  getNoopEmailProvider,
  isPlannedEmailProviderId,
  normalizeEmailProviderEnv,
  resolvePlannedProviderId,
} from "./email-provider";
import { sanitizeEmailErrorMessage } from "./redaction";
import type { SendEmailInput, SendEmailResult } from "./types";

function readEmailProviderEnv(): string | undefined {
  return normalizeEmailProviderEnv(process.env.EMAIL_PROVIDER);
}

/**
 * Send transactional email through the configured provider boundary.
 *
 * Default: noop (no network). Optional `EMAIL_PROVIDER` is read here only —
 * not validated by `lib/env.ts`.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const configured = readEmailProviderEnv();

  if (!configured || configured.toLowerCase() === "noop") {
    return getNoopEmailProvider().send(input);
  }

  if (isPlannedEmailProviderId(configured)) {
    const provider = resolvePlannedProviderId(configured)!;
    return {
      ok: false,
      provider,
      errorCode: "PROVIDER_NOT_IMPLEMENTED",
      message: sanitizeEmailErrorMessage(
        `Email provider "${provider}" is not configured in this deployment.`,
      ),
    };
  }

  return {
    ok: false,
    provider: "noop",
    errorCode: "PROVIDER_UNKNOWN",
    message: sanitizeEmailErrorMessage(
      "Unknown EMAIL_PROVIDER value; no email was sent.",
    ),
  };
}
