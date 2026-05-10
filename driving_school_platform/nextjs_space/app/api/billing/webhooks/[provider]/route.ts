import { NextResponse } from "next/server";
import {
  billingEventToPayloadV1,
  getBillingProvider,
  isSupportedBillingProviderId,
  recordBillingEventWithOutcome,
  processPersistedBillingEventLifecycle,
} from "@/lib/billing";

type Params = { provider: string };

/**
 * Billing webhook boundary skeleton.
 *
 * No real provider signatures/crypto parsing is done in this batch.
 * We only:
 * - validate provider param
 * - delegate parsing to the provider adapter (registry)
 * - persist normalized BillingEventPayloadV1 idempotently (provider + providerEventId)
 */
export async function POST(request: Request, ctx: { params: Params }) {
  const providerParam = ctx?.params?.provider ?? "";
  if (!isSupportedBillingProviderId(providerParam)) {
    return NextResponse.json(
      { error: "Unsupported provider" },
      { status: 400 },
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
    return NextResponse.json(
      {
        error: "Provider webhook parse failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  if (parsed.events.length === 0) {
    return NextResponse.json({ error: "No events parsed" }, { status: 400 });
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
    (x) => x.status === "rejected" || (x.status === "fulfilled" && !x.value.ok),
  );
  if (processingFailed) {
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
      billingEventId: recorded.length === 1 ? recorded[0]!.event.id : undefined,
      billingEventIds: recorded.map((x) => x.event.id),
    },
    { status: 200 },
  );
}
