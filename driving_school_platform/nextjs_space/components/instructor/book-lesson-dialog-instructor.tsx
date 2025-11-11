
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface BookLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instructorUserId: string;
}

export function BookLessonDialog({ open, onOpenChange, onSuccess, instructorUserId }: BookLessonDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lessonType, setLessonType] = useState<string>('DRIVING');
  const [studentId, setStudentId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [lessonDate, setLessonDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchStudents();
      fetchVehicles();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (Student is optional for THEORY lessons)
    if (!lessonType || !lessonDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate student field for non-THEORY lessons
    if (lessonType !== 'THEORY' && !studentId) {
      toast.error('Please select a student');
      return;
    }

    // Validate vehicle for driving lessons
    if (lessonType === 'DRIVING' && !vehicleId) {
      toast.error('Please select a vehicle for driving lessons');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonType,
          instructorId: instructorUserId,
          studentId: lessonType === 'THEORY' ? null : studentId,
          vehicleId: vehicleId ? parseInt(vehicleId) : null,
          lessonDate,
          startTime,
          endTime,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Lesson booked successfully!');
        // Reset form first
        setLessonType('DRIVING');
        setStudentId('');
        setVehicleId('');
        setLessonDate('');
        setStartTime('');
        setEndTime('');
        // Then call success handler which will close dialog and refresh
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to book lesson');
      }
    } catch (error) {
      console.error('Error booking lesson:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
          <DialogDescription>
            Schedule a new lesson for your students.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lessonType">Lesson Type *</Label>
            <Select value={lessonType} onValueChange={setLessonType}>
              <SelectTrigger>
                <SelectValue placeholder="Select lesson type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="THEORY">Theory / Code Class</SelectItem>
                <SelectItem value="DRIVING">Driving Lesson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {lessonType !== 'THEORY' && (
            <div className="space-y-2">
              <Label htmlFor="student">Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lessonType === 'DRIVING' && (
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

          <div className="space-y-2">
            <Label htmlFor="lessonDate">Date *</Label>
            <Input
              id="lessonDate"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
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
              {isLoading ? 'Booking...' : 'Book Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
