import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { decideDemoVehicleCreate } from "@/lib/demo/demo-write-sandbox-route-guard";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import {
  assertVehicleTenantHost,
  vehicleFeatureAccessErrorResponse,
} from "@/lib/vehicles/vehicle-route-access";
import type { Prisma } from "@prisma/client";
import { VehicleStatus } from "@prisma/client";

type VehicleWithRelations = Prisma.VehicleGetPayload<{
  include: { category: true; transmissionType: true };
}>;

/**
 * GET /api/admin/vehicles
 * Get all vehicles with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow both SUPER_ADMIN and INSTRUCTOR to access
    if (
      session.user.role !== "SUPER_ADMIN" &&
      session.user.role !== "INSTRUCTOR"
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if Vehicle Management feature is enabled
    // For SUPER_ADMIN: Check feature access
    // For INSTRUCTOR: Also check feature access (defense in depth)
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );
    if (!featureCheck.allowed) {
      return vehicleFeatureAccessErrorResponse(featureCheck, "admin_get");
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");

    const orgId = featureCheck.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantBlocked = await assertVehicleTenantHost(request, orgId);
    if (tenantBlocked) return tenantBlocked;

    // Build where clause (scoped to org)
    const where: Prisma.VehicleWhereInput = { organizationId: orgId };

    if (status) {
      const normalized = status.toUpperCase() as VehicleStatus;
      if (Object.values(VehicleStatus).includes(normalized)) {
        where.status = normalized;
      }
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    // Fetch vehicles
    const vehicles = await db.vehicle.findMany({
      where,
      include: {
        category: true,
        transmissionType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate real-time vehicle status based on current lessons/exams
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Robust "today" range (avoid Date equality issues)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Any lesson happening right now (includes lessonType = EXAM if exams are stored as Lesson)
    const currentLessons = await db.lesson.findMany({
      where: {
        organizationId: orgId,
        lessonDate: { gte: startOfToday, lt: startOfTomorrow },
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
        vehicleId: { not: null },
      },
      select: { vehicleId: true },
    });

    // Legacy exams table (keep if you still have old data there)
    const currentExams = await db.exam.findMany({
      where: {
        organizationId: orgId,
        examDate: { gte: startOfToday, lt: startOfTomorrow },
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
        vehicleId: { not: null },
      },
      select: { vehicleId: true },
    });

    const vehicleIdsInUse = new Set<number>();

    for (const l of currentLessons) {
      if (l.vehicleId != null) vehicleIdsInUse.add(l.vehicleId);
    }
    for (const e of currentExams) {
      if (e.vehicleId != null) vehicleIdsInUse.add(e.vehicleId);
    }

    // Update vehicle status based on real-time usage
    const vehiclesWithStatus = (vehicles as VehicleWithRelations[]).map(
      (vehicle) => {
        let status = vehicle.status;

        // Priority 1: Under Maintenance
        if (vehicle.underMaintenance) {
          status = "MAINTENANCE";
        }
        // Priority 2: Currently in use (has an active lesson/exam)
        else if (vehicleIdsInUse.has(vehicle.id)) {
          status = "IN_USE";
        }
        // Priority 3: Available
        else if (vehicle.isActive) {
          status = "AVAILABLE";
        }

        return {
          ...vehicle,
          status,
        };
      },
    );

    return NextResponse.json({ vehicles: vehiclesWithStatus });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/vehicles
 * Create a new vehicle
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if Vehicle Management feature is enabled
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );
    if (!featureCheck.allowed) {
      return vehicleFeatureAccessErrorResponse(featureCheck, "admin_mutate");
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

    const sandboxDecision = await decideDemoVehicleCreate({
      organizationId: orgId,
    });
    if (!sandboxDecision.allowed) {
      return NextResponse.json(
        { error: sandboxDecision.message, code: sandboxDecision.code },
        { status: sandboxDecision.status },
      );
    }

    const body = await request.json();

    // Check if registration number already exists
    const existingByRegNumber = await db.vehicle.findFirst({
      where: {
        organizationId: orgId,
        registrationNumber: body.registrationNumber,
      },
      select: { id: true },
    });

    if (existingByRegNumber) {
      return NextResponse.json(
        {
          error: "A vehicle with this registration number already exists",
        },
        { status: 400 },
      );
    }

    // Check if VIN already exists (only if VIN is provided)
    if (body.vin && body.vin.trim()) {
      const existingByVin = await db.vehicle.findFirst({
        where: { organizationId: orgId, vin: body.vin.trim() },
        select: { id: true },
      });

      if (existingByVin) {
        return NextResponse.json(
          {
            error: "A vehicle with this VIN already exists",
          },
          { status: 400 },
        );
      }
    }

    // Create vehicle
    const vehicle = await db.vehicle.create({
      data: {
        organizationId: orgId,
        registrationNumber: body.registrationNumber,
        make: body.make,
        model: body.model,
        year: body.year,
        color: body.color,
        vin: body.vin && body.vin.trim() ? body.vin.trim() : null,
        categoryId: body.categoryId ? parseInt(body.categoryId) : null,
        transmissionTypeId: parseInt(body.transmissionTypeId),
        status: body.status || "AVAILABLE",
        isActive: body.isActive !== undefined ? body.isActive : true,
        hasDualControls:
          body.hasDualControls !== undefined ? body.hasDualControls : true,
        hasDashcam: body.hasDashcam || false,
        fuelType: body.fuelType || null,
        insurancePolicyNumber: body.insurancePolicyNumber || null,
        insuranceExpiryDate: body.insuranceExpiryDate
          ? new Date(body.insuranceExpiryDate)
          : null,
        insuranceCompany: body.insuranceCompany || null,
        currentMileage: body.currentMileage || 0,
        serviceIntervalKm: body.serviceIntervalKm || 10000,
        lastServiceDate: body.lastServiceDate
          ? new Date(body.lastServiceDate)
          : null,
        nextServiceDate: body.nextServiceDate
          ? new Date(body.nextServiceDate)
          : null,
        vehicleImageUrl: body.vehicleImageUrl || null,
        adminNotes: body.adminNotes || null,
      },
      include: {
        category: true,
        transmissionType: true,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/vehicles
 * Update an existing vehicle
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if Vehicle Management feature is enabled
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );
    if (!featureCheck.allowed) {
      return vehicleFeatureAccessErrorResponse(featureCheck, "admin_mutate");
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

    const demoDecision = await decideDemoRouteMutation({
      organizationId: orgId,
      category: "vehicle_management",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    const body = await request.json();
    const { vehicleId, ...updateData } = body;

    const vehicleIdNum =
      typeof vehicleId === "string" ? parseInt(vehicleId, 10) : vehicleId;

    if (!vehicleIdNum || Number.isNaN(vehicleIdNum)) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // Check if vehicle exists
    const existingVehicle = await db.vehicle.findFirst({
      where: { id: vehicleIdNum, organizationId: orgId },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Check if registration number is being changed and if it already exists
    if (updateData.registrationNumber !== existingVehicle.registrationNumber) {
      const existingByRegNumber = await db.vehicle.findFirst({
        where: {
          organizationId: orgId,
          registrationNumber: updateData.registrationNumber,
          id: { not: vehicleIdNum },
        },
        select: { id: true },
      });

      if (existingByRegNumber) {
        return NextResponse.json(
          {
            error: "A vehicle with this registration number already exists",
          },
          { status: 400 },
        );
      }
    }

    // Check if VIN is being changed and if it already exists (only if VIN is provided)
    if (updateData.vin && updateData.vin.trim()) {
      if (updateData.vin.trim() !== existingVehicle.vin) {
        const existingByVin = await db.vehicle.findFirst({
          where: {
            organizationId: orgId,
            vin: updateData.vin.trim(),
            id: { not: vehicleIdNum },
          },
          select: { id: true },
        });

        if (existingByVin) {
          return NextResponse.json(
            {
              error: "A vehicle with this VIN already exists",
            },
            { status: 400 },
          );
        }
      }
    }

    // Update vehicle
    const vehicle = await db.vehicle.update({
      where: { id: vehicleIdNum },
      data: {
        registrationNumber: updateData.registrationNumber,
        make: updateData.make,
        model: updateData.model,
        year: updateData.year,
        color: updateData.color,
        vin:
          updateData.vin && updateData.vin.trim()
            ? updateData.vin.trim()
            : null,
        categoryId: updateData.categoryId
          ? parseInt(updateData.categoryId)
          : null,
        transmissionTypeId: parseInt(updateData.transmissionTypeId),
        status: updateData.status,
        isActive: updateData.isActive,
        hasDualControls: updateData.hasDualControls,
        hasDashcam: updateData.hasDashcam,
        fuelType: updateData.fuelType,
        insurancePolicyNumber: updateData.insurancePolicyNumber,
        insuranceExpiryDate: updateData.insuranceExpiryDate
          ? new Date(updateData.insuranceExpiryDate)
          : null,
        insuranceCompany: updateData.insuranceCompany,
        currentMileage: updateData.currentMileage,
        serviceIntervalKm: updateData.serviceIntervalKm,
        lastServiceDate: updateData.lastServiceDate
          ? new Date(updateData.lastServiceDate)
          : null,
        nextServiceDate: updateData.nextServiceDate
          ? new Date(updateData.nextServiceDate)
          : null,
        vehicleImageUrl: updateData.vehicleImageUrl,
        adminNotes: updateData.adminNotes,
      },
      include: {
        category: true,
        transmissionType: true,
      },
    });

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/vehicles
 * Delete a vehicle
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if Vehicle Management feature is enabled
    const featureCheck = await checkFeatureAccess(
      "VEHICLE_MANAGEMENT",
      request,
    );
    if (!featureCheck.allowed) {
      return vehicleFeatureAccessErrorResponse(featureCheck, "admin_mutate");
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

    const demoDecision = await decideDemoRouteMutation({
      organizationId: orgId,
      category: "vehicle_management",
    });
    if (!demoDecision.allowed) {
      return NextResponse.json(
        { error: demoDecision.message, code: demoDecision.reason },
        { status: demoDecision.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    const vehicleIdNum = parseInt(vehicleId, 10);
    if (Number.isNaN(vehicleIdNum)) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // Check if vehicle exists
    const vehicle = await db.vehicle.findFirst({
      where: { id: vehicleIdNum, organizationId: orgId },
      include: {
        _count: {
          select: {
            lessons: true,
            exams: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Check if vehicle is used in any lessons or exams
    if (vehicle._count.lessons > 0 || vehicle._count.exams > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete vehicle with existing lessons or exams. Please reassign them first.",
        },
        { status: 400 },
      );
    }

    // Delete vehicle
    await db.vehicle.deleteMany({
      where: { id: vehicleIdNum, organizationId: orgId },
    });

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
