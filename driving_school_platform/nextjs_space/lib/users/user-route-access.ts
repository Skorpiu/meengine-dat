import { NextRequest, NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";
import { decideDemoRouteMutation } from "@/lib/demo/demo-route-guard";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

/** Roles tenant user-management APIs may assign (never PLATFORM_ADMIN). */
export const TENANT_ASSIGNABLE_USER_ROLES = [
  "STUDENT",
  "INSTRUCTOR",
  "SUPER_ADMIN",
] as const satisfies readonly UserRole[];

export type TenantAssignableUserRole =
  (typeof TENANT_ASSIGNABLE_USER_ROLES)[number];

export const isTenantAssignableUserRole = (
  value: string,
): value is TenantAssignableUserRole =>
  (TENANT_ASSIGNABLE_USER_ROLES as readonly string[]).includes(value);

/** Prisma select for list endpoints — excludes secrets and internal fields. */
export const USER_LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isApproved: true,
  student: {
    select: {
      studentNumber: true,
    },
  },
} satisfies Prisma.UserSelect;

export async function assertUserTenantHost(
  request: NextRequest,
  organizationId: string,
): Promise<NextResponse | null> {
  const tenantGuard = await guardTenantAuthenticatedRoute(
    request,
    organizationId,
  );
  if (!tenantGuard.allowed) {
    return NextResponse.json(
      { error: tenantGuard.error },
      { status: tenantGuard.status },
    );
  }
  return null;
}

export async function rejectDemoUserManagementMutation(
  organizationId: string,
): Promise<NextResponse | null> {
  const demoDecision = await decideDemoRouteMutation({
    organizationId,
    category: "user_management",
  });
  if (!demoDecision.allowed) {
    return NextResponse.json(
      { error: demoDecision.message, code: demoDecision.reason },
      { status: demoDecision.status },
    );
  }
  return null;
}

/**
 * Blocks PLATFORM_ADMIN and other non-tenant roles on user-management mutations.
 * Preserves existing "Invalid role" wording for bad role strings.
 */
export function rejectForbiddenTenantUserRole(
  role: string | undefined,
): NextResponse | null {
  if (role === undefined) {
    return null;
  }
  if (!isTenantAssignableUserRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  return null;
}
