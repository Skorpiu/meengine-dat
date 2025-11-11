
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navigation/navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Flag, History } from "lucide-react"
import { SettingsManagementClient } from "@/components/admin/settings-management-client"
import { FeatureFlagsClient } from "@/components/admin/feature-flags-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="settings" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuration Management</h1>
          <p className="text-gray-600 mt-2">
            Manage system settings, feature flags, and platform configuration.
          </p>
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
  )
}
