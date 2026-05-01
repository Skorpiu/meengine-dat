import { db } from "@/lib/db";
import { BillingEventStatus } from "@prisma/client";
import {
  markBillingEventFailed,
  markBillingEventProcessed,
} from "./event-store";
import {
  parseBillingEventPayloadV1,
  projectBillingEventPayloadV1,
} from "./payload-v1";
import { applyBillingProjectionForOrganization } from "./processor";

export type BillingEventProcessingLifecycleResult =
  | { ok: true; status: "PROCESSED" | "SKIPPED" }
  | { ok: false; status: "FAILED"; error: unknown };

/**
 * Provider-agnostic processing lifecycle for a persisted BillingEvent row.
 *
 * Semantics:
 * - Only processes events in RECEIVED status.
 * - Marks PROCESSED on successful apply.
 * - Marks FAILED on parse/apply errors.
 */
export async function processPersistedBillingEventLifecycle(
  billingEventId: string,
): Promise<BillingEventProcessingLifecycleResult> {
  const event = await db.billingEvent.findUnique({
    where: { id: billingEventId },
  });
  if (!event) {
    return {
      ok: false,
      status: "FAILED",
      error: { code: "NOT_FOUND", message: "BillingEvent not found" },
    };
  }

  if (event.status !== BillingEventStatus.RECEIVED) {
    return { ok: true, status: "SKIPPED" };
  }

  const parsed = parseBillingEventPayloadV1(event.payload);
  if (!parsed.ok) {
    await markBillingEventFailed(billingEventId, {
      error: parsed.error,
      stage: "parse",
    });
    return { ok: false, status: "FAILED", error: parsed.error };
  }

  if (!parsed.value.organizationId) {
    const err = {
      code: "MISSING_ORGANIZATION",
      message: "organizationId is required",
    };
    await markBillingEventFailed(billingEventId, {
      error: err,
      stage: "validate",
    });
    return { ok: false, status: "FAILED", error: err };
  }

  try {
    const projection = projectBillingEventPayloadV1(parsed.value);

    await applyBillingProjectionForOrganization({
      organizationId: parsed.value.organizationId,
      occurredAt: new Date(parsed.value.occurredAtIso),
      projection,
    });

    await markBillingEventProcessed(billingEventId, {
      ok: true,
    });
    return { ok: true, status: "PROCESSED" };
  } catch (error) {
    await markBillingEventFailed(billingEventId, { error, stage: "apply" });
    return { ok: false, status: "FAILED", error };
  }
}
