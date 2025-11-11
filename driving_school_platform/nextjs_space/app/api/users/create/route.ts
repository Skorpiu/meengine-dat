
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Only administrators can create user accounts." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth,
      address,
      city,
      postalCode,
      role,
      // Student-specific
      selectedCategories,
      transmissionType,
      // Instructor-specific
      instructorLicenseNumber,
      instructorLicenseExpiry,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address,
        city,
        postalCode,
        role,
        isApproved: true, // Admin-created users are pre-approved
        isEmailVerified: false, // Must verify email
        emailVerificationToken,
        emailVerificationExpiresAt,
      },
    })

    // Create role-specific profile
    if (role === "STUDENT") {
      // Get transmission type
      let transmissionTypeRecord = null
      if (transmissionType) {
        transmissionTypeRecord = await prisma.transmissionType.findFirst({
          where: { name: transmissionType },
        })
      }

      // Get first selected category
      let categoryRecord = null
      if (selectedCategories && selectedCategories.length > 0) {
        categoryRecord = await prisma.category.findFirst({
          where: { name: selectedCategories[0] },
        })
      }

      await prisma.student.create({
        data: {
          userId: user.id,
          categoryId: categoryRecord?.id,
          transmissionTypeId: transmissionTypeRecord?.id,
        },
      })
    } else if (role === "INSTRUCTOR") {
      if (!instructorLicenseNumber || !instructorLicenseExpiry) {
        // Clean up user if instructor data is missing
        await prisma.user.delete({ where: { id: user.id } })
        return NextResponse.json(
          { error: "Instructor license information is required" },
          { status: 400 }
        )
      }

      await prisma.instructor.create({
        data: {
          userId: user.id,
          instructorLicenseNumber,
          instructorLicenseExpiry: new Date(instructorLicenseExpiry),
        },
      })
    }

    // TODO: Send verification email with temporary password
    // For now, return the temp password (in production, this should be emailed)

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tempPassword, // REMOVE THIS IN PRODUCTION - send via email instead
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
