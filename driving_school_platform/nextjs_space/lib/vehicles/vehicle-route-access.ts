import { NextRequest, NextResponse } from "next/server";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

/**
 * Ensures tenant host matches the organization resolved for vehicle APIs.
 * `checkFeatureAccess` already compares host vs session org; this adds the same
 * explicit guard used on other tenant admin routes.
 */
export async function assertVehicleTenantHost(
  request: NextRequest,
  organizationId: string,
): Promise<NextResponse | null> {
  const tenantGuard = await guardTenantAuthenticatedRoute(
    request,
    organizationId,
  );
  if (!tenantGuard.allowed) {
    return NextResponse.json(
      { error: tenantGuard.error },
      { status: tenantGuard.status },
    );
  }
  return null;
}

/**
 * Blocks demo-org vehicle mutations (status, maintenance, PUT, DELETE).
 * POST create uses the separate sandbox quota helper.
 */
export async function rejectDemoVehicleManagementMutation(
  organizationId: string,
): Promise<NextResponse | null> {
  const demoDecision = await decideDemoRouteMutation({
    organizationId,
    category: "vehicle_management",
  });
  if (!demoDecision.allowed) {
    return NextResponse.json(
      { error: demoDecision.message, code: demoDecision.reason },
      { status: demoDecision.status },
    );
  }
  return null;
}

type FeatureCheckResult = Awaited<ReturnType<typeof checkFeatureAccess>>;

/**
 * Maps `checkFeatureAccess` failures to the legacy vehicle route error shapes.
 */
export function vehicleFeatureAccessErrorResponse(
  featureCheck: FeatureCheckResult,
  variant: "admin_get" | "admin_mutate" | "vehicle_aux",
): NextResponse {
  if (featureCheck.error === "Wrong organization for this domain") {
    return NextResponse.json(
      { error: "Organization does not match this domain" },
      { status: 403 },
    );
  }

  if (featureCheck.error === "No organization found") {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 400 },
    );
  }

  if (
    featureCheck.error === "Unauthorized" ||
    featureCheck.error === "User not found"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (featureCheck.error === "Internal server error") {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (variant === "admin_get") {
    return NextResponse.json(
      {
        error: "Vehicles feature not enabled",
        message:
          "Vehicle Management feature is not enabled. Please upgrade to unlock this feature.",
        requiresUpgrade: true,
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Vehicle Management feature is not enabled. Please upgrade to unlock this feature.",
      requiresUpgrade: true,
    },
    { status: 403 },
  );
}
