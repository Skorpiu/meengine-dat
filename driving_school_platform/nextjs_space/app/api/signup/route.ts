
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import type { $Enums } from "@prisma/client"

type UserRole = $Enums.UserRole

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      role,
      dateOfBirth,
      address,
      city,
      postalCode,
      organizationId,
      // Student-specific fields
      selectedCategories,
      transmissionType,
      // Instructor-specific fields
      instructorLicenseNumber,
      instructorLicenseExpiry,
    } = body

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Please select a organization" },
        { status: 400 }
      )
    }

    const validRoles = ["STUDENT", "INSTRUCTOR", "SUPER_ADMIN"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          role: role as UserRole,
          firstName,
          lastName,
          phoneNumber,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          address,
          city,
          postalCode,
          isEmailVerified: true, // For demo purposes, skip email verification
          isApproved: true, // Auto-approve all users
        },
      })

      // Create role-specific profile
      if (role === "STUDENT") {
        // Find transmission type
        let transmission = null
        if (transmissionType) {
          transmission = await tx.transmissionType.findFirst({
            where: { name: transmissionType },
          })
          if (!transmission) {
            transmission = await tx.transmissionType.findFirst({
              where: { code: transmissionType.toUpperCase() === "MANUAL" ? "MT" : "AT" },
            })
          }
        }

        // Find primary category (first selected one)
        const primaryCategory = selectedCategories?.[0]
        let category = null
        if (primaryCategory) {
          category = await tx.category.findFirst({
            where: { name: primaryCategory },
          })
        }

        // Create student profile
        const studentData = {
          userId: user.id,
          categoryId: category?.id || null,
          transmissionTypeId: transmission?.id || null,
          organizationId: organizationId || null,
          studentIdNumber: `STU-${Date.now()}`,
        }

        const newStudent = await tx.student.create({
          data: studentData,
        })

        // Create lesson counter for primary category
        if (category) {
          await tx.lessonCounter.create({
            data: {
              studentId: newStudent.id,
              categoryId: category.id,
              requiredDrivingHours: category.minLessonHours,
            },
          })
        }

      } else if (role === "INSTRUCTOR") {
        // Create instructor profile
        await tx.instructor.create({
          data: {
            userId: user.id,
            instructorLicenseNumber,
            instructorLicenseExpiry: new Date(instructorLicenseExpiry),
            organizationId: organizationId || null,
            instructorIdNumber: `INS-${Date.now()}`,
            employmentType: "FULL_TIME",
            hourlyRate: 45.00,
          },
        })
      }

      return user
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.id,
        requiresApproval: role === "INSTRUCTOR",
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
