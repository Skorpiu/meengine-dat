
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const transmissionTypes = await prisma.transmissionType.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ transmissionTypes })
  } catch (error) {
    console.error("Error fetching transmission types:", error)
    return NextResponse.json(
      { error: "Failed to fetch transmission types" },
      { status: 500 }
    )
  }
}
