# Mobile / tablet readiness review

**Batch:** `mobile-tablet-readiness-review-v1`  
**Date:** 2026-07-10  
**Scope:** docs-only review + optional localized layout fixes (no API/schema/auth/billing/audit changes)

## 1. Executive summary

DAT has **basic responsive scaffolding** (Tailwind breakpoints, mobile navbar, stacked grids on dashboards, card-based People lists, responsive lesson booking forms) but remains **desktop-first** overall.

**Production decision (aligned with DEC-032):** Mobile/tablet gaps are **not production blockers** for the controlled first B2B client. School secretaria is expected to operate primarily on **desktop or tablet landscape**; student/instructor mobile use is **secondary** (schedule check, not full admin workflows).

**Highest-impact gaps:** Schedule Map week/month views — **mitigated**; admin Lessons/Vehicles/Audit logs narrow-viewport polish **done** in admin-surfaces slice; Settings tables remain scroll-only (deferred/internal).

**Recommended next slice:** `competitive-product-discovery-v1` — only after explicit approval/waiver (DEC-007).

**Implemented (2026-07-10):** `mobile-tablet-readiness-schedule-map-v1` — week/month disabled below `lg` (1024px); auto-fallback to day on resize; helper copy; edit/delete/nav touch targets `h-11` on narrow viewports; helpers in `lib/schedule/schedule-map-responsive.ts`.

**Implemented (2026-07-10):** `mobile-tablet-readiness-pwa-manifest-v1` — `manifest.webmanifest`, `dat-icon.svg`, theme-color/background metadata; no service worker.

**Implemented (2026-07-10):** `mobile-tablet-readiness-admin-surfaces-v1` — Lessons row stack on narrow viewports; Vehicles badge wrap + touch targets; Audit logs card fallback below `md` (privacy-minimal fields only).

**Implemented (2026-07-10):** `mobile-tablet-readiness-playwright-viewports-v1` — opt-in `pnpm e2e:mobile-viewports` via `playwright.mobile-viewports.config.ts`; projects `desktop-chromium`, `mobile-chromium` (Pixel 5), `tablet-chromium` (810×1080 Chromium); read-only admin loads on `/admin`, `/admin/lessons`, `/admin/vehicles`, `/admin/audit-logs`, `/admin/users` (15 tests); not in `pnpm check`.

---

## 2. Review methodology

- Static code review of primary routes and shared components under `driving_school_platform/nextjs_space`.
- Breakpoints: Tailwind defaults (`sm` 640px, `md` 768px, `lg` 1024px).
- Viewports considered: phone portrait (~375px), tablet portrait (~768px), tablet landscape / small laptop (~1024px).
- No device lab runs in the original review batch; Playwright mobile viewport smoke added in `mobile-tablet-readiness-playwright-viewports-v1` (opt-in; not in `pnpm check`).
- Separated **production blockers** from **polish** per DEC-032 cutline.

---

## 3. Answers to review questions

### Is DAT usable on tablet for school admin / secretaria operations?

**Partially yes — with caveats.**

| Area | Tablet portrait | Tablet landscape |
| ---- | --------------- | ---------------- |
| People (`/admin/users`) | Usable — card rows stack; L2 tabs may crowd | Good |
| Lesson Management (`/admin/lessons`) | Usable — 3-column dashboard stacks below `lg`; header/actions improved in this batch | Good |
| Schedule Map (`/admin`) | **Weak** in week/month; day view OK with scroll | Acceptable in day view |
| Vehicles (`/admin/vehicles`) | Improved in this batch (stacked rows); still badge-dense | Good |
| Audit logs (`/admin/audit-logs`) | Usable via horizontal scroll; not ideal | Acceptable |
| Settings (`/admin/settings`) | Operator/internal; table scroll | Acceptable |
| Import/export dialogs | Good — preview tables have `overflow-x-auto` | Good |

**Verdict:** Secretaria can run daily ops on **tablet landscape** or **desktop**. Tablet portrait is workable for People and Lessons lists; Schedule Map and Vehicles need care.

### Is DAT usable on mobile for student / instructor?

**Limited — day view only; not mobile-first.**

| Surface | Usability | Notes |
| ------- | --------- | ----- |
| Auth (login, forgot, reset) | **Good** | Centered layout, `h-11` inputs |
| Student dashboard | **Partial** | Default Schedule Map **day** view OK; week/month poor |
| Instructor dashboard | **Partial** | Booking dialogs/forms responsive; map edit/delete targets small (24px) |
| Profile / preferences | **OK** | Same layout patterns as dashboards |

**Verdict:** Mobile is acceptable for **read-only schedule check** (day view). Instructor booking on phone works via dialogs but is not optimized. Not a primary production persona for v1.

### Which pages are OK?

- Auth flows (`/auth/login`, forgot/reset password, verify email)
- People Management profiles/onboarding (card-based, `sm:` stacking)
- Instructor lesson booking / exam dialogs (`lesson-form-styles.ts` patterns)
- Import/export preview dialogs (scrollable tables)
- Platform operator page (grids collapse; internal use)
- Admin stats grids and lesson dashboard column stack (`lg:grid-cols-3`)

### Which pages are desktop-first only?

- Schedule Map **week** and **month** views (all roles)
- Audit logs table (8 columns, scroll-only)
- Settings / feature flags tables (6–7 columns)
- Vehicles rows (dense badges + inline maintenance — mitigated in this batch)
- Operator settings headers (partially dense)

### What risks block production?

**None identified as P0 blockers** for DEC-032 controlled first B2B client.

Documented **expectation management** risk (P2): if client assumes full secretaria on phone portrait, they will hit friction on Schedule Map and tables. Mitigate via onboarding copy / operator guidance ([first-client-onboarding-record.md](./first-client-onboarding-record.md)).

### P1 vs P2 improvements

| Priority | Item | Rationale |
| -------- | ---- | --------- |
| **P1 (workflow friction, not production gate)** | Schedule Map week/month on narrow viewports | Core admin/instructor surface; illegible below ~640px |
| **P1 (workflow friction)** | Schedule Map edit/delete touch targets (24px icons) | Instructor mobile edits are error-prone |
| **P2** | PWA manifest / icons / theme-color | Installable home-screen experience |
| **P2** | Audit/settings table card fallback on mobile | Scroll works; UX polish |
| **P2** | Navbar density (language + bell + avatar + menu) | Crowded on small screens |
| **P2** | Badge tooltips (hover-only) on People profiles | Context lost on touch |
| **P2** | Playwright mobile viewport smoke | QA gap |
| **P2** | Touch targets &lt;44px on calendar controls | Below common HIG |
| **P2** | Register page category grid `grid-cols-3` at 320px | Minor auth polish |

### What should be resolved before the first real client?

Per DEC-032: **operational/deploy discipline**, not mobile redesign.

**Recommended operator stance for v1:**

1. Document supported devices: desktop/laptop for secretaria; tablet landscape acceptable; phone for student/instructor **schedule glance** (day view).
2. Do **not** promise full admin on phone portrait until Schedule Map slice ships.
3. Optional: add one line to first-client onboarding checklist.

**No mobile slice is required before go-live** unless the client contract explicitly requires mobile admin.

### Small safe fixes applied in this batch

| File | Change | Justification |
| ---- | ------ | ------------- |
| `components/admin/vehicles-management-client.tsx` | Vehicle list rows + card header stack on `&lt;sm` | Matches People card pattern; prevents horizontal overflow |
| `components/admin/lessons-management-client.tsx` | Lesson Management header stacks on `&lt;sm` | Prevents cramped Import/Export/Refresh toolbar |
| `components/admin/users-management-client.tsx` | L2 Profiles/Onboarding tabs wrap | Aligns with L1 tab pattern |

---

## 4. Readiness matrix

| Area / page | Current state | Risk | Priority | Recommendation | Next slice |
| ----------- | ------------- | ---- | -------- | -------------- | ---------- |
| **Global — PWA** | `manifest.webmanifest`, SVG icon, theme-color via layout metadata; **no service worker / offline** | Low (v1) | P2 done | Install/home-screen metadata only; defer offline SW | — |
| **Global — Navbar** | Mobile hamburger `md:hidden`; desktop links `hidden md:flex` | Low | P2 | Reduce header chrome on mobile; consider collapsing language/bell | `mobile-tablet-readiness-navbar-v1` |
| **Global — Touch targets** | Buttons default `h-10`; calendar controls `h-8`; map edit `h-6` | Medium on map | P1 | Bump map actions to ≥44px; audit calendar controls | Part of schedule-map slice |
| **`/admin` Schedule Map** | Day default; week/month gated at `lg` (1024px); touch targets `h-11` on narrow | Low | — | Optional instructor viewport smoke | — |
| **`/admin/users` People** | Cards + `sm:` stacks; import/export responsive | Low | P2 | Badge tooltips → tap-friendly help; L2 tabs fixed (this batch) | `mobile-tablet-readiness-people-tooltips-v1` |
| **`/admin/lessons`** | Columns stack `&lt;lg`; rows stack on narrow; header fixed | Low | P2 done | — | — |
| **`/admin/vehicles`** | Rows stack `&lt;sm`; badges wrap; touch-friendly actions | Low | P2 done | — | — |
| **`/admin/audit-logs`** | Filters responsive; table `md+`; card fallback `&lt;md` | Low | P2 done | — | — |
| **`/admin/settings`** | Operator/internal; tables scroll | Low | P2 | Stack filter header; defer until Platform boundary | Defer with Platform |
| **`/admin/license`** | Read-only; standard container | OK | — | None | — |
| **`/instructor`** | Schedule Map slice done; booking forms good | Low | P2 | Navbar density | `mobile-tablet-readiness-navbar-v1` |
| **`/student`** | Read-only map; day view OK | Low | P2 | Same as instructor nav | `mobile-tablet-readiness-navbar-v1` |
| **`/platform`** | Grids collapse; no navbar | Low | P2 | Touch-friendly inputs if mobile operator needed | Defer |
| **Auth pages** | Mobile-friendly centered cards | OK | — | Register category grid minor | `mobile-tablet-readiness-auth-register-grid-v1` |
| **Import/export dialogs** | `overflow-x-auto` preview; responsive footers | OK | — | None | — |
| **Modals / dialogs** | `max-h-[90vh]`, `w-full`, `sm:max-w-*` | OK | — | None | — |
| **Playwright QA** | Mobile/tablet viewport smoke (opt-in; 15 tests) | Low | — | Optional instructor viewport smoke | — |

---

## 5. Pattern inventory

### Positive patterns (reuse)

- Page containers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Card lists instead of tables on People (`student-records-manager.tsx`, `instructor-records-manager.tsx`)
- `flex-col sm:flex-row` on row actions
- `min-w-0` + `truncate` on long emails/names
- Lesson form: `lesson-form-styles.ts` (`grid-cols-1 sm:grid-cols-2`, `flex-col-reverse sm:flex-row`)
- Dialog footers: `flex-col-reverse sm:flex-row` (`dialog.tsx`)
- Import preview: `overflow-x-auto max-h-64` wrappers

### Problematic patterns (address in future slices)

| Pattern | Evidence | Impact |
| ------- | -------- | ------ |
| Fixed 7-column calendar grid | `schedule-map.tsx` — `grid-cols-7` for week/month | Illegible on phone |
| Horizontal-only table UX | `settings-management-client.tsx` (audit logs mitigated with card fallback) | Scroll fatigue on settings |
| Single-row dense admin cards | lesson rows improved in admin-surfaces slice | Reduced overflow on Lessons |
| Hover-dependent tooltips | `student-records-manager.tsx` — Radix Tooltip on badges | Lost context on touch |
| Small icon buttons on map | `schedule-map.tsx` — edit/delete `h-6 w-6` | Mis-taps |
| No PWA metadata | **Resolved** — `public/manifest.webmanifest` + `app/layout.tsx` metadata + `public/icons/dat-icon.svg` | Install metadata only; not offline-capable |

---

## 6. Role-based readiness summary

```
Desktop (≥1280px)     ████████████████████  Production-ready
Tablet landscape      ████████████████░░░░  Admin OK; map week/month usable
Tablet portrait       ████████████░░░░░░░░  People/Lessons OK; map weak
Phone (student/inst.) ████████░░░░░░░░░░░░  Day view glance; not primary
Phone (admin)         ████░░░░░░░░░░░░░░░░  Desktop-first; not supported v1
```

---

## 7. Recommended slice sequence (post-review)

1. **`mobile-tablet-readiness-schedule-map-v1`** — **Done** (2026-07-10): `lg` gate for week/month; day fallback; touch targets; `schedule-map-responsive.ts`.
2. **`mobile-tablet-readiness-pwa-manifest-v1`** — **Done** (2026-07-10): `manifest.webmanifest`, `dat-icon.svg`, theme-color/background metadata; no service worker.
3. **`mobile-tablet-readiness-admin-surfaces-v1`** — **Done** (2026-07-10): Lessons rows, Vehicles badges/actions, Audit logs mobile cards (`buildAuditLogMobileCardFields`).
4. **`mobile-tablet-readiness-playwright-viewports-v1`** — **Done** (2026-07-10): dedicated `playwright.mobile-viewports.config.ts`; 5 admin routes × 3 projects; Schedule Map narrow-helper assertions.

**Deferred (not in v1 PWA):** service worker, offline cache, push notifications.

**Do not open:** full redesign, new design system, auth/billing/audit changes, or broad responsive refactor in one batch.

---

## 8. Relation to production cutline (DEC-032)

DEC-032 explicitly placed mobile/tablet review as **penultimate / P2 deferred**. This review **confirms** that placement: gaps are real but **do not block** controlled first B2B production when operator expectations are set correctly.

After stable production and optional mobile polish: **`competitive-product-discovery-v1`** (DEC-007) per product priority.

---

## 9. Manual QA recommendations (future runtime slices)

When implementing Schedule Map slice:

- [ ] iPhone Safari + Android Chrome — day view default, lesson expand/edit
- [ ] iPad portrait — week view legibility or lock to day
- [ ] Instructor book lesson dialog — full form on 375px width
- [ ] People row actions — tap all buttons without horizontal page scroll
- [ ] Vehicles list — maintenance toggle + edit without layout break
- [ ] Audit logs — filter + scroll table + load more on tablet

---

## 10. References

- [production-readiness-cutline.md](./production-readiness-cutline.md) — DEC-032
- [first-client-onboarding-record.md](./first-client-onboarding-record.md) — device expectations (add note optional)
- [roadmap-todo.md](./roadmap-todo.md) — slice tracking
- `components/schedule/schedule-map.tsx` — primary P1 target
- `components/lessons/lesson-form-styles.ts` — positive reference implementation
