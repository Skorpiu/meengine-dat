import { NextResponse } from "next/server";
import { recordBillingEvent } from "@/lib/billing";
import type { BillingEventType, BillingProviderId } from "@/lib/billing";

type Params = { provider: string };

type BillingWebhookSkeletonBody = {
  providerEventId?: string;
  eventType?: BillingEventType;
  organizationId?: string | null;
  payload?: unknown;
};

function isBillingProviderId(p: string): p is BillingProviderId {
  return p === "sibs" || p === "stripe" || p === "paypal";
}

function isBillingEventType(x: unknown): x is BillingEventType {
  return (
    x === "CHECKOUT_SESSION_CREATED" ||
    x === "PAYMENT_SUCCEEDED" ||
    x === "PAYMENT_FAILED" ||
    x === "SUBSCRIPTION_STARTED" ||
    x === "SUBSCRIPTION_RENEWED" ||
    x === "SUBSCRIPTION_CANCELLED" ||
    x === "SUBSCRIPTION_EXPIRED" ||
    x === "REFUND_ISSUED"
  );
}

async function readBody(
  request: Request,
): Promise<{ json: BillingWebhookSkeletonBody | null; raw: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const j = (await request.json()) as BillingWebhookSkeletonBody;
      return { json: j ?? null, raw: "" };
    } catch {
      const raw = await request.text();
      return { json: null, raw };
    }
  }

  const raw = await request.text();
  return { json: null, raw };
}

/**
 * Billing webhook boundary skeleton.
 *
 * No real provider signatures/crypto parsing is done in this batch.
 * We only:
 * - validate provider param
 * - accept a minimal internal "event envelope"
 * - persist the received event idempotently (provider + providerEventId)
 */
export async function POST(request: Request, ctx: { params: Params }) {
  const providerParam = ctx?.params?.provider ?? "";
  if (!isBillingProviderId(providerParam)) {
    return NextResponse.json(
      { error: "Unsupported provider" },
      { status: 400 },
    );
  }

  const { json, raw } = await readBody(request);

  const providerEventId =
    (json?.providerEventId && typeof json.providerEventId === "string"
      ? json.providerEventId
      : null) ??
    request.headers.get("x-provider-event-id") ??
    request.headers.get("x-event-id");

  if (!providerEventId || typeof providerEventId !== "string") {
    return NextResponse.json(
      { error: "Missing providerEventId" },
      { status: 400 },
    );
  }

  const eventType: BillingEventType = isBillingEventType(json?.eventType)
    ? json!.eventType
    : "CHECKOUT_SESSION_CREATED";

  const payload =
    typeof json?.payload !== "undefined" ? json.payload : (json ?? raw);

  const recorded = await recordBillingEvent({
    provider: providerParam,
    providerEventId,
    eventType,
    organizationId:
      typeof json?.organizationId === "string" ? json.organizationId : null,
    payload,
  });

  return NextResponse.json(
    {
      ok: true,
      billingEventId: recorded.id,
    },
    { status: 200 },
  );
}
