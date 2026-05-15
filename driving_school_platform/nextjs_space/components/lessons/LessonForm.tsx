"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { Lesson } from "@/lib/types";
import { useLicense } from "@/hooks/use-license";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Search, X } from "lucide-react";
import type { LessonType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  lessonFormActionsClass,
  lessonFormFieldClass,
  lessonFormFieldGroupClass,
  lessonFormLabelClass,
  lessonFormRootClass,
  lessonFormSearchInputClass,
  lessonFormSelectContentClass,
  lessonFormSelectTriggerClass,
  lessonFormStudentLabelClass,
  lessonFormStudentPanelClass,
  lessonFormStudentRowClass,
  lessonFormTimeGridClass,
} from "@/components/lessons/lesson-form-styles";

/**
 * User role types for permission-based rendering
 */
type UserRole = "SUPER_ADMIN" | "INSTRUCTOR" | "STUDENT";

/**
 * Lesson form mode
 */
type FormMode = "create" | "edit";

/**
 * Lesson form payload structure
 */
export interface LessonFormPayload {
  lessonType: LessonType;
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
  allowedLessonTypes?: LessonType[];
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

interface InstructorOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface VehicleOption {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
  underMaintenance: boolean;
}

const ALL_LESSON_TYPES = ["DRIVING", "THEORY", "EXAM", "THEORY_EXAM"] as const;

const isLessonType = (value: unknown): value is LessonType =>
  typeof value === "string" &&
  (ALL_LESSON_TYPES as readonly unknown[]).includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getArrayProp = <T,>(value: unknown, key: string): T[] => {
  if (!isRecord(value)) return [];
  const prop = value[key];
  return Array.isArray(prop) ? (prop as T[]) : [];
};

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
  const isVehicleFeatureEnabled = isFeatureEnabled("VEHICLE_MANAGEMENT");

  const [isLoading, setIsLoading] = useState(false);
  const getDefaultLessonType = (): LessonType => {
    // 1) In edit mode, respect what comes from the registry
    const existingType = initialLesson?.lessonType;
    if (isLessonType(existingType)) return existingType;

    // 2) In the create section, choose the default from the allowed list
    //    (THEORY_EXAM by default, when applicable)
    const allowed = allowedLessonTypes?.length
      ? allowedLessonTypes
      : (ALL_LESSON_TYPES as unknown as LessonType[]);

    if (allowed.includes("THEORY_EXAM")) return "THEORY_EXAM";
    if (allowed.includes("EXAM")) return "EXAM";
    if (allowed.includes("DRIVING")) return "DRIVING";
    if (allowed.includes("THEORY")) return "THEORY";

    return "DRIVING";
  };

  const [lessonType, setLessonType] =
    useState<LessonType>(getDefaultLessonType);

  const [instructorId, setInstructorId] = useState<string>(
    instructorUserId || initialLesson?.instructor?.user?.id || "",
  );

  // For single student selection (DRIVING)
  const [studentId, setStudentId] = useState<string>(
    initialLesson?.student?.user?.id
      ? String(initialLesson.student.user.id)
      : "",
  );

  // For multiple student selection (EXAM, THEORY_EXAM)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [vehicleId, setVehicleId] = useState<string>(
    initialLesson?.vehicleId?.toString() || "",
  );
  const [lessonDate, setLessonDate] = useState<string>(
    initialLesson?.lessonDate
      ? new Date(initialLesson.lessonDate).toISOString().split("T")[0]
      : "",
  );
  const [startTime, setStartTime] = useState<string>(
    initialLesson?.startTime || "",
  );
  const [endTime, setEndTime] = useState<string>(initialLesson?.endTime || "");
  const [status, setStatus] = useState<string>(
    initialLesson?.status || "SCHEDULED",
  );

  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  // Search state for students
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");

  const fetchInstructors = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/admin/users?role=INSTRUCTOR", {
          credentials: "include",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch instructors (${response.status})`);
        }

        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        setInstructors(getArrayProp<InstructorOption>(data, "users"));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error("Error fetching instructors:", error);
        setInstructors([]);
      }
    },
    [setInstructors],
  );

  const fetchStudents = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/admin/users?role=STUDENT", {
          credentials: "include",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch students (${response.status})`);
        }

        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        setStudents(getArrayProp<Student>(data, "users"));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error("Error fetching students:", error);
        setStudents([]);
      }
    },
    [setStudents],
  );

  const fetchVehicles = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/admin/vehicles", {
          credentials: "include",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch vehicles (${response.status})`);
        }

        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        const vehiclesRaw = getArrayProp<VehicleOption>(data, "vehicles");
        const availableVehicles = vehiclesRaw.filter(
          (v) => v.status === "AVAILABLE" && !v.underMaintenance,
        );
        setVehicles(availableVehicles);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error("Error fetching vehicles:", error);
        setVehicles([]);
      }
    },
    [setVehicles],
  );

  // Fetch data when component mounts or when needed
  useEffect(() => {
    const controller = new AbortController();

    if (userRole === "SUPER_ADMIN") {
      void fetchInstructors(controller.signal);
    }
    void fetchStudents(controller.signal);
    // Only fetch vehicles if feature is enabled
    if (isVehicleFeatureEnabled) {
      void fetchVehicles(controller.signal);
    }
    return () => controller.abort();
  }, [
    userRole,
    isVehicleFeatureEnabled,
    fetchInstructors,
    fetchStudents,
    fetchVehicles,
  ]);

  // Update form when initialLesson changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && initialLesson) {
      setLessonType(
        isLessonType(initialLesson.lessonType)
          ? initialLesson.lessonType
          : "DRIVING",
      );
      setInstructorId(initialLesson.instructor?.user?.id || "");
      setStudentId(
        initialLesson.student?.user?.id
          ? String(initialLesson.student.user.id)
          : "",
      );
      setVehicleId(initialLesson.vehicleId?.toString() || "");
      setLessonDate(
        initialLesson.lessonDate
          ? new Date(initialLesson.lessonDate).toISOString().split("T")[0]
          : "",
      );
      setStartTime(initialLesson.startTime || "");
      setEndTime(initialLesson.endTime || "");
      setStatus(initialLesson.status || "SCHEDULED");
    }
  }, [mode, initialLesson]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) {
      return students;
    }

    const searchLower = studentSearchTerm.toLowerCase();
    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const studentNumberStr = student.studentNumber?.toString() || "";
      return (
        fullName.includes(searchLower) || studentNumberStr.includes(searchLower)
      );
    });
  }, [students, studentSearchTerm]);

  // Check if lesson type requires multiple students
  const isMultiStudentType =
    lessonType === "EXAM" || lessonType === "THEORY_EXAM";

  // Get student selection limit based on lesson type
  const getStudentLimit = () => {
    if (lessonType === "EXAM") return 2; // Max 2 for practical exams
    if (lessonType === "THEORY_EXAM") return undefined; // No limit for theory exams
    return 1; // Single student for DRIVING and THEORY
  };

  // Lesson type options
  const lessonTypeOptions: Array<{ value: LessonType; label: string }> = [
    { value: "THEORY", label: "Code Class (Theory)" },
    { value: "DRIVING", label: "Driving Class" },
    { value: "EXAM", label: "Practical Exam" },
    { value: "THEORY_EXAM", label: "Theoretical Exam" },
  ];

  // Filter lesson types based on allowedLessonTypes prop
  const filteredLessonTypeOptions =
    mode === "edit"
      ? lessonTypeOptions
      : allowedLessonTypes
        ? lessonTypeOptions.filter((option) =>
            allowedLessonTypes.includes(option.value),
          )
        : lessonTypeOptions;

  const studentLimit = getStudentLimit();

  // Handle student checkbox toggle
  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.includes(studentId);

      if (isSelected) {
        return prev.filter((id) => id !== studentId);
      } else {
        // Check limit
        if (studentLimit && prev.length >= studentLimit) {
          toast.error(
            `Maximum ${studentLimit} student(s) allowed for ${lessonType}`,
          );
          return prev;
        }
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredInstructor = userRole === "SUPER_ADMIN";
    if (requiredInstructor && !instructorId) {
      toast.error("Please select an instructor");
      return;
    }

    if (!lessonType || !lessonDate || !startTime || !endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate student selection based on lesson type
    if (isMultiStudentType) {
      if (selectedStudents.length === 0) {
        toast.error("Please select at least one student");
        return;
      }
    } else {
      // For non-exam types (DRIVING requires student, THEORY is optional)
      if (lessonType !== "THEORY" && !studentId) {
        toast.error("Please select a student");
        return;
      }
    }

    // Validate vehicle for driving lessons (only if vehicles feature is enabled)
    if (lessonType === "DRIVING" && !vehicleId && isVehicleFeatureEnabled) {
      toast.error("Please select a vehicle for driving lessons");
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
        payload.studentId = lessonType === "THEORY" ? undefined : studentId;
      }

      // Add vehicle if selected
      if (vehicleId) {
        payload.vehicleId = vehicleId;
      }

      // Include status only in edit mode
      if (mode === "edit") {
        payload.status = status;
      }

      await onSubmit(payload);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred");
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
    <form onSubmit={handleSubmit} className={lessonFormRootClass}>
      {/* Lesson Type */}
      <div className={lessonFormFieldGroupClass}>
        <Label htmlFor="lessonType" className={lessonFormLabelClass}>
          Lesson Type *
        </Label>
        <Select
          value={lessonType}
          onValueChange={(v) => {
            if (isLessonType(v)) setLessonType(v);
          }}
          disabled={mode === "edit"} // Don't allow changing lesson type in edit mode
        >
          <SelectTrigger className={lessonFormSelectTriggerClass}>
            <SelectValue placeholder="Select lesson type" />
          </SelectTrigger>
          <SelectContent className={lessonFormSelectContentClass}>
            {filteredLessonTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Instructor Selection (Admin only) */}
      {userRole === "SUPER_ADMIN" && (
        <div className={lessonFormFieldGroupClass}>
          <Label htmlFor="instructor" className={lessonFormLabelClass}>
            Instructor *
          </Label>
          <Select
            value={instructorId || undefined}
            onValueChange={setInstructorId}
          >
            <SelectTrigger className={lessonFormSelectTriggerClass}>
              <SelectValue placeholder="Select instructor" />
            </SelectTrigger>
            <SelectContent className={lessonFormSelectContentClass}>
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
        <div className={lessonFormFieldGroupClass}>
          <Label className={lessonFormLabelClass}>
            Students * {lessonType === "EXAM" && "(Max 2)"}
            {lessonType === "THEORY_EXAM" && "(Unlimited)"}
          </Label>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or student number..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className={cn(lessonFormFieldClass, lessonFormSearchInputClass)}
            />
            {studentSearchTerm && (
              <button
                type="button"
                onClick={() => setStudentSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Student List with Checkboxes */}
          <div className={lessonFormStudentPanelClass}>
            {filteredStudents.length === 0 ? (
              <div className="text-sm text-gray-500">
                {students.length === 0
                  ? "No students available"
                  : "No students match your search"}
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div key={student.id} className={lessonFormStudentRowClass}>
                  <Checkbox
                    id={`student-${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => handleStudentToggle(student.id)}
                  />
                  <label
                    htmlFor={`student-${student.id}`}
                    className={lessonFormStudentLabelClass}
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

      {/* Student Selection - DRIVING requires exactly 1 student */}
      {lessonType === "DRIVING" && (
        <div className={lessonFormFieldGroupClass}>
          <Label htmlFor="student" className={lessonFormLabelClass}>
            Student *
          </Label>

          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or student number."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className={cn(lessonFormFieldClass, lessonFormSearchInputClass)}
            />
            {studentSearchTerm && (
              <button
                type="button"
                onClick={() => setStudentSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={studentId || undefined} onValueChange={setStudentId}>
            <SelectTrigger className={lessonFormSelectTriggerClass}>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent className={lessonFormSelectContentClass}>
              {filteredStudents.length === 0 ? (
                <SelectItem value="loading-students" disabled>
                  {students.length === 0
                    ? "Loading students..."
                    : "No students match your search"}
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
        </div>
      )}

      {/* Vehicle Selection (for Driving lessons and Exams) */}
      {(lessonType === "DRIVING" || lessonType === "EXAM") &&
        isVehicleFeatureEnabled && (
          <div className={lessonFormFieldGroupClass}>
            <Label htmlFor="vehicle" className={lessonFormLabelClass}>
              Vehicle {lessonType === "DRIVING" ? "*" : "(Optional)"}
            </Label>
            <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
              <SelectTrigger className={lessonFormSelectTriggerClass}>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent className={lessonFormSelectContentClass}>
                {vehicles.length === 0 ? (
                  <SelectItem value="loading-vehicles" disabled>
                    {mode === "edit"
                      ? "No available vehicles"
                      : "Loading vehicles..."}
                  </SelectItem>
                ) : (
                  vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.registrationNumber} - {vehicle.make}{" "}
                      {vehicle.model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

      {/* Vehicle Feature Locked Message (when feature is disabled) */}
      {(lessonType === "DRIVING" || lessonType === "EXAM") &&
        !isVehicleFeatureEnabled &&
        !licenseLoading && (
          <Alert className="rounded-xl border-gray-200 bg-gray-50/80 shadow-sm">
            <Lock className="h-4 w-4" />
            <AlertTitle>Premium Feature</AlertTitle>
            <AlertDescription>
              Vehicle management requires an upgrade. Lessons will be created
              without vehicle assignment. Contact your administrator to unlock
              this feature.
            </AlertDescription>
          </Alert>
        )}

      {/* Lesson Date */}
      <div className={lessonFormFieldGroupClass}>
        <Label htmlFor="lessonDate" className={lessonFormLabelClass}>
          Date *
        </Label>
        <Input
          id="lessonDate"
          type="date"
          value={lessonDate}
          onChange={(e) => setLessonDate(e.target.value)}
          min={
            mode === "create"
              ? new Date().toISOString().split("T")[0]
              : undefined
          }
          className={cn(lessonFormFieldClass, "[color-scheme:light]")}
          required
        />
      </div>

      {/* Start and End Time */}
      <div className={lessonFormTimeGridClass}>
        <div className={lessonFormFieldGroupClass}>
          <Label htmlFor="startTime" className={lessonFormLabelClass}>
            Start Time *
          </Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={cn(lessonFormFieldClass, "[color-scheme:light]")}
            required
          />
        </div>

        <div className={lessonFormFieldGroupClass}>
          <Label htmlFor="endTime" className={lessonFormLabelClass}>
            End Time *
          </Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={cn(lessonFormFieldClass, "[color-scheme:light]")}
            required
          />
        </div>
      </div>

      {/* Status (Edit mode only) */}
      {mode === "edit" && (
        <div className={lessonFormFieldGroupClass}>
          <Label htmlFor="status" className={lessonFormLabelClass}>
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={lessonFormSelectTriggerClass}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className={lessonFormSelectContentClass}>
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
      <div className={lessonFormActionsClass}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:w-auto"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="h-11 w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading
            ? mode === "edit"
              ? "Updating..."
              : "Booking..."
            : submitButtonText ||
              (mode === "edit" ? "Update Lesson" : "Book Lesson")}
        </Button>
      </div>
    </form>
  );
}
