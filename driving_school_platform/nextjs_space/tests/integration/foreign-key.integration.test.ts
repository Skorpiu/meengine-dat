import { Prisma } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { createIntegrationPrismaClient } from "@/tests/integration/helpers/create-integration-prisma-client";
import { inspectPrismaPgError } from "@/tests/integration/helpers/inspect-prisma-pg-error";

const prisma = createIntegrationPrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("integration proof B — foreign key", () => {
  it("accepts OrganizationDomain rows that reference an existing Organization and rejects a missing parent", async () => {
    const organization = await prisma.organization.create({
      data: { name: "it-fk-parent-organization" },
    });

    const valid = await prisma.organizationDomain.create({
      data: {
        organizationId: organization.id,
        host: "it-fk-valid.example.test",
      },
    });
    expect(valid.organizationId).toBe(organization.id);

    let rejected: unknown;
    try {
      await prisma.organizationDomain.create({
        data: {
          organizationId: "it-fk-missing-organization-id",
          host: "it-fk-missing.example.test",
        },
      });
    } catch (error) {
      rejected = error;
    }

    expect(rejected).toBeDefined();
    expect(rejected).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    const inspected = inspectPrismaPgError(rejected);
    expect(inspected.prismaCode).toBe("P2003");
    if (inspected.sqlState) {
      expect(inspected.sqlState).toBe("23503");
    }
  });
});
