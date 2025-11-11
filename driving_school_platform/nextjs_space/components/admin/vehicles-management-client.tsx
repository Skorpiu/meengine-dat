/**
 * Vehicles Management Client Component
 * Manages the driving school fleet with maintenance tracking
 * @module components/admin/vehicles-management-client
 */

'use client';

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Car, Bike, Truck, Bus, Wrench, CheckCircle, Plus, Edit2, Trash2 } from "lucide-react"
import { VehicleDialog } from "./vehicle-dialog"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { ListSkeleton } from "@/components/ui/loading-skeleton"
import { Pagination } from "@/components/ui/pagination"
import { usePagination } from "@/hooks/use-pagination"
import { apiPost, apiDelete, showSuccess, showError } from "@/lib/client-utils"
import { useEffect } from "react"

type FleetType = 'all' | 'motorcycle' | 'car' | 'heavy_goods' | 'heavy_passenger';

const fleetCategories: Record<FleetType, string[]> = {
  all: [],
  motorcycle: ['AM', 'A1', 'A2', 'A'],
  car: ['B', 'B1', 'B+E'],
  heavy_goods: ['C', 'C1', 'C+E', 'C1+E'],
  heavy_passenger: ['D', 'D1', 'D+E', 'D1+E'],
};

const fleetIcons = {
  all: Car,
  motorcycle: Bike,
  car: Car,
  heavy_goods: Truck,
  heavy_passenger: Bus,
};

/**
 * Main component for vehicle management
 */
export function VehiclesManagementClient() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFleet, setSelectedFleet] = useState<FleetType>('all')
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null)

  /**
   * Fetch vehicles
   */
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/vehicles')
      if (!response.ok) throw new Error('Failed to fetch vehicles')
      const data = await response.json()
      setVehicles(data.vehicles || [])
    } catch (error) {
      showError(error instanceof Error ? error : new Error('Failed to fetch vehicles'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  /**
   * Calculate statistics based on vehicle data
   */
  const stats = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return { total: 0, available: 0, inUse: 0, maintenance: 0 }
    }
    
    return {
      total: vehicles.length,
      available: vehicles.filter((v: any) => 
        v.isActive && v.status === 'AVAILABLE' && !v.underMaintenance
      ).length,
      inUse: vehicles.filter((v: any) => v.status === 'IN_USE').length,
      maintenance: vehicles.filter((v: any) => v.underMaintenance).length,
    }
  }, [vehicles])

  /**
   * Handle maintenance toggle
   */
  const handleMaintenanceToggle = useCallback(async (vehicleId: number, currentStatus: boolean) => {
    try {
      await apiPost('/api/vehicles/update-maintenance', {
        vehicleId,
        underMaintenance: !currentStatus
      })
      showSuccess('Maintenance status updated')
      fetchVehicles()
    } catch (error) {
      showError(error instanceof Error ? error : new Error('Failed to update maintenance status'))
    }
  }, [fetchVehicles])

  /**
   * Open dialog to add a new vehicle
   */
  const handleAddVehicle = useCallback(() => {
    setEditingVehicle(null)
    setVehicleDialogOpen(true)
  }, [])

  /**
   * Open dialog to edit an existing vehicle
   */
  const handleEditVehicle = useCallback((vehicle: any) => {
    setEditingVehicle(vehicle)
    setVehicleDialogOpen(true)
  }, [])

  /**
   * Show delete confirmation dialog
   */
  const handleDeleteClick = useCallback((vehicle: any) => {
    setVehicleToDelete(vehicle)
    setDeleteDialogOpen(true)
  }, [])

  /**
   * Delete vehicle after confirmation
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!vehicleToDelete) return

    try {
      await apiDelete(`/api/admin/vehicles?vehicleId=${vehicleToDelete.id}`)
      showSuccess('Vehicle deleted successfully')
      fetchVehicles()
      setDeleteDialogOpen(false)
      setVehicleToDelete(null)
    } catch (error) {
      showError(error instanceof Error ? error : new Error('Failed to delete vehicle'))
    }
  }, [vehicleToDelete, fetchVehicles])

  /**
   * Refresh vehicle list after success
   */
  const handleVehicleSuccess = useCallback(() => {
    fetchVehicles()
  }, [fetchVehicles])

  /**
   * Filter vehicles by selected fleet type
   */
  const filteredVehicles = useMemo(() => {
    if (selectedFleet === 'all') return vehicles
    const categories = fleetCategories[selectedFleet]
    return vehicles.filter((v: any) => v.category && categories.includes(v.category.name))
  }, [vehicles, selectedFleet])

  /**
   * Calculate stats for filtered vehicles
   */
  const filteredStats = useMemo(() => {
    if (selectedFleet === 'all') return stats
    
    return {
      total: filteredVehicles.length,
      available: filteredVehicles.filter((v: any) => 
        v.isActive && v.status === 'AVAILABLE' && !v.underMaintenance
      ).length,
      inUse: filteredVehicles.filter((v: any) => v.status === 'IN_USE').length,
      maintenance: filteredVehicles.filter((v: any) => v.underMaintenance).length,
    }
  }, [selectedFleet, stats, filteredVehicles])

  /**
   * Pagination for filtered vehicles
   */
  const { 
    currentPage, 
    totalPages,
    getPaginatedItems,
    goToPage,
    nextPage,
    prevPage 
  } = usePagination({ totalItems: filteredVehicles.length, pageSize: 10 })
  
  const paginatedVehicles = getPaginatedItems(filteredVehicles)

  const FleetIcon = fleetIcons[selectedFleet]

  const getVehicleIcon = (vehicle: any) => {
    if (!vehicle.category) return Car
    const categoryName = vehicle.category.name
    
    // Motorcycles
    if (['AM', 'A1', 'A2', 'A'].includes(categoryName)) return Bike
    // Heavy Goods
    if (['C', 'C1', 'C+E', 'C1+E'].includes(categoryName)) return Truck
    // Heavy Passenger
    if (['D', 'D1', 'D+E', 'D1+E'].includes(categoryName)) return Bus
    // Cars
    return Car
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
        <p className="text-gray-600 mt-2">
          Manage the driving school fleet and maintenance schedules.
        </p>
      </div>

      {/* Fleet Type Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedFleet === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedFleet('all')}
            className="gap-2"
          >
            <Car className="h-4 w-4" />
            All Vehicles
          </Button>
          <Button
            variant={selectedFleet === 'motorcycle' ? 'default' : 'outline'}
            onClick={() => setSelectedFleet('motorcycle')}
            className="gap-2"
          >
            <Bike className="h-4 w-4" />
            Motorcycles
          </Button>
          <Button
            variant={selectedFleet === 'car' ? 'default' : 'outline'}
            onClick={() => setSelectedFleet('car')}
            className="gap-2"
          >
            <Car className="h-4 w-4" />
            Cars
          </Button>
          <Button
            variant={selectedFleet === 'heavy_goods' ? 'default' : 'outline'}
            onClick={() => setSelectedFleet('heavy_goods')}
            className="gap-2"
          >
            <Truck className="h-4 w-4" />
            Heavy Goods
          </Button>
          <Button
            variant={selectedFleet === 'heavy_passenger' ? 'default' : 'outline'}
            onClick={() => setSelectedFleet('heavy_passenger')}
            className="gap-2"
          >
            <Bus className="h-4 w-4" />
            Heavy Passenger
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <FleetIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredStats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{filteredStats.available}</div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use</CardTitle>
            <Car className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{filteredStats.inUse}</div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{filteredStats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedFleet === 'all' ? 'Fleet Overview' : 
                 selectedFleet === 'motorcycle' ? 'Motorcycles' :
                 selectedFleet === 'car' ? 'Cars' :
                 selectedFleet === 'heavy_goods' ? 'Heavy Goods Vehicles' :
                 'Heavy Passenger Vehicles'}
              </CardTitle>
              <CardDescription>
                {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} in this category
              </CardDescription>
            </div>
            <Button onClick={handleAddVehicle} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton items={3} />
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No vehicles found in this category</div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedVehicles.map((vehicle) => {
                const isInUse = vehicle.status === 'IN_USE'
                const underMaintenance = vehicle.underMaintenance || false
                const isAvailable = vehicle.isActive && vehicle.status === 'AVAILABLE' && !underMaintenance
                const VehicleIcon = getVehicleIcon(vehicle)
                
                return (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                        <VehicleIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </div>
                        <div className="text-sm text-gray-600">
                          {vehicle.registrationNumber} • {vehicle.color} • {vehicle.transmissionType?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Category: {vehicle.category?.name || "General"} • 
                          Mileage: {vehicle.currentMileage?.toLocaleString()} km • 
                          Fuel: {vehicle.fuelType}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Maintenance Checkbox */}
                      <div className="flex items-center space-x-2 px-3 py-2 border rounded-lg bg-gray-50">
                        <Checkbox
                          id={`maintenance-${vehicle.id}`}
                          checked={underMaintenance}
                          onCheckedChange={() => handleMaintenanceToggle(vehicle.id, underMaintenance)}
                        />
                        <label
                          htmlFor={`maintenance-${vehicle.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          Under Maintenance
                        </label>
                      </div>

                      {/* Status Badges */}
                      <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                        {vehicle.isActive ? "Active" : "Inactive"}
                      </Badge>
                      
                      {isInUse && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          In Use
                        </Badge>
                      )}

                      {isAvailable && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      )}

                      {underMaintenance && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          Maintenance
                        </Badge>
                      )}
                      
                      {vehicle.hasDualControls && (
                        <Badge variant="secondary">
                          Dual Controls
                        </Badge>
                      )}
                      
                      {vehicle.hasDashcam && (
                        <Badge variant="secondary">
                          Dashcam
                        </Badge>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVehicle(vehicle)}
                          className="gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(vehicle)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    totalItems={filteredVehicles.length}
                    showInfo
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Dialog */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        onSuccess={handleVehicleSuccess}
        vehicle={editingVehicle}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Vehicle"
        description={`Are you sure you want to delete ${vehicleToDelete?.make} ${vehicleToDelete?.model} (${vehicleToDelete?.registrationNumber})? This action cannot be undone.`}
        confirmText="Delete"
        destructive
      />
    </>
  )
}
