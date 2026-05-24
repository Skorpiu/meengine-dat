import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const transactionMock = vi.fn();

  const prismaMock = {
    user: { findUnique: findUniqueMock },
    organization: { findUnique: organizationFindUniqueMock },
    $transaction: transactionMock,
  };

  return {
    prismaMock,
    findUniqueMock,
    organizationFindUniqueMock,
    transactionMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

vi.mock("@/lib/rate-limit/enforce-auth-rate-limits", () => ({
  enforceSignupRateLimits: vi.fn().mockResolvedValue(null),
}));

import bcrypt from "bcryptjs";
import { resolveTenantOrganizationId } from "@/lib/tenant";
import { POST } from "./route";

const hashMock = (bcrypt as any).hash as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock =
  resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

const studentSignupBody = {
  firstName: "A",
  lastName: "B",
  email: "x@y.com",
  password: "123",
  role: "STUDENT",
};

let previousPublicSignupEnabled: string | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  previousPublicSignupEnabled = process.env.PUBLIC_SIGNUP_ENABLED;
  delete process.env.PUBLIC_SIGNUP_ENABLED;
  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
});

afterEach(() => {
  if (previousPublicSignupEnabled === undefined) {
    delete process.env.PUBLIC_SIGNUP_ENABLED;
  } else {
    process.env.PUBLIC_SIGNUP_ENABLED = previousPublicSignupEnabled;
  }
});

describe("POST /api/signup (tenant hardening)", () => {
  it("returns 403 when role is SUPER_ADMIN", async () => {
    process.env.PUBLIC_SIGNUP_ENABLED = "true";
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...studentSignupBody,
        role: "SUPER_ADMIN",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 with demo_signup_disabled when organization is demo", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "demo.meengine.io",
      organizationId: "orgDemo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: "A",
        lastName: "B",
        email: "new@y.com",
        password: "123",
        role: "STUDENT",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_signup_disabled");
    expect(body.error).toBe(
      "Public signup is disabled for demo organizations.",
    );
    expect(body).not.toHaveProperty("details");
    expect(body).not.toHaveProperty("detail");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
    expect(h.transactionMock).not.toHaveBeenCalled();
  });

  it("returns demo_signup_disabled for demo org even when PUBLIC_SIGNUP_ENABLED is true", async () => {
    process.env.PUBLIC_SIGNUP_ENABLED = "true";
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "demo.meengine.io",
      organizationId: "orgDemo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(studentSignupBody),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_signup_disabled");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 with public_signup_disabled when env is unset", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(studentSignupBody),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("public_signup_disabled");
    expect(body.error).toBe("Public signup is currently disabled.");
    expect(body).not.toHaveProperty("details");
    expect(body).not.toHaveProperty("detail");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
    expect(h.transactionMock).not.toHaveBeenCalled();
  });

  it('returns 403 with public_signup_disabled when env is "false"', async () => {
    process.env.PUBLIC_SIGNUP_ENABLED = "false";
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(studentSignupBody),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("public_signup_disabled");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when organization id does not exist in database", async () => {
    process.env.PUBLIC_SIGNUP_ENABLED = "true";
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgMissing",
    });
    h.organizationFindUniqueMock.mockResolvedValue(null);

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(studentSignupBody),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Organization not found");
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when host is non-local and no org is resolved (even if body has organizationId)", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "school-x.meengine.io",
      organizationId: null,
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...studentSignupBody,
        organizationId: "orgA",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 when tenant org != body organizationId", async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...studentSignupBody,
        organizationId: "orgB",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 201 on happy path (tenant org present, non-demo, PUBLIC_SIGNUP_ENABLED=true)", async () => {
    process.env.PUBLIC_SIGNUP_ENABLED = "true";
    resolveTenantOrganizationIdMock.mockResolvedValue({
      host: "www.meengine.io",
      organizationId: "orgA",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
    h.findUniqueMock.mockResolvedValue(null);
    hashMock.mockResolvedValue("hash");

    h.transactionMock.mockImplementation(async (cb: any) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue({ id: "u1" }) },
        student: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
        instructor: { create: vi.fn() },
        transmissionType: { findFirst: vi.fn().mockResolvedValue(null) },
        category: { findFirst: vi.fn().mockResolvedValue(null) },
        lessonCounter: { create: vi.fn() },
      };
      return cb(tx);
    });

    const req = new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(studentSignupBody),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(201);

    const body: any = await res.json();
    expect(body.userId).toBe("u1");
    expect(body).not.toHaveProperty("details");
    expect(body).not.toHaveProperty("detail");
  });
});
