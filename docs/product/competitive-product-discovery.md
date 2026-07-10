# Competitive Product Discovery

**Slice:** `competitive-product-discovery-v1`  
**Date:** 2026-07-10 (correction pass)  
**Baseline:** main `a1c2dad` · prior slice `mobile-tablet-readiness-playwright-viewports-v1`  
**Decision context:** DEC-007 (discovery slice only; no durable product decisions in this batch)

**Registry summary (canonical):**

| Classification | Count | In prevalence calculations |
| -------------- | ----- | -------------------------- |
| **Direct competitors** (counted; HIGH/MEDIUM per row) | **9** | Yes |
| **Adjacent benchmarks** | **3** | No (separate column where shown) |
| **Low-evidence / excluded** | **2** | No |
| **Supplementary evidence only** | **1** | No |

**Principle:** `Schema existence is not implementation readiness and does not authorize reuse.`

---

## 1. Executive summary

DAT is **production-ready for a controlled first B2B client** (invite-only, no live billing) with strong **People management**, **Schedule Map / lessons**, **fleet**, **import/export**, **audit logs**, and **tenant isolation**.

Compared with **9 counted direct competitors with sufficient official evidence** and **3 adjacent horizontal booking benchmarks**, the largest **market gaps** are:

**Prevalence summary:** Lesson reminders and school-facing balances are confirmed in **8/9** eligible direct competitors; controlled self-booking or lesson requests are confirmed in **6/9**. Do not combine capabilities with different denominators under one prevalence value.

| Gap | Market signal (denominator = 9 eligible direct competitors) | DAT today |
| --- | ------------------------------------------------------ | --------- |
| Automated lesson reminders (email) | **COMMON_TABLE_STAKE** — confirmed in **8/9** direct competitors (official pages); not publicly confirmed in **1** (AutoGest — reminders not explicit on homepage) | Postmark **delivery boundary** for auth email only; **no** lesson-reminder orchestration, scheduling, or lifecycle |
| School-facing payments / balances / packages | **COMMON_TABLE_STAKE** — confirmed in **8/9**; not publicly confirmed in **1** (Control-L — TPV in app; full ledger depth unclear) | `Payment` model is **legacy/dormant**; **no school admin product surface**; **not tenant-ready** |
| Controlled student self-scheduling / lesson requests | **EMERGING_PATTERN** — confirmed in **6/9** | `LessonRequest` is **dormant schema only**; **no API/UI workflow** |
| Competency / progress tracking beyond lesson counts | **EMERGING_PATTERN** — confirmed in **5/9** (stronger in UK set) | Counters + flags; **no skills curriculum UI** |
| Operational analytics / management dashboards | **EMERGING_PATTERN** — confirmed in **6/9** | Basic admin stats; **no revenue/utilisation reporting** |

**Highest-value DAT differentiators to preserve (not copy away):** Student record vs app-account separation (`MANUAL_ONLY` / `INVITED` / `APP_USER`), import/export with zero-write dry-run + apply + audit, tenant-scoped audit log foundation, practical lesson numbering with import sources, People IA on one route.

**Recommended next slice (planning only):** `lesson-reminders-email-product-plan-v1` — product policy + template scope before any runtime work. **Does not authorize runtime implementation** and **must not presuppose reuse** of the current `Notification` model. Implementation still requires explicit approval.

**Prioritization risk:** No first-client interviews in this batch — relative urgency of reminders vs balances vs self-booking **Needs confirmation** with A Conquistadora ops.

---

## 2. Scope and non-goals

### In scope

- Evidence-based market comparison derived from one canonical competitor registry (§5)
- DAT capability baseline from repository inspection (§4)
- Opportunity scoring and ranked recommendations with prevalence denominators
- Concrete future slice names for backlog (not authorization)

### Out of scope

- Runtime, API, schema, migration, or UI changes
- Copying competitor features
- Final packaging commitments or DEC entries
- Portugal IMT/DGT regulatory integration design
- Platform (vendor) product design
- Establishing global EUR currency behaviour (see D-CPD-06)

---

## 3. Methodology

1. **Repository inspection** — `current-state.md`, `roadmap-todo.md`, `decision-log.md`, production cutline, product docs; routes under `app/` and `app/api/admin/`; Prisma models (`LessonRequest`, `Payment`, `Notification`).
2. **External research** — official product websites, documentation/help, pricing, and app-store listings accessed **2026-07-10**. Secondary comparison/review sources used only as supporting notes, **not** primary capability proof. Official marketing claims are **not** labelled independently verified.
3. **Canonical registry** — every counted product has one row in §5; profiles (§6–§8), matrix (§9), and summary counts **derive from that registry**.
4. **Market capability classification** (per capability):

   | Label | Threshold (denominator = 9 eligible direct competitors) |
   | ----- | ------------------------------------------------------- |
   | **COMMON_TABLE_STAKE** | Confirmed in **≥7/9** (≥78%) |
   | **EMERGING_PATTERN** | Confirmed in **4–6/9** |
   | **SEGMENT_SPECIFIC** | Geography- or segment-limited (e.g. Iberian regulatory modules); or **≤3/9** globally but **≥4/6** in a named Iberian segment |
   | **LOW_EVIDENCE** | Insufficient official documentation to count |

   Iberian sub-denominators use the **6** counted direct competitors with PT/ES primary market (MyDrive, Drovify, AccionVial, Control-L, AutoviaTest for Schools, AutoGest). Individual evidence is **HIGH** or **MEDIUM** per registry row — not uniformly HIGH.

5. **DAT status** — `DAT_DONE` | `DAT_PARTIAL` | `DAT_PLANNED` | `DAT_NOT_PRESENT` | `DAT_UNKNOWN`.
6. **Scoring** — 1–5 qualitative scores (not additive truth); explained per opportunity in §14.

**Evidence labels:** Fact (repo), Fact (external — official page), Inference, Recommendation, Risk, Needs confirmation.

---

## 4. DAT capability baseline

*Roadmap items are **not** counted as implemented unless listed in `current-state.md` as done.*

### 4.1 Operational areas

| Area | Status | Repository evidence |
| ---- | ------ | ------------------- |
| School administration (SUPER_ADMIN) | **DAT_DONE** | `/admin`, `/admin/users`, `/admin/lessons`, `/admin/vehicles`, `/admin/license` (read-only Plan) |
| Student profiles & onboarding | **DAT_DONE** | People → Students Profiles/Onboarding; manual create; invitations; app access lifecycle |
| Instructor profiles & onboarding | **DAT_DONE** | People → Instructors; invite with license fields; deactivate/reactivate; qualified categories |
| Lesson scheduling & Schedule Map | **DAT_DONE** | Admin + instructor dashboards; dialog edit; conflict warnings; v1a–v1d polish |
| Practical lesson tracking | **DAT_DONE** | `practicalLessonNumber`; manual history; import `DRIVING COMPLETED IMPORT` |
| Student dashboard | **DAT_PARTIAL** | Schedule Map, stats, category progress selector; **no** self-booking, balances, or skills UI |
| Instructor dashboard | **DAT_DONE** | Schedule Map, booking dialogs; pending request **count only** (no request workflow) |
| Vehicles / fleet | **DAT_DONE** | CRUD, maintenance, status; display-only warnings on lessons |
| Import/export | **DAT_DONE** | Students + practical lessons export/dry-run/apply UI; demo guards; export audit events |
| Audit logs | **DAT_DONE** | Write paths, read API, URL-only viewer, CSV export |
| Communications / email | **DAT_PARTIAL** | Postmark **delivery boundary** for auth (reset, verify) and copy-link invitations; **no** lesson-reminder orchestration, scheduling, lifecycle, or payment email product |
| Licensing / entitlements | **DAT_PARTIAL** | Read-only Plan UI; `license-features.ts`; **no** plan enforcement in product |
| Mobile / tablet / PWA | **DAT_PARTIAL** | Responsive polish + manifest; **no** native app or service worker |
| Reporting / analytics | **DAT_NOT_PRESENT** | Admin lesson lists/stats only; no revenue/utilisation dashboards |
| Documents / e-signatures | **DAT_NOT_PRESENT** | No document store or signature flows in product |
| Self-service (student booking) | **DAT_NOT_PRESENT** | See §4.2 `LessonRequest` — schema only |
| Exams | **DAT_PARTIAL** | `Exam` / `ExamRegistration` models; vehicle route references exams; **no** dedicated admin exam management UI found |
| Multi-language | **DAT_NOT_PRESENT** | English UI baseline; entitlement name only |
| Integrations / public API | **DAT_NOT_PRESENT** | No school-facing REST API product |
| IMT / national compliance (Portugal) | **DAT_NOT_PRESENT** | Not in scope of current product; competitors claim IMT/SAFT — **SEGMENT_SPECIFIC** |
| Platform operator controls | **DAT_PARTIAL** | `/admin/settings` internal URL; future Platform boundary (DEC-001/002) |

### 4.2 Dormant schema — not product readiness

**Principle:** `Schema existence is not implementation readiness and does not authorize reuse.`

#### `LessonRequest` — **DAT_PARTIAL — dormant schema only; runtime not authorized**

| Aspect | Repository fact |
| ------ | ----------------- |
| Tenant scope | **Yes** — `organizationId` required; indexed |
| Domain fields | Student, instructor, vehicle preference, status, review fields, optional linked `lessonId` |
| Product UI/API/workflow | **None confirmed** — no create/approve routes or student request UI found |
| Runtime behaviour | Pending request **count** on instructor dashboard only; policy and concurrency behaviour **unresolved** |

**Classification:** `DAT_PARTIAL — dormant schema only; runtime not authorized`

#### `Payment` — **DAT_PARTIAL — legacy/dormant schema; unsuitable as implementation foundation without dedicated architecture review**

| Aspect | Repository fact |
| ------ | ----------------- |
| Tenant scope | **No** — model has **no** `organizationId` |
| Currency | Defaults to **`USD`** |
| Primary link | **`userId`** (required); optional `studentId` |
| Concepts present | Gateway, transaction ID, refund, receipt fields — consumer/gateway-oriented |
| School ledger suitability | **Not** a tenant-ready school balance ledger |

**Classification:** `DAT_PARTIAL — legacy/dormant schema; unsuitable as an implementation foundation without a dedicated architecture review`

**Do not state or imply** that balances are “schema ready.”

#### `Notification` — **DAT_PARTIAL — legacy/dormant schema; reuse undecided**

| Aspect | Repository fact |
| ------ | ----------------- |
| Tenant scope | **No** — model has **no** `organizationId` |
| Concerns combined | Inbox/read state, email send flags, push send flags on one row |
| Active reminder runtime | **None confirmed** — no operational dispatch product path |
| Lesson reminders foundation | **Must not** automatically become the foundation for lesson reminders |

**Classification:** `DAT_PARTIAL — legacy/dormant schema; reuse undecided`

### 4.3 Lesson reminders — DAT readiness (transport vs product)

| Layer | Status |
| ----- | ------ |
| Email delivery transport (Postmark) | **Exists** — auth and invitation mailers (`lib/email/providers/postmark-provider.ts`) |
| Reminder scheduling | **Does not exist** |
| Reminder lifecycle (create / update / cancel on lesson changes) | **Does not exist** |
| Idempotency and cancellation behavior | **Undecided** |
| Retries and operational monitoring for reminders | **Undecided** |
| `Notification` model reuse | **Undecided** — **not** authorized as foundation without dedicated architecture review |

DAT already has a **Postmark email delivery boundary**, but has **no lesson-reminder orchestration, scheduling, or lifecycle runtime**.

---

## 5. Canonical competitor registry

All counts, profiles, and matrix rows derive from this table.

| ID | Product | Publisher / company | Official domain | Market | Classification | Evidence | Maturity caveat | In prevalence |
| -- | ------- | ------------------- | --------------- | ------ | -------------- | -------- | --------------- | ------------- |
| DC-01 | **DriveSchoolPro** | LEAVE.REVIEW LTD (UK) | [driveschoolpro.com](https://driveschoolpro.com/) | UK | `DIRECT_COMPETITOR` | **HIGH** | **Conflicting official evidence** on student portal/self-service: S-P-02 marks portal/booking “Coming Soon”; S-P-01 describes student-facing portal features — do not count as unqualified current capability | **Yes** |
| DC-02 | **Total Drive** | Total Drive (UK) | [totaldrive.co.uk](https://totaldrive.co.uk/) | UK | `DIRECT_COMPETITOR` | **HIGH** | School owner cannot see instructor finances (by design) | **Yes** |
| DC-03 | **MyDriveTime** | May Stanley Ltd (UK) | [mydrivetime.co.uk](https://www.mydrivetime.co.uk/) | UK | `DIRECT_COMPETITOR` | **HIGH** | Distinct from Portugal **MyDrive** (DC-08); lesson reminders supported by S-P-08 release notes | **Yes** |
| DC-04 | **Drovify** | Drovify Technologies S.L. (Spain) | [drovify.com](https://drovify.com/) | Spain / EU | `DIRECT_COMPETITOR` | **HIGH** | Official brand is **Drovify** (not “Drivofy”) | **Yes** |
| DC-05 | **AccionVial** | AccionVial (Spain) | [accionvial.com](https://www.accionvial.com/) | Spain | `DIRECT_COMPETITOR` | **HIGH** | Pricing not on homepage | **Yes** |
| DC-06 | **Control-L** | Control-L (Spain) | [control-l.com](https://www.control-l.com/) | Spain | `DIRECT_COMPETITOR` | **MEDIUM** | Mobile-first teacher workflow; ledger depth unclear publicly | **Yes** |
| DC-07 | **AutoviaTest for Schools** | AutoviaTest | [autoviatest.com](https://autoviatest.com/pt-PT/for-schools) | Multi-country (PT page) | `DIRECT_COMPETITOR` | **MEDIUM** | Early-access positioning; production maturity **Needs confirmation** | **Yes** |
| DC-08 | **MyDrive** | MyDrive (Portugal) | [mydrive.pt](https://www.mydrive.pt/) | Portugal | `DIRECT_COMPETITOR` | **MEDIUM** | Feature depth behind login; FAQ placeholder text on site | **Yes** |
| DC-09 | **AutoGest** | AutoGest (Spain) | [autogest.es](https://autogest.es/) | Spain | `DIRECT_COMPETITOR` | **HIGH** | DGT integration depth **Needs confirmation** | **Yes** |
| AB-01 | **meetergo** | meetergo GmbH | [meetergo.com](https://meetergo.com/en/solutions/driving-schools) | Germany / EU | `ADJACENT_BENCHMARK` | **HIGH** | Horizontal booking platform; driving-school vertical page | **No** |
| AB-02 | **anny** | anny GmbH | [anny.co](https://anny.co/en/solutions/driving-school-booking-system) | Germany / EU | `ADJACENT_BENCHMARK` | **HIGH** | Horizontal resource booking; driving-school use-case page | **No** |
| AB-03 | **EasyWeek** | EasyWeek | [easyweek.pt](https://easyweek.pt/business/solutions/driving-school) | EU (PT local page) | `ADJACENT_BENCHMARK` | **MEDIUM** | Generic booking CRM with driving-school landing page | **No** |
| LE-01 | **ER-Sigestec** | Alsis (Portugal) | Reseller listing only — [netpitapro product page](https://teste.netpitapro.com/index.php/product/er-sigestec-gestao-de-escolas-de-conducao/) | Portugal | `LOW_EVIDENCE` | **LOW** | Desktop/admin; cloud/mobile/API **not publicly confirmed**; publisher mention on [alsis.pt](https://www.alsis.pt/) | **No** |
| LE-02 | **Ensinar a Conduzir (AGE 2010)** | Ensinar a Conduzir | [ensinaraconduzir.pt/gestao](https://ensinaraconduzir.pt/gestao/) | Portugal | `LOW_EVIDENCE` | **LOW** | Desktop install; last public update **2022-12-16**; not cloud SaaS | **No** |
| SE-01 | **AutoviaTest** (consumer theory-test) | AutoviaTest | [autoviatest.com](https://autoviatest.com/) | Consumer | Supplementary only | **MEDIUM** | **Not** the school-management product; do not conflate with DC-07 | **No** |

**Derived counts:** 9 direct (prevalence) · 3 adjacent · 2 low-evidence · 1 supplementary.

**Reclassification notes:**

- **meetergo**, **anny**, **EasyWeek** — moved from direct to **ADJACENT_BENCHMARK** (horizontal booking/resource platforms with driving-school landing pages).
- **Drovify** — moved from adjacent to **DIRECT_COMPETITOR** (purpose-built autoescuela cloud SaaS).
- **Control-L** — included in direct registry (was matrix-only orphan).
- **MyDriveTime** — canonical UK product name (replaces erroneous “MyDrive” label for UK competitor); **MyDrive** retained for Portugal (`mydrive.pt`).

---

## 6. Direct competitor profiles (9 counted)

| ID | Product | Key public capabilities (official pages) | Limitations / unknowns |
| -- | ------- | ---------------------------------------- | ---------------------- |
| DC-01 | **DriveSchoolPro** | Multi-instructor scheduling, 3-way conflict detection, DVSA 27-skill tracking, **automated email reminders**, Stripe, analytics, document upload + expiry | **Conflicting official portal evidence** (S-P-01 vs S-P-02); WhatsApp “coming soon”; AI briefing scope unverified |
| DC-02 | **Total Drive** | Diary, pupil/parent apps, optional online booking, in-app payments, **reminders**, progress syllabus, enquiry manager, waiting lists | Vehicle scheduling depth unclear |
| DC-03 | **MyDriveTime** | UK diary + admin app; student app; **lesson reminders** (S-P-08 release notes); financial records; offline mobile sync; team/school plans | Student-app depth partly login-gated |
| DC-04 | **Drovify** | Cloud autoescuela: students, scheduling, exams, **billing/cobros**, digital contracts, Drovify Profesor/Alumno apps | Verifactu depth; store add-ons |
| DC-05 | **AccionVial** | Student/teacher/admin modules, online tests, DGT AUES files, Verifactu billing, **student booking + payments** | Exact pricing not listed |
| DC-06 | **Control-L** | Mobile teacher app, **student self-booking** from agenda, **TPV payments** in app | Full balance ledger not publicly detailed |
| DC-07 | **AutoviaTest for Schools** | CRM, AI scheduling (marketing), fleet, online payments, student/instructor/parent portals, **SMS/WhatsApp/email**, analytics, IMT/DGT country modules | Early access; pricing “sob medida”; maturity **Needs confirmation** |
| DC-08 | **MyDrive** | Students/instructors/vehicles, lesson planning, student area, **contas correntes**, code tests, IMT compliance claim, **automatic payment alerts** | Feature depth behind login |
| DC-09 | **AutoGest** | Drag-drop planning, student portal, DGT exams, **Stripe billing**, dashboard, from €29/mo | Email reminders not explicit on homepage; DGT depth **Needs confirmation** |

---

## 7. Adjacent benchmark profiles (3)

| ID | Product | Why adjacent | Useful benchmark for |
| -- | ------- | ------------ | -------------------- |
| AB-01 | **meetergo** | Horizontal EU booking platform with driving-school solution page | Online 24/7 booking, vehicle/instructor coordination, GDPR EU hosting |
| AB-02 | **anny** | Horizontal resource booking with driving-school packages page | Theory/practical/exam scheduling, packages/quotas, KPI dashboards |
| AB-03 | **EasyWeek** | Generic booking CRM with PT driving-school page | Online booking + reminders **without** full school ERP |

*Adjacent products appear in matrix notes only where useful; they are **excluded** from direct prevalence denominators.*

---

## 8. Low-evidence and supplementary products

### 8.1 Low-evidence (profiled, excluded from prevalence)

| ID | Product | Why excluded | Notes |
| -- | ------- | ------------ | ----- |
| LE-01 | **ER-Sigestec** | No dedicated official product site with feature/pricing detail located; reseller blurb only | Alsis publisher page mentions product; 500+ schools claim **not independently verified** |
| LE-02 | **Ensinar a Conduzir (AGE 2010)** | Desktop legacy; last update 2022; not comparable cloud SaaS baseline | Useful for **SEGMENT_SPECIFIC** IMT/legacy migration narrative only |

### 8.2 Supplementary evidence only

| ID | Product | Role |
| -- | ------- | ---- |
| SE-01 | **AutoviaTest** (consumer) | Consumer theory-test platform — **distinct** from **AutoviaTest for Schools** (DC-07). Cited only for brand context, not counted as a school-management competitor. |

---

## 9. Capability comparison matrix

**Prevalence denominator:** 9 eligible direct competitors (DC-01–DC-09) unless noted. DAT is **never** included in competitor prevalence numerators.

Legend: **Mkt** = prevalence among direct set · **DAT** = status · **Class** = market classification per §3 thresholds

| Capability | Mkt prevalence | Class | DAT | Notes |
| ---------- | -------------- | ----- | --- | ----- |
| Multi-instructor scheduling + conflict detection | **8/9** confirmed; **1/9** partial (Control-L — agenda-focused) | COMMON_TABLE_STAKE | DAT_DONE | DAT: instructor+vehicle display warnings; not full 3-way block |
| Student portal (lessons view) | **8/9** confirmed current; **1/9** conflicting official evidence (DriveSchoolPro — S-P-01 vs S-P-02) | COMMON_TABLE_STAKE | DAT_PARTIAL | Dashboard exists; limited self-service |
| Instructor portal | **9/9** | COMMON_TABLE_STAKE | DAT_DONE | Booking + Schedule Map |
| Controlled self-scheduling / online booking | **6/9** confirmed; **3/9** not publicly confirmed | EMERGING_PATTERN | DAT_NOT_PRESENT | `LessonRequest` dormant schema only |
| Lesson request + approval workflow | **5/9** | EMERGING_PATTERN | DAT_NOT_PRESENT | Dashboard pending count only |
| Waiting lists / cancellation backfill | **4/9** | EMERGING_PATTERN | DAT_NOT_PRESENT | Total Drive, anny (adjacent), others |
| Email lesson reminders | **8/9** confirmed; **1/9** not publicly confirmed (AutoGest — S-P-16) | COMMON_TABLE_STAKE | DAT_NOT_PRESENT | Postmark delivery boundary only; no reminder orchestration. **8/8** confirmations use direct official sources (incl. MyDriveTime S-P-08) |
| SMS / WhatsApp reminders | **4/9** direct; **2/3** adjacent | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | AutoviaTest for Schools, MyDrive (partial), marketing-heavy |
| Student progress / competency tracking | **5/9** (UK products stronger) | EMERGING_PATTERN | DAT_PARTIAL | Counters + exam flags; no skills matrix |
| Payments, balances, lesson packages | **8/9** confirmed; **1/9** unclear (Control-L TPV only) | COMMON_TABLE_STAKE | DAT_NOT_PRESENT | `Payment` legacy schema — **not** tenant-ready ledger |
| Online payment gateway (school→student) | **7/9** | COMMON_TABLE_STAKE | DAT_NOT_PRESENT | Out of production cutline |
| Invoicing / receipts (school-facing) | **5/6** Iberian direct (DC-04–DC-09 PT/ES set) | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | Verifactu, SAFT claims |
| Documents + e-signatures | **3/9** direct (Drovify, DriveSchoolPro, AccionVial partial) | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | — |
| National regulator integration (IMT/DGT/AUES) | **4/6** counted Iberian direct (DC-04–DC-09 PT/ES set) | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | Publicly confirmed in 4/6; Control-L and AccionVial not explicit on homepage sources used |
| Fleet maintenance alerts | **4/9** | EMERGING_PATTERN | DAT_PARTIAL | Fields + display warnings; no alerting product |
| Operational analytics dashboard | **6/9** | EMERGING_PATTERN | DAT_NOT_PRESENT | — |
| Communications history / CRM inbox | **5/9** | EMERGING_PATTERN | DAT_NOT_PRESENT | — |
| Native mobile apps | **6/9** | EMERGING_PATTERN | DAT_NOT_PRESENT | PWA manifest only |
| Data import/export | **2/9** publicly marketed | SEGMENT_SPECIFIC | DAT_DONE | **DIFFERENTIATOR** for DAT |
| Audit / accountability log | **0/9** on public pages | DIFFERENTIATOR | DAT_DONE | Rare in competitor marketing |
| Student record without app account | **0/9** publicly confirmed among counted competitors | DIFFERENTIATOR | DAT_DONE | DAT repo: `Student.userId` optional — not a competitor prevalence claim |
| Tenant isolation + security posture | **0/9** public detail | DIFFERENTIATOR | DAT_DONE | RLS revoke-only complete |
| AI scheduling / AI briefings | **2/9** marketing-led | PREMATURE | DAT_NOT_PRESENT | AutoviaTest, DriveSchoolPro |
| Multi-language product UI | **3/9** direct; **3/3** adjacent EU | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | i18n framework deferred |
| Public API / webhooks | **1/9** (Drovify store/integration) | SEGMENT_SPECIFIC | DAT_NOT_PRESENT | — |
| DAT subscription billing | N/A | OUTSIDE_DAT_BOUNDARY | OUTSIDE | Future Platform |
| Platform feature flags in school admin | N/A | OUTSIDE_DAT_BOUNDARY | DAT_PARTIAL | Hidden from nav; operator URL |

---

## 10. Market patterns and table stakes

**Corrected rule:** Do **not** call a capability universal unless every **eligible direct competitor** confirms it on an official page.

### Confirmed cross-market patterns (9 eligible direct set)

1. **Calendar scheduling** with instructor coordination — **COMMON_TABLE_STAKE** (**8/9**; conflict detection depth varies)
2. **Automated reminders (email minimum)** — **COMMON_TABLE_STAKE** (**8/9**)
3. **Student-facing portal or app** — **COMMON_TABLE_STAKE** (**8/9** confirmed current; DriveSchoolPro **conflicting official evidence**)
4. **Payments or balance tracking** — **COMMON_TABLE_STAKE** (**8/9**)
5. **Progress tracking** beyond raw scheduling — **EMERGING_PATTERN** (**5/9**; UK stronger)
6. **Fleet / vehicle assignment** — **EMERGING_PATTERN** (**6/9** explicit)
7. **Reporting** for utilisation/revenue — **EMERGING_PATTERN** (**6/9**; often tier-gated)

**Inference:** For DAT’s **first B2B client** (school staff–driven ops), gaps **1** and fleet basics are largely closed. Gaps **2–4** and **7** are credible near-term product pressure.

**SEGMENT_SPECIFIC (Iberia):** National regulator integration (IMT/DGT/AUES) is **publicly confirmed in 4/6 counted Iberian direct competitors** (MyDrive, Drovify, AutoviaTest for Schools, AutoGest per official pages used; not confirmed for Control-L or AccionVial on sources cited). Local invoicing/Verifactu claims appear in additional Iberian products. **Recommendation:** parallel track, not DAT core v1, unless client contract requires it.

**Adjacent benchmarks (not in denominator):** meetergo, anny, and EasyWeek reinforce booking + reminders patterns but are **not** full school ERP comparators.

---

## 11. Potential DAT differentiators

| Differentiator | Why it matters | Preserve |
| -------------- | -------------- | -------- |
| Student ficha vs app account | Matches real school workflow; avoids duplicate records | Yes — core domain model |
| Import/export + audit trail | Migration and accountability; rare publicly | Yes — packaging hook (Premium) |
| Invite-only + controlled onboarding | Fits B2B cutline; reduces abuse | Yes — DEC-032 |
| Tenant-scoped audit logs | Compliance-ready without platform bleed | Yes |
| Practical lesson source + numbering | Honest history (manual/import/system) | Yes |
| Settings/License demotion | Keeps school product simple | Yes — DEC-026 |

**Do not chase:** marketplace/discovery, full AI coach, white-label native apps, or regulator filing automation without explicit client demand.

---

## 12. Portugal / Iberia relevance and evidence gaps

### Portugal

| Product | Evidence | Relevance |
| ------- | -------- | --------- |
| **MyDrive** (DC-08) | Public PT site, €26+/mo, IMT claim | Primary cloud comparator for A Conquistadora-style schools |
| **AutoviaTest for Schools** (DC-07) | PT marketing page, IMT listed | Modern cloud narrative; maturity **Needs confirmation** |
| **ER-Sigestec** (LE-01) | Reseller + publisher mention only | Likely incumbent; **excluded from prevalence** |
| **Ensinar a Conduzir AGE** (LE-02) | Official module page; desktop | Legacy installed base; migration/import story only |

**Evidence gap:** No strong public SaaS pricing/feature parity study for PT-only cloud rivals beyond MyDrive and marketing-heavy AutoviaTest for Schools.

### Spain

Cloud competition (AutoGest, AccionVial, Control-L, Drovify) with DGT/Verifactu emphasis — useful for **payments/invoicing** and **regulatory** patterns, less for immediate DAT PT client.

### Inference for DAT

First-client relevance prioritises **operational scheduling + people + reminders + balances** over **IMT file generation**. Regulatory modules belong in **SEGMENT_SPECIFIC** backlog with explicit client gate.

---

## 13. Opportunity scoring

Scores 1 (low) – 5 (high). **Not summed** — qualitative prioritisation. Market prevalence scores use **corrected denominators**, not “universal” claims.

### O1 — Lesson reminders (email first)

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| Customer value | 5 | Reduces no-shows — **8/9** direct competitors advertise email reminders |
| First-client relevance | 5 | School secretaria pain; **Needs confirmation** without client interviews |
| Market prevalence | 4 | **COMMON_TABLE_STAKE** (8/9) — not literally universal |
| Differentiation potential | 2 | Table stakes |
| Revenue / packaging | 3 | Premium comms tier possible |
| Implementation complexity | 3 | Postmark delivery boundary exists; reminder orchestration/scheduling/lifecycle **do not**; needs **new** product design — **`Notification` reuse undecided** |
| Security / data risk | 2 | Email PII; opt-out policy needed |
| Operational burden | 2 | Template maintenance |
| Evidence confidence | 4 | Strong external; repo confirms gap |

### O2 — School-facing balances / manual payment ledger (no PSP)

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| Customer value | 5 | **8/9** direct competitors show balance/payment tracking |
| First-client relevance | 4 | May be handled offline — **Needs confirmation** with client |
| Market prevalence | 4 | **COMMON_TABLE_STAKE** (8/9) |
| Differentiation potential | 1 | Table stakes |
| Revenue / packaging | 4 | Premium/Enterprise |
| Implementation complexity | 5 | **`Payment` schema not suitable foundation**; greenfield tenant ledger likely |
| Security / data risk | 3 | Financial records |
| Operational burden | 3 | Reconciliation support |
| Evidence confidence | 4 | Strong market; repo confirms no product surface |

### O3 — Controlled student lesson request workflow

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| Customer value | 4 | Reduces phone load when policy allows |
| First-client relevance | 3 | Cutline is staff-driven; client may defer self-service |
| Market prevalence | 3 | **EMERGING_PATTERN** (6/9 self-booking) |
| Differentiation potential | 2 | Table stakes where present |
| Revenue / packaging | 3 | Could gate “self-service booking” |
| Implementation complexity | 4 | `LessonRequest` dormant; policy + approval UI + notifications |
| Security / data risk | 3 | Booking abuse, tenant rules |
| Operational burden | 3 | Support for edge cases |
| Evidence confidence | 4 | Repo confirms schema-without-UI |

### O4 — Student progress / skills foundation

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| Customer value | 4 | Parent/student transparency |
| First-client relevance | 3 | Nice-to-have vs reminders/payments |
| Market prevalence | 3 | **EMERGING_PATTERN** (5/9) |
| Differentiation potential | 3 | Could align to PT competencies later |
| Revenue / packaging | 3 | Premium |
| Implementation complexity | 4 | Domain model + UI + instructor workflow |
| Security / data risk | 2 | Low |
| Operational burden | 3 | Curriculum maintenance |
| Evidence confidence | 3 | Market mixed by country |

### O5 — Operational analytics (utilisation / lessons / basic revenue)

| Dimension | Score | Rationale |
| --------- | ----- | --------- |
| Customer value | 3 | Owner insight |
| First-client relevance | 2 | Single school may defer |
| Market prevalence | 3 | **EMERGING_PATTERN** (6/9) |
| Differentiation potential | 2 | — |
| Revenue / packaging | 4 | Enterprise |
| Implementation complexity | 3 | Read models + UI |
| Security / data risk | 2 | Aggregates only if scoped |
| Operational burden | 2 | — |
| Evidence confidence | 3 | — |

**Ranking unchanged after correction:** O1 (reminders) remains highest — **COMMON_TABLE_STAKE** with lowest planning risk vs payments (O2 schema unsuitable) and self-booking (O3 emerging, staff-driven cutline).

---

## 14. Recommended product opportunities

### Highest priority (top 3)

#### 1. `lesson-reminders-email-product-plan-v1` ⭐ **Recommended next slice**

| Field | Detail |
| ----- | ------ |
| Problem | Schools lose time/margin to no-shows and manual reminder calls |
| Target user | School admin; secondary: student/instructor recipients |
| External evidence | **8/9** direct competitors — e.g. DriveSchoolPro, Total Drive, MyDrive, AutoviaTest for Schools (DC-01, DC-02, DC-08, DC-07) |
| DAT evidence | Postmark delivery boundary for auth mailers (**Fact repo**); **no** lesson-reminder orchestration, scheduling, or lifecycle; `Notification` reuse **undecided** — not authorized foundation |
| Product value | Table-stakes parity after planning |
| Packaging | Premium comms; Basic = manual only |
| Dependencies | Postmark delivery boundary; **new** reminder orchestration/scheduling/lifecycle design; lesson schedule queries; tenant isolation |
| Risk | Wrong timing/content; GDPR/marketing vs transactional — **legal confirmation required** |
| Authorization | **Planning slice only** — does **not** authorize runtime implementation |
| Non-goals (plan + future runtime) | SMS, WhatsApp, payment reminders, marketing campaigns |

**Future product plan must resolve (minimum):**

| Topic | Planning question |
| ----- | ----------------- |
| Eligible lesson states | Which statuses trigger reminders? |
| Timing & timezone | Offset rules; org timezone; DST |
| Lifecycle | Create / update / cancel on lesson changes |
| Rescheduling | Re-issue vs amend vs suppress |
| Idempotency | Duplicate prevention keys |
| Recipient identity | `Student.email`; linked `User.email`; account-less student behaviour |
| Opt-out & preferences | Per-recipient; org defaults |
| Legal classification | Transactional vs marketing — **legal confirmation**, not product assumption |
| Template language | EN baseline; i18n deferral |
| Sender identity | From/reply-to per org |
| Postmark failure/retry | Bounce handling; dead letter |
| Tenant isolation | Org-scoped sends and templates |
| Audit boundaries | Which events logged; metadata minimization |
| Privacy-minimal metadata | No unnecessary PII in logs |
| Demo environment | Suppress or sandbox sends |
| Retention | Template/version history |
| Operational monitoring | Alerts for failure rates |
| Explicit non-goals | SMS, WhatsApp, payment reminders |

**Prioritization risk:** Lack of first-client interviews — confirm reminder pain vs balances before implementation approval.

#### 2. `school-balances-ledger-product-plan-v1`

| Field | Detail |
| ----- | ------ |
| Problem | Schools track lesson credits/debts outside DAT (Excel/WhatsApp) |
| Target user | School admin; student view optional later |
| External evidence | **8/9** direct — e.g. MyDrive contas correntes; Drovify billing; Control-L TPV |
| DAT evidence | `Payment` model is **legacy, non-tenant, USD-default** — **not** implementation foundation (**Fact repo**) |
| Product value | Closes major Iberia/UK gap without PSP |
| Packaging | Premium/Enterprise; distinct from Platform subscription billing |
| Dependencies | **Architecture review** for tenant ledger; currency **policy decision** (D-CPD-06) |
| Risk | Scope creep into invoicing/SAFT; PSP integration |
| Smallest safe slice | Manual ledger: record payment/charge, balance per **Student**, read-only student view |
| Out of scope | Stripe/SIBS, SAFT-PT, automated invoicing |
| Policy first? | **Yes** — DEC-002 boundary: school-facing vs Platform billing |

#### 3. `student-lesson-request-policy-planning-v1`

| Field | Detail |
| ----- | ------ |
| Problem | Students cannot request slots; staff handle all booking |
| Target user | Student (request); admin/instructor (approve) |
| External evidence | **6/9** — Total Drive online booking; Control-L student agenda; AutoviaTest for Schools portal |
| DAT evidence | `LessonRequest` tenant-scoped schema; pending counts only; **no API** (**Fact repo**) |
| Product value | Controlled self-service when school policy allows |
| Packaging | Premium “controlled booking” |
| Dependencies | Reminders (O1); availability rules; audit events; concurrency policy |
| Risk | Overbooking; inactive instructor edge cases |
| Smallest safe slice | Policy: who can request, approval SLA, instructor assignment rules |
| Out of scope | Public open booking; payment at booking |
| Policy first? | **Yes** |

### Medium-term (2)

4. **`student-progress-tracking-foundation-plan-v1`** — competency/skills model aligned to school policy (not DVSA copy); builds on `LessonCounter` + lesson feedback fields.  
5. **`import-export-business-packaging-v1`** — entitlements for self-service import/export already shipped technically (**Fact repo** PA-006).

### Explicitly rejected or deferred (≥2)

| Idea | Verdict | Reason |
| ---- | ------- | ------ |
| **IMT/SAFT-PT/DGT AUES integration v1** | **DEFER** (`SEGMENT_SPECIFIC`) | High regulatory scope; legacy incumbents (LE-01/LE-02); not first-client cutline |
| **Native iOS/Android apps** | **DEFER** | PWA + responsive sufficient per DEC-032 mobile review |
| **WhatsApp/SMS reminder suite** | **DEFER** | Provider cost, consent, template law **Needs confirmation** |
| **AI lesson briefings / AI scheduling** | **REJECT for near-term** (`PREMATURE`) | **2/9** marketing-led |
| **Open marketplace / student discovery** | **REJECT** (`OUTSIDE_DAT_BOUNDARY`) | Different product category |
| **Move billing/subscription into DAT admin** | **REJECT** (`OUTSIDE_DAT_BOUNDARY`) | Platform owns DAT customer billing (DEC-001) |
| **Reuse `Notification` model for reminders without review** | **REJECT** (architecture) | No `organizationId`; combined concerns; no active runtime |

---

## 15. Proposed future slices (backlog candidates — not approved)

| Slice | Type | Priority signal |
| ----- | ---- | --------------- |
| `lesson-reminders-email-product-plan-v1` | Docs/plan | **Next recommended** |
| `lesson-reminders-email-foundation-v1` | Runtime | After plan + `APPROVED TO IMPLEMENT` |
| `school-balances-ledger-product-plan-v1` | Docs/plan | P1 backlog |
| `school-balances-manual-ledger-v1` | Runtime | After plan + architecture review + approval |
| `student-lesson-request-policy-planning-v1` | Docs/plan | P1 backlog |
| `student-lesson-request-approval-v1` | Runtime | After policy + approval |
| `student-progress-tracking-foundation-plan-v1` | Docs/plan | P2 |
| `import-export-business-packaging-v1` | Product/ops | P2 |
| `school-operational-alerts-v1` | Runtime | P2 — vehicle/doc expiry |
| `i18n-framework-planning-v1` | Docs/plan | P2 — pt-PT market |

---

## 16. Recommended next slice

**`lesson-reminders-email-product-plan-v1`**

**Rationale (post-correction):** Highest **COMMON_TABLE_STAKE** gap on lesson reminders (**8/9**). DAT already has a Postmark **delivery boundary** for auth email but **no** reminder orchestration, scheduling, or lifecycle runtime. **Lower planning risk** than payments (legacy non-tenant `Payment` schema) or self-booking (**6/9**, staff-driven cutline). **No schema migration required for planning.**

**Blocked until:**

1. Plan slice completes with topics in §14.1  
2. Explicit `APPROVED TO IMPLEMENT: lesson-reminders-email-foundation-v1` (or equivalent)  
3. Architecture decision on reminder storage/dispatch — **not** assumed to reuse `Notification`

---

## 17. Decisions requiring human approval

| # | Proposed item | Type | Why not in decision-log yet |
| - | ------------- | ---- | --------------------------- |
| D-CPD-01 | First operational email scope = **lesson reminders only** (not SMS/WhatsApp/payment) | **Product decision** | Scope gate for planning |
| D-CPD-02 | School-facing balances = **manual ledger v1** before any PSP | **Product decision** | Payments sensitivity |
| D-CPD-03 | Student self-booking = **request + approval** (not open calendar) for v1 | **Product decision** | Security/policy |
| D-CPD-04 | **IMT/regulatory integration** out of DAT core until client contract requires | **Product decision** | Segment scope |
| D-CPD-05 | Reminder email class = **transactional vs marketing** | **Legal confirmation** | Postmark/GDPR — not a product decision alone |
| D-CPD-06 | The first Portuguese client operates in EUR. Any future ledger must define an **organization-level currency policy** or an **explicitly approved single-currency product policy** before runtime implementation. | **Architecture decision** + **first-client validation** | Do not hard-code global EUR in docs-only batch |
| D-CPD-07 | Reminder dispatch architecture (reuse vs replace `Notification`) | **Architecture decision** | Requires dedicated review; default = **do not reuse** without approval |

**Note:** Legal confirmation (D-CPD-05) is **not** the same as a product decision (D-CPD-01).

---

## 18. Sources

**Access date for all external sources:** 2026-07-10

### 18.1 Source type summary

Reconciled directly against **S-P-01 through S-P-21** (one exact URL per row in §18.2):

| Source type | Count | Source IDs |
| ----------- | ----- | ---------- |
| Official product/homepage | **8** | S-P-01, S-P-04, S-P-07, S-P-09, S-P-12, S-P-15, S-P-16, S-P-19 |
| Official feature/solution/vertical page | **8** | S-P-02, S-P-05, S-P-06, S-P-08, S-P-13, S-P-14, S-P-17, S-P-18 |
| Official pricing page | **2** | S-P-03, S-P-10 |
| Official app-store listing | **1** | S-P-20 |
| Official legal/company page | **1** | S-P-11 |
| Official publisher/product-list page | **1** | S-P-21 |
| **Total primary official sources** | **21** | S-P-01–S-P-21 |
| Secondary — comparison/review | **1** | S-SEC-01 |
| Low-confidence indirect/reseller | **1** | S-LC-01 |

**Category sum check:** 8 + 8 + 2 + 1 + 1 + 1 = **21** primary rows.

Official marketing claims are cited as **Fact (external — official page)** only; they are **not** independently verified product behaviour.

### 18.2 Primary official sources

| Source ID | Product | URL | Page title (short) | Type | Claim supported | Limitations |
| --------- | ------- | --- | ------------------ | ---- | --------------- | ----------- |
| S-P-01 | DriveSchoolPro | https://driveschoolpro.com/ | Homepage | Product/homepage | Scheduling, DVSA tracking, reminders, student portal marketing | **Conflicts with S-P-02** on portal/booking availability; login-gated depth |
| S-P-02 | DriveSchoolPro | https://driveschoolpro.com/driving-school-software/ | Driving school software | Feature/solution | Email reminders, conflict detection; comparison table | **Student portal / booking widget “Coming Soon”** — conflicts with S-P-01 |
| S-P-03 | DriveSchoolPro | https://driveschoolpro.com/pricing/ | Pricing 2026 | Pricing | Plan tiers | Promo pricing may change |
| S-P-04 | Total Drive | https://totaldrive.co.uk/ | Homepage | Product/homepage | Diary, apps, payments | — |
| S-P-05 | Total Drive | https://totaldrive.co.uk/driving-school-software/ | Driving school software | Feature/solution | School features, reminders | — |
| S-P-06 | Total Drive | https://totaldrive.co.uk/online-booking-software/ | Online booking | Feature/solution | Self-booking | — |
| S-P-07 | MyDriveTime | https://www.mydrivetime.co.uk/ | Homepage | Product/homepage | UK instructor/school app | Distinct from MyDrive PT (S-P-15) |
| S-P-08 | MyDriveTime | https://mydrivetime.wpenginepowered.com/blog/release-2-5-0/ | Release 2.5.0 — Lesson Reminders | Feature/solution | Lesson reminder configuration, send controls | Release notes; not independent verification |
| S-P-09 | Drovify | https://drovify.com/ | Homepage | Product/homepage | Autoescuela cloud ERP | Marketing superlatives |
| S-P-10 | Drovify | https://drovify.com/precios/ | Pricing | Pricing | €59/mo+, modules | — |
| S-P-11 | Drovify | https://drovify.com/terminos-y-condiciones/ | Terms | Legal/company | Publisher: Drovify Technologies S.L. | Not feature list |
| S-P-12 | AccionVial | https://www.accionvial.com/ | Homepage | Product/homepage | Modules, DGT, Verifactu | Regulator integration depth not explicit on page used |
| S-P-13 | Control-L | https://www.control-l.com/como_funciona.asp | Cómo funciona | Feature/solution | Teacher app, student booking, TPV | Ledger depth unclear |
| S-P-14 | AutoviaTest for Schools | https://autoviatest.com/pt-PT/for-schools | PT for-schools | Feature/solution/vertical | CRM, comms, IMT modules | Early access; maturity unverified |
| S-P-15 | MyDrive | https://www.mydrive.pt/ | Homepage | Product/homepage | PT school modules, contas correntes, IMT claim | Login-gated depth |
| S-P-16 | AutoGest | https://autogest.es/ | Homepage | Product/homepage | Planning, Stripe, portal | Email reminders not explicit — excluded from 8/9 reminders count |
| S-P-17 | meetergo | https://meetergo.com/en/solutions/driving-schools | Driving schools solution | Feature/solution/vertical | Booking, GDPR EU | Horizontal product; adjacent only |
| S-P-18 | anny | https://anny.co/en/solutions/driving-school-booking-system | Driving school booking | Feature/solution/vertical | Packages, scheduling | Horizontal product; adjacent only |
| S-P-19 | EasyWeek | https://easyweek.pt/ | Homepage | Product/homepage | EasyWeek product entry point | Driving-school vertical: https://easyweek.pt/business/solutions/driving-school (adjacent benchmark AB-03) |
| S-P-20 | MyDriveTime | https://apps.apple.com/gb/app/mydrivetime/id6444725965 | App Store listing | App-store | Mobile app existence | Privacy summary only; not capability proof alone |
| S-P-21 | Alsis | https://www.alsis.pt/ | Software list | Publisher/product-list | ER-Sigestec existence | Not dedicated ER-Sigestec product site |

**Prevalence traceability (examples):** Email reminders **8/9** — S-P-01, S-P-02, S-P-05, S-P-08, S-P-14, S-P-15, plus DC-02/DC-03/DC-06/DC-07 profile pages tied to S-P-04/S-P-07/S-P-13/S-P-14; **not** S-P-16 (AutoGest). Self-booking **6/9** — S-P-06, S-P-13, S-P-14, plus Total Drive/Control-L/AutoviaTest profiles. Iberian regulator **4/6** — S-P-15, S-P-09/S-P-10 (Drovify), S-P-14, S-P-16; not S-P-12 or S-P-13 on sources cited.

### 18.3 Secondary and low-confidence sources

| Source ID | Product | URL | Page title | Type | Claim supported | Limitations |
| --------- | ------- | --- | ---------- | ---- | --------------- | ----------- |
| S-SEC-01 | Total Drive | https://www.getapp.com/education-childcare-software/a/total-drive/ | GetApp listing | Secondary review | Supporting feature list | Third-party; not primary proof |
| S-LC-01 | ER-Sigestec | https://teste.netpitapro.com/index.php/product/er-sigestec-gestao-de-escolas-de-conducao/ | Netpitapro reseller product | Reseller/indirect | Feature bullet list | **Low confidence**; not official product site |
| S-LC-02 | Ensinar a Conduzir (AGE) | https://ensinaraconduzir.pt/gestao/ | Gestão module page | Low-confidence official | Desktop AGE modules (LE-02) | Legacy; not SaaS baseline; excluded from prevalence |

### 18.4 Repository sources

`docs/architecture/current-state.md`, `roadmap-todo.md`, `production-readiness-cutline.md`, `audit-log-coverage-readiness-review.md`, `mobile-tablet-readiness-review.md`, `docs/product/*.md`, `app/**/page.tsx`, `app/api/admin/**`, `prisma/schema.prisma` (models `LessonRequest`, `Payment`, `Notification`).

---

## 19. Limitations and confidence

| Limitation | Impact |
| ---------- | ------ |
| Marketing pages ≠ verified product behaviour | Capabilities marked “not publicly confirmed” where needed |
| Login-gated competitor apps not inspected | Feature absence not inferred |
| ER-Sigestec / Ensinar a Conduzir (LE-01/LE-02) | Excluded from prevalence; Iberia legacy gap documented |
| AutoviaTest for Schools “early access” | Maturity and install base **Needs confirmation** |
| **No client interviews in this batch** | First-client priority for payments vs reminders **Needs confirmation** — **prioritization risk** |
| AutoGest homepage (S-P-16) | Email reminders not explicit — excluded from **8/9** reminders numerator |
| DriveSchoolPro portal (S-P-01 vs S-P-02) | **Conflicting official evidence** — counted as **not** unqualified current student portal in **8/9** portal prevalence |
| MyDriveTime lesson reminders (S-P-08) | Official release notes support reminder capability in **8/9** reminders count |

**Overall confidence:** **Medium–High** for table-stakes themes with denominators; **Medium** for PT incumbent detail; **High** for DAT baseline (repo-inspected).

**Merge-readiness note:** Registry (9 eligible direct / 3 adjacent), source accounting (S-P-01–S-P-21 = 21 primary with exact URLs), prevalence denominators (reminders/balances **8/9**, self-booking **6/9**, Iberian regulator **4/6**), DriveSchoolPro portal conflict (S-P-01 vs S-P-02), MyDriveTime reminders (S-P-08), and schema-readiness language reconciled. DAT excluded from competitor numerators.
