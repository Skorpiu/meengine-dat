
/**
 * Validation schemas and utilities using Zod
 * @module lib/validation
 */

import { z } from 'zod';
import { VALIDATION_RULES, LICENSE_CATEGORIES, USER_ROLES, LESSON_TYPES, VEHICLE_STATUS } from './constants';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(VALIDATION_RULES.NAME_REGEX, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phoneNumber: z
    .string()
    .regex(VALIDATION_RULES.PHONE_REGEX, 'Invalid phone number')
    .optional(),
  date: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid date format'
  ),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  // CUID validator - accepts both CUID and UUID formats
  id: z.string().min(1, 'ID is required').refine(
    (id) => {
      // Accept CUID format (starts with 'c' followed by alphanumeric, min 20 chars)
      const cuidRegex = /^c[a-z0-9]{19,}$/i;
      // Accept UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return cuidRegex.test(id) || uuidRegex.test(id);
    },
    'Invalid ID format'
  ),
  // Keep uuid for backward compatibility but use id for new validations
  uuid: z.string().min(1, 'ID is required').refine(
    (id) => {
      // Accept CUID format (starts with 'c' followed by alphanumeric, min 20 chars)
      const cuidRegex = /^c[a-z0-9]{19,}$/i;
      // Accept UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return cuidRegex.test(id) || uuidRegex.test(id);
    },
    'Invalid ID format'
  ),
};

/**
 * User Registration Schema
 */
export const userRegistrationSchema = z.object({
  firstName: commonSchemas.name,
  lastName: commonSchemas.name,
  email: commonSchemas.email,
  password: commonSchemas.password,
  confirmPassword: z.string(),
  phoneNumber: z.string().optional(),
  countryCode: z.string().optional(),
  dateOfBirth: commonSchemas.date.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR, USER_ROLES.SUPER_ADMIN]),
  drivingSchoolId: z.string().optional(),
  // Student-specific fields
  selectedCategories: z.array(z.string()).optional(),
  transmissionType: z.string().optional(),
  // Instructor-specific fields
  instructorLicenseNumber: z.string().optional(),
  instructorLicenseExpiry: commonSchemas.date.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/**
 * User Login Schema
 */
export const userLoginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

/**
 * User Creation Schema (Admin)
 */
export const userCreationSchema = z.object({
  firstName: commonSchemas.name,
  lastName: commonSchemas.name,
  email: commonSchemas.email,
  phoneNumber: z.string().optional(),
  dateOfBirth: commonSchemas.date.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR]),
  // Student-specific
  selectedCategories: z.array(z.string()).optional(),
  transmissionType: z.string().optional(),
  // Instructor-specific
  instructorLicenseNumber: z.string().optional(),
  instructorLicenseExpiry: commonSchemas.date.optional(),
});

/**
 * User Update Schema
 */
export const userUpdateSchema = z.object({
  userId: commonSchemas.uuid,
  firstName: commonSchemas.name.optional(),
  lastName: commonSchemas.name.optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  // Role-specific updates
  selectedCategories: z.array(z.string()).optional(),
  transmissionType: z.string().optional(),
  instructorLicenseNumber: z.string().optional(),
  instructorLicenseExpiry: commonSchemas.date.optional(),
});

/**
 * Lesson Creation Schema
 */
export const lessonCreationSchema = z.object({
  lessonType: z.enum([LESSON_TYPES.THEORY, LESSON_TYPES.DRIVING, LESSON_TYPES.EXAM]),
  instructorId: commonSchemas.uuid,
  studentId: z.union([commonSchemas.uuid, z.null()]).optional(),
  studentIds: z.array(commonSchemas.uuid).optional(),
  lessonDate: commonSchemas.date,
  startTime: commonSchemas.time,
  endTime: commonSchemas.time,
  vehicleId: z.union([z.number().int().positive(), z.null()]).optional(),
  categoryId: commonSchemas.uuid.optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.lessonType === LESSON_TYPES.EXAM) {
      return data.studentIds && data.studentIds.length > 0;
    }
    // For THEORY lessons, studentId is optional (group classes)
    if (data.lessonType === LESSON_TYPES.THEORY) {
      return true;
    }
    // For DRIVING lessons, studentId is required
    return data.studentId !== undefined && data.studentId !== null;
  },
  {
    message: 'Student is required for driving lessons',
    path: ['studentId'],
  }
);

/**
 * Vehicle Creation/Update Schema
 */
export const vehicleSchema = z.object({
  model: z.string().min(1, 'Vehicle model is required'),
  licensePlate: z.string().min(1, 'License plate is required'),
  categoryId: commonSchemas.uuid,
  transmissionTypeId: commonSchemas.uuid,
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  status: z.enum([
    VEHICLE_STATUS.AVAILABLE,
    VEHICLE_STATUS.IN_USE,
    VEHICLE_STATUS.MAINTENANCE,
    VEHICLE_STATUS.OUT_OF_SERVICE,
  ]),
  fuelType: z.string().optional(),
  color: z.string().optional(),
  insuranceExpiry: commonSchemas.date.optional(),
  nextServiceDate: commonSchemas.date.optional(),
  notes: z.string().optional(),
});

/**
 * User Approval Schema
 */
export const userApprovalSchema = z.object({
  userId: commonSchemas.uuid,
  action: z.enum(['approve', 'reject']),
});

/**
 * Type inference helpers
 */
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserCreationInput = z.infer<typeof userCreationSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type LessonCreationInput = z.infer<typeof lessonCreationSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type UserApprovalInput = z.infer<typeof userApprovalSchema>;

/**
 * Validation helper function
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with parsed data or errors
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors for user-friendly display
 * @param error - Zod validation error
 * @returns Formatted error messages
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
}
