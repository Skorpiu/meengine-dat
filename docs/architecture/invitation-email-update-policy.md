# Pending invitation email update — Policy (v1)

**Batch:** `invitation-email-update-policy-doc-v1` (+ runtime slice `invitation-email-update-unlinked-instructor-v1`)  
**Status:** Policy accepted (DEC-029). **Runtime slices 2a + 2b done** — unlinked INSTRUCTOR and STUDENT pending invitations (`POST /api/admin/invitations/[id]/change-email` + Onboarding UI per role tab). Slice 2c (linked student) deferred.  
**Decision:** [DEC-029](./decision-log.md)  
**Related:** [DEC-024](./decision-log.md) (Student Change email), [DEC-028](./decision-log.md) (Instructor Change email), [student-app-access-lifecycle-policy.md](./student-app-access-lifecycle-policy.md), [instructor-email-change-policy.md](./instructor-email-change-policy.md)

---

## Purpose

Define the safe School Admin policy for changing the **email on a pending `UserInvitation`** without always requiring revoke + create. This is **distinct** from Student or Instructor **Change email** flows, which apply only when a **profile** (`Student` / `Instructor` + `User`) already exists.

**Today:** admins change a pending invitation email by **Revoke** + **Send new invitation** (Onboarding or Profiles).  
**Future runtime:** dedicated change-email on the invitation row with **token regeneration** (see phased plan below).

---

## Scope boundary

| Flow | Applies to | Canonical email before accept |
| ---- | ---------- | ------------------------------ |
| Student Change email (DEC-024) | Student **with profile** | `Student.email` (+ `User.email` when APP_USER) |
| Instructor Change email (DEC-028) | Instructor **with profile** | `User.email` only |
| **Invitation email update (this policy)** | **`UserInvitation` with `status = PENDING`** | `UserInvitation.email` only |

**Out of scope:**

- Accepted, revoked, or expired-as-status invitations (no in-place email edit)
- Replacing Student/Instructor Change email
- Auto-resend email to the new address in v1
- Changes to accept route, token generation algorithm, or email provider

**Safe fallback (always valid):** Revoke pending invitation + Send new invitation.

---

## Current model — `UserInvitation`

| Field | Detail |
| ----- | ------ |
| `id` | Primary key (cuid) |
| `organizationId` | Tenant scope |
| `email` | Invitation destination; normalized `trim().toLowerCase()` in app |
| `role` | `STUDENT` or `INSTRUCTOR` only |
| `tokenHash` | SHA-256 hex of raw token; `@unique`; **raw token never persisted** |
| `status` | `PENDING` \| `ACCEPTED` \| `EXPIRED` \| `REVOKED` |
| `expiresAt` | Default +7 days from create |
| `studentId` | Optional — set when inviting an **existing** Student record |
| `acceptedUserId`, `revokedAt`, `acceptedAt` | Lifecycle timestamps |

**Indexes:** `(organizationId)`, `(organizationId, email)`, `(organizationId, status)`, `(organizationId, studentId)` — **no** DB unique on pending email per tenant (enforced in application on create).

**Runtime today:**

- Create: `POST /api/admin/invitations` or `POST /api/admin/students/[id]/invite`
- List: `GET /api/admin/invitations`
- Revoke: `POST /api/admin/invitations/[id]/revoke`
- Accept: `POST /api/invitations/accept` (lookup by `tokenHash` only)

---

## Lifecycle

| Phase | Behaviour |
| ----- | --------- |
| **Create** | Generate raw token → store `tokenHash`; return `inviteLink` **once**; best-effort email via `attemptInvitationEmailDelivery` |
| **List** | Tenant-scoped; DTO never exposes `tokenHash` |
| **Revoke** | Only `PENDING`; linked Student may revert to `MANUAL_ONLY` when last pending invite removed |
| **Accept preview / accept** | Lookup invitation by `tokenHash`; read **`UserInvitation.email` from row at accept time** to create `User.email` |
| **Expiry (wall-clock)** | Evaluated in accept guard + admin UI display; DB often remains `PENDING` until revoke/accept — `EXPIRED` enum exists but is **not** written by current create/revoke/accept paths |

---

## Token vs email

| Fact | Implication |
| ---- | ----------- |
| Token is `randomBytes(32)` → base64url; hash stored | **Independent of email** |
| Accept uses `invitation.email` at accept time | In-place email update **without** token change would make old links register the **new** email |
| Raw token not stored after create | Admin cannot re-copy link without regenerate or new invitation |
| Email sent to old address contains old link | If email changes but token stays, recipient of old email could still accept with wrong semantic pairing |

### Rejected policy — same-token email update

**REJECT:** Update `UserInvitation.email` while keeping the same `tokenHash`.

**Reason:** A link copied or emailed to the **old** address remains valid and would accept into the **new** email — wrong recipient / wrong audit trail. Product and security posture reject this even though accept would technically succeed.

### Accepted policy — regenerate-token email update

**ACCEPT:** Within one transaction:

1. Row lock on `user_invitations` (`SELECT … FOR UPDATE` where applicable)
2. Validate invitation is `PENDING` in session tenant
3. Normalize and validate new email; collision checks (below)
4. Update `UserInvitation.email`
5. **Regenerate** raw token → new `tokenHash` (invalidates all previous links)
6. Return new `inviteLink` **once** (same pattern as create)
7. **Do not** auto-send email in v1 — admin copies link or uses separate send flow if added later

**Linked Student (`studentId` set):** also update `Student.email` in the same transaction; **preserve** `appAccessMode = INVITED`; **do not** create or link `User`.

**Unlinked Student / Instructor:** update invitation email + token only.

---

## Matrix — pending invitation by type

| Type | Where in UI | `studentId` | Profile before accept | Future update must |
| ---- | ----------- | ----------- | --------------------- | ------------------ |
| **Student unlinked** | Onboarding → Students | `null` | None | Update invitation + regenerate token |
| **Student linked** | Students → Profiles (not Onboarding list) | set | `Student`; `INVITED` | Sync `Student.email`; keep `INVITED`; regenerate token |
| **Instructor unlinked** | Onboarding → Instructors | N/A | None | Update invitation + regenerate token |

**Not invitation-email-update:**

- Student **INVITED** today can use **Student Change email** (DEC-024): revokes pending invites, updates `Student.email`, sets `MANUAL_ONLY`, admin re-sends invitation. Future linked-student invitation update is a **lighter** alternative (keeps `INVITED` + same invitation id).

- Instructor **with profile** uses **Instructor Change email** (DEC-028), not this policy.

---

## Required validations (future runtime)

| Check | On failure |
| ----- | ---------- |
| Invitation exists in session `organizationId` | 404 `invitation_not_found` |
| `status === PENDING` | 409 `invitation_not_pending` |
| `newEmail` normalized + valid format | 400 `invalid_email` |
| `newEmail` ≠ current (normalized) | 400 `email_unchanged` |
| No `User` with same email globally | 409 `user_already_exists` |
| No other `PENDING` invitation in tenant for new email | 409 `pending_invitation_exists` |
| No other `Student` in org with same email (case-insensitive) | 409 `student_email_already_in_use` |
| Linked student: `Student.userId` must be null | 409 `student_already_linked` |
| Demo org | 403 demo guard code |

**Note:** `createInvitation` today does **not** check org-level `Student.email` collision — future invitation email update should close this gap.

---

## Expired invitations (wall-clock)

Pending rows past `expiresAt` remain `status = PENDING` in DB; admin UI shows **Expired** client-side.

**Recommended runtime decision (D2 inside approved batch):**

- **Allow** change-email on wall-clock-expired but still-`PENDING` invitations, with token regeneration and **reset `expiresAt`** to a fresh window (e.g. +7 days from change), **or**
- **Defer** expiry extension to runtime implementation choice — policy requires token regeneration either way.

**Alternative (stricter):** require **Revoke** first on expired invites — valid fallback, not required if runtime implements reset above.

Accept route continues to reject expired invitations regardless until accept logic changes (out of scope).

---

## API — slice 2a (implemented)

```
POST /api/admin/invitations/[id]/change-email
Body: { "newEmail": "..." }
```

**Scope (v1 runtime):** `PENDING` + `studentId = null` + `role = INSTRUCTOR` or `role = STUDENT` (unlinked). Linked student (`studentId` set) deferred to slice 2c.

**Guards:**

- `SUPER_ADMIN` session + `organizationId` from session (never from body)
- Tenant host guard (`assertUserTenantHost`)
- Demo mutation guard (`rejectDemoUserManagementMutation` / `user_management`)

**Response:** `{ invitation, inviteLink }` — no auto-send email in v1.

**Explicitly not changed in slice 2a:**

- `POST /api/invitations/accept`
- `generateInvitationToken` / `hashInvitationToken` algorithms
- Email provider / templates (except optional future batch)

---

## UI — slices 2a + 2b (implemented)

- **Instructors → Onboarding** pending unlinked invitation rows: **Change email** beside **Revoke**
- **Students → Onboarding** pending unlinked invitation rows: **Change email** beside **Revoke**

## UI — slice 2c (deferred)

- **Students → Profiles** linked-student rows: **Change email** (future)
- Modal: current email read-only, new email, warnings:
  - “This updates the invitation email.”
  - “The previous invite link will stop working.”
  - “Copy the new link after saving.”
  - “Email is not sent automatically.”
- **Profiles** linked-student invites: phase 3 slice (optional; Change email on Student remains fallback)

---

## Phased runtime plan

| Phase | Batch | Status |
| ----- | ----- | ------ |
| 0 | `invitation-email-update-v1` | **Done** — analysis-only |
| 1 | `invitation-email-update-policy-doc-v1` | **Done** — this document + DEC-029 |
| 2a | `invitation-email-update-unlinked-instructor-v1` | **Done** — API + Onboarding UI (INSTRUCTOR); token regeneration; no auto-send |
| 2b | `invitation-email-update-unlinked-student-v1` | **Done** — + STUDENT unlinked Onboarding; org `Student.email` collision check |
| 2c | `invitation-email-update-linked-student-v1` | **Deferred** — + Profiles linked student sync |

**Runtime gate (2a):** `APPROVED TO IMPLEMENT: invitation-email-update-unlinked-instructor-v1`

---

## Explicit non-goals

- No same-token email update
- No auto-resend email in v1
- No edit of ACCEPTED / REVOKED invitations
- No schema / migration / RLS / accept-route / auth-core changes in policy batch
- No replacement of Student or Instructor Change email
- Revoke + new invitation remains supported fallback

---

## Related decisions

- DEC-024 — Student Change email (profile)
- DEC-025 — Pending instructor invites in Onboarding only
- DEC-028 — Instructor Change email (profile); pending invite without profile → this policy
- DEC-029 — Pending invitation email update (this document)
