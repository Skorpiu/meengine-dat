
/**
 * Comprehensive TypeScript type definitions
 * @module lib/types
 */

export type UserRole = "STUDENT" | "INSTRUCTOR" | "SUPER_ADMIN"

export type LessonStatus = string
export type LessonType = string
export type VehicleStatus = string

/**
 * Base User Interface
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  role: UserRole;
  isApproved: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Extended User with Relations
 */
export interface UserWithRelations extends User {
  student?: StudentProfile | null;
  instructor?: InstructorProfile | null;
}

/**
 * Student Profile
 */
export interface StudentProfile {
  id: string;
  userId: string;
  user?: User;
  categoryId: string | null;
  category?: Category | null;
  transmissionTypeId: string | null;
  transmissionType?: TransmissionType | null;
  lessonsCompleted: number;
  theoryTestPassed: boolean;
  practicalTestPassed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Instructor Profile
 */
export interface InstructorProfile {
  id: string;
  userId: string;
  user?: User;
  instructorLicenseNumber: string;
  instructorLicenseExpiry: Date;
  qualifiedCategories: Category[];
  isAvailable: boolean;
  rating: number | null;
  totalLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lesson Interface
 */
export interface Lesson {
  id: string;
  studentId: string;
  student?: StudentWithUser;
  instructorId: string;
  instructor?: InstructorWithUser;
  vehicleId: string | null;
  vehicle?: Vehicle | null;
  categoryId: string;
  category?: Category;
  lessonType: LessonType;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: LessonStatus;
  studentNotes: string | null;
  instructorNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Student with User relation
 */
export interface StudentWithUser {
  id: string;
  user: User;
  category?: Category | null;
  transmissionType?: TransmissionType | null;
}

/**
 * Instructor with User relation
 */
export interface InstructorWithUser {
  id: string;
  user: User;
  qualifiedCategories: Category[];
  rating: number | null;
}

/**
 * Vehicle Interface
 */
export interface Vehicle {
  id: string;
  model: string;
  licensePlate: string;
  categoryId: string;
  category?: Category;
  transmissionTypeId: string;
  transmissionType?: TransmissionType;
  year: number;
  status: VehicleStatus;
  fuelType: string | null;
  color: string | null;
  insuranceExpiry: Date | null;
  lastServiceDate: Date | null;
  nextServiceDate: Date | null;
  mileage: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Interface
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  requiredTheoryHours: number;
  requiredPracticalHours: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transmission Type Interface
 */
export interface TransmissionType {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exam Interface
 */
export interface Exam {
  id: string;
  studentId: string;
  student?: StudentWithUser;
  examinerId: string;
  examiner?: InstructorWithUser;
  vehicleId: string | null;
  vehicle?: Vehicle | null;
  categoryId: string;
  category?: Category;
  examDate: Date;
  startTime: string;
  endTime: string;
  examType: 'THEORY' | 'PRACTICAL';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'CANCELLED';
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Statistics Interfaces
 */
export interface DashboardStats {
  totalStudents: number;
  totalInstructors: number;
  totalVehicles: number;
  activeUsers: number;
  approvedUsers: number;
  upcomingLessons: number;
  completedLessons: number;
  pendingApprovals: number;
}

export interface UserManagementStats {
  totalStudents: number;
  totalInstructors: number;
  activeUsers: number;
  approvedUsers: number;
}

export interface VehicleStats {
  totalVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  vehiclesOutOfService: number;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Form Data Types
 */
export interface LessonFormData {
  lessonType: LessonType;
  instructorId: string;
  studentId?: string;
  studentIds?: string[];
  lessonDate: string;
  startTime: string;
  endTime: string;
  vehicleId?: string;
  categoryId?: string;
  notes?: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  countryCode?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  role: UserRole;
  // Student-specific
  selectedCategories?: string[];
  transmissionType?: string;
  // Instructor-specific
  instructorLicenseNumber?: string;
  instructorLicenseExpiry?: string;
}

export interface VehicleFormData {
  model: string;
  licensePlate: string;
  categoryId: string;
  transmissionTypeId: string;
  year: number;
  status: VehicleStatus;
  fuelType?: string;
  color?: string;
  insuranceExpiry?: string;
  nextServiceDate?: string;
  notes?: string;
}

/**
 * Session and Auth Types
 */
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isApproved: boolean;
}

export interface AuthSession {
  user: SessionUser;
  expires: string;
}

/**
 * Loading State Types
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface LoadingStates {
  [key: string]: boolean;
}

/**
 * Filter and Sort Types
 */
export interface LessonFilters {
  view?: 'DRIVING' | 'CODE' | 'EXAMS';
  instructorId?: string;
  studentId?: string;
  status?: LessonStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: 'active' | 'inactive';
  isApproved?: boolean;
  search?: string;
}

export interface VehicleFilters {
  status?: VehicleStatus;
  categoryId?: string;
  transmissionTypeId?: string;
  search?: string;
}

/**
 * Calendar Event Type (for Schedule View)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lesson' | 'exam';
  status: string;
  instructor?: string;
  student?: string;
  vehicle?: string;
  color?: string;
}

/**
 * Utility Types
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
