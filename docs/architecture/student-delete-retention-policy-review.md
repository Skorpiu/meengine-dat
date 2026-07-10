# Student delete & retention policy review

**Batch:** `student-delete-retention-policy-review-v1`  
**Date:** 2026-07-10  
**Scope:** docs-only review (no Prisma/schema/runtime changes)

## 1. Executive summary

DAT currently implements a **hard-delete policy for Student records** that is intentionally **very restrictive**: hard delete is only allowed for **MANUAL_ONLY** Students with **zero dependent operational records** (including **zero lessons**). This preserves operational history by policy.

At the database level, several Student dependencies (including `Lesson`) use `onDelete: Cascade`, meaning **out-of-band deletes** (SQL/Supabase UI, future scripts, bugs) could still cascade-delete history. This is a **P2 risk** as long as the application delete policy remains the only supported deletion path and operators follow “no direct deletes” discipline.

**Recommended production decision:** keep current policy as-is; treat DB cascade risk as **operator/process risk** for now; consider a future retention-hardening slice only if compliance/operator needs require it.

## 2. Current policy (application)

### Hard delete (Student record)

**API:** `DELETE /api/admin/students/[id]` (SUPER_ADMIN, tenant host guard, demo user-management guard).  
**Implementation:** `lib/students/student-record-delete.ts` + `student-record-delete-policy.ts`.

**Eligibility (must all be true):**

- `Student.appAccessMode === MANUAL_ONLY`
- `Student.userId === null`
- No dependent operational records:
  - lessons
  - user invitations
  - lesson counters
  - lesson requests
  - exam registrations
  - payments

**Blocking is explicit and stable (409):**

- Primary code in `error.code` + full list in `codes[]` (e.g. `student_has_lessons`).

### Remove app access vs hard delete (important distinction)

- **Remove app access** (`POST /api/admin/students/[id]/app-access/remove`): preserves Student record and **all** operational history. It unlinks `Student.userId`, sets `appAccessMode=MANUAL_ONLY`, invalidates sessions/tokens, and revokes pending invitations. It is a **retention-preserving** action.
- **Reactivate app access** (`POST /api/admin/students/[id]/app-access/reactivate`): re-links an existing orphan User when safe (Path A) or returns stable 409 directing admin to Send invitation (Path B). Also **retention-preserving**.
- **Hard delete** (`DELETE /api/admin/students/[id]`): only for “empty” manual records; intended for cleanup of accidental/manual fichas before any operational history exists.

## 3. Current behavior (database-level FKs)

From `prisma/schema.prisma`:

### Student → Lesson

- `Lesson.studentId` is nullable (`String?`) for THEORY group classes, but when present:
- `Lesson.student` uses `onDelete: Cascade`

### Other Student-linked operational dependencies

- `LessonRequest.student`: `onDelete: Cascade`
- `LessonCounter.student`: `onDelete: Cascade`
- `ExamRegistration.student`: `onDelete: Cascade`
- `UserInvitation.student`: `onDelete: SetNull` (invites may remain even if Student record is removed)
- `Payment.student`: **no explicit `onDelete`** in Prisma schema (DB default applies; do not assume cascade)

## 4. What operational history should be preserved?

By current product intent and implemented flows, the system is designed to preserve:

- lessons (SYSTEM, MANUAL, IMPORT)
- lesson counters / lesson requests
- exam registrations
- payments
- audit logs (separate table; not modeled as a Student FK)

This matches the delete policy: any presence of this history blocks hard delete.

## 5. Risk analysis (app policy vs DB behavior)

### R1 — Out-of-band DB delete could cascade-delete history (P2)

Even though the app blocks deleting Students with lessons, DB `onDelete: Cascade` on `Lesson.student` (and other relations) means a direct delete of `students` can remove dependent rows.

**Scope of risk:** operator SQL / Supabase dashboard / future scripts / future routes (not current product UI).

**Mitigation today (recommended):**

- Treat direct deletes of `students` as forbidden operationally.
- Rely on app endpoints only (`remove app access`, `change email`, etc.).

### R2 — Deleting “empty” manual Students remains safe (P1)

The policy ensures hard delete happens only when there is no dependent operational history; DB cascade is then irrelevant.

## 6. Recommendation (decision proposal)

**Recommended decision for controlled production:** keep current behavior:

- Hard delete remains available only for empty MANUAL_ONLY student records.
- Remove/reactivate app access remain the “operational” lifecycle actions.
- DB cascade risk is documented as P2 and handled via operator discipline.

No migration is recommended in this review batch.

## 7. Future slice (only if needed)

If compliance/operator governance requires preventing history loss even under out-of-band deletes, propose a gated follow-up slice (no commitment in this batch):

- `student-retention-hardening-plan-v1` (docs-only)
  - Decide target DB behavior per dependency: `RESTRICT` vs `SET NULL` (per table), with an explicit retention policy decision.
  - Define migration safety checklist + manual smoke plan.

Possible implementation slice after plan (sensitive: migrations):

- `student-retention-hardening-migration-v1` (D4)

## 8. Manual QA / smoke notes (for any future migration)

Before any FK `onDelete` changes:

- Verify Student delete endpoint still blocks correctly for each dependency code.
- Verify remove/reactivate app access unchanged.
- Verify lesson create/update/import/export paths unchanged.
- Verify instructor/student dashboards and admin lessons lists tolerate THEORY group lessons (`studentId=null`).
- Confirm there are no orphaned rows or unexpected deletes on test data.

## Appendix: primary evidence pointers

- Student delete policy: `driving_school_platform/nextjs_space/lib/students/student-record-delete-policy.ts`
- Student delete service: `driving_school_platform/nextjs_space/lib/students/student-record-delete.ts`
- Student delete route: `driving_school_platform/nextjs_space/app/api/admin/students/[id]/route.ts`
- App access lifecycle policy: `docs/architecture/student-app-access-lifecycle-policy.md`
- Prisma relations: `driving_school_platform/nextjs_space/prisma/schema.prisma`

