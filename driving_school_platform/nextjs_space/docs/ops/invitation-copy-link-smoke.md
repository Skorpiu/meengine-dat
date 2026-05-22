# Invite-only copy-link manual smoke checklist

Manual validation for **School Admin → copy invite link → private accept** before relying on invite-only onboarding in production or before integrating an email provider. Uses **placeholders only** — never paste real passwords, invite URLs, or API secrets into tickets, screenshots, or this doc.

**Prerequisites**

| Item         | Notes                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment  | Non-production tenant host (preview/staging) or a dedicated test org — not live customer data unless explicitly approved.                                                 |
| Migration    | `UserInvitation` migration applied on the target DB ([`20260521120000_add_user_invitations`](../../prisma/migrations/20260521120000_add_user_invitations/migration.sql)). |
| Gate         | `pnpm -C driving_school_platform/nextjs_space check` passes on the deployed commit.                                                                                       |
| School Admin | Tenant `SUPER_ADMIN` credentials from your secret process — e.g. `SCHOOL_ADMIN_EMAIL` / `SCHOOL_ADMIN_PASSWORD` (placeholders).                                           |
| Browser      | Two contexts: normal window (admin) + **private/incognito** window (accept).                                                                                              |

**Related:** [invite-only-foundation-plan.md](../engineering/invite-only-foundation-plan.md), [release-checklist.md](./release-checklist.md), [api-response-contract-baseline.md](../engineering/api-response-contract-baseline.md).

---

## 1. Student invite — happy path

| Step | Action                                                                                                                                                 | Expected                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1.1  | Sign in as School Admin on tenant host → **Admin → Users** → **Invitations**.                                                                          | Invitations card loads; list has no raw token or full invite URL.        |
| 1.2  | Create invitation: email `student-smoke+PLACEHOLDER@example.com`, role **Student**, default expiry.                                                    | Success toast; **amber** “Private invite link — copy now” alert appears. |
| 1.3  | Click **Copy invite link**.                                                                                                                            | Button shows **Copied!** (briefly); toast confirms copy.                 |
| 1.4  | Confirm invitation list row shows email, role, status **Pending**, expiry — **no** `token`, `tokenHash`, or invite URL in UI or network list response. | List `GET /api/admin/invitations` has no link/hash fields.               |
| 1.5  | Open copied link in **private window** (do not share link in chat/ticket).                                                                             | `/invitations/accept` shows org name, email, role Student.               |
| 1.6  | Complete accept: first name `Smoke`, last name `Student`, password `PLACEHOLDER_STRONG_PASSWORD`.                                                      | Success message + **Go to login**.                                       |
| 1.7  | Sign in on tenant host with invitee email + password.                                                                                                  | Lands as **Student** in correct org.                                     |

Record: date `____`, environment `____`, org slug `____`, admin operator `____` (initials).

---

## 2. Instructor invite — happy path

| Step | Action                                                                              | Expected                                        |
| ---- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| 2.1  | Create invitation: `instructor-smoke+PLACEHOLDER@example.com`, role **Instructor**. | New pending row; new one-time link in alert.    |
| 2.2  | Accept in a **fresh private window** with distinct name/password placeholders.      | Account created; login works as **Instructor**. |

---

## 3. Revoke pending invite

| Step | Action                                                                                                       | Expected                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 3.1  | Create a **throwaway** pending invite (unique email `revoke-smoke+PLACEHOLDER@example.com`). Copy link once. | Pending + link alert.                                        |
| 3.2  | Click **Revoke** on that row (only visible for **Pending**). Confirm dialog.                                 | Status **Revoked**; revoke button gone.                      |
| 3.3  | Open saved link in private window.                                                                           | Clear error: invitation **revoked** (not a generic failure). |

---

## 4. Already accepted link

| Step | Action                                                                                    | Expected                                                            |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 4.1  | Re-open the **Student** (or Instructor) accept URL from §1 or §2 after successful accept. | Error: invitation **already used** / accepted; form not shown.      |
| 4.2  | Optional: submit accept again via devtools with same token.                               | API rejects with `invitation_already_accepted` (no duplicate user). |

---

## 5. Existing user (post-accept re-invite)

| Step | Action                                                                                                    | Expected                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 5.1  | After §1 or §2 (user already created), try **Create invitation** for the **same** email again (any role). | Toast/error before any link alert: account already exists (`user_already_exists`, HTTP **409**).                     |
| 5.2  | Confirm no new amber invite-link alert and no new pending row with a fresh link.                          | `POST /api/admin/invitations` body has **no** `inviteLink`; accept flow still blocks same email as defense in depth. |

---

## 6. Duplicate pending (same email)

| Step | Action                                                                                                                   | Expected                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 6.1  | While a **Pending** invite exists for `student-smoke+PLACEHOLDER@example.com`, create another for the **same** email.    | Toast/error: pending invitation already exists (`pending_invitation_exists`). |
| 6.2  | Revoke the pending row, then create again (email must still have **no** User — use a throwaway email not used in §1–§2). | Create succeeds (new one-time link).                                          |

---

## 7. Security / data exposure checks

| Check           | Expected                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- |
| List API / UI   | No `inviteLink`, raw `token`, or `tokenHash` in list view or `GET /api/admin/invitations` JSON. |
| Accept GET      | Preview returns email, role, org name, expiry — **no** token hash.                              |
| Link handling   | Invite URL treated as secret; not stored in browser localStorage by admin UI.                   |
| Create response | `inviteLink` only in create response / one-time admin alert.                                    |

---

## 8. Loading / double-submit (quick)

| Check             | Expected                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Create invitation | Button **Creating…**; form disabled until finished; no duplicate rows from double-click. |
| Revoke            | **Revoking…** on that row only; other actions not stuck.                                 |
| Accept form       | **Creating account…**; fields disabled during submit.                                    |

---

## Sign-off

| Field               | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Result              | ☐ Pass ☐ Fail                                         |
| Commit / deploy ref | `____`                                                |
| Blockers (if fail)  | `____`                                                |
| Email provider      | ☐ Still not integrated (expected for copy-link phase) |

**Fail criteria:** token or link visible in list; accept works after revoke; duplicate pending allowed; unclear errors for revoked/expired/accepted.

**Next (out of scope here):** email provider batch, distributed rate limit on accept — [invite-only-foundation-plan.md](../engineering/invite-only-foundation-plan.md).
