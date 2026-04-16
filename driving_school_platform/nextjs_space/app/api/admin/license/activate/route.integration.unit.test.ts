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
    activateLicenseKey: vi.fn(),
  },
}));

// IMPORT AFTER MOCKS
import { POST } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { LicenseService } from "@/lib/services/license-service";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;
const activateLicenseKeyMock = (LicenseService as any)
  .activateLicenseKey as ReturnType<typeof vi.fn>;

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

describe("Admin License Activate API (contracts)", () => {
  it("POST accepts { licenseKey } and returns { success: true, message, features } (filtered to valid FeatureKey)", async () => {
    activateLicenseKeyMock.mockResolvedValue({
      success: true,
      message: "License key activated successfully",
      features: ["VEHICLE_MANAGEMENT", "NOT_A_REAL_KEY"],
    });

    const res = await POST(
      jsonReq("POST", "http://localhost/api/admin/license/activate", {
        licenseKey: "LIC-TEST-123",
      }) as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      message: "License key activated successfully",
    });
    expect(Array.isArray(body.features)).toBe(true);
    expect(body.features).toEqual(["VEHICLE_MANAGEMENT"]);

    expect(activateLicenseKeyMock).toHaveBeenCalledWith("orgA", "LIC-TEST-123");
  });
});
