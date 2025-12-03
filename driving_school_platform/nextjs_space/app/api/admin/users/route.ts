
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Allow both SUPER_ADMIN and INSTRUCTOR to access
    if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INSTRUCTOR")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    const where: any = {}
    
    if (role) {
      where.role = role
    }

    // Instructors can only see students, not other users
    if (session.user.role === "INSTRUCTOR" && role !== "STUDENT") {
      where.role = "STUDENT"
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true,
        student: {
          select: {
            studentNumber: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format the response to include studentNumber at the top level for students
    const formattedUsers = users.map(user => ({
      ...user,
      studentNumber: user.student?.studentNumber || null,
      student: undefined, // Remove the nested student object
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
