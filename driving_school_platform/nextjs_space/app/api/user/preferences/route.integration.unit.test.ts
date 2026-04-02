import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

vi.mock("@/lib/config-utils", () => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  logConfigurationChange: vi.fn(),
}));

import { GET, PUT } from "./route";
import { getServerSession } from "next-auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import {
  getUserPreferences,
  updateUserPreferences,
  logConfigurationChange,
} from "@/lib/config-utils";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const guardTenantAuthenticatedRouteMock =
  guardTenantAuthenticatedRoute as unknown as ReturnType<typeof vi.fn>;
const getUserPreferencesMock = getUserPreferences as unknown as ReturnType<
  typeof vi.fn
>;
const updateUserPreferencesMock =
  updateUserPreferences as unknown as ReturnType<typeof vi.fn>;
const logConfigurationChangeMock =
  logConfigurationChange as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("/api/user/preferences (tenant scoping)", () => {
  it("GET returns 400 when session has no organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: null },
    });

    const res = await GET(
      new Request("http://localhost/api/user/preferences") as any,
    );
    expect(res.status).toBe(400);
    expect(getUserPreferencesMock).not.toHaveBeenCalled();
  });

  it("GET returns 403 when tenant org != session org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "orgA" },
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "Organization does not match this domain",
    });

    const res = await GET(
      new Request("http://localhost/api/user/preferences") as any,
    );
    expect(res.status).toBe(403);
    expect(getUserPreferencesMock).not.toHaveBeenCalled();
  });

  it("GET returns preferences when tenant matches", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "orgA" },
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
    getUserPreferencesMock.mockResolvedValue({ id: "pref1", theme: "dark" });

    const res = await GET(
      new Request("http://localhost/api/user/preferences") as any,
    );
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(body.preferences).toBeTruthy();
    expect(getUserPreferencesMock).toHaveBeenCalledWith("u1");
  });

  it("PUT returns 400 when session has no organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: null },
    });

    const res = await PUT(
      new Request("http://localhost/api/user/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }) as any,
    );

    expect(res.status).toBe(400);
    expect(updateUserPreferencesMock).not.toHaveBeenCalled();
  });

  it("PUT returns 403 when tenant org != session org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "orgA" },
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({
      allowed: false,
      status: 403,
      error: "Organization does not match this domain",
    });

    const res = await PUT(
      new Request("http://localhost/api/user/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }) as any,
    );

    expect(res.status).toBe(403);
    expect(updateUserPreferencesMock).not.toHaveBeenCalled();
  });

  it("PUT updates preferences when tenant matches", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "orgA" },
    });
    guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });

    getUserPreferencesMock.mockResolvedValue({ id: "pref1", theme: "dark" });
    updateUserPreferencesMock.mockResolvedValue({
      id: "pref1",
      theme: "light",
    });

    const res = await PUT(
      new Request("http://localhost/api/user/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: "light" }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(updateUserPreferencesMock).toHaveBeenCalled();
    expect(logConfigurationChangeMock).toHaveBeenCalled();
  });
});
