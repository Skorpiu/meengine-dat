/**
 * API endpoint to fetch all instructors for filtering purposes
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { mapInstructorUsersToBookingList } from "@/lib/instructors/instructor-booking-list";

function parseForBookingParam(value: string | null): boolean {
  if (value === null || value === "") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

/**
 * GET handler - Fetch all instructors
 * Accessible by SUPER_ADMIN roles only
 *
 * Query: `forBooking=true` returns only instructors with isAvailableForBooking=true
 * and exposes booking-readiness metadata (`qualifiedCategoryNames`, `instructorLicenseExpiry`).
 * Default (forBooking=false) returns all tenant instructors for historical filters.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized - SUPER_ADMIN access required" },
      { status: 401 },
    );
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 400 },
    );
  }

  const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
  if (!tenantGuard.allowed) {
    return NextResponse.json(
      { error: tenantGuard.error },
      { status: tenantGuard.status },
    );
  }

  const forBooking = parseForBookingParam(
    request.nextUrl.searchParams.get("forBooking"),
  );

  try {
    const instructorUsers = await prisma.user.findMany({
      where: {
        role: "INSTRUCTOR",
        organizationId: orgId,
        ...(forBooking
          ? {
              instructor: {
                isAvailableForBooking: true,
              },
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        instructor: {
          select: forBooking
            ? {
                isAvailableForBooking: true,
                instructorLicenseExpiry: true,
                qualifiedCategories: {
                  where: { isActive: true },
                  select: { name: true },
                  orderBy: { name: "asc" },
                },
              }
            : {
                isAvailableForBooking: true,
              },
        },
      },
      orderBy: {
        firstName: "asc",
      },
    });

    const instructors = mapInstructorUsersToBookingList(instructorUsers, {
      includeBookingMetadata: forBooking,
    });

    return NextResponse.json(
      { instructors },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching instructors:", error);
    return NextResponse.json(
      { error: "Failed to fetch instructors" },
      { status: 500 },
    );
  }
}
