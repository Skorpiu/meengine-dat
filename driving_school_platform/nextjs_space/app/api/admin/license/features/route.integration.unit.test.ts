import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const orgFeatureFindManyMock = vi.fn();
  const orgFeatureUpsertMock = vi.fn();
  const grantFindManyMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: findUniqueMock,
    },
    organization: {
      findUnique: organizationFindUniqueMock,
    },
    organizationFeature: {
      findMany: orgFeatureFindManyMock,
      upsert: orgFeatureUpsertMock,
    },
    entitlementGrant: {
      findMany: grantFindManyMock,
    },
  };

  return {
    prismaMock,
    findUniqueMock,
    organizationFindUniqueMock,
    orgFeatureFindManyMock,
    orgFeatureUpsertMock,
    grantFindManyMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

// IMPORT AFTER MOCKS
import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;

function jsonReq(method: string, url: string, payload?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
  getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
  h.findUniqueMock.mockResolvedValue({
    id: "u1",
    role: "SUPER_ADMIN",
    organizationId: "orgA",
    organization: { name: "Org A", subscriptionTier: "PREMIUM" },
  });

  h.orgFeatureFindManyMock.mockResolvedValue([]);
  h.grantFindManyMock.mockResolvedValue([]);
  h.orgFeatureUpsertMock.mockResolvedValue({});
  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
});

describe("Admin License Features API (contracts)", () => {
  it("GET returns entitlements + minimal metadata and does not return rich catalog", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    try {
      h.grantFindManyMock.mockResolvedValue([
        {
          featureKey: "VEHICLE_MANAGEMENT",
          startsAt: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
        {
          featureKey: "NOT_A_REAL_KEY",
          startsAt: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: null,
        },
      ]);

      const res = await GET(
        jsonReq("GET", "http://localhost/api/admin/license/features") as any,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.organizationId).toBe("orgA");
      expect(body.organizationName).toBe("Org A");
      expect(body.subscriptionTier).toBe("PREMIUM");

      expect(Array.isArray(body.enabledFeatureKeys)).toBe(true);
      expect(body.enabledFeatureKeys).toEqual(["VEHICLE_MANAGEMENT"]);

      // Boundary rule: no rich catalog from API
      expect("features" in body).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("GET includes manual OrganizationFeature entitlements", async () => {
    h.orgFeatureFindManyMock.mockResolvedValue([
      { featureKey: "ADVANCED_REPORTING" },
    ]);

    const res = await GET(
      jsonReq("GET", "http://localhost/api/admin/license/features") as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enabledFeatureKeys).toEqual(["ADVANCED_REPORTING"]);
  });

  it("POST accepts { featureKey, enabled } and returns { success: true, message }", async () => {
    const res = await POST(
      jsonReq("POST", "http://localhost/api/admin/license/features", {
        featureKey: "VEHICLE_MANAGEMENT",
        enabled: true,
      }) as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ success: true });
    expect(typeof body.message).toBe("string");

    expect(h.orgFeatureUpsertMock).toHaveBeenCalledTimes(1);
  });
});
