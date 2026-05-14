import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// -----------------------------
// Hoisted mocks (Vitest-safe)
// -----------------------------
const h = vi.hoisted(() => {
  const getServerSessionMock = vi.fn();
  const checkFeatureAccessMock = vi.fn();

  const vehicleFindManyMock = vi.fn();
  const vehicleFindFirstMock = vi.fn();
  const vehicleCreateMock = vi.fn();
  const vehicleCountMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const examFindManyMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();

  const dbMock = {
    vehicle: {
      findMany: vehicleFindManyMock,
      findFirst: vehicleFindFirstMock,
      create: vehicleCreateMock,
      count: vehicleCountMock,
    },
    lesson: { findMany: lessonFindManyMock },
    exam: { findMany: examFindManyMock },
    organization: { findUnique: organizationFindUniqueMock },
  };

  return {
    getServerSessionMock,
    checkFeatureAccessMock,
    dbMock,
    vehicleFindManyMock,
    vehicleFindFirstMock,
    vehicleCreateMock,
    vehicleCountMock,
    lessonFindManyMock,
    examFindManyMock,
    organizationFindUniqueMock,
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

vi.mock("@/lib/db", () => ({
  db: h.dbMock,
  prisma: h.dbMock,
}));

// IMPORTANT: import AFTER mocks
import { GET, POST } from "./route";

function req(url = "http://localhost/api/admin/vehicles"): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.DEMO_WRITE_SANDBOX_ENABLED;

  // default mocks
  h.lessonFindManyMock.mockResolvedValue([]);
  h.examFindManyMock.mockResolvedValue([]);
  h.vehicleFindManyMock.mockResolvedValue([]);

  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
  h.vehicleCountMock.mockResolvedValue(0);
  h.vehicleFindFirstMock.mockResolvedValue(null);
  h.vehicleCreateMock.mockResolvedValue({
    id: 99,
    category: {},
    transmissionType: {},
  });

  h.checkFeatureAccessMock.mockResolvedValue({
    allowed: true,
    organizationId: "org1",
  });
});

afterEach(() => {
  delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
});

describe("GET /api/admin/vehicles (handler integration)", () => {
  it("returns 401 when not authenticated", async () => {
    h.getServerSessionMock.mockResolvedValue(null);

    const res = await GET(req() as any);
    expect(res.status).toBe(401);

    const body: any = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is not SUPER_ADMIN/INSTRUCTOR", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT" },
    });

    const res = await GET(req() as any);
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.error).toBe("Access denied");
  });

  it("returns 403 when VEHICLE_MANAGEMENT feature is disabled and does not hit DB", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR" },
    });
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: false,
      error: "Feature not enabled",
    });

    const res = await GET(req() as any);
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.requiresUpgrade).toBe(true);
    expect(body.error).toBe("Vehicles feature not enabled");

    expect(h.vehicleFindManyMock).not.toHaveBeenCalled();
    expect(h.lessonFindManyMock).not.toHaveBeenCalled();
    expect(h.examFindManyMock).not.toHaveBeenCalled();
  });

  it("returns 200 and computes AVAILABLE when feature enabled and vehicle is active", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });

    h.vehicleFindManyMock.mockResolvedValue([
      {
        id: 1,
        status: "UNKNOWN",
        underMaintenance: false,
        isActive: true,
        category: {},
        transmissionType: {},
      },
    ]);

    const res = await GET(req() as any);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(Array.isArray(body.vehicles)).toBe(true);
    expect(body.vehicles.length).toBe(1);
    expect(body.vehicles[0].status).toBe("AVAILABLE");
  });

  it("returns 200 and forces MAINTENANCE when underMaintenance=true", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });

    h.vehicleFindManyMock.mockResolvedValue([
      {
        id: 2,
        status: "AVAILABLE",
        underMaintenance: true,
        isActive: true,
        category: {},
        transmissionType: {},
      },
    ]);

    const res = await GET(req() as any);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(body.vehicles[0].status).toBe("MAINTENANCE");
  });
});

function postReq(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/vehicles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const minimalVehicleBody = {
  registrationNumber: "AB-12-CD",
  make: "Test",
  model: "Car",
  year: 2024,
  color: "Blue",
  transmissionTypeId: 1,
};

describe("POST /api/admin/vehicles (handler integration)", () => {
  it("demo org + sandbox disabled blocks with demo_restricted_action", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: true,
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await POST(postReq(minimalVehicleBody) as any);
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(h.vehicleCreateMock).not.toHaveBeenCalled();
  });

  it("demo org + sandbox enabled + quota allows create", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: true,
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.vehicleCountMock.mockResolvedValue(0);

    const res = await POST(postReq(minimalVehicleBody) as any);
    expect(res.status).toBe(201);
    expect(h.vehicleCreateMock).toHaveBeenCalled();
  });

  it("demo org + sandbox enabled + quota used returns demo_write_quota_exceeded", async () => {
    h.getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });
    h.checkFeatureAccessMock.mockResolvedValue({
      allowed: true,
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.vehicleCountMock.mockResolvedValue(1);

    const res = await POST(postReq(minimalVehicleBody) as any);
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_write_quota_exceeded");
    expect(h.vehicleCreateMock).not.toHaveBeenCalled();
  });
});
