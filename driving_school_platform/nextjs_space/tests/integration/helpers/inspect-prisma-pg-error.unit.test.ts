import { describe, expect, it } from "vitest";

import { inspectPrismaPgError } from "@/tests/integration/helpers/inspect-prisma-pg-error";

describe("inspectPrismaPgError", () => {
  it("does not treat Prisma P2003 as PostgreSQL SQLSTATE", () => {
    const inspected = inspectPrismaPgError({
      code: "P2003",
      meta: { modelName: "OrganizationDomain", field_name: "organizationId" },
    });
    expect(inspected.prismaCode).toBe("P2003");
    expect(inspected.sqlState).toBeNull();
  });

  it("keeps PostgreSQL lock_timeout 55P03 distinct from Prisma codes", () => {
    const inspected = inspectPrismaPgError({
      code: "P2010",
      meta: { code: "55P03" },
    });
    expect(inspected.prismaCode).toBe("P2010");
    expect(inspected.sqlState).toBe("55P03");
  });
});
