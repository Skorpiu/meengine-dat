# Student app access lifecycle policy

## Purpose

Documents the **Remove app access** v1 behavior for School Admin People management. Reactivate and Change email remain future slices.

## Remove app access (`people-management-app-access-remove-v1`)

**Goal:** Disable the student's app login while **preserving** the Student profile and all operational history (lessons, payments, exams, imports, audit).

### API

- `POST /api/admin/students/[id]/app-access/remove`
- Admin-only (`SUPER_ADMIN`), tenant host guard, demo `user_management` mutation guard.

### Transactional effects

1. Validate Student exists in tenant with `appAccessMode === APP_USER`, `userId` present, linked User role `STUDENT`, same `organizationId`.
2. Revoke all **PENDING** `UserInvitation` rows linked to the Student.
3. Delete active `Session` rows for the linked User.
4. Invalidate unused `PasswordResetToken` and `EmailVerificationToken` rows for the User (mark `usedAt`).
5. Set linked User `isApproved = false`; clear legacy inline reset/verification token fields on User. **User row is preserved** (no hard delete).
6. Update Student: `userId = null`, `appAccessMode = MANUAL_ONLY`.
7. **Preserve** lessons, payments, exam registrations, lesson counters, category/transmission on Student profile.

### Canonical email on remove

- If `Student.email` is empty, copy linked `User.email` onto the Student record.
- If `Student.email` is already set, **keep unchanged** (operational email may differ; Change email is a future batch).

### Stable errors

| Condition | HTTP | Code |
| --------- | ---- | ---- |
| Missing / cross-tenant Student | 404 | (message only) |
| Not `APP_USER` (e.g. INVITED) | 409 | `student_not_app_user` |
| Already removed (`MANUAL_ONLY`, no user) | 409 | `student_app_access_already_removed` |
| No linked user on APP_USER row | 409 | `student_no_linked_user` |
| Linked User missing | 409 | `linked_user_not_found` |
| Linked User role ≠ STUDENT | 409 | `linked_user_role_mismatch` |
| Linked User wrong tenant | 409 | `linked_user_tenant_mismatch` |
| Demo org | 403 | demo guard code |

**Idempotency:** Second remove on an already-removed student returns **409** `student_app_access_already_removed` (not a silent no-op).

### UI

- **Edit Student → App access** section: destructive **Remove app access** button (APP_USER only).
- Strong confirmation modal; does not auto-run on Delete.
- Blocked Delete copy directs admin to Remove app access first when app access is active.

### Explicit non-goals (this slice)

- No hard delete of User or Student.
- No Reactivate app access (`people-management-app-access-reactivate-v1`).
- No Change email (`people-management-student-email-change-policy-v1`).
- No App Accounts tab demote (`people-management-app-accounts-demote-v1` — deferred until remove/reactivate safe).
- No Prisma schema / migration / RLS changes.

### Deferred hardening

- Dedicated bulk invalidation helper for auth tokens (currently uses existing token models in-transaction).
- Login block after remove relies on `isApproved=false` + session deletion; no auth-core changes in v1.

## Future slices

| Batch | Scope |
| ----- | ----- |
| `people-management-app-access-reactivate-v1` | Re-enable app access; reuse profile/account where safe |
| `people-management-student-email-change-policy-v1` | Canonical Change email (Student + User + invitations) |
| `people-management-app-accounts-demote-v1` | Simplify App accounts tab after lifecycle parity |

## Related decisions

- DEC-014 — App access lifecycle product intent
- DEC-015 — Canonical student email
