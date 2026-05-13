import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LicenseService } from "@/lib/services/license-service";
import { db } from "@/lib/db";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { isFeatureKey } from "@/lib/config/license-features";
import type {
  AdminLicenseActivatePostRequest,
  AdminLicenseActivatePostResponse,
} from "@/lib/platform/contracts/license-entitlements";

/**
 * POST /api/admin/license/activate
 * Activate a license key
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

    const demoDecision = await decideDemoRouteMutation({
      organizationId: user.organizationId,
      category: "licensing",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    const rawBody: unknown = await request.json();
    const body = rawBody as Partial<AdminLicenseActivatePostRequest>;
    const licenseKey = body.licenseKey;

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 400 },
      );
    }

    // Activate the license key
    const result = await LicenseService.activateLicenseKey(
      user.organizationId,
      licenseKey,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const featureKeys = (result.features ?? [])
      .filter((k): k is string => typeof k === "string")
      .filter(isFeatureKey);

    const resBody: AdminLicenseActivatePostResponse = {
      success: true,
      message: result.message,
      features: featureKeys,
    };

    return NextResponse.json(resBody);
  } catch (error) {
    console.error("Error activating license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
