import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const findManyMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
  };

  return { prismaMock, findUniqueMock, findManyMock };
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
  resolveTenantOrganizationId: vi.fn(),
}));

// IMPORT AFTER MOCKS
import { GET } from "./route";
import { getServerSession } from "next-auth";
import { resolveTenantOrganizationId } from "@/lib/tenant";

const getServerSessionMock = getServerSession as unknown as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([]);
});

describe("Admin Users API (tenant scoping)", () => {
  it("returns 400 when session has no organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });

    h.findUniqueMock.mockResolvedValue({ organizationId: null });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: "www.meengine.io", organizationId: null });

    const res = await GET(new Request("http://localhost/api/admin/users") as any);
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when tenant org != session org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });

    h.findUniqueMock.mockResolvedValue({ organizationId: "orgA" });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: "school-b.meengine.io", organizationId: "orgB" });

    const res = await GET(new Request("http://localhost/api/admin/users") as any);
    expect(res.status).toBe(403);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("scopes findMany by organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "SUPER_ADMIN" },
    });

    h.findUniqueMock.mockResolvedValue({ organizationId: "orgA" });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: "www.meengine.io", organizationId: "orgA" });

    const res = await GET(new Request("http://localhost/api/admin/users?role=STUDENT") as any);
    expect(res.status).toBe(200);

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("orgA");
    expect(arg.where.role).toBe("STUDENT");
  });

  it("forces INSTRUCTOR to see only STUDENTs", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR" },
    });

    h.findUniqueMock.mockResolvedValue({ organizationId: "orgA" });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: "www.meengine.io", organizationId: "orgA" });

    const res = await GET(new Request("http://localhost/api/admin/users") as any);
    expect(res.status).toBe(200);

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("orgA");
    expect(arg.where.role).toBe("STUDENT");
  });
});
