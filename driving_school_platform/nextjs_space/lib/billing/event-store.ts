import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  BillingEventStatus,
  BillingEventType,
  BillingProvider,
} from "@prisma/client";
import type {
  BillingProviderId,
  BillingEventType as CoreBillingEventType,
} from "./types";

export type RecordBillingEventInput = {
  provider: BillingProviderId;
  providerEventId: string;
  eventType: CoreBillingEventType;
  organizationId?: string | null;
  payload: unknown;
};

function toPrismaProvider(provider: BillingProviderId): BillingProvider {
  switch (provider) {
    case "sibs":
      return BillingProvider.SIBS;
    case "stripe":
      return BillingProvider.STRIPE;
    case "paypal":
      return BillingProvider.PAYPAL;
  }
}

function toPrismaEventType(eventType: CoreBillingEventType): BillingEventType {
  // `CoreBillingEventType` is already aligned with the Prisma enum values.
  // Keep this mapping explicit so we can evolve internal names safely later.
  switch (eventType) {
    case "CHECKOUT_SESSION_CREATED":
      return BillingEventType.CHECKOUT_SESSION_CREATED;
    case "PAYMENT_SUCCEEDED":
      return BillingEventType.PAYMENT_SUCCEEDED;
    case "PAYMENT_FAILED":
      return BillingEventType.PAYMENT_FAILED;
    case "SUBSCRIPTION_STARTED":
      return BillingEventType.SUBSCRIPTION_STARTED;
    case "SUBSCRIPTION_RENEWED":
      return BillingEventType.SUBSCRIPTION_RENEWED;
    case "SUBSCRIPTION_CANCELLED":
      return BillingEventType.SUBSCRIPTION_CANCELLED;
    case "SUBSCRIPTION_EXPIRED":
      return BillingEventType.SUBSCRIPTION_EXPIRED;
    case "REFUND_ISSUED":
      return BillingEventType.REFUND_ISSUED;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  const e = err as Partial<Prisma.PrismaClientKnownRequestError> & {
    code?: string;
  };
  return e?.code === "P2002";
}

export async function getBillingEventByProviderEventId(
  provider: BillingProviderId,
  providerEventId: string,
) {
  return await db.billingEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: toPrismaProvider(provider),
        providerEventId,
      },
    },
  });
}

/**
 * Record a billing event idempotently.
 *
 * Semantics:
 * - First write wins: on duplicate (provider, providerEventId), we return the existing row unchanged.
 * - Status starts at RECEIVED; processing is intentionally out of scope for this batch.
 */
export async function recordBillingEvent(input: RecordBillingEventInput) {
  const provider = toPrismaProvider(input.provider);
  const eventType = toPrismaEventType(input.eventType);
  const providerEventId = input.providerEventId;

  try {
    return await db.billingEvent.create({
      data: {
        provider,
        providerEventId,
        eventType,
        organizationId: input.organizationId ?? null,
        status: BillingEventStatus.RECEIVED,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) {
      throw err;
    }

    const existing = await getBillingEventByProviderEventId(
      input.provider,
      providerEventId,
    );

    if (!existing) {
      // Extremely unlikely race, but keep behavior deterministic.
      throw err;
    }

    return existing;
  }
}
