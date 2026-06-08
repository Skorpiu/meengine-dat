# Instructor delete and deactivate policy

## Purpose

Formal policy for School Admin **Instructor** lifecycle in People management: **Delete**, **Deactivate**, and **Remove app access** are **separate concepts**. Policy doc established in `instructor-delete-policy-v1-docs`; zero-deps hard delete implemented in `instructor-hard-delete-zero-deps-v1`.

**Related:** [decision-log.md](./decision-log.md) DEC-018, DEC-019; [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md) (student parallel).

**Current runtime (post `instructor-hard-delete-zero-deps-v1`):**

- Instructors → Profiles: **Edit Instructor** + **Delete** (policy-aware: allowed only zero-deps; blocked modal with stable codes otherwise).
- `DELETE /api/admin/instructors/[id]` — dedicated hard delete by `Instructor.id` (SUPER_ADMIN, tenant, demo guard).
- `DELETE /api/users/delete` — returns **409** `use_instructor_delete_policy` when target role is **INSTRUCTOR**.
- App Accounts tab: legacy delete still exists for non-instructor roles; instructor delete must use Profiles.
- **Deactivate** and **Remove app access** — not implemented (future batches).

---

## A. Current model constraints

### Instructor always requires User

- `Instructor.userId` is **required** (`@unique`).
- Unlike `Student`, there is **no** operational Instructor profile without a linked `User`.
- There is **no** `appAccessMode` on Instructor; app login state is expressed via `User.isApproved`, sessions, and invitations.

### Database relationships affecting delete safety

| Entity / relation | FK | ON DELETE | Policy implication |
| ----------------- | -- | --------- | ------------------ |
| `User` → `Instructor` | `userId` | **CASCADE** | Deleting `User` attempts to delete `Instructor` |
| `Lesson` | `instructorId` (required) | **RESTRICT** | **Any lesson blocks** hard delete of Instructor |
| `Exam` | `examinerId` (optional) | SET NULL | DB allows delete; **policy blocks** to preserve examiner history |
| `LessonRequest` | `instructorId` (optional) | SET NULL | DB allows delete; **policy blocks** to preserve attribution |
| `Student` | `preferredInstructorId` (optional) | SET NULL | DB allows delete; **policy blocks** while preferences exist |
| M2M `qualifiedCategories` / `qualifiedTransmissionTypes` | — | CASCADE | Qualifications cleared on Instructor delete |

### Effects via linked `User` (hard delete of User)

| Relation | ON DELETE | Risk |
| -------- | --------- | ---- |
| `Payment` (`userId`) | **CASCADE** | Financial records tied to User are **destroyed** |
| `Session`, `Account`, `Notification`, `UserPreference` | CASCADE | Login and notification state destroyed |
| `AuditLog` | SET NULL | Audit rows remain but lose `userId` link |
| `UserInvitation` (createdBy / acceptedUser) | SET NULL | Invitation metadata partially orphaned |

### Payments

- `Payment` references **`User.id`**, not `Instructor.id`.
- Lessons taught by the instructor may have related `Payment.lessonId` rows — operational/financial history must be preserved by policy even when DB constraints differ.

### Invitations

- `UserInvitation` has `studentId` for students only — **no** `instructorId`.
- Instructor invitations are matched by `email` + `role = INSTRUCTOR` + `status = PENDING`.

### Existing operational fields (no dedicated lifecycle status today)

- `Instructor.isAvailableForBooking` (default `true`) — candidate for **deactivate** without schema migration.
- `User.isApproved` — controls login approval; candidate for deactivate / future app-access lifecycle.

### App Accounts legacy delete is unsafe

`DELETE /api/users/delete` today:

- Performs **unconditional** `User` hard delete (tenant-scoped only).
- Has **no** dependency checks (lessons, payments, invitations).
- With lessons → database **RESTRICT** may surface as opaque **500** errors.
- With zero lessons → still cascades payments, sessions, and Instructor row.
- Is a **technical account delete**, not a People policy action — **must not** remain the instructor delete path (DEC-019).

---

## B. Product policy — three separate concepts

### 1. Delete Instructor (hard delete)

**Intent:** Remove a mistaken or onboarding-error instructor record that has **never** participated in school operations.

- **Only** when **zero operational dependencies** (see eligibility matrix).
- Hard-deletes `User` (cascade `Instructor`) via a **dedicated** admin endpoint — **not** `DELETE /api/users/delete`.
- **Not** for instructors who taught lessons, examined exams, or otherwise have history.

### 2. Deactivate Instructor (normal “left the school” path)

**Intent:** Stop scheduling and app login while **preserving** all operational history.

- Default product action when an instructor leaves the school.
- Does **not** remove `Instructor` or `User` rows.
- Expected v1 mechanism (no schema): `Instructor.isAvailableForBooking = false`, `User.isApproved = false`, session invalidation, UI badge “Inactive”.
- Instructor remains visible in People with history intact; excluded from new lesson assignment (future batch `instructor-deactivate-v1`).

### 3. Remove app access (deferred lifecycle)

**Intent:** Disable app login while keeping the instructor operational profile — analogous to student remove/reactivate (DEC-014).

- **Not** equivalent to Delete or Deactivate.
- **Deferred** to `people-management-instructor-app-access-lifecycle-policy-v1` (+ implementation).
- Structural note: `Instructor.userId` is required — cannot mirror `Student.userId = null` without schema/product change.

---

## C. Eligibility matrix

| Action | Allowed when | Blocked when |
| ------ | ------------ | ------------ |
| **Hard delete** | All zero-dependency checks pass (below); tenant match; not demo mutation; not deleting self | Any dependency or policy guard fails |
| **Hard delete blocked** | — | Any row in “Hard delete blocked reasons” below |
| **Deactivate** | Operational `Instructor` exists; admin intends to stop booking/login; preserve history | Demo (optional guard); policy TBD for self-deactivate |
| **Remove app access** | — | **Deferred** — not available until instructor app-access lifecycle batch |
| **No action** | — | — |
| **Hard delete (Profiles)** | Zero-deps checks pass | Any dependency or policy guard fails |

### Hard delete allowed — all must be true

| Check | Rule |
| ----- | ---- |
| Lessons | `_count.lessons === 0` (any `Lesson.instructorId`; past or future) |
| Payments | `_count.payments` on linked `User` === 0 |
| Exams | `_count.exams` as `examinerId` === 0 |
| Lesson requests | `_count.lessonRequests` with `instructorId` === 0 |
| Preferred students | `_count.preferredStudents` === 0 |
| Pending invitation | No `UserInvitation` with `status = PENDING`, `role = INSTRUCTOR`, same normalized email in tenant |
| Self | Target `User.id` ≠ session admin `id` |
| Tenant | `Instructor.organizationId` matches session `organizationId` (load by `Instructor.id`, never trust body org) |
| Demo | Not demo org (`rejectDemoUserManagementMutation`) |

### Hard delete blocked reasons (409 stable codes — implemented)

| Code | Condition |
| ---- | --------- |
| `instructor_has_lessons` | Any lesson references instructor |
| `instructor_has_payments` | Any payment on linked User |
| `instructor_has_exams` | Any exam as examiner |
| `instructor_has_lesson_requests` | Any lesson request with instructor |
| `instructor_has_preferred_students` | Any student preferred instructor |
| `instructor_has_pending_invitation` | Pending INSTRUCTOR invitation for email |
| `instructor_delete_self_not_allowed` | Admin targets own account |
| `instructor_delete_not_allowed` | Inconsistent user/instructor link or delete failed safely |
| `instructor_not_found` | 404 — missing or cross-tenant |

---

## D. API contracts

### `DELETE /api/admin/instructors/[id]` — **implemented** (`instructor-hard-delete-zero-deps-v1`)

| Aspect | Contract |
| ------ | -------- |
| **ID** | `Instructor.id` (not `User.id`) |
| **Auth** | `SUPER_ADMIN`, tenant host guard, demo `user_management` guard |
| **Behavior** | Transaction: lock instructor row (`FOR UPDATE`), evaluate eligibility, hard-delete linked `User` (cascade `Instructor`) only when allowed |
| **Implementation** | `lib/instructors/instructor-record-delete-policy.ts`, `lib/instructors/instructor-record-delete.ts`, `app/api/admin/instructors/[id]/route.ts` |
| **Success** | `200` / `{ success: true, data: { deleted: true } }` |
| **Blocked** | `409` + stable codes from matrix above |
| **Not found** | `404` |
| **Demo** | `403` |

Mirror patterns from `lib/students/student-record-delete.ts` and `student-record-delete-policy.ts`.

### `POST /api/admin/instructors/[id]/deactivate` — `instructor-deactivate-v1`

| Aspect | Contract |
| ------ | -------- |
| **Goal** | Disable booking + login; **preserve** all history |
| **Likely effects** | `isAvailableForBooking = false`, `User.isApproved = false`, invalidate `Session` rows |
| **Reactivate** | Future slice (optional `POST .../reactivate`) |
| **Schema** | **None** required for v1 |

### `POST /api/admin/instructors/[id]/app-access/remove` — deferred

| Aspect | Contract |
| ------ | -------- |
| **Batch** | `people-management-instructor-app-access-lifecycle-policy-v1` (+ implementation) |
| **Scope** | Policy doc + transactional service; not part of delete/deactivate v1 |

---

## E. Legacy guard — **implemented**

Batch **`instructor-hard-delete-zero-deps-v1`** added a guard on **`DELETE /api/users/delete`**:

- If target `User.role === 'INSTRUCTOR'` → **`409`** with stable code **`use_instructor_delete_policy`**
- Message: instruct admin to use People → Instructors → Profiles
- Prevents destructive user-level deletion bypassing People policy
- App Accounts tab delete for instructors should eventually call policy endpoints or be removed on demote (`people-management-app-accounts-demote-v1` — still deferred)

---

## F. Recommended batch sequence

| Order | Batch | Scope |
| ----- | ----- | ----- |
| 1 | **`instructor-delete-policy-v1-docs`** | This policy doc + DEC-019 + memory (**done** when merged) |
| 2 | **`instructor-hard-delete-zero-deps-v1`** | `DELETE /api/admin/instructors/[id]` + UI allowed/blocked + legacy guard (**done** when merged) |
| 3 | **`instructor-deactivate-v1`** | Deactivate endpoint + UI badge + scheduling filters |
| 4 | **`people-management-instructor-app-access-lifecycle-policy-v1`** | Remove/reactivate app access policy + API |
| 5 | **`people-management-app-accounts-demote-v1`** | Demote tab **after** policy-driven delete/deactivate + legacy guard |
| 6 | **`instructor-archive-schema-v1`** (optional, D4) | `Instructor.status` / `archivedAt` if product requires formal archive |

---

## Explicit non-goals (docs slice)

- No runtime, API, UI, Prisma, migration, RLS, auth, or route changes.
- No data deletion.
- No App Accounts demote.
- No instructor app-access remove/reactivate implementation.

## Related decisions

- DEC-011 / DEC-012 — Student People row UX (delete policy-driven)
- DEC-014 — App access lifecycle separate from delete (students)
- DEC-018 — Instructor unified editor; Delete blocked until policy implementation
- DEC-019 — Instructor delete vs deactivate vs app access (this policy)
