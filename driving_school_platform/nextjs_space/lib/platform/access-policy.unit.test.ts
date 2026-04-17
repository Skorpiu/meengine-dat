import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const isLocalHostMock = vi.fn();
  const isPlatformHostMock = vi.fn();
  return { isLocalHostMock, isPlatformHostMock };
});

vi.mock("@/lib/tenant", () => ({
  isLocalHost: h.isLocalHostMock,
  isPlatformHost: h.isPlatformHostMock,
}));

// IMPORT AFTER MOCKS
import { decidePlatformSurfaceAccess } from "./access-policy";

beforeEach(() => {
  vi.resetAllMocks();
  h.isLocalHostMock.mockReturnValue(false);
  h.isPlatformHostMock.mockReturnValue(false);
});

describe("decidePlatformSurfaceAccess", () => {
  it("allows PLATFORM_ADMIN on localhost/platform host when not tenant-mapped", () => {
    h.isLocalHostMock.mockReturnValue(true);

    const r = decidePlatformSurfaceAccess({
      mode: "page",
      userRole: "PLATFORM_ADMIN",
      host: "localhost",
      tenantOrganizationId: null,
    });

    expect(r).toEqual({ allowed: true });
  });

  it("denies when role is not PLATFORM_ADMIN", () => {
    const r = decidePlatformSurfaceAccess({
      mode: "api",
      userRole: "SUPER_ADMIN",
      host: "localhost",
      tenantOrganizationId: null,
    });

    expect(r).toEqual({ allowed: false, reason: "not_platform_admin" });
  });

  it("denies when host is missing", () => {
    const r = decidePlatformSurfaceAccess({
      mode: "api",
      userRole: "PLATFORM_ADMIN",
      host: null,
      tenantOrganizationId: null,
    });

    expect(r).toEqual({ allowed: false, reason: "missing_host" });
  });

  it("denies when host is not allowed (not local, not platform)", () => {
    h.isLocalHostMock.mockReturnValue(false);
    h.isPlatformHostMock.mockReturnValue(false);

    const r = decidePlatformSurfaceAccess({
      mode: "page",
      userRole: "PLATFORM_ADMIN",
      host: "evil.com",
      tenantOrganizationId: null,
    });

    expect(r).toEqual({ allowed: false, reason: "host_not_allowed" });
  });

  it("denies when host is tenant-mapped", () => {
    h.isPlatformHostMock.mockReturnValue(true);

    const r = decidePlatformSurfaceAccess({
      mode: "page",
      userRole: "PLATFORM_ADMIN",
      host: "platform.meengine.io",
      tenantOrganizationId: "orgA",
    });

    expect(r).toEqual({ allowed: false, reason: "tenant_mapped_host" });
  });
});
