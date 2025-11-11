
-- Database Performance Optimization
-- Add indexes to improve query performance
-- Run this file to add indexes to your PostgreSQL database

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_isActive ON users("isActive");
CREATE INDEX IF NOT EXISTS idx_users_isApproved ON users("isApproved");
CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users("createdAt");

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_userId ON students("userId");
CREATE INDEX IF NOT EXISTS idx_students_categoryId ON students("categoryId");
CREATE INDEX IF NOT EXISTS idx_students_transmissionTypeId ON students("transmissionTypeId");

-- Instructors table indexes
CREATE INDEX IF NOT EXISTS idx_instructors_userId ON instructors("userId");
CREATE INDEX IF NOT EXISTS idx_instructors_isAvailableForBooking ON instructors("isAvailableForBooking");

-- Lessons table indexes
CREATE INDEX IF NOT EXISTS idx_lessons_studentId ON lessons("studentId");
CREATE INDEX IF NOT EXISTS idx_lessons_instructorId ON lessons("instructorId");
CREATE INDEX IF NOT EXISTS idx_lessons_vehicleId ON lessons("vehicleId");
CREATE INDEX IF NOT EXISTS idx_lessons_lessonDate ON lessons("lessonDate");
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_lessonType ON lessons("lessonType");
CREATE INDEX IF NOT EXISTS idx_lessons_date_status ON lessons("lessonDate", status);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor_date ON lessons("instructorId", "lessonDate");

-- Vehicles table indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_categoryId ON vehicles("categoryId");
CREATE INDEX IF NOT EXISTS idx_vehicles_transmissionTypeId ON vehicles("transmissionTypeId");
CREATE INDEX IF NOT EXISTS idx_vehicles_isActive ON vehicles("isActive");
CREATE INDEX IF NOT EXISTS idx_vehicles_nextServiceDate ON vehicles("nextServiceDate");

-- Exams table indexes
CREATE INDEX IF NOT EXISTS idx_exams_examDate ON exams("examDate");
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_categoryId ON exams("categoryId");
CREATE INDEX IF NOT EXISTS idx_exams_examinerId ON exams("examinerId");

-- Exam Registrations table indexes
CREATE INDEX IF NOT EXISTS idx_exam_registrations_examId ON exam_registrations("examId");
CREATE INDEX IF NOT EXISTS idx_exam_registrations_studentId ON exam_registrations("studentId");
CREATE INDEX IF NOT EXISTS idx_exam_registrations_result ON exam_registrations(result);

-- Lesson Requests table indexes
CREATE INDEX IF NOT EXISTS idx_lesson_requests_studentId ON lesson_requests("studentId");
CREATE INDEX IF NOT EXISTS idx_lesson_requests_instructorId ON lesson_requests("instructorId");
CREATE INDEX IF NOT EXISTS idx_lesson_requests_status ON lesson_requests(status);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_requestedDate ON lesson_requests("requestedDate");

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments("userId");
CREATE INDEX IF NOT EXISTS idx_payments_studentId ON payments("studentId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transactionDate ON payments("transactionDate");
CREATE INDEX IF NOT EXISTS idx_payments_lessonId ON payments("lessonId");

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_createdAt ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", "isRead");

-- Audit Logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entityType ON audit_logs("entityType");
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, "isActive");
CREATE INDEX IF NOT EXISTS idx_lessons_student_date ON lessons("studentId", "lessonDate");
CREATE INDEX IF NOT EXISTS idx_lessons_type_date_status ON lessons("lessonType", "lessonDate", status);

-- Add comments to indexes for documentation
COMMENT ON INDEX idx_users_email IS 'Improves user lookup by email';
COMMENT ON INDEX idx_lessons_date_status IS 'Optimizes lesson queries by date and status';
COMMENT ON INDEX idx_vehicles_nextServiceDate IS 'Helps identify vehicles needing maintenance';
