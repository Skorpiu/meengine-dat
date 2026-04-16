import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: findUniqueMock,
    },
  };

  return { prismaMock, findUniqueMock };
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

vi.mock("@/lib/services/license-service", () => ({
  LicenseService: {
    getEnabledFeatures: vi.fn(),
    enableFeature: vi.fn(),
    disableFeature: vi.fn(),
  },
}));

// IMPORT AFTER MOCKS
import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { LicenseService } from "@/lib/services/license-service";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;
const getEnabledFeaturesMock = (LicenseService as any)
  .getEnabledFeatures as ReturnType<typeof vi.fn>;
const enableFeatureMock = (LicenseService as any).enableFeature as ReturnType<
  typeof vi.fn
>;
const disableFeatureMock = (LicenseService as any).disableFeature as ReturnType<
  typeof vi.fn
>;

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
});

describe("Admin License Features API (contracts)", () => {
  it("GET returns entitlements + minimal metadata and does not return rich catalog", async () => {
    getEnabledFeaturesMock.mockResolvedValue([
      "VEHICLE_MANAGEMENT",
      "NOT_A_REAL_KEY",
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
  });

  it("POST accepts { featureKey, enabled } and returns { success: true, message }", async () => {
    enableFeatureMock.mockResolvedValue(true);

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

    expect(enableFeatureMock).toHaveBeenCalledWith(
      "orgA",
      "VEHICLE_MANAGEMENT",
      "u1",
    );
    expect(disableFeatureMock).not.toHaveBeenCalled();
  });
});
