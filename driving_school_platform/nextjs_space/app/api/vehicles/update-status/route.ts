
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
