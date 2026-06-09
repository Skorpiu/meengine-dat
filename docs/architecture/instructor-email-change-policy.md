# Instructor Change email — Policy (v1)

**Batch:** `people-management-instructor-email-change-v1`  
**Status:** **Runtime implemented** — service, API, UI, tests (DEC-028).  
**Decision:** [DEC-028](./decision-log.md)  
**Related:** [DEC-024](./decision-log.md) (Student Change email), [instructor-delete-policy.md](./instructor-delete-policy.md), [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md)

---

## Purpose

Define the safe School Admin policy for changing an **Instructor login email** before runtime implementation. Instructor email change is **simpler than Student** (no `appAccessMode`, no operational email column on `Instructor`) but must preserve deactivate/reactivate semantics, invitation rules, tenant isolation, and lesson/exam history.

---

## Current model

| Fact | Detail |
| ---- | ------ |
| **`Instructor.email`** | **Does not exist** in Prisma schema |
| **Canonical login email** | Always `User.email` (`@unique` globally) |
| **`Instructor.userId`** | **Required** (`@unique`) — every Instructor row has a linked `User` |
| **No Student-style modes** | No `MANUAL_ONLY` / `INVITED` / `APP_USER` on Instructor |
| **UI today** | Edit Instructor → App access shows login email **read-only**; `PUT /api/users/update` does **not** accept `email` |
| **Profiles / search** | `User.email` via `InstructorRecordUserDto` |
| **Pending INSTRUCTOR invitations** | `UserInvitation.email` in Onboarding only — **no** `Instructor` row until accept (DEC-025) |

---

## Comparison with Student Change email (DEC-024)

| Aspect | Student | Instructor (this policy) |
| ------ | ------- | ------------------------ |
| Canonical email storage | `Student.email` (+ sync `User.email` when APP_USER) | `User.email` only |
| Access modes | MANUAL_ONLY / INVITED / APP_USER | Always User + Instructor profile |
| Dedicated endpoint | `POST /api/admin/students/[id]/change-email` | **Future:** `POST /api/admin/instructors/[id]/change-email` |
| Generic update guard | PATCH student → `use_change_email_flow` | PUT users/update must **not** gain email; change-email only |
| Post-change profile fields | May update `Student.email` + `appAccessMode` | Updates `User.email` only |
| History preservation | Via `Student.id` | Via `Instructor.id` (lessons/exams FKs) |

---

## Policy by state

### In scope — Instructor with profile (`Instructor` + `User`)

All three operational states use the **same** change-email effects on `User.email`; lifecycle flags are **preserved**.

| State | Signals | Change email allowed? | Preserved after change |
| ----- | ------- | --------------------- | ---------------------- |
| **Active** | `isApproved=true`, `isAvailableForBooking=true` | Yes | Approval + booking availability |
| **Pending approval** | `isApproved=false`, `isAvailableForBooking=true` (typical post-invite accept) | Yes | Stays pending approval |
| **Deactivated** | `isApproved=false`, `isAvailableForBooking=false` | Yes | Stays deactivated — **no auto-reactivate** |

**Lessons / exams (past or future):** Allowed. Relations use `Lesson.instructorId` / `Exam.examinerId`, not email. History is unchanged.

### Out of scope — Pending INSTRUCTOR invitation (no profile)

| State | Policy |
| ----- | ------ |
| **Pending invitation** (Onboarding, no `User` / `Instructor` yet) | **Not** Instructor change-email. **v1 workaround:** Revoke invitation + Send new invitation. **Deferred:** `invitation-email-update-v1` |

---

## Future API (implemented — v1)

```
POST /api/admin/instructors/[id]/change-email
Body: { "newEmail": "..." }
```

**Runtime (v1):**

- Route: `app/api/admin/instructors/[id]/change-email/route.ts`
- Service: `lib/instructors/instructor-email-change-service.ts`
- UI: Edit Instructor → App access → **Change email** (`components/admin/instructor-email-change-dialog.tsx`)

**Guards:**

- `SUPER_ADMIN` session + `organizationId` from session (never from body)
- Tenant host guard (`assertUserTenantHost`)
- Demo mutation guard (`rejectDemoUserManagementMutation` / `user_management`)

**Do not use:** `PUT /api/users/update` for email changes.

---

## Required validations (runtime v1)

| Check | On failure |
| ----- | ---------- |
| Instructor exists in session `organizationId` | 404 |
| Linked `User` exists; `role === INSTRUCTOR`; `organizationId` matches tenant | 409 |
| `newEmail` normalized + valid format | 400 `invalid_email` |
| `newEmail` ≠ current | 400 `email_unchanged` |
| No other `User` with same email (exclude linked user) | 409 `user_email_already_exists` |
| No `UserInvitation` PENDING in tenant for new email (other record) | 409 `pending_invitation_exists` |

**Note:** Unlike Student, there is no per-org `Student.email` collision check.

---

## Required side effects (runtime v1)

Within a single transaction (after row lock on `instructors`):

1. **Update** `User.email` to normalized new email.
2. **Admin attestation:** `isEmailVerified=true`, `emailVerified=now()` (aligned with DEC-024 APP_USER — School Admin attests control of the new address).
3. **Invalidate access** for linked user:
   - `Session.deleteMany` where `userId`
   - Mark unused `PasswordResetToken` / `EmailVerificationToken` as used; clear legacy token fields on `User` if present
4. **Revoke** PENDING `UserInvitation` rows where `role=INSTRUCTOR` and email = **old** normalized email in tenant (same pattern as deactivate).
5. **Preserve** `User.isApproved` and `Instructor.isAvailableForBooking` — unchanged.

**Explicitly not done in v1:**

- Auto-reactivate deactivated instructors
- Auto-resend invitation to new email
- Email notification to old or new address
- JWT version / forced global sign-out beyond DB session delete

---

## JWT / session limitation

Same class of limitation as DEC-024 and instructor deactivate (DEC-020): after DB `Session` rows are deleted, **already-issued JWT cookies may remain valid until expiry** (NextAuth JWT strategy). Login with the **old** email must fail once `User.email` is updated.

---

## Suggested stable error codes (runtime v1)

| Condition | HTTP | Code |
| --------- | ---- | ---- |
| Missing / cross-tenant instructor | 404 | (message only) |
| Invalid / empty email | 400 | `invalid_email` |
| Same as current | 400 | `email_unchanged` |
| Global User email taken | 409 | `user_email_already_exists` |
| Pending invitation for new email | 409 | `pending_invitation_exists` |
| Linked User missing | 409 | `linked_user_not_found` |
| Linked User wrong role | 409 | `linked_user_role_mismatch` |
| Linked User wrong tenant | 409 | `linked_user_tenant_mismatch` |
| Transaction / unexpected failure | 409 | `instructor_change_email_failed` |
| Demo org | 403 | demo guard code |

---

## UI (implemented v1)

- **Change email** action in **Edit Instructor → App access** (mirrors Student modal pattern).
- Login email remains read-only in the main form; dedicated modal with current email + new email + contextual warnings.
- Copy clarifies: pending invitations without a profile are changed via Onboarding (revoke + resend), not this action.

---

## Phased plan

| Phase | Batch | Status |
| ----- | ----- | ------ |
| 0 | `people-management-instructor-email-change-policy-v1` | **Done** — analysis |
| 1 | `people-management-instructor-email-change-policy-doc-v1` | **Done** — this document + DEC-028 |
| 2 | `people-management-instructor-email-change-v1` | **Done** — service + route + UI + tests |
| — | `invitation-email-update-v1` | **Deferred** — edit pending invitation email without revoke |

**Runtime gate:** ~~`APPROVED TO IMPLEMENT: people-management-instructor-email-change-v1`~~ **Closed** (runtime v1 merged).

---

## Explicit non-goals

- No `Instructor.email` schema column
- No Student Change email changes
- No People layout / App Accounts changes
- No Platform identity policy
- No NOT NULL / RLS / billing / auth-core changes in policy or doc batch
- No pending-invitation email edit in Instructor change-email v1

---

## Related decisions

- DEC-018 — Edit Instructor unified UX; login email read-only in App access
- DEC-020 — Instructor deactivate/reactivate; invitation revoke by email; JWT limitation
- DEC-024 — Student Change email (parallel security patterns)
- DEC-025 — Pending instructor invites live in Onboarding only
- DEC-028 — Instructor Change email policy (this document)
