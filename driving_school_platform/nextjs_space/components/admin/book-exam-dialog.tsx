

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface BookExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BookExamDialog({ open, onOpenChange, onSuccess }: BookExamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [instructorId, setInstructorId] = useState<string>('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [lessonDate, setLessonDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  const [instructors, setInstructors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchInstructors();
      fetchStudents();
      fetchVehicles();
    }
  }, [open]);

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/admin/users?role=INSTRUCTOR', {
        credentials: 'include',
      });
      const data = await response.json();
      setInstructors(data.users || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    }
  };

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

  const handleAddStudent = (studentId: string) => {
    if (studentIds.length >= 2) {
      toast.error('Maximum 2 students per exam');
      return;
    }
    if (!studentIds.includes(studentId)) {
      setStudentIds([...studentIds, studentId]);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setStudentIds(studentIds.filter(id => id !== studentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!instructorId || studentIds.length === 0 || !lessonDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!vehicleId) {
      toast.error('Please select a vehicle for the exam');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonType: 'EXAM',
          instructorId,
          studentIds,
          vehicleId: parseInt(vehicleId),
          lessonDate,
          startTime,
          endTime,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Exam booked successfully!');
        // Reset form first
        setInstructorId('');
        setStudentIds([]);
        setVehicleId('');
        setLessonDate('');
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

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Exam</DialogTitle>
          <DialogDescription>
            Schedule a new exam (maximum 2 students per exam).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor *</Label>
              <Select value={instructorId || undefined} onValueChange={setInstructorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.length === 0 ? (
                    <SelectItem value="loading-instructors" disabled>
                      Loading instructors...
                    </SelectItem>
                  ) : (
                    instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.firstName} {instructor.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student">Students * (Max 2)</Label>
              <Select 
                value={undefined} 
                onValueChange={handleAddStudent}
                disabled={studentIds.length >= 2}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add student" />
                </SelectTrigger>
                <SelectContent>
                  {students.length === 0 ? (
                    <SelectItem value="loading-students" disabled>
                      Loading students...
                    </SelectItem>
                  ) : (
                    students
                      .filter(s => !studentIds.includes(s.id))
                      .map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              
              {studentIds.length > 0 && (
                <div className="space-y-2 mt-2">
                  {studentIds.map((studentId) => (
                    <div key={studentId} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <span className="text-sm">{getStudentName(studentId)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(studentId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <SelectItem value="loading-vehicles" disabled>
                      Loading vehicles...
                    </SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="lessonDate">Date *</Label>
              <Input
                id="lessonDate"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
