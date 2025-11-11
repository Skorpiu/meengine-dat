'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vehicle?: any;
}

// Vehicle type to category mapping
const vehicleTypeCategories = {
  motorcycle: ['AM', 'A1', 'A2', 'A'],
  car: ['B', 'B1', 'B+E'],
  heavy_goods: ['C', 'C1', 'C+E', 'C1+E'],
  heavy_passenger: ['D', 'D1', 'D+E', 'D1+E'],
};

export function VehicleDialog({ open, onOpenChange, onSuccess, vehicle }: VehicleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [transmissionTypes, setTransmissionTypes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    registrationNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    vin: '',
    vehicleType: '', // Changed from categoryId to vehicleType
    categoryId: '',
    transmissionTypeId: '',
    hasDualControls: true,
    hasDashcam: false,
    fuelType: 'PETROL',
    currentMileage: 0,
    serviceIntervalKm: 10000,
  });

  // Helper to determine vehicle type from category
  const getVehicleTypeFromCategory = (categoryId: number | null | undefined, categoryList: any[]) => {
    if (!categoryId) return '';
    
    const category = categoryList.find(cat => cat.id === categoryId);
    if (!category) return '';
    
    const categoryName = category.name;
    
    if (vehicleTypeCategories.motorcycle.includes(categoryName)) return 'motorcycle';
    if (vehicleTypeCategories.car.includes(categoryName)) return 'car';
    if (vehicleTypeCategories.heavy_goods.includes(categoryName)) return 'heavy_goods';
    if (vehicleTypeCategories.heavy_passenger.includes(categoryName)) return 'heavy_passenger';
    
    return '';
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchTransmissionTypes();
    }
  }, [open]);

  // Update form data when vehicle or categories change
  useEffect(() => {
    if (open && categories.length > 0) {
      if (vehicle) {
        const vehicleType = getVehicleTypeFromCategory(vehicle.categoryId, categories);
        setFormData({
          registrationNumber: vehicle.registrationNumber || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || new Date().getFullYear(),
          color: vehicle.color || '',
          vin: vehicle.vin || '',
          vehicleType: vehicleType,
          categoryId: vehicle.categoryId?.toString() || '',
          transmissionTypeId: vehicle.transmissionTypeId?.toString() || '',
          hasDualControls: vehicle.hasDualControls ?? true,
          hasDashcam: vehicle.hasDashcam ?? false,
          fuelType: vehicle.fuelType || 'PETROL',
          currentMileage: vehicle.currentMileage || 0,
          serviceIntervalKm: vehicle.serviceIntervalKm || 10000,
        });
      } else {
        // Reset form for new vehicle
        setFormData({
          registrationNumber: '',
          make: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          vin: '',
          vehicleType: '',
          categoryId: '',
          transmissionTypeId: '',
          hasDualControls: true,
          hasDashcam: false,
          fuelType: 'PETROL',
          currentMileage: 0,
          serviceIntervalKm: 10000,
        });
      }
    }
  }, [open, vehicle, categories]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTransmissionTypes = async () => {
    try {
      const response = await fetch('/api/transmission-types');
      const data = await response.json();
      setTransmissionTypes(data.transmissionTypes || []);
    } catch (error) {
      console.error('Error fetching transmission types:', error);
    }
  };

  // When vehicle type changes, select an appropriate category
  const handleVehicleTypeChange = (vehicleType: string) => {
    setFormData(prev => ({ ...prev, vehicleType }));
    
    if (vehicleType && vehicleType !== 'none') {
      // Find the first category that matches this vehicle type
      const categoryNames = vehicleTypeCategories[vehicleType as keyof typeof vehicleTypeCategories];
      if (categoryNames && categoryNames.length > 0) {
        const matchingCategory = categories.find(cat => categoryNames.includes(cat.name));
        if (matchingCategory) {
          setFormData(prev => ({ ...prev, categoryId: matchingCategory.id.toString() }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, categoryId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Detailed validation with specific error messages
    if (!formData.registrationNumber) {
      toast.error('Registration number is required');
      return;
    }
    
    if (!formData.make) {
      toast.error('Make is required');
      return;
    }
    
    if (!formData.model) {
      toast.error('Model is required');
      return;
    }
    
    if (!formData.transmissionTypeId) {
      toast.error('Transmission type is required');
      return;
    }

    setIsLoading(true);

    try {
      const url = '/api/admin/vehicles';
      const method = vehicle ? 'PUT' : 'POST';
      
      const payload = {
        registrationNumber: formData.registrationNumber.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: parseInt(formData.year.toString()),
        color: formData.color.trim(),
        vin: formData.vin.trim(),
        vehicleId: vehicle?.id,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        transmissionTypeId: parseInt(formData.transmissionTypeId),
        hasDualControls: formData.hasDualControls,
        hasDashcam: formData.hasDashcam,
        fuelType: formData.fuelType,
        currentMileage: parseInt(formData.currentMileage.toString()) || 0,
        serviceIntervalKm: parseInt(formData.serviceIntervalKm.toString()) || 10000,
      };

      console.log('Submitting vehicle data:', payload);

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(vehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
        // Close dialog first
        onOpenChange(false);
        // Then refresh the vehicle list
        setTimeout(() => {
          onSuccess();
        }, 100);
      } else {
        console.error('Server error:', data);
        toast.error(data.error || 'Failed to save vehicle');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('An error occurred while saving the vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          <DialogDescription>
            {vehicle ? 'Update vehicle information' : 'Add a new vehicle to the fleet'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  placeholder="XX-00-XX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  placeholder="Vehicle VIN"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="Toyota"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Corolla"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="White"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PETROL">Petrol</SelectItem>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="ELECTRIC">Electric</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select value={formData.vehicleType || "none"} onValueChange={handleVehicleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="motorcycle">Motorcycles</SelectItem>
                    <SelectItem value="car">Cars</SelectItem>
                    <SelectItem value="heavy_goods">Heavy Goods</SelectItem>
                    <SelectItem value="heavy_passenger">Heavy Passenger</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transmissionType">Transmission *</Label>
                <Select value={formData.transmissionTypeId} onValueChange={(value) => setFormData({ ...formData, transmissionTypeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {transmissionTypes.map((trans) => (
                      <SelectItem key={trans.id} value={trans.id.toString()}>
                        {trans.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentMileage">Current Mileage (km)</Label>
                <Input
                  id="currentMileage"
                  type="number"
                  value={formData.currentMileage}
                  onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceIntervalKm">Service Interval (km)</Label>
                <Input
                  id="serviceIntervalKm"
                  type="number"
                  value={formData.serviceIntervalKm}
                  onChange={(e) => setFormData({ ...formData, serviceIntervalKm: parseInt(e.target.value) || 10000 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDualControls"
                  checked={formData.hasDualControls}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasDualControls: !!checked })}
                />
                <Label htmlFor="hasDualControls" className="cursor-pointer">
                  Dual Controls
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDashcam"
                  checked={formData.hasDashcam}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasDashcam: !!checked })}
                />
                <Label htmlFor="hasDashcam" className="cursor-pointer">
                  Dashcam
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
