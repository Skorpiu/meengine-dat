import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  organizationFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    organization: { findUnique: h.organizationFindUniqueMock },
  },
  db: {
    organization: { findUnique: h.organizationFindUniqueMock },
  },
}));

import { decideDemoRouteMutation } from "./demo-route-guard";

const STABLE_MESSAGE =
  "This action is restricted in the public demo environment.";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("decideDemoRouteMutation", () => {
  it("allows user_management when organization is not demo", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });

    const result = await decideDemoRouteMutation({
      organizationId: "org-1",
      category: "user_management",
    });

    expect(result).toEqual({ allowed: true });
    expect(h.organizationFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
      select: { isDemo: true },
    });
  });

  it("blocks user_management when organization is demo", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoRouteMutation({
      organizationId: "org-demo",
      category: "user_management",
    });

    expect(result).toEqual({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: STABLE_MESSAGE,
    });
  });

  it("blocks vehicle_management for demo org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoRouteMutation({
      organizationId: "org-demo",
      category: "vehicle_management",
    });

    expect(result).toEqual({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: STABLE_MESSAGE,
    });
  });

  it("blocks lesson_management for demo org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoRouteMutation({
      organizationId: "org-demo",
      category: "lesson_management",
    });

    expect(result).toEqual({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: STABLE_MESSAGE,
    });
  });

  it("blocks cleanup for demo org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoRouteMutation({
      organizationId: "org-demo",
      category: "cleanup",
    });

    expect(result).toEqual({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: STABLE_MESSAGE,
    });
  });

  it("allows profile_preferences for demo org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoRouteMutation({
      organizationId: "org-demo",
      category: "profile_preferences",
    });

    expect(result).toEqual({ allowed: true });
  });

  it("returns stable 403 when organization does not exist", async () => {
    h.organizationFindUniqueMock.mockResolvedValue(null);

    const result = await decideDemoRouteMutation({
      organizationId: "missing-org",
      category: "user_management",
    });

    expect(result).toEqual({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: STABLE_MESSAGE,
    });
  });
});
