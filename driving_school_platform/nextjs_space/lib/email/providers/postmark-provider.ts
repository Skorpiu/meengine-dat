import { sanitizeEmailErrorMessage } from "../redaction";
import type {
  EmailErrorCode,
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from "../types";

export const DEFAULT_POSTMARK_API_BASE_URL = "https://api.postmarkapp.com";
export const DEFAULT_POSTMARK_MESSAGE_STREAM = "outbound";

export type PostmarkConfig = {
  serverToken: string;
  fromEmail: string;
  messageStream: string;
  apiBaseUrl: string;
};

export function readPostmarkConfigFromEnv(): PostmarkConfig | null {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const fromEmail = process.env.POSTMARK_FROM_EMAIL?.trim();
  if (!serverToken || !fromEmail) {
    return null;
  }

  const messageStream =
    process.env.POSTMARK_MESSAGE_STREAM?.trim() ||
    DEFAULT_POSTMARK_MESSAGE_STREAM;
  const apiBaseUrl = (
    process.env.POSTMARK_API_BASE_URL?.trim() || DEFAULT_POSTMARK_API_BASE_URL
  ).replace(/\/$/, "");

  return {
    serverToken,
    fromEmail,
    messageStream,
    apiBaseUrl,
  };
}

function hasEmailBody(input: SendEmailInput): boolean {
  return Boolean(input.html?.trim() || input.text?.trim());
}

export function mapPostmarkHttpStatusToErrorCode(
  status: number,
): EmailErrorCode {
  if (status === 401) return "PROVIDER_AUTH_FAILED";
  if (status === 422) return "EMAIL_REJECTED";
  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status >= 500 && status <= 599) return "PROVIDER_TEMPORARY_FAILURE";
  return "PROVIDER_SEND_FAILED";
}

export function postmarkErrorMessage(code: EmailErrorCode): string {
  switch (code) {
    case "PROVIDER_MISCONFIGURED":
      return "Postmark is not configured for this deployment.";
    case "INVALID_EMAIL_INPUT":
      return "Email must include HTML or plain text content.";
    case "PROVIDER_AUTH_FAILED":
      return "Postmark authentication failed.";
    case "EMAIL_REJECTED":
      return "Postmark rejected the email.";
    case "PROVIDER_RATE_LIMITED":
      return "Postmark rate limit exceeded.";
    case "PROVIDER_TEMPORARY_FAILURE":
      return "Postmark is temporarily unavailable.";
    case "PROVIDER_SEND_FAILED":
      return "Postmark could not send the email.";
    default:
      return "Email could not be sent.";
  }
}

function postmarkFailure(errorCode: EmailErrorCode): SendEmailResult {
  return {
    ok: false,
    provider: "postmark",
    errorCode,
    message: sanitizeEmailErrorMessage(postmarkErrorMessage(errorCode)),
  };
}

function buildPostmarkRequestBody(
  config: PostmarkConfig,
  input: SendEmailInput,
): Record<string, string> {
  const body: Record<string, string> = {
    From: config.fromEmail,
    To: input.to,
    Subject: input.subject,
    MessageStream: config.messageStream,
  };

  if (input.html?.trim()) {
    body.HtmlBody = input.html;
  }
  if (input.text?.trim()) {
    body.TextBody = input.text;
  }
  if (input.replyTo?.trim()) {
    body.ReplyTo = input.replyTo;
  }
  const tag = input.tags?.[0]?.trim();
  if (tag) {
    body.Tag = tag;
  }

  return body;
}

export function createPostmarkEmailProvider(
  config?: PostmarkConfig,
): EmailProvider {
  return {
    id: "postmark",

    async send(input: SendEmailInput): Promise<SendEmailResult> {
      const resolved = config ?? readPostmarkConfigFromEnv();
      if (
        !resolved ||
        !resolved.serverToken.trim() ||
        !resolved.fromEmail.trim()
      ) {
        return postmarkFailure("PROVIDER_MISCONFIGURED");
      }

      if (!hasEmailBody(input)) {
        return postmarkFailure("INVALID_EMAIL_INPUT");
      }

      const url = `${resolved.apiBaseUrl}/email`;
      const requestBody = buildPostmarkRequestBody(resolved, input);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": resolved.serverToken,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          let id: string | undefined;
          try {
            const payload = (await response.json()) as {
              MessageID?: unknown;
            };
            if (typeof payload.MessageID === "string") {
              id = payload.MessageID;
            }
          } catch {
            // Ignore parse errors; send still succeeded at HTTP level.
          }

          return {
            ok: true,
            provider: "postmark",
            id,
          };
        }

        return postmarkFailure(
          mapPostmarkHttpStatusToErrorCode(response.status),
        );
      } catch {
        return postmarkFailure("PROVIDER_TEMPORARY_FAILURE");
      }
    },
  };
}

export const postmarkEmailProvider = createPostmarkEmailProvider();
