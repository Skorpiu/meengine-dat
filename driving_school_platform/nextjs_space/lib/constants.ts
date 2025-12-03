
/**
 * Application-wide constants and configuration values
 * @module lib/constants
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * API Response Messages
 */
export const API_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  MISSING_FIELDS: 'Missing required fields',
  INVALID_ACTION: 'Invalid action',
  CREATED_SUCCESS: 'Created successfully',
  UPDATED_SUCCESS: 'Updated successfully',
  DELETED_SUCCESS: 'Deleted successfully',
  FETCH_ERROR: 'Failed to fetch data',
  CREATE_ERROR: 'Failed to create record',
  UPDATE_ERROR: 'Failed to update record',
  DELETE_ERROR: 'Failed to delete record',
} as const;

/**
 * User Role Constants
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
} as const;

/**
 * Lesson Types
 */
export const LESSON_TYPES = {
  THEORY: 'THEORY',
  DRIVING: 'DRIVING',
  EXAM: 'EXAM',
  THEORY_EXAM: 'THEORY_EXAM',
} as const;

/**
 * Lesson Status
 */
export const LESSON_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
} as const;

/**
 * Vehicle Status
 */
export const VEHICLE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  MAINTENANCE: 'MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
} as const;

/**
 * License Categories
 */
export const LICENSE_CATEGORIES = [
  'AM', 'A1', 'A2', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D',
  'B+E', 'C+E', 'C1+E', 'D+E', 'D1+E'
] as const;

/**
 * Transmission Types
 */
export const TRANSMISSION_TYPES = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
} as const;

/**
 * Country Codes for Phone Numbers
 */
export const COUNTRY_CODES = [
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
] as const;

/**
 * Time-related Constants
 */
export const TIME_CONSTANTS = {
  HOURS_IN_DAY: 24,
  MINUTES_IN_HOUR: 60,
  SECONDS_IN_MINUTE: 60,
  MS_IN_SECOND: 1000,
  MS_IN_HOUR: 3600000,
  MS_IN_DAY: 86400000,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
} as const;

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  MAX_STUDENTS_PER_EXAM: 2,
  NAME_REGEX: /^[A-Za-zÀ-ÿ\s'-]+$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\d{9,15}$/,
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Date Format Constants
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  INPUT: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm',
} as const;
