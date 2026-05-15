import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const getServerSessionMock = vi.fn();
  const checkFeatureAccessMock = vi.fn();
  const guardTenantAuthenticatedRouteMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const vehicleUpdateManyMock = vi.fn();

  const prismaMock = {
    vehicle: { updateMany: vehicleUpdateManyMock },
    organization: { findUnique: organizationFindUniqueMock },
  };

  return {
    getServerSessionMock,
    checkFeatureAccessMock,
    guardTenantAuthenticatedRouteMock,
    organizationFindUniqueMock,
    vehicleUpdateManyMock,
    prismaMock,
  };
});

vi.mock("next-auth", () => ({
  getServerSession: h.getServerSessionMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/middleware/feature-check", () => ({
  checkFeatureAccess: h.checkFeatureAccessMock,
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: h.guardTenantAuthenticatedRouteMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
  h.guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
  h.checkFeatureAccessMock.mockResolvedValue({
    allowed: true,
    organizationId: "org1",
  });
  h.getServerSessionMock.mockResolvedValue({
    user: { id: "u1", role: "SUPER_ADMIN" },
  });
});

describe("POST /api/vehicles/update-maintenance", () => {
  it("updates maintenance flag for non-demo org", async () => {
    h.vehicleUpdateManyMock.mockResolvedValue({ count: 1 });

    const res = await POST(
      new Request("http://localhost/api/vehicles/update-maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicleId: 2, underMaintenance: true }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(h.vehicleUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 2, organizationId: "org1" },
      data: { underMaintenance: true },
    });
  });

  it("demo org blocks maintenance update with demo_restricted_action", async () => {
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: true,
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await POST(
      new Request("http://localhost/api/vehicles/update-maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicleId: 2, underMaintenance: true }),
      }) as any,
    );

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(h.vehicleUpdateManyMock).not.toHaveBeenCalled();
  });
});
