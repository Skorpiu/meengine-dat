import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navigation/navbar"
import { UserPreferencesClient } from "@/components/user/user-preferences-client"

export const dynamic = "force-dynamic"

export default async function UserPreferencesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="profile" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Preferences</h1>
          <p className="text-gray-600 mt-2">
            Customize your experience and notification settings.
          </p>
        </div>

        <UserPreferencesClient />
      </div>
    </div>
  )
}
