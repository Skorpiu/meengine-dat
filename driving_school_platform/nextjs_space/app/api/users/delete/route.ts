import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.organizationId;
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

    const demoDenied = await rejectDemoUserManagementMutation(orgId);
    if (demoDenied) {
      return demoDenied;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    if (targetUser.role === "INSTRUCTOR") {
      return NextResponse.json(
        {
          error: "use_instructor_delete_policy",
          code: "use_instructor_delete_policy",
          message:
            "Instructor accounts cannot be deleted from App Accounts. Use People → Instructors → Profiles to delete zero-dependency instructor records, or Deactivate when the instructor has operational history.",
        },
        { status: 409 },
      );
    }

    if (targetUser.role === "STUDENT") {
      return NextResponse.json(
        {
          error: "use_student_delete_policy",
          code: "use_student_delete_policy",
          message:
            "Student accounts cannot be deleted via legacy user delete. Use People → Students → Profiles for student record delete policy, or Remove/Reactivate app access for login lifecycle changes.",
        },
        { status: 409 },
      );
    }

    const deleted = await prisma.user.deleteMany({
      where: { id: userId, organizationId: orgId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
