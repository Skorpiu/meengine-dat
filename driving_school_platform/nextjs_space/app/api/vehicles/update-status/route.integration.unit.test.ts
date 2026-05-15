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

describe("POST /api/vehicles/update-status", () => {
  it("updates status for non-demo org", async () => {
    h.vehicleUpdateManyMock.mockResolvedValue({ count: 1 });

    const res = await POST(
      new Request("http://localhost/api/vehicles/update-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicleId: 1, status: "AVAILABLE" }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(h.vehicleUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 1, organizationId: "org1" },
      data: { status: "AVAILABLE" },
    });
  });

  it("demo org blocks status update with demo_restricted_action", async () => {
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: true,
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await POST(
      new Request("http://localhost/api/vehicles/update-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicleId: 1, status: "AVAILABLE" }),
      }) as any,
    );

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(body.error).toBe(
      "This action is restricted in the public demo environment.",
    );
    expect(h.vehicleUpdateManyMock).not.toHaveBeenCalled();
  });
});
