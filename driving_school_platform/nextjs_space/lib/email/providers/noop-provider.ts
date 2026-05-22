import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";

/**
 * Default provider: no network, no delivery. Safe for local, test, and production
 * when no transactional provider is configured.
 */
export const noopEmailProvider: EmailProvider = {
  id: "noop",

  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    return {
      ok: true,
      provider: "noop",
      noop: true,
    };
  },
};
