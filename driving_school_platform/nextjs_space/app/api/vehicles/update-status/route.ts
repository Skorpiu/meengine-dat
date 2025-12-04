
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { checkFeatureAccess } from "@/lib/middleware/feature-check"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if Vehicle Management feature is enabled
    const featureCheck = await checkFeatureAccess('VEHICLE_MANAGEMENT')
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Vehicle Management feature is not enabled. Please upgrade to unlock this feature.",
          requiresUpgrade: true 
        },
        { status: 403 }
      )
    }

    const { vehicleId, status } = await request.json()

    if (!vehicleId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Update vehicle status
    await prisma.vehicle.update({
      where: { id: parseInt(vehicleId) },
      data: { status },
    })

    return NextResponse.json({ 
      success: true, 
      message: "Vehicle status updated successfully" 
    })
  } catch (error) {
    console.error("Error updating vehicle status:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle status" },
      { status: 500 }
    )
  }
}
