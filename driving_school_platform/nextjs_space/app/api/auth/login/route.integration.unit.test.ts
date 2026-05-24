import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const updateMock = vi.fn();

  return {
    prismaMock: {
      user: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
    },
    findUniqueMock,
    updateMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("@/lib/rate-limit/enforce-auth-rate-limits", () => ({
  enforceLoginRateLimits: vi.fn().mockResolvedValue(null),
}));

import bcrypt from "bcryptjs";
import { enforceLoginRateLimits } from "@/lib/rate-limit/enforce-auth-rate-limits";
import { NextResponse } from "next/server";
import { resolveTenantOrganizationId } from "@/lib/tenant";
import { POST } from "./route";

const bcryptCompareMock = (bcrypt as any).compare as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock =
  resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;
const enforceLoginRateLimitsMock =
  enforceLoginRateLimits as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  enforceLoginRateLimitsMock.mockResolvedValue(null);
});

describe("POST /api/auth/login (tenant scoping)", () => {
  it("returns 403 when tenant org != user org", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "school-b.meengine.io",
      organizationId: "orgB",
    });

    h.findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "x@y.com",
      passwordHash: "hash",
      role: "STUDENT",
      isApproved: true,
      isEmailVerified: true,
      organizationId: "orgA",
      student: null,
      instructor: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": "school-b.meengine.io",
      },
      body: JSON.stringify({ email: "x@y.com", password: "123" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when user has no organizationId", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    h.findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "x@y.com",
      passwordHash: "hash",
      role: "STUDENT",
      isApproved: true,
      isEmailVerified: true,
      organizationId: null,
      student: null,
      instructor: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": "www.meengine.io",
      },
      body: JSON.stringify({ email: "x@y.com", password: "123" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(bcryptCompareMock).not.toHaveBeenCalled();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("allows login when tenant matches user org", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    h.findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "x@y.com",
      passwordHash: "hash",
      role: "STUDENT",
      isApproved: true,
      isEmailVerified: true,
      organizationId: "orgA",
      student: null,
      instructor: null,
    });

    bcryptCompareMock.mockResolvedValue(true);
    h.updateMock.mockResolvedValue({});

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": "www.meengine.io",
      },
      body: JSON.stringify({ email: "x@y.com", password: "123" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(bcryptCompareMock).toHaveBeenCalled();
    expect(h.updateMock).toHaveBeenCalled();
  });

  it("returns 429 when rate limited without sensitive internals", async () => {
    enforceLoginRateLimitsMock.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "rate_limited",
        },
        { status: 429, headers: { "Retry-After": "120" } },
      ),
    );

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "x@y.com", password: "123" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe("rate_limited");
    expect(json.error).toContain("Too many requests");
    expect(json).not.toHaveProperty("keyHash");
    expect(JSON.stringify(json)).not.toContain("x@y.com");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });
});
