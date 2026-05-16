import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  resetDemoSandboxMock: vi.fn(),
}));

vi.mock("@/lib/demo/demo-sandbox-reset", () => ({
  resetDemoSandbox: (...args: unknown[]) => h.resetDemoSandboxMock(...args),
  DemoSandboxResetError: class DemoSandboxResetError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { DemoSandboxResetError } from "@/lib/demo/demo-sandbox-reset";
import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };

function cronRequest(auth?: string): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) {
    headers.authorization = auth;
  }
  return new Request("http://localhost/api/cron/demo-sandbox-reset", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.DEMO_ORGANIZATION_ID = "org-demo";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /api/cron/demo-sandbox-reset", () => {
  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(503);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe("Cron secret is not configured.");
    expect(h.resetDemoSandboxMock).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization is missing or invalid", async () => {
    const missing = await GET(cronRequest() as never);
    expect(missing.status).toBe(401);

    const invalid = await GET(cronRequest("Bearer wrong") as never);
    expect(invalid.status).toBe(401);

    const body: { error?: string } = await invalid.json();
    expect(body.error).toBe("Unauthorized");
    expect(h.resetDemoSandboxMock).not.toHaveBeenCalled();
  });

  it("returns 500 when DEMO_ORGANIZATION_ID is not configured", async () => {
    delete process.env.DEMO_ORGANIZATION_ID;

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(500);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe("Demo organization is not configured.");
    expect(h.resetDemoSandboxMock).not.toHaveBeenCalled();
  });

  it("returns 500 when demo organization id does not exist", async () => {
    h.resetDemoSandboxMock.mockRejectedValue(
      new DemoSandboxResetError(
        "organization_not_found",
        "No organization found for the given id.",
      ),
    );

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(500);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe("Demo organization is not configured.");
  });

  it("returns 403 when organization is not demo", async () => {
    h.resetDemoSandboxMock.mockRejectedValue(
      new DemoSandboxResetError(
        "not_demo_organization",
        "Refusing to reset sandbox for a non-demo organization.",
      ),
    );

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(403);

    const body: { error?: string } = await res.json();
    expect(body.error).toBe(
      "Demo sandbox reset is not allowed for this organization.",
    );
  });

  it("calls reset with env org id and returns deleted counts", async () => {
    h.resetDemoSandboxMock.mockResolvedValue({
      organizationId: "org-demo",
      organizationName: "Demo",
      plannedLessons: 3,
      plannedVehicles: 1,
      deletedLessons: 3,
      deletedVehicles: 1,
      applied: true,
    });

    const res = await GET(cronRequest("Bearer test-cron-secret") as never);
    expect(res.status).toBe(200);

    expect(h.resetDemoSandboxMock).toHaveBeenCalledWith({
      organizationId: "org-demo",
      apply: true,
    });

    const body: {
      success?: boolean;
      deletedLessons?: number;
      deletedVehicles?: number;
    } = await res.json();
    expect(body).toEqual({
      success: true,
      deletedLessons: 3,
      deletedVehicles: 1,
    });
  });
});
