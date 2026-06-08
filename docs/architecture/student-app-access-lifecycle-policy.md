# Student app access lifecycle policy

## Purpose

Documents **Remove** and **Reactivate app access** for School Admin People management. Change email remains a future slice.

---

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

### Stable errors (remove)

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

**Idempotency:** Second remove → **409** `student_app_access_already_removed`.

---

## Reactivate app access (`people-management-app-access-reactivate-v1`)

**Goal:** Restore app login on the **same** Student profile by re-linking an existing orphan User when safe. Never creates a duplicate Student.

### API

- `POST /api/admin/students/[id]/app-access/reactivate`
- Same guards as remove (admin, tenant, demo).
- Optional JSON body reserved for future category/transmission updates; v1 ignores body safely.

### Eligibility

- Student in tenant with `appAccessMode === MANUAL_ONLY`, `userId === null`.
- Canonical `Student.email` present and valid.
- No **PENDING** invitation on the Student.
- Not `INVITED` / not already `APP_USER`.

### Path A — orphan User relink (implemented)

Find User where:

- `email` = normalized Student email
- `role === STUDENT`
- `organizationId` = tenant
- Not linked to a **different** Student (`students.userId`)

Then atomically:

1. `User.isApproved = true` (User row preserved)
2. `Student.userId = user.id`, `Student.appAccessMode = APP_USER`
3. Normalize `Student.email` to canonical form

Category/transmission: edit after reactivate via normal **Edit Student → App access** (v1 conservative).

### Path B — no orphan User

Returns **409** `reactivate_orphan_user_not_found` with message to use **Send invitation** on the profile row. Does **not** auto-invite or create Students.

### Path C — User linked to another Student

**409** `user_linked_to_other_student`.

### Path D — email mismatch

If orphan User email does not match Student canonical email after normalization → **409** `student_email_user_mismatch`. Requires future **Change email** batch (`people-management-student-email-change-policy-v1`).

### Stable errors (reactivate)

| Condition | HTTP | Code |
| --------- | ---- | ---- |
| Missing / cross-tenant Student | 404 | (message only) |
| Missing email | 400 | `missing_email` |
| Invalid email format | 400 | `invalid_email` |
| Already `APP_USER` / has userId | 409 | `student_already_has_app_access` |
| `INVITED` or pending invitation | 409 | `student_has_pending_invitation` |
| Not `MANUAL_ONLY` | 409 | `student_not_manual_only` |
| No orphan User (Path B) | 409 | `reactivate_orphan_user_not_found` |
| User linked elsewhere (Path C) | 409 | `user_linked_to_other_student` |
| Orphan role ≠ STUDENT | 409 | `orphan_user_role_mismatch` |
| Orphan wrong tenant | 409 | `orphan_user_tenant_mismatch` |
| Email mismatch (Path D) | 409 | `student_email_user_mismatch` |
| Demo org | 403 | demo guard code |

**Idempotency:** Second reactivate when already active → **409** `student_already_has_app_access`.

### UI

- **Edit Student → App access** section for eligible `MANUAL_ONLY` students: **Reactivate app access** + confirmation modal.
- After success: row → `APP_USER`, badges return, **Remove app access** available, **Send invitation** hidden.
- **Delete** remains separate; active app access blocks delete again (existing policy).

---

## Change email (`people-management-student-email-change-policy-v1`)

**Goal:** Explicit School Admin flow to change the canonical student email without diverging Student / User / invitation state.

### API

- `POST /api/admin/students/[id]/change-email` — body `{ "newEmail": "..." }`
- Admin-only (`SUPER_ADMIN`), tenant host guard, demo `user_management` mutation guard.
- Generic `PATCH /api/admin/students/[id]` rejects `email` unless `MANUAL_ONLY`, no `userId`, no pending invitation (**409** `use_change_email_flow`).

### Policy by mode

| Mode | Effects |
| ---- | ------- |
| **MANUAL_ONLY** (no user, no pending invite) | Update `Student.email`; global `User.email` + org student email + pending invitation collision checks |
| **INVITED** | Revoke PENDING invitations for Student; update `Student.email`; set `MANUAL_ONLY`; admin must **Send invitation** again (no auto-resend v1) |
| **APP_USER** | Atomic `Student.email` + `User.email`; delete `Session` rows; invalidate password-reset and email-verification tokens; admin attestation (`isEmailVerified=true`, `emailVerified=now()`) |
| **Post-remove MANUAL_ONLY** | Update `Student.email` only; orphan User unchanged; reactivate still validates email match |

### Stable errors (change email)

| Condition | HTTP | Code |
| --------- | ---- | ---- |
| Missing / cross-tenant Student | 404 | (message only) |
| Invalid / empty email | 400 | `invalid_email` |
| Same as current | 400 | `email_unchanged` |
| PATCH email on APP_USER / INVITED / linked / pending | 409 | `use_change_email_flow` |
| Global User email taken | 409 | `user_email_already_exists` |
| Another Student in org | 409 | `student_email_already_in_use` |
| Pending invitation for new email (other record) | 409 | `pending_invitation_exists` |
| APP_USER without linked user | 409 | `student_no_linked_user` |
| Linked User missing / wrong role / tenant | 409 | `linked_user_not_found` / `linked_user_role_mismatch` / `linked_user_tenant_mismatch` |
| Demo org | 403 | demo guard code |

### JWT limitation

After APP_USER change, DB sessions are deleted but **JWT cookies may remain valid until expiry** (NextAuth JWT strategy — same class of limitation as instructor deactivate, DEC-020). Old email cannot log in after `User.email` update.

### UI

- **Change email** button in Edit Student (profile for MANUAL_ONLY/reactivatable; App access for APP_USER/INVITED).
- Modal: current email read-only, new email, contextual warning copy.

---

## Explicit non-goals (remove + reactivate slices)

- No hard delete of User or Student.
- No auto-resend invitation after change email (admin uses **Send invitation**).
- No email notification to new address (deferred).
- No JWT hard invalidation / session version (deferred).
- No Prisma schema / migration / RLS / auth-core changes.

## Future slices

| Batch | Scope |
| ----- | ----- |
| `people-management-instructor-email-change-policy-v1` | Instructor Change email (separate batch) |
| `people-management-app-accounts-demote-v1` | **Done** — Advanced accounts removed from People UI |
| `users-delete-student-guard-v1` | **Done** — `DELETE /api/users/delete` returns **409** `use_student_delete_policy` for STUDENT |

## Related decisions

- DEC-014 — App access lifecycle product intent
- DEC-015 — Canonical student email
- DEC-016 — Remove app access v1
- DEC-017 — Reactivate app access v1 (orphan User relink; Path B → Send invitation)
- DEC-024 — Student Change email v1
