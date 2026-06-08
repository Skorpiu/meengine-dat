import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { UsersManagementClient } from "@/components/admin/users-management-client";
import { loadAdminUsersPageData } from "@/lib/people/admin-users-page-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    redirect("/auth/login");
  }

  const { users, categories, transmissionTypes } =
    await loadAdminUsersPageData(orgId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="users" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UsersManagementClient
          users={users}
          categories={categories}
          transmissionTypes={transmissionTypes}
        />
      </div>
    </div>
  );
}
