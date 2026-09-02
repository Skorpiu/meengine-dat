import {
  BillingEventStatus,
  BillingEventType,
  BillingProvider,
  SubscriptionStatus,
  SubscriptionTier,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  processPersistedBillingEventLifecycle,
  retryPersistedBillingEventLifecycle,
} from "@/lib/billing/processing-lifecycle";
import { BILLING_PLAN_FEATURES } from "@/lib/billing/billing-plans";
import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";

const clientA = createIntegrationPrismaClient();
const clientB = createIntegrationPrismaClient();

const ORG_PREFIX = "it-billing-atomicity-";
const FAIL_PROCESSED_FUNCTION = "dat_it_fail_billing_processed";
const FAIL_PROCESSED_TRIGGER = "dat_it_fail_billing_processed_trg";
const PREMIUM_FEATURE_COUNT = BILLING_PLAN_FEATURES.PREMIUM.length;

function premiumStartedPayload(input: {
  providerEventId: string;
  organizationId: string;
  periodEndIso?: string;
}) {
  return {
    v: 1 as const,
    provider: "sibs" as const,
    providerEventId: input.providerEventId,
    type: "SUBSCRIPTION_STARTED" as const,
    occurredAtIso: "2026-05-01T00:00:00.000Z",
    organizationId: input.organizationId,
    subscription: {
      externalId: "sub_1",
      status: "ACTIVE" as const,
      planKey: "PREMIUM" as const,
      currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
      currentPeriodEndIso: input.periodEndIso ?? "2026-06-01T00:00:00.000Z",
    },
    payment: null,
  };
}

async function cleanupBillingAtomicityRows() {
  const organizations = await clientA.organization.findMany({
    where: { name: { startsWith: ORG_PREFIX } },
    select: { id: true },
  });
  const organizationIds = organizations.map((organization) => organization.id);
  if (organizationIds.length > 0) {
    await clientA.billingEvent.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await clientA.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  }
}

async function installProcessedFailureTrigger() {
  await clientA.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION ${FAIL_PROCESSED_FUNCTION}()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.status = 'PROCESSED' THEN
        RAISE EXCEPTION 'dat_it_controlled_billing_processed_failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await clientA.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS ${FAIL_PROCESSED_TRIGGER} ON billing_events`,
  );
  await clientA.$executeRawUnsafe(`
    CREATE TRIGGER ${FAIL_PROCESSED_TRIGGER}
    BEFORE UPDATE ON billing_events
    FOR EACH ROW
    EXECUTE PROCEDURE ${FAIL_PROCESSED_FUNCTION}();
  `);
}

async function removeProcessedFailureTrigger() {
  await clientA.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS ${FAIL_PROCESSED_TRIGGER} ON billing_events`,
  );
  await clientA.$executeRawUnsafe(
    `DROP FUNCTION IF EXISTS ${FAIL_PROCESSED_FUNCTION}()`,
  );
}

async function createOrg(name: string) {
  return await clientA.organization.create({
    data: { name },
  });
}

async function createReceivedEvent(input: {
  organizationId: string;
  payloadOrganizationId: string;
  providerEventId: string;
}) {
  return await clientA.billingEvent.create({
    data: {
      provider: BillingProvider.SIBS,
      providerEventId: input.providerEventId,
      eventType: BillingEventType.SUBSCRIPTION_STARTED,
      organizationId: input.organizationId,
      status: BillingEventStatus.RECEIVED,
      payload: premiumStartedPayload({
        providerEventId: input.providerEventId,
        organizationId: input.payloadOrganizationId,
      }),
    },
  });
}

async function billingGrantCount(organizationId: string) {
  return await clientA.entitlementGrant.count({
    where: { organizationId, source: "BILLING" },
  });
}

beforeAll(async () => {
  await removeProcessedFailureTrigger();
  await cleanupBillingAtomicityRows();
});

afterEach(async () => {
  await removeProcessedFailureTrigger();
  await cleanupBillingAtomicityRows();
});

afterAll(async () => {
  await removeProcessedFailureTrigger();
  await cleanupBillingAtomicityRows();
  await Promise.all([clientA.$disconnect(), clientB.$disconnect()]);
});

describe("integration — billing projection atomicity and idempotency", () => {
  it("applies a RECEIVED event once: projection, exact BILLING grants, PROCESSED", async () => {
    const organization = await createOrg(`${ORG_PREFIX}first-apply`);
    const event = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-first-apply",
    });

    const result = await processPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );

    expect(result).toEqual({ ok: true, status: "PROCESSED" });

    const persisted = await clientA.billingEvent.findUnique({
      where: { id: event.id },
    });
    expect(persisted?.status).toBe(BillingEventStatus.PROCESSED);

    const org = await clientA.organization.findUnique({
      where: { id: organization.id },
    });
    expect(org?.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
    expect(org?.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
    expect(org?.subscriptionEndsAt?.toISOString()).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(await billingGrantCount(organization.id)).toBe(
      PREMIUM_FEATURE_COUNT,
    );
  });

  it("replays PROCESSED as SKIPPED with zero additional grants", async () => {
    const organization = await createOrg(`${ORG_PREFIX}replay`);
    const event = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-replay",
    });

    await processPersistedBillingEventLifecycle(event.id, clientA);
    const replay = await processPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );
    const retry = await retryPersistedBillingEventLifecycle(event.id, clientA);

    expect(replay).toEqual({ ok: true, status: "SKIPPED" });
    expect(retry).toEqual({ ok: true, status: "SKIPPED" });
    expect(await billingGrantCount(organization.id)).toBe(
      PREMIUM_FEATURE_COUNT,
    );
  });

  it("rolls back commercial writes when PROCESSED cannot complete inside the transaction", async () => {
    const organization = await createOrg(`${ORG_PREFIX}rollback`);
    const event = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-rollback",
    });

    await installProcessedFailureTrigger();

    const result = await processPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");

    const persisted = await clientA.billingEvent.findUnique({
      where: { id: event.id },
    });
    expect(persisted?.status).toBe(BillingEventStatus.FAILED);

    const org = await clientA.organization.findUnique({
      where: { id: organization.id },
    });
    expect(org?.subscriptionTier).toBe(SubscriptionTier.BASE);
    expect(org?.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
    expect(org?.subscriptionEndsAt).toBeNull();
    expect(await billingGrantCount(organization.id)).toBe(0);
  });

  it("retries a FAILED event after the injected failure is removed and applies once", async () => {
    const organization = await createOrg(`${ORG_PREFIX}retry`);
    const event = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-retry",
    });

    await installProcessedFailureTrigger();
    const failed = await processPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );
    expect(failed.status).toBe("FAILED");
    expect(await billingGrantCount(organization.id)).toBe(0);

    await removeProcessedFailureTrigger();

    const retried = await retryPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );
    expect(retried).toEqual({ ok: true, status: "PROCESSED" });
    expect(await billingGrantCount(organization.id)).toBe(
      PREMIUM_FEATURE_COUNT,
    );

    const org = await clientA.organization.findUnique({
      where: { id: organization.id },
    });
    expect(org?.subscriptionTier).toBe(SubscriptionTier.PREMIUM);
  });

  it("serializes concurrent same-event workers to a single commercial application", async () => {
    const organization = await createOrg(`${ORG_PREFIX}concurrency`);
    const event = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-concurrency",
    });

    const [first, second] = await Promise.all([
      processPersistedBillingEventLifecycle(event.id, clientA),
      processPersistedBillingEventLifecycle(event.id, clientB),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["PROCESSED", "SKIPPED"]);
    expect(first.ok && second.ok).toBe(true);

    const persisted = await clientA.billingEvent.findUnique({
      where: { id: event.id },
    });
    expect(persisted?.status).toBe(BillingEventStatus.PROCESSED);
    expect(await billingGrantCount(organization.id)).toBe(
      PREMIUM_FEATURE_COUNT,
    );
  });

  it("allows distinct provider-event identities to apply independently", async () => {
    const organization = await createOrg(`${ORG_PREFIX}distinct`);
    const firstEvent = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-distinct-1",
    });
    const secondEvent = await createReceivedEvent({
      organizationId: organization.id,
      payloadOrganizationId: organization.id,
      providerEventId: "evt-distinct-2",
    });

    const [first, second] = await Promise.all([
      processPersistedBillingEventLifecycle(firstEvent.id, clientA),
      processPersistedBillingEventLifecycle(secondEvent.id, clientB),
    ]);

    expect(first).toEqual({ ok: true, status: "PROCESSED" });
    expect(second).toEqual({ ok: true, status: "PROCESSED" });
    expect(await billingGrantCount(organization.id)).toBe(
      PREMIUM_FEATURE_COUNT * 2,
    );
  });

  it("rejects persisted/payload organization mismatch without writing either tenant", async () => {
    const organizationA = await createOrg(`${ORG_PREFIX}mismatch-a`);
    const organizationB = await createOrg(`${ORG_PREFIX}mismatch-b`);
    const event = await createReceivedEvent({
      organizationId: organizationA.id,
      payloadOrganizationId: organizationB.id,
      providerEventId: "evt-mismatch",
    });

    const result = await processPersistedBillingEventLifecycle(
      event.id,
      clientA,
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result).toMatchObject({
      error: { code: "ORGANIZATION_MISMATCH" },
    });

    const persisted = await clientA.billingEvent.findUnique({
      where: { id: event.id },
    });
    expect(persisted?.status).toBe(BillingEventStatus.FAILED);

    const [orgA, orgB] = await Promise.all([
      clientA.organization.findUnique({ where: { id: organizationA.id } }),
      clientA.organization.findUnique({ where: { id: organizationB.id } }),
    ]);
    expect(orgA?.subscriptionTier).toBe(SubscriptionTier.BASE);
    expect(orgB?.subscriptionTier).toBe(SubscriptionTier.BASE);
    expect(await billingGrantCount(organizationA.id)).toBe(0);
    expect(await billingGrantCount(organizationB.id)).toBe(0);
  });
});
