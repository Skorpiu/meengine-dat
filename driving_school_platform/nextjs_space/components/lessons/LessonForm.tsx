'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Lesson } from '@/lib/types';

/**
 * User role types for permission-based rendering
 */
type UserRole = 'admin' | 'instructor' | 'student';

/**
 * Lesson form mode
 */
type FormMode = 'create' | 'edit';

/**
 * Lesson form payload structure
 */
interface LessonFormPayload {
  lessonType: string;
  instructorId?: string;
  studentId?: string;
  vehicleId?: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status?: string;
}

/**
 * LessonForm component props
 */
interface LessonFormProps {
  mode: FormMode;
  initialLesson?: Lesson;
  userRole: UserRole;
  instructorUserId?: string; // For instructor role, pre-set instructor
  onSubmit: (payload: LessonFormPayload) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
}

/**
 * Reusable LessonForm component
 * Handles both create and edit modes for lessons
 */
export function LessonForm({
  mode,
  initialLesson,
  userRole,
  instructorUserId,
  onSubmit,
  onCancel,
  submitButtonText,
}: LessonFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lessonType, setLessonType] = useState<string>(
    initialLesson?.lessonType || 'DRIVING'
  );
  const [instructorId, setInstructorId] = useState<string>(
    instructorUserId || (initialLesson?.instructor?.user?.id) || ''
  );
  const [studentId, setStudentId] = useState<string>(
    initialLesson?.student?.user?.id ? String(initialLesson.student.user.id) : ''
  );
  const [vehicleId, setVehicleId] = useState<string>(
    initialLesson?.vehicleId?.toString() || ''
  );
  const [lessonDate, setLessonDate] = useState<string>(
    initialLesson?.lessonDate
      ? new Date(initialLesson.lessonDate).toISOString().split('T')[0]
      : ''
  );
  const [startTime, setStartTime] = useState<string>(
    initialLesson?.startTime || ''
  );
  const [endTime, setEndTime] = useState<string>(initialLesson?.endTime || '');
  const [status, setStatus] = useState<string>(
    initialLesson?.status || 'SCHEDULED'
  );

  const [instructors, setInstructors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Fetch data when component mounts or when needed
  useEffect(() => {
    if (userRole === 'admin') {
      fetchInstructors();
    }
    fetchStudents();
    fetchVehicles();
  }, [userRole]);

  // Update form when initialLesson changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialLesson) {
      setLessonType(initialLesson.lessonType || 'DRIVING');
      setInstructorId(initialLesson.instructor?.user?.id || '');
      setStudentId(initialLesson.student?.user?.id ? String(initialLesson.student.user.id) : '');
      setVehicleId(initialLesson.vehicleId?.toString() || '');
      setLessonDate(
        initialLesson.lessonDate
          ? new Date(initialLesson.lessonDate).toISOString().split('T')[0]
          : ''
      );
      setStartTime(initialLesson.startTime || '');
      setEndTime(initialLesson.endTime || '');
      setStatus(initialLesson.status || 'SCHEDULED');
    }
  }, [mode, initialLesson]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredInstructor = userRole === 'admin';
    if (requiredInstructor && !instructorId) {
      toast.error('Please select an instructor');
      return;
    }

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
      const payload: LessonFormPayload = {
        lessonType,
        instructorId: instructorUserId || instructorId,
        studentId: lessonType === 'THEORY' ? undefined : studentId,
        vehicleId: vehicleId ? vehicleId : undefined,
        lessonDate,
        startTime,
        endTime,
      };

      // Include status only in edit mode
      if (mode === 'edit') {
        payload.status = status;
      }

      await onSubmit(payload);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lesson Type */}
      <div className="space-y-2">
        <Label htmlFor="lessonType">Lesson Type *</Label>
        <Select 
          value={lessonType} 
          onValueChange={setLessonType}
          disabled={mode === 'edit'} // Don't allow changing lesson type in edit mode
        >
          <SelectTrigger>
            <SelectValue placeholder="Select lesson type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="THEORY">Code Class (Theory)</SelectItem>
            <SelectItem value="DRIVING">Driving Class</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Instructor Selection (Admin only) */}
      {userRole === 'admin' && (
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
      )}

      {/* Student Selection */}
      {lessonType && (
        <div className="space-y-2">
          <Label htmlFor="student">
            Student{' '}
            {lessonType === 'THEORY'
              ? '(Optional for group classes)'
              : '*'}
          </Label>
          <Select value={studentId || undefined} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  lessonType === 'THEORY'
                    ? 'Select student (optional)'
                    : 'Select student'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {students.length === 0 ? (
                <SelectItem value="loading-students" disabled>
                  Loading students...
                </SelectItem>
              ) : (
                students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {lessonType === 'THEORY' && (
            <p className="text-xs text-muted-foreground">
              For individual theory lessons, select a student. For group
              classes, leave empty.
            </p>
          )}
        </div>
      )}

      {/* Vehicle Selection (for Driving lessons) */}
      {lessonType === 'DRIVING' && (
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle *</Label>
          <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.length === 0 ? (
                <SelectItem value="loading-vehicles" disabled>
                  {mode === 'edit' ? 'No available vehicles' : 'Loading vehicles...'}
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
      )}

      {/* Lesson Date */}
      <div className="space-y-2">
        <Label htmlFor="lessonDate">Date *</Label>
        <Input
          id="lessonDate"
          type="date"
          value={lessonDate}
          onChange={(e) => setLessonDate(e.target.value)}
          min={mode === 'create' ? new Date().toISOString().split('T')[0] : undefined}
          required
        />
      </div>

      {/* Start and End Time */}
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

      {/* Status (Edit mode only) */}
      {mode === 'edit' && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? mode === 'edit'
              ? 'Updating...'
              : 'Booking...'
            : submitButtonText ||
              (mode === 'edit' ? 'Update Lesson' : 'Book Lesson')}
        </Button>
      </div>
    </form>
  );
}
