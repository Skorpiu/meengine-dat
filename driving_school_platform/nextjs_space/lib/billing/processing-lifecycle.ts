import { db } from "@/lib/db";
import { BillingEventStatus, type PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  lockBillingEventRowForUpdate,
  markBillingEventFailed,
  markBillingEventFailedIfProcessable,
  markBillingEventProcessed,
  toBillingProcessingFailureJson,
} from "./event-store";
import {
  parseBillingEventPayloadV1,
  projectBillingEventPayloadV1,
} from "./payload-v1";
import { applyBillingProjectionForOrganization } from "./processor";

export type BillingEventProcessingLifecycleResult =
  | { ok: true; status: "PROCESSED" | "SKIPPED" }
  | { ok: false; status: "FAILED"; error: unknown };

export type BillingLifecycleClient = {
  $transaction: PrismaClient["$transaction"];
  billingEvent: PrismaClient["billingEvent"];
};

const BILLING_APPLY_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

function isProcessableForInitialApply(status: BillingEventStatus): boolean {
  return status === BillingEventStatus.RECEIVED;
}

function isProcessableForRetry(status: BillingEventStatus): boolean {
  return (
    status === BillingEventStatus.RECEIVED ||
    status === BillingEventStatus.FAILED
  );
}

function resolveAuthoritativeOrganizationId(input: {
  persistedOrganizationId: string | null;
  payloadOrganizationId: string;
}):
  | { ok: true; organizationId: string }
  | {
      ok: false;
      error: { code: "ORGANIZATION_MISMATCH"; message: string };
    } {
  if (
    input.persistedOrganizationId &&
    input.persistedOrganizationId !== input.payloadOrganizationId
  ) {
    return {
      ok: false,
      error: {
        code: "ORGANIZATION_MISMATCH",
        message:
          "Persisted BillingEvent.organizationId does not match payload organizationId",
      },
    };
  }

  return {
    ok: true,
    organizationId:
      input.persistedOrganizationId ?? input.payloadOrganizationId,
  };
}

async function applyLifecycleUnderLock(
  tx: Prisma.TransactionClient,
  event: {
    id: string;
    organizationId: string | null;
    payload: Prisma.JsonValue;
  },
): Promise<BillingEventProcessingLifecycleResult> {
  const parsed = parseBillingEventPayloadV1(event.payload);
  if (!parsed.ok) {
    await markBillingEventFailed(
      event.id,
      {
        stage: "parse",
        code: parsed.error.code,
        message: parsed.error.message,
      },
      tx,
    );
    return { ok: false, status: "FAILED", error: parsed.error };
  }

  if (!parsed.value.organizationId) {
    const err = {
      code: "MISSING_ORGANIZATION" as const,
      message: "organizationId is required",
    };
    await markBillingEventFailed(
      event.id,
      {
        stage: "validate",
        code: err.code,
        message: err.message,
      },
      tx,
    );
    return { ok: false, status: "FAILED", error: err };
  }

  const orgAuthority = resolveAuthoritativeOrganizationId({
    persistedOrganizationId: event.organizationId,
    payloadOrganizationId: parsed.value.organizationId,
  });
  if (!orgAuthority.ok) {
    await markBillingEventFailed(
      event.id,
      {
        stage: "validate",
        code: orgAuthority.error.code,
        message: orgAuthority.error.message,
      },
      tx,
    );
    return { ok: false, status: "FAILED", error: orgAuthority.error };
  }

  const projection = projectBillingEventPayloadV1(parsed.value);

  await applyBillingProjectionForOrganization(tx, {
    organizationId: orgAuthority.organizationId,
    occurredAt: new Date(parsed.value.occurredAtIso),
    projection,
  });

  await markBillingEventProcessed(event.id, { ok: true }, tx);
  return { ok: true, status: "PROCESSED" };
}

async function runLockedBillingEventLifecycle(
  billingEventId: string,
  client: BillingLifecycleClient,
  isProcessable: (status: BillingEventStatus) => boolean,
): Promise<BillingEventProcessingLifecycleResult> {
  try {
    return await client.$transaction(async (tx) => {
      await lockBillingEventRowForUpdate(tx, billingEventId);

      const event = await tx.billingEvent.findUnique({
        where: { id: billingEventId },
      });
      if (!event) {
        return {
          ok: false,
          status: "FAILED",
          error: { code: "NOT_FOUND", message: "BillingEvent not found" },
        };
      }

      if (event.status === BillingEventStatus.PROCESSED) {
        return { ok: true, status: "SKIPPED" };
      }

      if (!isProcessable(event.status)) {
        return { ok: true, status: "SKIPPED" };
      }

      return await applyLifecycleUnderLock(tx, event);
    }, BILLING_APPLY_TX_OPTIONS);
  } catch (error) {
    const failure = toBillingProcessingFailureJson("apply", error);
    const marked = await markBillingEventFailedIfProcessable(
      billingEventId,
      failure,
      client,
    );

    if (marked.outcome === "already_processed") {
      return { ok: true, status: "SKIPPED" };
    }

    return { ok: false, status: "FAILED", error: failure };
  }
}

/**
 * Provider-agnostic processing lifecycle for a persisted BillingEvent row.
 *
 * Semantics:
 * - Locks the billing_events row FOR UPDATE inside one interactive transaction.
 * - Only processes events in RECEIVED status.
 * - Applies commercial projection and PROCESSED on the same transaction client.
 * - Marks FAILED on parse/validate errors inside the same locked transaction.
 * - Apply/database failures roll back commercial writes, then conditionally
 *   persist FAILED without overwriting a concurrent PROCESSED commit.
 */
export async function processPersistedBillingEventLifecycle(
  billingEventId: string,
  client: BillingLifecycleClient = db,
): Promise<BillingEventProcessingLifecycleResult> {
  return await runLockedBillingEventLifecycle(
    billingEventId,
    client,
    isProcessableForInitialApply,
  );
}

export async function retryPersistedBillingEventLifecycle(
  billingEventId: string,
  client: BillingLifecycleClient = db,
): Promise<BillingEventProcessingLifecycleResult> {
  return await runLockedBillingEventLifecycle(
    billingEventId,
    client,
    isProcessableForRetry,
  );
}
