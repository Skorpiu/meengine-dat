import type { BillingProjection } from "./types";
import {
  parseBillingEventPayloadV1,
  projectBillingEventPayloadV1,
  type BillingPayloadParseError,
} from "./payload-v1";

export type BillingProcessResult =
  | { ok: true; projection: BillingProjection }
  | { ok: false; error: BillingPayloadParseError };

/**
 * Minimal processor: take a persisted BillingEvent.payload and produce a projection.
 *
 * This intentionally depends only on the explicit BillingEventPayloadV1 shape (via the codec),
 * so the rest of the system doesn't rely on implicit/loose JSON payloads.
 */
export function processPersistedBillingEventPayload(
  payload: unknown,
): BillingProcessResult {
  const parsed = parseBillingEventPayloadV1(payload);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, projection: projectBillingEventPayloadV1(parsed.value) };
}
