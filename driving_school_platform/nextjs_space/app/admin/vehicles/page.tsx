'use client';

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navigation/navbar"
import { VehiclesManagementClient } from "@/components/admin/vehicles-management-client"
import { FeatureGate } from "@/components/license/feature-gate"

export default function AdminVehiclesPage() {
  const { data: session, status } = useSession() || {};

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="vehicles" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FeatureGate featureKey="VEHICLE_MANAGEMENT">
          <VehiclesManagementClient />
        </FeatureGate>
      </div>
    </div>
  )
}
