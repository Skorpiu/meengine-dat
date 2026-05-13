import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  decideDemoRouteMutationMock: vi.fn(),
}));

vi.mock("@/lib/demo/demo-route-guard", () => ({
  decideDemoRouteMutation: (...args: unknown[]) =>
    h.decideDemoRouteMutationMock(...args),
}));

vi.mock("@/lib/cleanup", () => ({
  cleanupOldLessons: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<any>("@/lib/api-utils");
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

import { POST } from "./route";
import { verifyAuth } from "@/lib/api-utils";
import { cleanupOldLessons } from "@/lib/cleanup";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const cleanupOldLessonsMock = cleanupOldLessons as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  h.decideDemoRouteMutationMock.mockResolvedValue({ allowed: true });
});

describe("Admin Cleanup API (tenant scoping)", () => {
  it("returns 400 when user has no organizationId", async () => {
    verifyAuthMock.mockResolvedValue({
      id: "u1",
      role: "SUPER_ADMIN",
      organizationId: null,
    });

    const res = await POST(
      new Request("http://localhost/api/admin/cleanup", {
        method: "POST",
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(cleanupOldLessonsMock).not.toHaveBeenCalled();
  });

  it("returns 403 when tenant org != session org", async () => {
    verifyAuthMock.mockResolvedValue({
      id: "u1",
      role: "SUPER_ADMIN",
      organizationId: "orgA",
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "Organization does not match this domain",
    });

    const res = await POST(
      new Request("http://localhost/api/admin/cleanup", {
        method: "POST",
      }) as any,
    );
    expect(res.status).toBe(403);
    expect(cleanupOldLessonsMock).not.toHaveBeenCalled();
  });

  it("calls cleanup scoped by organizationId", async () => {
    verifyAuthMock.mockResolvedValue({
      id: "u1",
      role: "SUPER_ADMIN",
      organizationId: "orgA",
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
    cleanupOldLessonsMock.mockResolvedValue({ count: 7 });

    const res = await POST(
      new Request("http://localhost/api/admin/cleanup", {
        method: "POST",
      }) as any,
    );
    expect(res.status).toBe(200);

    expect(cleanupOldLessonsMock).toHaveBeenCalledWith("orgA");

    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(7);
  });

  it("returns 403 with stable demo payload when demo guard blocks cleanup", async () => {
    verifyAuthMock.mockResolvedValue({
      id: "u1",
      role: "SUPER_ADMIN",
      organizationId: "orgA",
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
    h.decideDemoRouteMutationMock.mockResolvedValue({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: "This action is restricted in the public demo environment.",
    });

    const res = await POST(
      new Request("http://localhost/api/admin/cleanup", {
        method: "POST",
      }) as any,
    );
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.error).toBe(
      "This action is restricted in the public demo environment.",
    );
    expect(body.code).toBe("demo_restricted_action");

    expect(cleanupOldLessonsMock).not.toHaveBeenCalled();
  });
});
