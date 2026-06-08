/**
 * UI DTO for instructor rows on /admin/users (sourced from User + Instructor include).
 */

export type InstructorOperationalDto = {
  id?: string;
  instructorIdNumber?: string | null;
  instructorLicenseNumber?: string | null;
  instructorLicenseExpiry?: string | Date | null;
};

export type InstructorRecordUserDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address?: string | null;
  role: string;
  isApproved: boolean;
  instructor?: InstructorOperationalDto | null;
};
