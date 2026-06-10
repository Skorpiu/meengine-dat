/*
  Class-B RLS hardening v1b — slice B2 (tenant business + platform registry).

  Scope (12 tables only):
  - students, instructors, vehicles, lessons, exams, lesson_requests
  - lesson_counters, exam_registrations, payments, notifications
  - organizations, organization_features

  Pattern:
  - ENABLE ROW LEVEL SECURITY
  - REVOKE ALL ON TABLE … FROM anon, authenticated

  No CREATE POLICY, no FORCE ROW LEVEL SECURITY, no GRANT to anon/authenticated.
  Prisma/backend uses DATABASE_URL (table owner / migration role bypasses RLS).

  Idempotent: repeating ENABLE ROW LEVEL SECURITY and REVOKE is safe in Postgres.
*/

-- students (tenant operational — organizationId NOT NULL)
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "students" FROM anon, authenticated;

-- instructors (tenant operational — organizationId NOT NULL)
ALTER TABLE "instructors" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "instructors" FROM anon, authenticated;

-- vehicles (tenant operational — organizationId NOT NULL)
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "vehicles" FROM anon, authenticated;

-- lessons (tenant operational — organizationId NOT NULL)
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "lessons" FROM anon, authenticated;

-- exams (tenant operational — organizationId NOT NULL)
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "exams" FROM anon, authenticated;

-- lesson_requests (tenant operational — organizationId NOT NULL)
ALTER TABLE "lesson_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "lesson_requests" FROM anon, authenticated;

-- lesson_counters (scope via studentId parent)
ALTER TABLE "lesson_counters" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "lesson_counters" FROM anon, authenticated;

-- exam_registrations (scope via examId + studentId)
ALTER TABLE "exam_registrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "exam_registrations" FROM anon, authenticated;

-- payments (billing UI — server-only today)
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "payments" FROM anon, authenticated;

-- notifications (via userId)
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "notifications" FROM anon, authenticated;

-- organizations (platform/tenant registry)
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "organizations" FROM anon, authenticated;

-- organization_features (entitlement gating metadata)
ALTER TABLE "organization_features" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "organization_features" FROM anon, authenticated;
