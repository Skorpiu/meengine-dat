import { NextResponse } from "next/server";
import {
  billingEventToPayloadV1,
  getBillingProvider,
  isSupportedBillingProviderId,
  recordBillingEventWithOutcome,
  processPersistedBillingEventLifecycle,
} from "@/lib/billing";
import {
  BILLING_WEBHOOK_CODES,
  billingWebhookJsonError,
  logBillingWebhookFailure,
} from "@/lib/billing/webhook-http";

type Params = { provider: string };

/**
 * Billing webhook boundary skeleton.
 *
 * No real provider signatures/crypto parsing is done in this batch.
 * We only:
 * - validate provider param
 * - delegate parsing to the provider adapter (registry)
 * - persist normalized BillingEventPayloadV1 idempotently (provider + providerEventId)
 *
 * HTTP error bodies are sanitized — see lib/billing/webhook-http.ts.
 */
export async function POST(request: Request, ctx: { params: Params }) {
  const providerParam = ctx?.params?.provider ?? "";

  try {
    if (!isSupportedBillingProviderId(providerParam)) {
      return billingWebhookJsonError(
        400,
        BILLING_WEBHOOK_CODES.unsupportedProvider,
        "Unsupported provider",
      );
    }

    const provider = getBillingProvider(providerParam);

    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = await request.text();
    let parsed;
    try {
      parsed = await provider.parseWebhook({ headers, body });
    } catch (err) {
      logBillingWebhookFailure("Provider parseWebhook failed", {
        provider: providerParam,
        status: 400,
        code: BILLING_WEBHOOK_CODES.parseFailed,
        error: err,
      });
      return billingWebhookJsonError(400, BILLING_WEBHOOK_CODES.parseFailed);
    }

    if (parsed.events.length === 0) {
      return billingWebhookJsonError(400, BILLING_WEBHOOK_CODES.noEvents);
    }

    const recorded = await Promise.all(
      parsed.events.map(async (e) => {
        const payloadV1 = billingEventToPayloadV1(e);
        return await recordBillingEventWithOutcome({
          provider: providerParam,
          providerEventId: e.providerEventId,
          eventType: e.type,
          organizationId: e.organizationId ?? null,
          payload: payloadV1,
        });
      }),
    );

    const toProcess = recorded.filter((r) => r.created);
    const processing = await Promise.allSettled(
      toProcess.map((r) => processPersistedBillingEventLifecycle(r.event.id)),
    );

    const processingFailed = processing.some(
      (x) =>
        x.status === "rejected" || (x.status === "fulfilled" && !x.value.ok),
    );
    if (processingFailed) {
      for (const outcome of processing) {
        if (outcome.status === "rejected") {
          logBillingWebhookFailure("Lifecycle processing rejected", {
            provider: providerParam,
            code: BILLING_WEBHOOK_CODES.processingFailed,
            error: outcome.reason,
          });
        } else if (!outcome.value.ok) {
          logBillingWebhookFailure("Lifecycle processing returned not ok", {
            provider: providerParam,
            code: BILLING_WEBHOOK_CODES.processingFailed,
          });
        }
      }

      return NextResponse.json(
        {
          ok: true,
          accepted: true,
          processing: "DEFERRED",
          billingEventId:
            recorded.length === 1 ? recorded[0]!.event.id : undefined,
          billingEventIds: recorded.map((x) => x.event.id),
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        billingEventId:
          recorded.length === 1 ? recorded[0]!.event.id : undefined,
        billingEventIds: recorded.map((x) => x.event.id),
      },
      { status: 200 },
    );
  } catch (err) {
    logBillingWebhookFailure("Unhandled billing webhook error", {
      provider: providerParam || undefined,
      status: 500,
      code: BILLING_WEBHOOK_CODES.processingFailed,
      error: err,
    });
    return billingWebhookJsonError(500, BILLING_WEBHOOK_CODES.processingFailed);
  }
}
