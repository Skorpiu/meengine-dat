import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  organizationFindUniqueMock: vi.fn(),
  lessonCountMock: vi.fn(),
  vehicleCountMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    organization: { findUnique: h.organizationFindUniqueMock },
    lesson: { count: h.lessonCountMock },
    vehicle: { count: h.vehicleCountMock },
  },
}));

import {
  decideDemoLessonCreate,
  decideDemoVehicleCreate,
} from "./demo-write-sandbox-route-guard";

const RESTRICTED = "This action is restricted in the public demo environment.";
const QUOTA = "This demo sandbox quota has already been used.";

describe("decideDemoLessonCreate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
  });

  afterEach(() => {
    delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
  });

  it("allows non-demo org without checking sandbox env", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });

    const result = await decideDemoLessonCreate({
      organizationId: "org-1",
      lessonType: "THEORY",
    });

    expect(result).toEqual({ allowed: true });
    expect(h.lessonCountMock).not.toHaveBeenCalled();
  });

  it("returns stable 403 when organization is missing", async () => {
    h.organizationFindUniqueMock.mockResolvedValue(null);

    const result = await decideDemoLessonCreate({
      organizationId: "missing",
      lessonType: "THEORY",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_restricted_action",
      message: RESTRICTED,
    });
    expect(h.lessonCountMock).not.toHaveBeenCalled();
  });

  it("blocks demo org when sandbox is disabled", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "false";

    const result = await decideDemoLessonCreate({
      organizationId: "org-demo",
      lessonType: "THEORY",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_restricted_action",
      message: RESTRICTED,
    });
    expect(h.lessonCountMock).not.toHaveBeenCalled();
  });

  it("allows demo org with sandbox on and count 0", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.lessonCountMock.mockResolvedValue(0);

    const result = await decideDemoLessonCreate({
      organizationId: "org-demo",
      lessonType: "DRIVING",
    });

    expect(result).toEqual({ allowed: true });
    expect(h.lessonCountMock).toHaveBeenCalled();
  });

  it("blocks demo org with sandbox on when quota is used", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.lessonCountMock.mockResolvedValue(1);

    const result = await decideDemoLessonCreate({
      organizationId: "org-demo",
      lessonType: "THEORY",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_write_quota_exceeded",
      message: QUOTA,
    });
  });

  it("skips quota for unknown lessonType (validation layer)", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";

    const result = await decideDemoLessonCreate({
      organizationId: "org-demo",
      lessonType: "NOT_A_REAL_TYPE",
    });

    expect(result).toEqual({ allowed: true });
    expect(h.lessonCountMock).not.toHaveBeenCalled();
  });
});

describe("decideDemoVehicleCreate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
  });

  afterEach(() => {
    delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
  });

  it("allows non-demo org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });

    const result = await decideDemoVehicleCreate({
      organizationId: "org-1",
    });

    expect(result).toEqual({ allowed: true });
    expect(h.vehicleCountMock).not.toHaveBeenCalled();
  });

  it("blocks missing org", async () => {
    h.organizationFindUniqueMock.mockResolvedValue(null);

    const result = await decideDemoVehicleCreate({
      organizationId: "missing",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_restricted_action",
      message: RESTRICTED,
    });
  });

  it("blocks demo when sandbox disabled", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const result = await decideDemoVehicleCreate({
      organizationId: "org-demo",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_restricted_action",
      message: RESTRICTED,
    });
    expect(h.vehicleCountMock).not.toHaveBeenCalled();
  });

  it("allows demo sandbox on with vehicle count 0", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.vehicleCountMock.mockResolvedValue(0);

    const result = await decideDemoVehicleCreate({
      organizationId: "org-demo",
    });

    expect(result).toEqual({ allowed: true });
  });

  it("blocks demo sandbox on when vehicle count >= 1", async () => {
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.vehicleCountMock.mockResolvedValue(1);

    const result = await decideDemoVehicleCreate({
      organizationId: "org-demo",
    });

    expect(result).toEqual({
      allowed: false,
      status: 403,
      code: "demo_write_quota_exceeded",
      message: QUOTA,
    });
  });
});
