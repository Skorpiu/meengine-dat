# Admin Users page tenant scope audit

**Batch:** `admin-users-page-tenant-scope-v1` (analysis) + `admin-users-page-tenant-scope-fix-v1` (fix)  
**Date:** 2026-06-08  
**Route:** `/admin/users` (`app/admin/users/page.tsx`)

---

## Summary

The People page SSR loader previously fetched all `STUDENT` and `INSTRUCTOR` `User` rows **without** `organizationId` filtering. In a multi-tenant database this exposed cross-tenant PII through:

- **Advanced accounts** (read-only diagnostics)
- **Instructors → Profiles** (SSR `users` prop)

**Students → Profiles** was already safe via scoped APIs (`GET /api/admin/students`).

**Fix (v1):** scope SSR user loading to `session.user.organizationId`, matching `app/admin/page.tsx`. Loader extracted to `lib/people/admin-users-page-data.ts` with unit tests.

---

## Confirmed risk (pre-fix)

| ID | Finding | Severity |
| -- | ------- | -------- |
| R1 | `prisma.user.findMany` without `organizationId` | P1 read leak |
| R2 | Advanced accounts inherited unscoped SSR `users` | P1 |
| R3 | Instructors Profiles inherited unscoped SSR `users` | P1 |

---

## Scoped surfaces (unchanged / already safe)

| Surface | Tenant scope |
| ------- | ------------ |
| `GET /api/admin/students` and student mutations | `organizationId` from session + host guard |
| `GET/POST /api/admin/invitations` | Scoped |
| `PUT /api/users/update`, `POST /api/users/create` | Scoped; legacy delete guarded for STUDENT/INSTRUCTOR |
| `Category` / `TransmissionType` on page | Global catalog by design (no `organizationId` on model) |

---

## Fix implementation

- `loadAdminUsersPageData(organizationId)` — `where: { organizationId, role: { in: ['STUDENT','INSTRUCTOR'] } }`
- Page redirects to `/auth/login` when `session.user.organizationId` is missing (same pattern as `/admin` dashboard)
- Tests: `lib/people/admin-users-page-data.unit.test.ts`

---

## Deferred (out of fix v1 scope)

- Migrate Instructors list to dedicated API (`instructor-records-list-api-v1`)
- SSR host guard on admin pages (APIs already use `assertUserTenantHost`)
- `organizationId` NOT NULL enforcement / backfill apply

---

## Related memory

- [current-state.md](./current-state.md)
- [roadmap-todo.md](./roadmap-todo.md)
- [tenant-required-operational-organization-id-audit.md](./tenant-required-operational-organization-id-audit.md)
