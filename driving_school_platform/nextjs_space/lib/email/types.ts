/**
 * Email boundary types (provider-neutral).
 *
 * No provider SDKs or network calls in this module.
 */

/** Providers with an adapter in `lib/email/providers/*`. */
export type EmailProviderId = "noop" | "resend" | "postmark" | "smtp";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[];
};

export type EmailErrorCode =
  | "PROVIDER_UNKNOWN"
  | "PROVIDER_NOT_IMPLEMENTED"
  | "PROVIDER_MISCONFIGURED"
  | "INVALID_EMAIL_INPUT"
  | "PROVIDER_AUTH_FAILED"
  | "EMAIL_REJECTED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TEMPORARY_FAILURE"
  | "PROVIDER_SEND_FAILED";

export type SendEmailSuccessResult = {
  ok: true;
  provider: EmailProviderId;
  /** Present when the active provider is noop (no outbound delivery). */
  noop?: true;
  id?: string;
};

export type SendEmailErrorResult = {
  ok: false;
  provider: EmailProviderId;
  errorCode: EmailErrorCode;
  /** Sanitized; never includes full html/text or raw tokens. */
  message: string;
};

export type SendEmailResult = SendEmailSuccessResult | SendEmailErrorResult;

export interface EmailProvider {
  readonly id: EmailProviderId;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
