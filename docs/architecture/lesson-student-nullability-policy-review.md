# Lesson ↔ Student nullability policy review

**Batch:** `lesson-student-nullability-policy-review-v1`  
**Date:** 2026-07-09  
**Scope:** docs-only review (no Prisma/schema/runtime changes)

## 1. Questions answered (current state)

### Is `Lesson.studentId` currently nullable in Prisma?

Yes. In `prisma/schema.prisma`:

- `Lesson.studentId` is `String?`
- `Lesson.student` relation is `Student?` with `onDelete: Cascade`

### Do lessons without a student exist / can the product create them?

Yes, **by design** for **THEORY group classes**:

- `lessonCreationSchema` allows **THEORY** with `studentId` omitted/null.
- `createAdminLesson` explicitly creates a THEORY group lesson with `studentId: null` when no student is selected.
- UI (`LessonForm`) treats THEORY as **optional student**, and explicitly enforces student selection for DRIVING/EXAM/THEORY_EXAM.

### Which flows depend on student being mandatory?

**Student is mandatory** for:

- **DRIVING**: `lessonCreationSchema` enforces `studentId`, and `createAdminLesson` returns 400 if missing.
- **EXAM / THEORY_EXAM**: `lessonCreationSchema` enforces `studentIds`, and `createAdminLesson` creates one Lesson per student.
- **Manual practical history**: `createManualPracticalLesson` requires `studentId` (route is scoped under `/students/[id]/...`).
- **Practical lesson import apply**: normalized rows always resolve to a `studentId` and create DRIVING lessons with `studentId` set.

### What happens when deleting a Student who has lessons?

Application policy blocks hard delete when the Student has dependent records:

- Student delete is blocked when `_count.lessons > 0` (stable 409 code: `student_has_lessons`).
- If a Student delete *were* performed at DB level despite policy, `Lesson.student` relation uses `onDelete: Cascade` and would delete dependent lessons.

### Do exports/audit metadata assume student is always present?

No hard assumption was found in the practical-lesson export row mapping:

- `mapPracticalLessonToExportRow` accepts `student: ... | null` and exports a blank `schoolStudentId` when absent.
- Audit event wiring for lessons passes `studentId` through and tolerates it being null (THEORY group class path).

### UI risk if `studentId` is null

- Core list/calendar/dashboard queries select `lesson.student` (nullable) and return it in the payload.
- UI must therefore be resilient to `lesson.student === null` at least for THEORY.

## 2. Current policy (documented from code)

**Operational rule today:**

- `Lesson.studentId` is **nullable** to support **THEORY group classes**.
- `Lesson.studentId` is **required at application level** for **DRIVING**, **EXAM**, and **THEORY_EXAM**.

**Deletion rule today:**

- Student hard delete is only allowed for MANUAL_ONLY students with **zero dependent operational rows**, including **zero lessons**.

## 3. Risks / inconsistencies

### R1 — DB-level cascade vs product retention expectations (P2)

Even though the application blocks deleting students with lessons, the DB constraint is still `onDelete: Cascade`. Any out-of-band delete (operator SQL, future code path, bug) could cascade-delete lesson history.

### R2 — Theory group classes share the same `Lesson` table (intentional)

Because THEORY group classes use the same table with `studentId: null`, any new UI/query/policy work must not silently assume “Lesson always has student”.

## 4. Recommendation (decision proposal)

**Recommended decision (docs-only): keep `Lesson.studentId` nullable**, explicitly as:

- **Nullable** only for **THEORY group classes**
- **Required** (application-level invariant) for **DRIVING/EXAM/THEORY_EXAM**

No schema change is recommended in this batch.

## 5. Next slice (only if/when needed)

If operator/compliance requirements demand “never lose lesson history even if Student is deleted”, propose a separate, gated slice:

- `lesson-student-retention-policy-hardening-v1` (P2)
  - Decide whether to change DB behaviour (`RESTRICT` / `SET NULL`) and align with product retention policy.
  - Add characterization tests around delete policy and/or direct service contracts.
  - Explicitly out of scope: migrations in this review batch.

## Appendix: primary evidence pointers

- Prisma models: `driving_school_platform/nextjs_space/prisma/schema.prisma`
- Validation contract: `driving_school_platform/nextjs_space/lib/validation.ts` (`lessonCreationSchema`)
- Admin create orchestration: `driving_school_platform/nextjs_space/lib/lessons/lesson-create-service.ts`
- UI create/edit: `driving_school_platform/nextjs_space/components/lessons/LessonForm.tsx`
- Manual practical history: `driving_school_platform/nextjs_space/lib/lessons/manual-practical-lesson-service.ts`
- Practical import apply: `driving_school_platform/nextjs_space/lib/import-export/practical-lesson-import-apply.ts`
- Student delete policy: `driving_school_platform/nextjs_space/lib/students/student-record-delete-policy.ts`, `student-record-delete.ts`

