import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import {
  assertVehicleTenantHost,
  rejectDemoVehicleManagementMutation,
  vehicleFeatureAccessErrorResponse,
} from "@/lib/vehicles/vehicle-route-access";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );

    if (!featureCheck.allowed) {
      return vehicleFeatureAccessErrorResponse(featureCheck, "vehicle_aux");
    }

    const orgId = featureCheck.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantBlocked = await assertVehicleTenantHost(request, orgId);
    if (tenantBlocked) return tenantBlocked;

    const demoBlocked = await rejectDemoVehicleManagementMutation(orgId);
    if (demoBlocked) return demoBlocked;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    type UpdateMaintenanceBody = {
      vehicleId?: unknown;
      underMaintenance?: unknown;
    };

    const { vehicleId: vehicleIdRaw, underMaintenance: underMaintenanceRaw } =
      (body as UpdateMaintenanceBody) ?? {};

    const vehicleId =
      typeof vehicleIdRaw === "number"
        ? vehicleIdRaw
        : typeof vehicleIdRaw === "string"
          ? parseInt(vehicleIdRaw, 10)
          : NaN;

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json({ error: "Invalid vehicleId" }, { status: 400 });
    }

    if (typeof underMaintenanceRaw !== "boolean") {
      return NextResponse.json(
        { error: "Invalid underMaintenance" },
        { status: 400 },
      );
    }

    const result = await prisma.vehicle.updateMany({
      where: { id: vehicleId, organizationId: orgId },
      data: { underMaintenance: underMaintenanceRaw },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `Vehicle ${underMaintenanceRaw ? "marked for" : "removed from"} maintenance`,
    });
  } catch (error) {
    console.error("Error updating vehicle maintenance status:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance status" },
      { status: 500 },
    );
  }
}
