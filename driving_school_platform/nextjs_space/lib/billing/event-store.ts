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

export type RecordBillingEventResult = {
  event: Awaited<ReturnType<typeof recordBillingEvent>>;
  created: boolean;
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

/**
 * Record a billing event idempotently, returning whether a new row was created.
 *
 * This is useful when the caller wants to avoid double-processing duplicates.
 */
export async function recordBillingEventWithOutcome(
  input: RecordBillingEventInput,
): Promise<RecordBillingEventResult> {
  try {
    const event = await db.billingEvent.create({
      data: {
        provider: toPrismaProvider(input.provider),
        providerEventId: input.providerEventId,
        eventType: toPrismaEventType(input.eventType),
        organizationId: input.organizationId ?? null,
        status: BillingEventStatus.RECEIVED,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    return { event, created: true };
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;

    const existing = await getBillingEventByProviderEventId(
      input.provider,
      input.providerEventId,
    );
    if (!existing) throw err;

    return { event: existing, created: false };
  }
}

export type BillingEventWriteClient = {
  billingEvent: Pick<
    Prisma.TransactionClient["billingEvent"],
    "findUnique" | "update" | "updateMany"
  >;
};

export type BillingEventLockClient = {
  $queryRaw: Prisma.TransactionClient["$queryRaw"];
};

export const BILLING_PROCESSABLE_STATUSES = [
  BillingEventStatus.RECEIVED,
  BillingEventStatus.FAILED,
] as const;

export type BillingProcessingFailureJson = {
  stage: "parse" | "validate" | "apply";
  code?: string;
  message?: string;
};

const FAILURE_MESSAGE_MAX_LENGTH = 500;

function asFailureMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, FAILURE_MESSAGE_MAX_LENGTH);
}

export function toBillingProcessingFailureJson(
  stage: BillingProcessingFailureJson["stage"],
  error: unknown,
): BillingProcessingFailureJson {
  if (error && typeof error === "object") {
    const rec = error as { code?: unknown; message?: unknown };
    const code = typeof rec.code === "string" ? rec.code : undefined;
    const message = asFailureMessage(rec.message);
    if (code || message) {
      return {
        stage,
        ...(code ? { code } : { code: "APPLY_FAILED" }),
        message: message ?? "Billing event processing failed",
      };
    }
  }

  if (typeof error === "string") {
    return {
      stage,
      code: "APPLY_FAILED",
      message: asFailureMessage(error) ?? "Billing event processing failed",
    };
  }

  return {
    stage,
    code: "APPLY_FAILED",
    message: "Billing event processing failed",
  };
}

/**
 * Acquire a PostgreSQL row lock on the billing_events row inside an
 * already-open interactive transaction. Prisma findUnique does not lock.
 */
export async function lockBillingEventRowForUpdate(
  tx: BillingEventLockClient,
  billingEventId: string,
): Promise<void> {
  await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM billing_events WHERE id = ${billingEventId} FOR UPDATE
  `;
}

export async function markBillingEventProcessed(
  billingEventId: string,
  processingResult?: unknown,
  client: BillingEventWriteClient = db,
) {
  return await client.billingEvent.update({
    where: { id: billingEventId },
    data: {
      status: BillingEventStatus.PROCESSED,
      processedAt: new Date(),
      processingResult:
        typeof processingResult === "undefined"
          ? undefined
          : (processingResult as Prisma.InputJsonValue),
    },
  });
}

export async function markBillingEventFailed(
  billingEventId: string,
  processingResult?: unknown,
  client: BillingEventWriteClient = db,
) {
  return await client.billingEvent.update({
    where: { id: billingEventId },
    data: {
      status: BillingEventStatus.FAILED,
      processedAt: new Date(),
      processingResult:
        typeof processingResult === "undefined"
          ? undefined
          : (processingResult as Prisma.InputJsonValue),
    },
  });
}

export type MarkBillingEventFailedIfProcessableResult =
  | { outcome: "updated"; status: "FAILED" }
  | { outcome: "already_processed"; status: "PROCESSED" }
  | { outcome: "missing" }
  | { outcome: "not_processable"; status: BillingEventStatus };

/**
 * Record FAILED only when the durable row is still processable.
 * Must not overwrite PROCESSED after a concurrent worker committed success.
 */
export async function markBillingEventFailedIfProcessable(
  billingEventId: string,
  processingResult: BillingProcessingFailureJson,
  client: BillingEventWriteClient = db,
): Promise<MarkBillingEventFailedIfProcessableResult> {
  const updated = await client.billingEvent.updateMany({
    where: {
      id: billingEventId,
      status: { in: [...BILLING_PROCESSABLE_STATUSES] },
    },
    data: {
      status: BillingEventStatus.FAILED,
      processedAt: new Date(),
      processingResult: processingResult as Prisma.InputJsonValue,
    },
  });

  if (updated.count > 0) {
    return { outcome: "updated", status: "FAILED" };
  }

  const existing = await client.billingEvent.findUnique({
    where: { id: billingEventId },
    select: { status: true },
  });

  if (!existing) {
    return { outcome: "missing" };
  }

  if (existing.status === BillingEventStatus.PROCESSED) {
    return { outcome: "already_processed", status: "PROCESSED" };
  }

  return { outcome: "not_processable", status: existing.status };
}
