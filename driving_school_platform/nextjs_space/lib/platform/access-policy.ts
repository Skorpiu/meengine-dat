import { isLocalHost, isPlatformHost } from "@/lib/tenant";

export type PlatformSurfaceAccessMode = "page" | "api";

export type PlatformSurfaceAccessDeniedReason =
  | "not_platform_admin"
  | "missing_host"
  | "tenant_mapped_host"
  | "host_not_allowed";

export type PlatformSurfaceAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: PlatformSurfaceAccessDeniedReason };

/**
 * Central access policy for the Platform surface.
 *
 * Boundary: this policy only evaluates *who* can access the Platform surface
 * and *where* it can run (host gating). It does not perform authentication.
 */
export function decidePlatformSurfaceAccess(input: {
  mode: PlatformSurfaceAccessMode;
  userRole: string | null | undefined;
  host: string | null;
  tenantOrganizationId: string | null | undefined;
}): PlatformSurfaceAccessDecision {
  if (input.userRole !== "PLATFORM_ADMIN") {
    return { allowed: false, reason: "not_platform_admin" };
  }

  if (!input.host) {
    // API requires a host header; page treats missing host as inaccessible.
    return { allowed: false, reason: "missing_host" };
  }

  // Platform surface must run only on local dev or configured platform hosts.
  if (!isLocalHost(input.host) && !isPlatformHost(input.host)) {
    return { allowed: false, reason: "host_not_allowed" };
  }

  // Platform surface must never run on tenant-mapped hosts.
  if (input.tenantOrganizationId) {
    return { allowed: false, reason: "tenant_mapped_host" };
  }

  return { allowed: true };
}
