import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LicenseService } from "@/lib/services/license-service";
import { db } from "@/lib/db";
import { isFeatureKey } from "@/lib/config/license-features";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import type { AdminLicenseEntitlementsGetResponse } from "@/lib/platform/contracts/license-entitlements";

/**
 * GET /api/admin/license/features
 * Get all features for the admin's organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(
      request,
      user.organizationId,
    );
    if (!tenantGuard.allowed) {
      return NextResponse.json(
        { error: tenantGuard.error },
        { status: tenantGuard.status },
      );
    }

    // Get enabled features
    const enabledFeatures = await LicenseService.getEnabledFeatures(
      user.organizationId,
    );

    const enabledFeatureKeys = enabledFeatures
      .filter((k): k is string => typeof k === "string")
      .filter(isFeatureKey);

    const body: AdminLicenseEntitlementsGetResponse = {
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      subscriptionTier: user.organization?.subscriptionTier ?? null,
      enabledFeatureKeys,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Error fetching features:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/license/features
 * Toggle a feature on or off
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantGuard = await guardTenantAuthenticatedRoute(
      request,
      user.organizationId,
    );
    if (!tenantGuard.allowed) {
      return NextResponse.json(
        { error: tenantGuard.error },
        { status: tenantGuard.status },
      );
    }

    const body = await request.json();
    const { featureKey, enabled } = body;

    if (!featureKey || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify feature exists
    if (typeof featureKey !== "string" || !isFeatureKey(featureKey)) {
      return NextResponse.json(
        { error: "Invalid feature key" },
        { status: 400 },
      );
    }

    // Toggle the feature
    const success = enabled
      ? await LicenseService.enableFeature(
          user.organizationId,
          featureKey,
          session.user.id,
        )
      : await LicenseService.disableFeature(user.organizationId, featureKey);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update feature" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    console.error("Error updating feature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
