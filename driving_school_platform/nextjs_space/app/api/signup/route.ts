
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { resolveTenantOrganizationId } from "@/lib/tenant"
import type { Prisma, UserRole } from "@prisma/client"

export const dynamic = "force-dynamic"

const USER_ROLES = ["STUDENT", "INSTRUCTOR", "SUPER_ADMIN"] as const

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && (USER_ROLES as readonly string[]).includes(value)

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const body = rawBody as Record<string, unknown>

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    const emailRaw = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const roleRaw = body.role

    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : null
    const address = typeof body.address === "string" ? body.address : null
    const city = typeof body.city === "string" ? body.city : null
    const postalCode = typeof body.postalCode === "string" ? body.postalCode : null
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null

    const selectedCategories = Array.isArray(body.selectedCategories)
      ? body.selectedCategories.filter((x): x is string => typeof x === "string")
      : null

    const transmissionType = typeof body.transmissionType === "string" ? body.transmissionType : null

    const instructorLicenseNumber =
      typeof body.instructorLicenseNumber === "string" ? body.instructorLicenseNumber : null

    const instructorLicenseExpiry = body.instructorLicenseExpiry

    const dateOfBirthDate = parseOptionalDate(body.dateOfBirth)

    if (!isUserRole(roleRaw)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    const role: UserRole = roleRaw
    const email = emailRaw.toLowerCase()

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    const tenant = await resolveTenantOrganizationId(request)

    // Public signup must be scoped by tenant domain (except local dev)
    const host = tenant.host
    const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
    const isLocal = !!host && (LOCAL_HOSTS.has(host) || host.endsWith(".localhost"))

    const effectiveOrganizationId = tenant.organizationId ?? (isLocal ? organizationId : null)

    // If we are on a mapped domain, we don't allow "choose another org"
    if (tenant.organizationId && organizationId && tenant.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Organization does not match this domain" },
        { status: 403 }
      )
    }

    if (!effectiveOrganizationId) {
      return NextResponse.json(
        { error: isLocal ? "Please select an organization" : "No organization found for this domain" },
        { status: 400 }
      )
    }

    // Production-grade: SUPER_ADMIN must not be created through a public endpoint
    if (role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "SUPER_ADMIN cannot be created via public signup" },
        { status: 403 }
      )
    }
    
    const instructorExpiryDate = parseOptionalDate(instructorLicenseExpiry)

    if (role === "INSTRUCTOR") {
      if (!instructorLicenseNumber || !instructorExpiryDate) {
        return NextResponse.json(
          { error: "Missing instructor license fields" },
          { status: 400 }
        )
      }
    }

    const instructorLicenseNumberRequired =
      role === "INSTRUCTOR" ? instructorLicenseNumber : null

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
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          role: role,
          firstName,
          lastName,
          phoneNumber,
          dateOfBirth: dateOfBirthDate,
          address,
          city,
          postalCode,
          isEmailVerified: true, // For demo purposes, skip email verification
          isApproved: role !== "INSTRUCTOR", // Auto-approve all users
          organizationId: effectiveOrganizationId,

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
          organizationId: effectiveOrganizationId,
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
            instructorLicenseNumber: instructorLicenseNumberRequired!,
            instructorLicenseExpiry: instructorExpiryDate!,
            organizationId: effectiveOrganizationId,
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
