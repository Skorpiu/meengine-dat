import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Flag, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SettingsManagementClient } from "@/components/admin/settings-management-client";
import { FeatureFlagsClient } from "@/components/admin/feature-flags-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="settings" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Operator configuration
            </h1>
            <p className="text-gray-600 mt-2">
              Internal tooling for system settings and feature flags. School
              module access is managed under License, not here.
            </p>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Internal / operator area</AlertTitle>
            <AlertDescription>
              This area is internal/operator tooling and is not part of
              school-facing administration. It is not linked from the school
              admin navigation. Licensed modules (Vehicles, Lessons, and related
              surfaces) are controlled via{" "}
              <a href="/admin/license" className="underline font-medium">
                License
              </a>
              .
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Settings
            </TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Feature Flags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <SettingsManagementClient />
          </TabsContent>

          <TabsContent value="flags">
            <FeatureFlagsClient />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
