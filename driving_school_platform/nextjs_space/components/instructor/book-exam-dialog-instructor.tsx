
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useLicense } from '@/hooks/use-license';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface BookExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instructorUserId: string;
}

export function BookExamDialog({ open, onOpenChange, onSuccess, instructorUserId }: BookExamDialogProps) {
  const { isFeatureEnabled, isLoading: licenseLoading } = useLicense();
  const isVehicleFeatureEnabled = isFeatureEnabled('VEHICLE_MANAGEMENT');
  
  const [isLoading, setIsLoading] = useState(false);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchStudents();
      // Only fetch vehicles if feature is enabled
      if (isVehicleFeatureEnabled) {
        fetchVehicles();
      }
    }
  }, [open, isVehicleFeatureEnabled]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/admin/users?role=STUDENT', {
        credentials: 'include',
      });
      const data = await response.json();
      setStudents(data.users || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles', {
        credentials: 'include',
      });
      const data = await response.json();
      // Filter for available vehicles only
      const availableVehicles = (data.vehicles || []).filter(
        (v: any) => v.status === 'AVAILABLE' && !v.underMaintenance
      );
      setVehicles(availableVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    // Validate basic required fields
    if (!examDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields (date and time)');
      return;
    }

    // Validate vehicle only if feature is enabled
    if (isVehicleFeatureEnabled && !vehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        lessonType: 'EXAM',
        instructorId: instructorUserId,
        studentIds: selectedStudents,
        lessonDate: examDate,
        startTime,
        endTime,
      };

      // Only include vehicleId if feature is enabled and vehicle is selected
      if (isVehicleFeatureEnabled && vehicleId) {
        payload.vehicleId = parseInt(vehicleId);
      }

      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Exam booked successfully for ${selectedStudents.length} student(s)!`);
        // Reset form first
        setSelectedStudents([]);
        setVehicleId('');
        setExamDate('');
        setStartTime('');
        setEndTime('');
        // Then call success handler which will close dialog and refresh
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to book exam');
      }
    } catch (error) {
      console.error('Error booking exam:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Exam</DialogTitle>
          <DialogDescription>
            Schedule a new exam for students. You can select multiple students.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Students * (Select one or more)</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <div className="text-sm text-gray-500">No students available</div>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`student-${student.id}`} className="text-sm cursor-pointer">
                      {student.firstName} {student.lastName}
                    </label>
                  </div>
                ))
              )}
            </div>
            {selectedStudents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedStudents.length} student(s) selected
              </p>
            )}
          </div>

          {/* Vehicle selection - only show if feature is enabled */}
          {isVehicleFeatureEnabled && (
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No available vehicles</div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vehicle Feature Locked Message */}
          {!isVehicleFeatureEnabled && !licenseLoading && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Premium Feature</AlertTitle>
              <AlertDescription>
                Vehicle management requires an upgrade. Exams will be created without vehicle assignment. Contact your administrator to unlock this feature.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="examDate">Date *</Label>
            <Input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Booking...' : 'Book Exam'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
