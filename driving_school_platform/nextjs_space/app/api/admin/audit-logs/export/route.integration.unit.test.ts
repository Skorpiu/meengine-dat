import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const exportMock = vi.fn();
  return { exportMock };
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
  exportTenantAuditLogs: (...args: unknown[]) => h.exportMock(...args),
}));

import { GET } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { AUDIT_LOG_EXPORT_CSV_HEADERS } from "@/lib/audit/audit-log-export";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;

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

function req(query = ""): Request {
  return new Request(
    `http://school.example.com/api/admin/audit-logs/export${query}`,
    {
      method: "GET",
    },
  );
}

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
  h.exportMock.mockResolvedValue({
    items: [sampleItem],
    exportedCount: 1,
    truncated: false,
    maxRows: 10_000,
  });
});

describe("GET /api/admin/audit-logs/export", () => {
  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
    expect(h.exportMock).not.toHaveBeenCalled();
  });

  it("requires SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "inst-1", role: "INSTRUCTOR", organizationId: "org-a" },
    });
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
    expect(h.exportMock).not.toHaveBeenCalled();
  });

  it("returns 403 when tenant host guard fails", async () => {
    guardTenantAuthenticatedRouteMock.mockResolvedValueOnce({
      allowed: false,
      status: 403,
      error: "Organization does not match this domain",
    });
    const res = await GET(req() as any);
    expect(res.status).toBe(403);
    expect(h.exportMock).not.toHaveBeenCalled();
  });

  it("returns CSV with stable headers and privacy-minimal rows", async () => {
    const res = await GET(req() as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain(
      'filename="audit-logs-',
    );
    expect(res.headers.get("x-audit-log-export-count")).toBe("1");
    expect(res.headers.get("x-audit-log-export-truncated")).toBe("false");

    const csv = await res.text();
    const lines = csv.split("\n");
    expect(lines[0]).toBe(AUDIT_LOG_EXPORT_CSV_HEADERS.join(";"));
    expect(lines[1]).toContain("audit-1");
    expect(lines[1]).toContain("lesson.create");
    expect(csv).not.toContain("organizationId");
    expect(csv).not.toContain("ipAddress");
    expect(csv).not.toContain("userAgent");
  });

  it("forwards filters to export service", async () => {
    const res = await GET(
      req(
        "?action=student.delete&entityType=Student&entityId=stu-1&actorUserId=admin-1&targetUserId=user-2&requestId=req-9&dateFrom=2026-06-01&dateTo=2026-06-30",
      ) as any,
    );
    expect(res.status).toBe(200);
    expect(h.exportMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      filters: {
        action: "student.delete",
        entityType: "Student",
        entityId: "stu-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-9",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      },
    });
  });

  it("returns 400 for invalid date range", async () => {
    const res = await GET(req("?dateFrom=2026-06-30&dateTo=2026-06-01") as any);
    expect(res.status).toBe(400);
    expect(h.exportMock).not.toHaveBeenCalled();
  });

  it("ignores list-only pagination params", async () => {
    const res = await GET(req("?limit=25&cursor=bad-cursor") as any);
    expect(res.status).toBe(200);
    expect(h.exportMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      filters: {},
    });
  });
});
