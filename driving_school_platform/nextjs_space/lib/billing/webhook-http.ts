import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const BILLING_WEBHOOK_GENERIC_ERROR =
  "Billing webhook could not be processed." as const;

export const BILLING_WEBHOOK_CODES = {
  processingFailed: "billing_webhook_processing_failed",
  parseFailed: "billing_webhook_parse_failed",
  unsupportedProvider: "billing_webhook_unsupported_provider",
  authenticityUnavailable: "billing_webhook_authenticity_unavailable",
  noEvents: "billing_webhook_no_events",
} as const;

export type BillingWebhookErrorCode =
  (typeof BILLING_WEBHOOK_CODES)[keyof typeof BILLING_WEBHOOK_CODES];

export function billingWebhookJsonError(
  status: number,
  code: BillingWebhookErrorCode,
  error: string = BILLING_WEBHOOK_GENERIC_ERROR,
): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Logs internal context for operators; never include raw webhook body or secrets.
 */
export function logBillingWebhookFailure(
  context: string,
  meta?: {
    provider?: string;
    status?: number;
    code?: string;
    error?: unknown;
  },
): void {
  const err = meta?.error;
  logger.error(
    `Billing webhook: ${context}`,
    err instanceof Error ? err : undefined,
    {
      provider: meta?.provider,
      status: meta?.status,
      code: meta?.code,
    },
  );
}
