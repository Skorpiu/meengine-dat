'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { Lesson } from '@/lib/types';
import { useLicense } from '@/hooks/use-license';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Search, X } from 'lucide-react';

/**
 * User role types for permission-based rendering
 */
type UserRole = 'SUPER_ADMIN' | 'INSTRUCTOR' | 'STUDENT';

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
  studentIds?: string[];
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
  allowedLessonTypes?: Array<'THEORY'|'DRIVING'|'EXAM'|'THEORY_EXAM'>;
  onSubmit: (payload: LessonFormPayload) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
}

/**
 * Student interface with studentNumber
 */
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: number | null;
}

/**
 * Reusable LessonForm component
 * Handles both create and edit modes for lessons with multi-student support
 */
export function LessonForm({
  mode,
  initialLesson,
  userRole,
  instructorUserId,
  allowedLessonTypes,
  onSubmit,
  onCancel,
  submitButtonText,
}: LessonFormProps) {
  const { isFeatureEnabled, isLoading: licenseLoading } = useLicense();
  const isVehicleFeatureEnabled = isFeatureEnabled('VEHICLE_MANAGEMENT');
  
  const [isLoading, setIsLoading] = useState(false);
  const [lessonType, setLessonType] = useState<string>(
    initialLesson?.lessonType || 'DRIVING'
  );
  const [instructorId, setInstructorId] = useState<string>(
    instructorUserId || (initialLesson?.instructor?.user?.id) || ''
  );
  
  // For single student selection (DRIVING, THEORY)
  const [studentId, setStudentId] = useState<string>(
    initialLesson?.student?.user?.id ? String(initialLesson.student.user.id) : ''
  );
  
  // For multiple student selection (EXAM, THEORY_EXAM)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
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
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  // Search state for students
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Fetch data when component mounts or when needed
  useEffect(() => {
    if (userRole === 'SUPER_ADMIN') {
      fetchInstructors();
    }
    fetchStudents();
    // Only fetch vehicles if feature is enabled
    if (isVehicleFeatureEnabled) {
      fetchVehicles();
    }
  }, [userRole, isVehicleFeatureEnabled]);

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

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) {
      return students;
    }
    
    const searchLower = studentSearchTerm.toLowerCase();
    return students.filter(student => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const studentNumberStr = student.studentNumber?.toString() || '';
      return fullName.includes(searchLower) || studentNumberStr.includes(searchLower);
    });
  }, [students, studentSearchTerm]);

  // Check if lesson type requires multiple students
  const isMultiStudentType = lessonType === 'EXAM' || lessonType === 'THEORY_EXAM';

  // Get student selection limit based on lesson type
  const getStudentLimit = () => {
    if (lessonType === 'EXAM') return 2; // Max 2 for practical exams
    if (lessonType === 'THEORY_EXAM') return undefined; // No limit for theory exams
    return 1; // Single student for DRIVING and THEORY
  };

  // Lesson type options
  const lessonTypeOptions = [
    { value: 'THEORY', label: 'Code Class (Theory)' },
    { value: 'DRIVING', label: 'Driving Class' },
    { value: 'EXAM', label: 'Practical Exam' },
    { value: 'THEORY_EXAM', label: 'Theoretical Exam' },
  ];

  // Filter lesson types based on allowedLessonTypes prop
  const filteredLessonTypeOptions = mode === 'edit' 
    ? lessonTypeOptions 
    : allowedLessonTypes 
      ? lessonTypeOptions.filter(option => allowedLessonTypes.includes(option.value as any))
      : lessonTypeOptions;

  const studentLimit = getStudentLimit();

  // Handle student checkbox toggle
  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => {
      const isSelected = prev.includes(studentId);
      
      if (isSelected) {
        return prev.filter(id => id !== studentId);
      } else {
        // Check limit
        if (studentLimit && prev.length >= studentLimit) {
          toast.error(`Maximum ${studentLimit} student(s) allowed for ${lessonType}`);
          return prev;
        }
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredInstructor = userRole === 'SUPER_ADMIN';
    if (requiredInstructor && !instructorId) {
      toast.error('Please select an instructor');
      return;
    }

    if (!lessonType || !lessonDate || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate student selection based on lesson type
    if (isMultiStudentType) {
      if (selectedStudents.length === 0) {
        toast.error('Please select at least one student');
        return;
      }
    } else {
      // For non-exam types (DRIVING requires student, THEORY is optional)
      if (lessonType !== 'THEORY' && !studentId) {
        toast.error('Please select a student');
        return;
      }
    }

    // Validate vehicle for driving lessons (only if vehicles feature is enabled)
    if (lessonType === 'DRIVING' && !vehicleId && isVehicleFeatureEnabled) {
      toast.error('Please select a vehicle for driving lessons');
      return;
    }

    setIsLoading(true);

    try {
      const payload: LessonFormPayload = {
        lessonType,
        instructorId: instructorUserId || instructorId,
        lessonDate,
        startTime,
        endTime,
      };

      // Add student data based on lesson type
      if (isMultiStudentType) {
        payload.studentIds = selectedStudents;
      } else {
        payload.studentId = lessonType === 'THEORY' ? undefined : studentId;
      }

      // Add vehicle if selected
      if (vehicleId) {
        payload.vehicleId = vehicleId;
      }

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

  // Get student display name with number
  const getStudentDisplayName = (student: Student) => {
    const fullName = `${student.firstName} ${student.lastName}`;
    if (student.studentNumber) {
      return `#${student.studentNumber} - ${fullName}`;
    }
    return fullName;
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
            {filteredLessonTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Instructor Selection (Admin only) */}
      {userRole === 'SUPER_ADMIN' && (
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

      {/* Student Selection - Multi-select for EXAM and THEORY_EXAM */}
      {lessonType && isMultiStudentType && (
        <div className="space-y-2">
          <Label>
            Students *{' '}
            {lessonType === 'EXAM' && '(Max 2)'}
            {lessonType === 'THEORY_EXAM' && '(Unlimited)'}
          </Label>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or student number..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="pl-10 pr-8"
            />
            {studentSearchTerm && (
              <button
                type="button"
                onClick={() => setStudentSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Student List with Checkboxes */}
          <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="text-sm text-gray-500">
                {students.length === 0 ? 'No students available' : 'No students match your search'}
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`student-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => handleStudentToggle(student.id)}
                  />
                  <label 
                    htmlFor={`student-${student.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {getStudentDisplayName(student)}
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
      )}

      {/* Student Selection - Single select for DRIVING and THEORY */}
      {lessonType && !isMultiStudentType && lessonType !== 'THEORY' && (
        <div className="space-y-2">
          <Label htmlFor="student">
            Student{' '}
            {lessonType === 'THEORY'
              ? '(Optional for group classes)'
              : '*'}
          </Label>
          
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or student number..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="pl-10 pr-8"
            />
            {studentSearchTerm && (
              <button
                type="button"
                onClick={() => setStudentSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

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
              {filteredStudents.length === 0 ? (
                <SelectItem value="loading-students" disabled>
                  {students.length === 0 ? 'Loading students...' : 'No students match your search'}
                </SelectItem>
              ) : (
                filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {getStudentDisplayName(student)}
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

      {/* Vehicle Selection (for Driving lessons and Exams) */}
      {(lessonType === 'DRIVING' || lessonType === 'EXAM') && isVehicleFeatureEnabled && (
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle {lessonType === 'DRIVING' ? '*' : '(Optional)'}</Label>
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
      
      {/* Vehicle Feature Locked Message (when feature is disabled) */}
      {(lessonType === 'DRIVING' || lessonType === 'EXAM') && !isVehicleFeatureEnabled && !licenseLoading && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Premium Feature</AlertTitle>
          <AlertDescription>
            Vehicle management requires an upgrade. Lessons will be created without vehicle assignment. Contact your administrator to unlock this feature.
          </AlertDescription>
        </Alert>
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
