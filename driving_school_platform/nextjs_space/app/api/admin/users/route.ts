import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma, UserRole } from "@prisma/client";
import {
  assertUserTenantHost,
  isTenantAssignableUserRole,
  USER_LIST_SELECT,
} from "@/lib/users/user-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Allow both SUPER_ADMIN and INSTRUCTOR to access
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "INSTRUCTOR")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    const orgId = currentUser?.organizationId ?? null;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const tenantDenied = await assertUserTenantHost(request, orgId);
    if (tenantDenied) {
      return tenantDenied;
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    if (roleParam && !isTenantAssignableUserRole(roleParam)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const role: UserRole | null =
      roleParam && isTenantAssignableUserRole(roleParam) ? roleParam : null;

    const where: Prisma.UserWhereInput = {
      organizationId: orgId,
    };

    if (role) {
      where.role = role;
    }

    // Instructors can only see students, not other users
    if (session.user.role === "INSTRUCTOR" && role !== "STUDENT") {
      where.role = "STUDENT";
    }

    const users = await prisma.user.findMany({
      where,
      select: USER_LIST_SELECT,
      orderBy: { createdAt: "desc" },
    });

    // Format the response to include studentNumber at the top level for students
    const formattedUsers = users.map((user) => ({
      ...user,
      studentNumber: user.student?.studentNumber || null,
      student: undefined, // Remove the nested student object
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
