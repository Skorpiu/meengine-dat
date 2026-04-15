import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import { VehicleStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Vehicle Management feature is enabled (also validates tenant by Host)
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );

    if (!featureCheck.allowed) {
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

      // Feature not enabled
      return NextResponse.json(
        {
          error:
            "Vehicle Management feature is not enabled. Please upgrade to unlock this feature.",
          requiresUpgrade: true,
        },
        { status: 403 },
      );
    }

    const orgId = featureCheck.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    type UpdateStatusBody = {
      vehicleId?: unknown;
      status?: unknown;
    };

    const { vehicleId: vehicleIdRaw, status: statusRaw } =
      (body as UpdateStatusBody) ?? {};

    const vehicleId =
      typeof vehicleIdRaw === "number"
        ? vehicleIdRaw
        : typeof vehicleIdRaw === "string"
          ? parseInt(vehicleIdRaw, 10)
          : NaN;

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json({ error: "Invalid vehicleId" }, { status: 400 });
    }

    if (typeof statusRaw !== "string") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const normalizedStatus = statusRaw.toUpperCase();
    if (
      !Object.values(VehicleStatus).includes(normalizedStatus as VehicleStatus)
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update vehicle status (scoped)
    const result = await prisma.vehicle.updateMany({
      where: { id: vehicleId, organizationId: orgId },
      data: { status: normalizedStatus as VehicleStatus },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle status updated successfully",
    });
  } catch (error) {
    console.error("Error updating vehicle status:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle status" },
      { status: 500 },
    );
  }
}
