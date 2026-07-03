import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const listMock = vi.fn();
  return { listMock };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

vi.mock("@/lib/audit/audit-log-query-service", () => ({
  listTenantAuditLogs: (...args: unknown[]) => h.listMock(...args),
}));

import { GET } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;

function req(query = ""): Request {
  return new Request(`http://school.example.com/api/admin/audit-logs${query}`, {
    method: "GET",
  });
}

const sampleItem = {
  id: "audit-1",
  createdAt: "2026-06-10T10:00:00.000Z",
  action: "lesson.create",
  entityType: "Lesson",
  entityId: "lesson-1",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  actorEmail: "admin@school.test",
  targetUserId: null,
  requestId: "req-1",
  metadata: { lessonType: "DRIVING" },
};

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "SUPER_ADMIN",
      organizationId: "org-a",
      email: "admin@school.test",
    },
  });
  guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
  h.listMock.mockResolvedValue({
    items: [sampleItem],
    nextCursor: null,
    limit: 50,
  });
});

describe("GET /api/admin/audit-logs", () => {
  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("requires SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "inst-1", role: "INSTRUCTOR", organizationId: "org-a" },
    });
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("returns 400 when session has no organizationId", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: null },
    });
    const res = await GET(req() as any);
    expect(res.status).toBe(400);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("returns 403 when tenant host guard fails", async () => {
    guardTenantAuthenticatedRouteMock.mockResolvedValueOnce({
      allowed: false,
      status: 403,
      error: "Organization does not match this domain",
    });
    const res = await GET(req() as any);
    expect(res.status).toBe(403);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("lists tenant-scoped audit logs for SUPER_ADMIN", async () => {
    const res = await GET(req() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(h.listMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      query: expect.objectContaining({ limit: 50 }),
    });
  });

  it("scopes by session organizationId even when query includes organizationId", async () => {
    const res = await GET(
      req("?organizationId=org-b&action=lesson.create") as any,
    );
    expect(res.status).toBe(200);
    expect(h.listMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      query: expect.objectContaining({
        action: "lesson.create",
        limit: 50,
      }),
    });
    const callArg = h.listMock.mock.calls[0]?.[0];
    expect(callArg.query).not.toHaveProperty("organizationId");
  });

  it("returns 400 for invalid limit", async () => {
    const res = await GET(req("?limit=500") as any);
    expect(res.status).toBe(400);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid cursor", async () => {
    const res = await GET(req("?cursor=bad-cursor") as any);
    expect(res.status).toBe(400);
    expect(h.listMock).not.toHaveBeenCalled();
  });

  it("forwards filters to list service", async () => {
    const res = await GET(
      req(
        "?limit=25&action=student.delete&entityType=Student&entityId=stu-1&actorUserId=admin-1&targetUserId=user-2&requestId=req-9&dateFrom=2026-06-01&dateTo=2026-06-30",
      ) as any,
    );
    expect(res.status).toBe(200);
    expect(h.listMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      query: expect.objectContaining({
        limit: 25,
        action: "student.delete",
        entityType: "Student",
        entityId: "stu-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-9",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      }),
    });
  });

  it("returns metadata safely without ipAddress or userAgent", async () => {
    const res = await GET(req() as any);
    const body = await res.json();
    const item = body.data.items[0];
    expect(item.metadata).toEqual({ lessonType: "DRIVING" });
    expect(item).not.toHaveProperty("organizationId");
    expect(item).not.toHaveProperty("ipAddress");
    expect(item).not.toHaveProperty("userAgent");
    expect(item).not.toHaveProperty("oldValues");
    expect(item).not.toHaveProperty("newValues");
  });
});
