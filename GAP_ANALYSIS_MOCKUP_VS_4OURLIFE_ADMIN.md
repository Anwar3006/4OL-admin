# Human Anatomy: Mockup vs. 4OurLife-Admin — Gap Analysis & Implementation Proposal

**Scope:** admin-panel.html mockup vs. 4OurLife-Admin codebase
**Part A:** Human Anatomy menu · **Part B:** Medication Reminder menu (Drug Database, Logged Reminders, Adherence, Interactions, AI Checker) · **Part C:** Users menu (All Users, IBP Businesses) · **Part D:** Dashboard + Task Manager · **Part E:** Chats menu (Groups, Support, Flagged) · **Part F:** Map & Footprint menu + Outdoor Workout pins · **Part G:** Upstream Sync Status (2026-08-20)
**Status:** Parts L/M/N implemented 2026-08-21 (BedTracker, Marketing RBAC retrofit, FacilityScout — code + migrations written; migrations pending application to the live DB). Security follow-ups landed the same day: response headers in `next.config.ts`, progressive login lockout + honeypots (`lib/auth-guard.ts`), dependency scanning (`npm run security:audit` + `.github/workflows/dependency-audit.yml` + Dependabot). Clone synced to upstream `main` @ `95857bb` (fast-forwarded 17 commits, 2026-08-20) — see Part G for what upstream closed and what remains

---

## Part A — Human Anatomy (✅ Implemented)

### A.1 Mockup inventory (`#page-anatomy`, line ~3905 of admin-panel.html)

**Header:** Female/Male gender toggle · 📥 Export · **+ Add Body Part** · mobile-integration alert banner
**KPIs (4):** Body Parts Mapped · Condition Links · Symptom Links · Map Interactions (30d)

| # | Tab | Contents |
|---|-----|----------|
| 1 | 🪴 Body Map | 9 system sub-tabs (General, Cardiovascular, Digestive, Respiratory, Nervous, Skeletal, Muscular, Urinary, Reproductive) · gender-aware PNG + SVG hotspot overlay (~22 clickable regions; female adds breasts/reproductive) · 🔬 Show Organs toggle · 🔄 Front/Back toggle · 15 quick-select tags · detail panel (Edit / Add Content, count chips, linked conditions/symptoms/tips lists) · organ list per system · 8 "All Body Regions" cards |
| 2 | 🦠 Conditions Linked | Filters (search, Body Part, System) · table: Body Part, Condition, ICD-11, Severity, Symptoms Count, Medications Linked, Specialist, Status, Actions |
| 3 | 🩺 Symptoms Linked | Filters (search, Body Part, Severity) · table: Body Part, Symptom, Severity, Linked Conditions, AI Classifier Used, User Reports 30d, Actions |
| 4 | 💡 Healthy Tips | Filters + Add Tip button · table: Body Part, Tip Title, Category, Views 30d, Likes, Status, Actions |
| 5 | 🔗 Connected Modules | 6 live cards → Diseases & Conditions, Symptoms, Healthy Living, Medications, Specialist/HCP, Nearby Facilities · suggested-connections card (Fitness, Nutrition, Labs, Period, AI Chat, IBP) · Gender-Aware Content Rules card |
| 6 | 💼 Business Strategy | 6 static revenue-model cards |

### A.2 Codebase current state

| Piece | State | Verdict |
|---|---|---|
| `app/(dashboard)/anatomy/page.tsx` (257 lines) | Read-only table: 4 system filters, 4 KPIs, one table | ~10% of mockup |
| `app/(dashboard)/human-anatomy/page.tsx` | Redirect stub → `/anatomy` | keep |
| `app/api/anatomy/body-map/route.ts` | GET only; still on legacy `getAdminApiUser()` (missed RBAC retrofit → needs `requireAdminApiUser("anatomy.view")`); infers system from name keywords; counts junctions in JS | fix + upgrade |
| RBAC | `anatomy.view` / `anatomy.edit` exist; granted to `admin` + `content_manager` | ready |
| Nav | "Human Anatomy" under Health Services, `permission: "anatomy.view"` | ready |

### A.3 Data infrastructure

**Already live:**
- `body_parts` — hierarchical (parent_id, ltree `path`, `level`) with `mesh_id` for 3D
- `condition_body_parts` + `symptom_body_parts` junctions — actively used by `useCondition.ts` (select/delete/re-insert) and `useSymptoms.ts` (create/update via `body_part_ids`, RPC `get_body_part_stats`)
- Diseases + Symptoms pages render body-part badge columns; Diseases shows `mostAffectedBodyPart`
- `conditions.specialist`, status workflow, `metadata jsonb`; `user_profiles.sex` (gender hook)

**Gaps:**
| Gap | Needed for |
|---|---|
| No `body_system`, `gender_scope`, `icon`, `display_order` on `body_parts` (system guessed from keywords) | System sub-tabs, gender rules, region cards |
| No hotspot geometry (mockup has `anatomySystems` SVG ellipse coords) | Interactive Body Map |
| No ICD-11 on `conditions` | Tab 2 |
| No body-part linkage for `healthy_living_info` | Tab 4 |
| No drug-class/body-part reference data | Tab 5 Medications card (see Part B `drug_body_parts`) |
| Fitness links free text (`fitness_plans.target_body_parts text[]`, `fitness_exercises.primary_muscle_group`) | Tab 5 Fitness card |
| No anatomy-interaction tracking table | "Map Interactions 30d" KPI |
| `get_body_part_stats` RPC not in `full-tables.sql` dump nor migrations (live-DB-only) | Symptom stats — persist in migration |

### A.4 Implementation plan

Conventions: TanStack Query hooks in `hooks/supabase-calls/`, zod schemas in `schemas/`, shadcn/ui, `requireAdminApiUser()` on server routes, sonner toasts.

- **Phase 0 — migration `anatomy_extension`:** fix body-map route to `requireAdminApiUser("anatomy.view")` + POST behind `anatomy.edit`; `alter table body_parts` add `body_system`, `gender_scope` (female/male/shared/unspecified), `icon`, `description`, `display_order` (backfill from keyword logic); new `anatomy_hotspots (body_part_id, gender, view front|back, svg_path_id, cx, cy, rx, ry)`; `conditions.icd11_code`; persist `get_body_part_stats` RPC; optional `anatomy_interactions` + mobile POST endpoint
- **Phase 1 — tab shell + data tables (tabs 2–4, 6):** shadcn Tabs with `?tab=` URL state; one aggregation endpoint `GET /api/anatomy/overview` (head-counts, not full-row fetches); `useAnatomyConditions` / `useAnatomySymptoms` joins with deep links to `/diseases?id=…`, `/symptoms?id=…`; new junction `healthy_living_body_parts` + Add Tip dialog reusing `useHealthyLiving` mutations (gate: `healthyliving.create`); tab 6 static cards
- **Phase 2 — interactive Body Map (tab 1):** data-driven SVG hotspot layer from `anatomy_hotspots`, gender toggle, system sub-tabs, Show Organs / Front–Back, quick-select tags, detail side panel; Add Body Part dialog (zod, `anatomy.edit`)
- **Phase 3 — Connected Modules (tab 5):** aggregation cards + deep links with body-part filter params; gender rules editor writing `body_parts.gender_scope`

### A.5 Interconnection matrix

| Menu | Linkage | Mechanism |
|---|---|---|
| Diseases & Conditions | Bidirectional ✅ mostly exists | `condition_body_parts` already read/written by disease forms; anatomy tab 2 reverse view; add body-part filter + ICD-11 column |
| Symptoms | Bidirectional ✅ mostly exists | `symptom_body_parts` fully wired incl. `get_body_part_stats`; anatomy tab 3 reverse view |
| Healthy Living | New junction needed | `healthy_living_body_parts`; tips surface in tab 4 + detail panel; `/healthy_living` gains body-part filter |
| Fitness | Mapping layer | (a) map `primary_muscle_group`/`target_body_parts` strings to `body_parts.name` at query time, or (b) nullable `body_part_id` FK on `fitness_exercises` + junction for plans |
| Medication Reminder | Reference-data bridge | `drug_body_parts` junction (Part B) feeding "Body part → drug class" card; Epic 27 templates can inject body-part context |

---

## Part B — Medication Reminder (✅ Implemented)

### B.1 Mockup inventory (`#page-medication`, line ~6307 of admin-panel.html)

**Header:** 📥 Export · 📋 AI Settings · **+ Add Drug**
**Banner:** Drug Interaction Checker AI v1.8 (98.1% accuracy) active · 12,400 active reminders · no individual prescription data exposed in admin view
**KPIs (6):** Drugs in Database (4,820) · Active Reminders (12,400) · AI Accuracy (98.1%) · Interaction Flags 30d (284) · Reminder Adherence (82%) · Drug Categories (620)
**Sidebar deep links:** Drug Database (parent) · 🔔 Logged Reminders · ⚗️ Interactions (via `showPageTab`)

| # | Tab | Contents |
|---|-----|----------|
| 1 | 💊 Drug Database | Filters: search (drug/generic/category), Category (Antibiotics, Antihypertensives, Antimalarials, Analgesics, Antiretrovirals, Antidiabetics, Antifungals, Vitamins & Supplements), Status (Active/Discontinued/Under Review), Availability (OTC/Rx Only/Controlled) · Columns: Drug Name (+ form + manufacturer), Generic Name, Category, Availability, Interactions count, Active Reminders count, Status, Actions (view/edit/delete) · pagination over 4,820 drugs · Export |
| 2 | 🔔 Logged Reminders | Privacy notice: identifiers partially masked; full ID only Super Admin & Data Officers; cross-referenced with **Medication Enquiry** for pharmacy availability; link to Notifications | 7 filters: search, Condition, Medication Type/Form, Schedule, Region, Status, Pharmacy Notif · 17 columns: User (masked), User ID (4OL-xxxxxx), Region, Medication Name (+ strength/brand), Generic/Brand, Condition Treated, Amount/Dose, Unit, Type/Form, Schedule (+ times), Duration, Adherence %, Status (Active/Completed/Missed/Paused), Pharmacy Notif (Notified/Pending/Not Eligible/Opted Out), Logged, Actions (view/analytics/pharmacy/Nudge) · Footer bulk actions: Nudge Missed Doses · Pharmacy Marketing Campaign · View Notification Log · Adherence Report · Export All |
| 3 | 📋 Adherence | Aggregate-only privacy notice · 4 KPI cards: Active Reminders, Adherence Rate, Missed Doses 30d, Notification Open Rate · Per-drug aggregate table: Drug Name, Active Reminders, Adherence Rate, Missed (30d), Avg Doses/Day, 📊 Analytics |
| 4 | ⚠️ Interactions | Filters: search, Severity (Critical/Major/Moderate/Minor) · Columns: Drug A, Drug B, Interaction Severity, Effect, Recommended Action, Flags 30d, Edit |
| 5 | 🤖 AI Checker | Gradient banner: Drug Interaction Checker AI v1.8 Active — real-time checks, 98.1%, covers 4,820 drugs, 24,600+ interaction pairs indexed · 4 KPI cards: AI Accuracy, Interaction Pairs, Flags Issued 30d, Avg Response Time (0.04s) · Clinical review notice: monthly pharmacist review; v2.0 Q3 2026 with expanded Ghanaian drug coverage |

**Pharmacy Marketing Campaign modal (`m-pharmacy-notif`, line ~12630):** select IBP-verified pharmacy → medication available → target health condition → GPS region (auto) → max proximity (1km/2km/5km/district/region) → message preview → send time → campaign expiry → estimated reach count (opted-out excluded) → Preview / Launch. Targets users who logged the medication AND are within the pharmacy's GPS region.

### B.2 Codebase current state

| Piece | State | Verdict |
|---|---|---|
| `medication-reminder/page.tsx` | 5-tab shell with `?tab=` URL sync, PageHeader, KPI row | ✅ structure matches mockup |
| `MedicationStats.tsx` | 3 KPIs via RPC `get_medication_kpi_stats` (Total, Active, Adherence Rate) | Mockup has 6 — add Drugs in DB, Interaction Flags, Categories |
| `LoggedRemindersTab.tsx` (172) | 8 columns (drug, type, user, dosage, interval, status, logged, actions), search only | Missing: 7 filters, 9 columns (region, condition, generic, unit, schedule times, duration, adherence %, pharmacy notif, masked IDs), bulk actions, campaign modal |
| `AdherenceTab.tsx` (137) | Per-log rows (taken/skipped/missed) with status filter | Mockup wants aggregate-only per-drug stats + 4 KPI cards — keep log view as drill-down |
| `DrugDatabaseTab.tsx` | "Coming Soon" stub | Not built |
| `InteractionsTab.tsx` | "Coming Soon" stub | Not built |
| `AICheckerTab.tsx` | "Coming Soon" stub | Not built |
| `view-medication-dialog.tsx` (402) | Reminder detail dialog | ✅ exists |
| `useMedicationReminder.ts` | `useMedicationReminders`, `useLoggedReminders`, `useMedicationAdherence`, `useMedicationReminder`, `useUpsertMedication`, `useDeleteMedication`, `useToggleUserMedicationNotification` | Extend, don't replace |
| Nav | "Medication Reminder" → `/medication-reminder` (`medication.view`) · "Medication Enquiry" → `/medenquiry` (`medication.view`) | ✅ ready |
| RBAC | `medication.view` / `medication.edit` exist; `admin` gets both, `content_manager` view-only | May add `medication.import` / reuse `medication.edit` |

### B.3 Database state (full-tables.sql)

**Exists:**
- `medication_reminders` — user-level; **free-text `drug_name`**, dosage_amount, interval/interval_unit, drug_type, drug_color, notification_schedule, week_days, etc.
- `medication_adherence` — reminder_id FK, status enum (taken/skipped/missed), scheduled_time, action_time
- `medication_enquiries` — **free-text `medication_name`**, pharmacy_id, escrow, delivery workflow
- `pharmacy_campaigns` — pharmacy_id FK, target_regions text[], **target_medications text[]**, target_user_segments, budget/spend/impressions/clicks/conversions, approval workflow → natural home for the Pharmacy Marketing Campaign modal

**Missing (all 3 stub tabs are blocked by this):**
- ❌ No `drugs` catalog table (no generic name, category, availability, form, manufacturer)
- ❌ No drug interaction pairs table
- ❌ No FK from `medication_reminders` / `medication_enquiries` to any catalog
- ❌ No import-batch tracking, no unknown-drug verification queue

### B.4 Proposed schema (migration `medication_drug_catalog`)

```sql
-- 1. Drug catalog (target of the 10,000-row Excel import)
create table public.drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- display name, e.g. "Paracetamol 500mg"
  generic_name text,                 -- e.g. "Acetaminophen"
  slug text unique,
  category text,                     -- analgesic | antibiotic | antimalarial | ...
  availability text check (availability in ('otc','rx_only','controlled')),
  dosage_form text,                  -- tablet | capsule | syrup | injection | inhaler | drops | topical | powder | chewable
  strength text,                     -- "500"
  strength_unit text,                -- mg | mcg | ml | tablets | puffs | sachet
  manufacturer text,
  active_ingredients text[],
  conditions_treated text[],         -- mirror of mockup "Condition Treated"
  atc_code text,                     -- WHO ATC code: normalization + verification anchor
  external_ids jsonb default '{}',   -- { openfda_spl_id, rxnorm, dailymed }
  status text default 'active'
    check (status in ('active','discontinued','under_review','unverified')),
  source text default 'admin'
    check (source in ('excel_import','admin','user_submission','api_verification')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- fuzzy search for mobile autocomplete
create extension if not exists pg_trgm;
create index drugs_name_trgm_idx on public.drugs using gin (name gin_trgm_ops);
create index drugs_generic_trgm_idx on public.drugs using gin (generic_name gin_trgm_ops);
alter table public.drugs add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(generic_name,''))) stored;
create index drugs_search_idx on public.drugs using gin (search_vector);

-- 2. Brand/local aliases (Ghana brand names → canonical drug)
create table public.drug_aliases (
  id uuid primary key default gen_random_uuid(),
  drug_id uuid not null references public.drugs(id) on delete cascade,
  alias text not null,
  alias_type text default 'brand' check (alias_type in ('brand','generic','local','abbreviation')),
  unique (alias)
);

-- 3. Interaction pairs (Interactions tab + mobile checker)
create table public.drug_interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a_id uuid not null references public.drugs(id),
  drug_b_id uuid not null references public.drugs(id),
  severity text not null check (severity in ('critical','major','moderate','minor')),
  effect text,
  recommended_action text,
  source text default 'admin',       -- admin | excel_import | ai_suggested
  is_active boolean default true,
  created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
  check (drug_a_id <> drug_b_id), unique (drug_a_id, drug_b_id)
);
create table public.drug_interaction_flags (   -- feeds "Flags (30d)" + AI Checker KPIs
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.drug_interactions(id),
  user_id uuid references public.user_profiles(user_id),
  flagged_at timestamptz default now()
);

-- 4. Excel import bookkeeping
create table public.drug_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_by uuid references public.user_profiles(user_id),
  total_rows int, inserted int default 0, updated int default 0,
  skipped_duplicates int default 0, failed int default 0,
  status text default 'processing' check (status in ('processing','completed','failed')),
  error_log jsonb default '[]', created_at timestamptz default now()
);

-- 5. Unknown-drug verification queue (mobile submissions)
create table public.drug_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(user_id),
  reminder_id uuid references public.medication_reminders(id),
  entered_name text not null,
  matched_drug_id uuid references public.drugs(id),
  auto_check_result jsonb default '{}',   -- openfda / trigram / AI verdicts
  status text default 'pending'
    check (status in ('pending','auto_matched','verified','rejected')),
  verified_by uuid references public.user_profiles(user_id),
  reviewed_at timestamptz, created_at timestamptz default now()
);

-- 6. Link existing tables into the catalog (nullable, backfilled)
alter table public.medication_reminders add column drug_id uuid references public.drugs(id);
alter table public.medication_enquiries add column drug_id uuid references public.drugs(id);

-- 7. Anatomy bridge (Part A tab 5 "Medications 312 — body part → drug class")
create table public.drug_body_parts (
  drug_id uuid not null references public.drugs(id),
  body_part_id uuid not null references public.body_parts(id),
  primary key (drug_id, body_part_id)
);
```

RLS/permissions: `drugs` readable by `authenticated` **where `status = 'active'`** (mobile autocomplete); writes service-role/admin only. All new admin endpoints behind `requireAdminApiUser("medication.view" | "medication.edit")`.

### B.5 Excel import pipeline (10,000+ medications)

1. **Prep:** obtain the Excel file and map its columns → `drugs` fields (headers unknown until the file is provided). Save a canonical CSV alongside for re-runs.
2. **Upload UI:** Drug Database tab → "📥 Import" button → file picker (accepts .xlsx/.csv), parsed server-side (e.g. SheetJS in a route handler, no client memory issues at 10k rows).
3. **Normalize:** trim/lowercase names, unify strength/unit spellings, resolve category vocabulary to the 8 mockup categories (+ "Other").
4. **Dedupe:** unique key = `(lower(generic_name), strength, strength_unit, dosage_form)`; brand names that collide become `drug_aliases` rows instead of duplicate drugs.
5. **Batch upsert:** chunks of 1,000 rows via `POST /api/medication/drugs/import` (`medication.edit`); each chunk reports inserted/updated/skipped/failed → `drug_import_batches`.
6. **Backfill:** match existing `medication_reminders.drug_name` and `medication_enquiries.medication_name` to the catalog (trigram ≥ 0.85) to populate `drug_id`.
7. Performance: 10k rows is trivial for Supabase Postgres; keep the GIN trigram indexes; run import off-peak.

### B.6 Mobile autocomplete + unknown-drug verification

**Autocomplete (happy path):**
- RPC `search_drugs(q text, lim int default 10)` — trigram similarity on `name`/`generic_name`/`drug_aliases.alias` unioned with tsvector match, returns id/name/generic/strength/form/category, ordered by similarity; index-backed, <50ms at 10k+ rows.
- Mobile (Expo): debounced input (300ms) → `supabase.rpc("search_drugs", { q })` → suggestion list; selecting one writes `reminder.drug_id` + canonical `drug_name`.

**Unknown-name verification flow (never block the user):**
1. No match above threshold → reminder is still created with free-text `drug_name`; mobile inserts a `drug_verification_requests` row (`status: pending`, entered_name, reminder_id).
2. **Automated checks** (async, server-side function/route):
   - Normalize + trigram re-check against catalog & aliases (catch typos like "paracetemol");
   - **OpenFDA Drug API** (free, no key): `https://api.fda.gov/drug/ndc.json?search=openfda.brand_name:"<name>"` + SPL data → verifies real medication, pulls generic name/active ingredients;
   - Optional LLM fallback to classify (real drug vs. supplement vs. nonsense) — flagged, never auto-trusted.
3. **Auto-match found** → set `matched_drug_id`, link `reminder.drug_id`, status `auto_matched`; new catalog entries created with `source: api_verification, status: under_review`.
4. **No match** → request stays `pending` and appears in an admin **Verification Queue** (sub-section of Drug Database tab: pending submissions table with Approve-as-new / Map-to-existing / Reject actions — `medication.edit`; clinical pharmacist sign-off mirrors the mockup's "monthly review" note).
5. Approved drugs flip to `status: active` and become instantly available to autocomplete for all users.

### B.7 Tab implementation map

| Tab | Build on | Key work |
|---|---|---|
| 💊 Drug Database | New `useDrugs` hook (TanStack Query) + `drugs` table | Filters (category/status/availability/search), DataTable with mockup columns, Add/Edit Drug dialog (zod), Import wizard, Export CSV, Verification Queue sub-tab |
| 🔔 Logged Reminders | Extend `useLoggedReminders` | Add 7 filters + 9 columns; masked identifiers (mask unless super_admin/data officer); adherence % from `medication_adherence` aggregate; Pharmacy Notif status column; bulk action bar |
| 📋 Adherence | New RPC `get_drug_adherence_stats()` | Aggregate per-drug view (active reminders, adherence rate, missed 30d, avg doses/day) + 4 KPI cards; existing log-level table becomes a drill-down |
| ⚠️ Interactions | `drug_interactions` + `drug_interaction_flags` | Severity filter + search, DataTable, Edit dialog, flags-30d computed column |
| 🤖 AI Checker | Feature flags (`settings/feature-flags` route exists) + flag aggregates | Version/accuracy/pairs/response-time KPIs from `drug_interactions` counts + config row; clinical-review notice static |
| KPI row | Extend `get_medication_kpi_stats` RPC | Add drugs-in-db, interaction-flags-30d, drug-categories |

### B.8 Drug Database ↔ Medication Enquiry linkage

- `medication_enquiries.drug_id` FK: enquiry creation (mobile + admin) uses the same `search_drugs` autocomplete; unknown names follow the same verification flow.
- Drug Database row view shows "Enquiries (30d)" count; enquiry tables gain a catalog-resolved column (canonical name, availability badge — Rx-only enquiries require prescription upload).
- **Pharmacy Marketing Campaign modal** → implemented on the existing `pharmacy_campaigns` table: pharmacy (IBP-verified = `ibp.status`/`facility_profile`), medication (from `drugs`), condition, GPS region + proximity (PostGIS/`facility_profile.location`), message preview, schedule/expiry. Dispatch reuses **Epic 27**: `resolve_notification_segment` with segment `{ has_medication_history: drug_id, within_km: { facility_id, radius } }` + `send_notification_campaign`. Estimated-reach count = `get_notification_segment_count`.
- "Nudge: Missed Doses" → ad-hoc Epic 27 campaign targeting users with `medication_adherence.status = 'missed'` in last N days for the selected drug.

### B.9 Cross-menu interconnections

| Menu | Linkage |
|---|---|
| Medication Enquiry | FK + shared autocomplete + pharmacy availability campaigns (above) |
| Diseases & Conditions | `drugs.conditions_treated` ↔ `conditions` (future junction `drug_conditions`); powers Logged Reminders "Condition Treated" filter and pharmacy campaign targeting |
| Symptoms | Optional `drug_symptoms` junction for side effects; AI consultation can cite side-effect data |
| Anatomy | `drug_body_parts` junction → anatomy tab 5 "Medications — body part → drug class" card (Part A) |
| Notifications | Missed-dose nudges + pharmacy campaigns via Epic 27 pipeline; "View Notification Log" deep-links to `/notifications` |
| Healthy Living | Drug-condition pairing can surface related tips (later) |
| Fitness | Contraindication hints for certain drug classes (later, optional) |

### B.10 Phasing

| Phase | Scope | Est. |
|---|---|---|
| 0 | Migration `medication_drug_catalog` (B.4) + permission keys check | Small |
| 1 | Excel import pipeline + Drug Database tab (table/filters/CRUD/import/export) | Medium–Large |
| 2 | `search_drugs` RPC + mobile autocomplete + verification flow + admin queue | Medium |
| 3 | Interactions tab + AI Checker tab + KPI extensions | Medium |
| 4 | Logged Reminders upgrades (filters/columns/masking/bulk actions) + Adherence aggregates | Medium |
| 5 | Pharmacy Marketing Campaign modal on `pharmacy_campaigns` + Epic 27 dispatch + Med Enquiry FK backfill | Medium |

### B.11 Open decisions (user input needed)

1. ~~**The Excel file**~~ — **provided 2026-08-17**, analyzed in B.12 below.
2. **Verification source mix** — recommendation: pg_trgm fuzzy + OpenFDA (free) + admin/pharmacist queue; confirm whether a paid data source (e.g. DrugBank) is on the table.
3. **Privacy masking** — confirm mockup policy: full user IDs visible only to `super_admin` (+ a "data officer" attribute?), masked for all other roles.
4. **Interaction seed data** — the CSV contains no interaction pairs; seed from a public dataset during Phase 3.
5. ~~**Category vocabulary**~~ — **resolved D1 (2026-08-17):** collapse the 138 CSV categories into the mockup's 8 buckets + "Other" at import time (mapping table in B.12).
6. ~~**Non-medication TRUE rows**~~ — **resolved D2 (2026-08-17):** exclude the 220 FMCG/personal-care rows from the drug catalog.

### B.12 Source file analysis — PILLS LIST_FINAL_classified.csv (import mapping)

**File:** `c:\Users\FM\CascadeProjects\windsurf-project\output\PILLS LIST_FINAL_classified.csv`
**Profiling script (read-only):** `scripts/analyze_pills_csv.py` · **Nature:** pharmacy inventory/sales list enriched by a medication classifier (columns H+ are sales forecasts — ignored per instruction; only columns A–E and G matter).

**Row counts (import filter = column B `is_medication` = TRUE):**

| Metric | Count |
|---|---|
| Total data rows | 8,536 |
| TRUE → pass filter | 3,530 |
| FALSE → skip | 5,006 |
| **Importable after D2 exclusion** | **3,310** (3,530 − 220 FMCG/personal-care) |
| `original_name` duplicates | 0 (all 8,536 unique) |
| TRUE rows missing `generic_name` | 0 |
| TRUE rows with no parseable strength in name | 939 |

**Column-by-column mapping (A,B,C,D,E,G):**

| CSV column | Header | Sample values | Maps to (`drugs`) | Notes |
|---|---|---|---|---|
| A | `original_name` | `METFORMIN DENK TAB 500MG 100'S`, `GALVUSMET TAB 50/1000MG 60'S` | `name` (title-cased) + regex-extracted `dosage_form`, `strength`, `strength_unit`, `pack_size` | Unique, no dupes — safe as natural key. Form/strength/pack embedded: `TAB`, `CAPS`, `SYRUP`, `INJ`, `DROPS`, `INHALER`, `CREAM`, `SUSP`, `EFF`, `AMP`…; packs as `100'S`, `28'S` |
| B | `is_medication` | `True` / `False` | **row filter only** | Only `True` imported; FALSE (5,006) skipped entirely |
| C | `generic_name` | `metformin`, `vildagliptin/metformin`, `iron supplement` | `generic_name` + split on `/` into `active_ingredients[]` | Always populated for TRUE. 1,486 unique; 93 combos (`/`). ⚠️ some entries are descriptors, not INNs (`antiseptic` ×35, `cough syrup` ×35, `multivitamin` ×102) |
| D | `category` | `Antidiabetic`, `Vitamin`, `Unknown - Review` | `category` | **Resolved D1:** 138 distinct values collapsed into 8 mockup buckets + `Other` at import time (mapping table below); the fine-grained original is preserved in `metadata.category_original`. 897 rows are `Unknown - Review` (842) / `Unknown` (55) → `Other` |
| E | `availability` | `OTC` (1,337), `Rx Only` (1,299), `Unknown` (894) | `availability` → `otc` / `rx_only` / `unknown` | **Resolved D3:** `Unknown` stored as `'unknown'` — B.4 check constraint becomes `('otc','rx_only','controlled','unknown')`. No `Controlled` in data |
| F | `confidence` | 0.45–0.95 | not imported (per A–E,G instruction) but recommended in `metadata` | 1,391 @0.95 · 795 @0.9 · 842 ≤0.65 |
| G | `reason` | `Known drug word: metformin`, `Brand word: galvusmet`, `Comprehensive mapping`, `Non-med indicator but has dosage+form: butter` | `metadata.classification_reason` + optional `drug_aliases` seed | Provenance of the classification. `Brand word: X` reasons can auto-seed `drug_aliases`. `Non-med indicator…` marks the suspect rows |

**Data-quality tiers found (drives import `status`):**

| Tier | Count | Definition | Suggested `drugs.status` |
|---|---|---|---|
| ✅ Clean | 2,468 | confidence ≥ 0.88, real category, known/brand match | `active`, `source: excel_import` |
| ⚠️ Review | 842 | confidence ≤ 0.65 and/or category `Unknown*` | `under_review` — admin-visible only, excluded from mobile autocomplete until promoted to `active` (D4) |
| 🚫 Suspect non-medication | 220 | TRUE with reason `Non-med indicator…` — deodorant sprays (Rexona ×63), lotions (Jergens ×33), butter, biscuits, bleach, chocolate, shower gel | **Excluded from import entirely (D2)** — never written to `drugs`; counted in `drug_import_batches.skipped` |

**Derived-field extraction rules (from column A):**
- `dosage_form`: token map TAB(S)→tablet, CAPS/CAP→capsule, SYRUP→syrup, INJ/AMP/VIAL→injection, DROPS→drops, INHALER→inhaler, CREAM/OINT/GEL/LOTION→topical, SUSP→suspension, EFF→effervescent tablet, SACHET/POWDER→powder, SPRAY→spray
- `strength` + `strength_unit`: regex `(\d+(?:\.\d+)?)(MG|MCG|G|ML|IU|%)`, keep combos (`50/1000MG` → two entries aligned with the `/`-split generic)
- `pack_size`: `(\d+)'S` (e.g. `100'S` → 100)
- `manufacturer` hints (optional, low confidence): parenthetical/suffix tokens `(INTAS)`, `(URODIUM)`, `(WUHAN)`, `DENK`, `UK`
- `slug`: lowercased generic + strength + form; collision-safe because names are unique

**Import execution (makes B.5 pipeline concrete):**
1. Read CSV (utf-8-sig), keep only columns A,B,C,D,E,G
2. Filter `is_medication == 'True'` → 3,530 rows
3. Exclude the 220 `Non-med indicator` FMCG/personal-care rows (D2) → **3,310 rows**; normalize + derive fields; collapse `category` per the D1 mapping table
4. Assign status per quality tier (2,468 `active` + 842 `under_review`); write `metadata: { confidence, reason, category_original, source_file, batch_id }`
5. Upsert in chunks of 500 (3,310 rows ≈ 7 chunks); `drug_import_batches` bookkeeping
6. Seed `drug_aliases` from `Brand word: X` reasons (brand → canonical generic)
7. Post-import backfill: match existing `medication_reminders.drug_name` / `medication_enquiries.medication_name` against the catalog (trigram ≥ 0.85) to set `drug_id`

**Volume note:** the expectation was 10,000+ medications; this file yields 3,530 TRUE rows → **3,310 importable after the D2 exclusion**. If a larger master list exists, the same mapping applies.

**Decisions resolved (2026-08-17):**
- **D1 — Categories: collapse at import time.** Store one of the 9 bucket values below in `drugs.category` (matches the mockup filter dropdown); keep the fine-grained CSV value in `metadata.category_original` so no information is lost.
- **D2 — Suspect rows: exclude.** The 220 `Non-med indicator` TRUE rows (FMCG/personal-care) are dropped from the import — not written to `drugs`.
- **D3 — `availability = Unknown` (894): store as `'unknown'`.** B.4 check constraint: `('otc','rx_only','controlled','unknown')`.
- **D4 — Autocomplete: `active` only.** Mobile `search_drugs` RPC filters `status = 'active'`; `under_review` drugs are visible only in the admin Drug Database tab. The B.4 RLS policy (`status = 'active'`) already enforces this at the database level.

**D1 category-collapse mapping (138 → 9 buckets):**

| Stored `drugs.category` | CSV categories folded in |
|---|---|
| Antibiotics | Antibiotic, Ophthalmic Antibiotic, Otic Antibiotic, Topical Antibiotic, Antiparasitic |
| Antihypertensives & Cardiovascular | Antihypertensive, Beta Blocker, Calcium Channel Blocker, ACE Inhibitor, ARB, Diuretic, Alpha Blocker, Statin, Antihyperlipidemic, Anticoagulant, Antiplatelet, Antiarrhythmic, Anti-anginal, Cardiac Glycoside, Venotonic, Peripheral Vasodilator, Inotropic, Bile Acid Sequestrant |
| Antimalarials | Antimalarial |
| Analgesics | Analgesic, Topical Analgesic, Antimigraine, Antigout, Antirheumatic, Biologic DMARD |
| Antiretrovirals | Antiviral (rows carry `metadata.needs_category_review: true` — not all antivirals are ARVs) |
| Antidiabetics | Antidiabetic |
| Antifungals | Antifungal |
| Vitamins & Supplements | Vitamin, Supplement, Mineral Supplement, Herbal Supplement, Nutritional Supplement, Multivitamin, Nutritional, Probiotic, Electrolyte, Antioxidant, Vitamin D Analog, Herbal Medicine |
| Other | `Unknown`, `Unknown - Review`, and the ~85 remaining categories (Antitussive, Antihistamine, Corticosteroid, Antacid, Antidepressant, Antipsychotic, Mood Stabilizer, Bronchodilator, Proton Pump Inhibitor, Hormonal Contraceptive, Topical, Antiseptic, Decongestant, Antiemetic, Antidiarrheal, Sleep Aid, Anxiolytic, Chemotherapy, Antiglaucoma, Laxatives of all types, Hormone/Thyroid/Progestin/Hormone Therapy, Erectile Dysfunction, Nootropic, Expectorant, Mucolytic, Eye/Otic preparations, Dermatologicals, Gastrointestinal aids, Emergency Medicine, Diagnostic, Medical Supply, and all other singletons) |

---

## Part C — Users Menu (All Users + IBP Businesses) (✅ Implemented)

### C.1 Mockup inventory

#### `#page-users` (line 2878)

**Header:** 📥 Export CSV · + Add User · + Invite User (modal `m-invite-user`: name, phone, email, default plan, region, note)
**PHI banner:** GH-DPA / AES-256 / masked display / watermarked exports
**KPIs (6):** Total Users · Active (30d) · Premium · **NHIS-Linked** · Flagged · Delete Requests — each with ⋮ drill-down menu

| # | Tab | Contents |
|---|-----|----------|
| 1 | All Users | Filter bar: search (name/masked phone/ID), Plan (Free/Starter/Pro/Elite), Status, NHIS, Sort, Export · 11-col table: ☑, User (**masked name + 4OL-XXXXXX badge + masked email**), masked Phone, Plan, NHIS, Region, **Engagement progress bar**, Joined, Last Active, Status, Actions (view/edit/copy/flag; flagged rows get approve/deactivate/delete) · Bulk bar: Export, Send Notification, Upgrade Plan, Suspend |
| 2 | ✅ Active | Retention alert · cols: User, Plan, Sessions (7d), Avg. Session, Engagement %, Features Used, Last Active, Actions |
| 3 | ⭐ Premium | 4 plan KPI cards (Total/Starter/Pro/Elite + prices) · Renewal filters · cols: User, Plan, Monthly Value, Sub. Since, Renewal Date, Payment Method, Status · Actions: Renew Now, Change Method, Cancel Sub |
| 4 | 🚩 Flagged | cols: User, Flag Reason, **Flagged By** (AI Moderation / User Reports), Date, Reports count · Actions: Clear / Ban |
| 5 | 🗑️ Delete Requests | GH-DPA 30-day deadline alert · cols: User, Request Date, Reason, **Days Remaining**, Status · Actions: Delete / Reject / Email User / Block |

#### `#page-ibp` (line 3024)

**Header:** + Register IBP / 📋 Add New IBP (modal `m-register-ibp`)
**Banners:** SA module connections (Transactions, Marketing & Ads, Facilities, Notifications, Reviews) · IBP policy alert (health-related only; 9 restricted facility types; no direct selling; edits need admin approval)
**KPIs (6):** Total IBPs · Active & Published · Pending Verification · Premium Members · Products Listed · Suspended
**All-IBPs toolbar:** search · Export dropdown (CSV/Excel/PDF/selected) · Filters dropdown (status × plan × region) · Sort dropdown · **Columns visibility dropdown** · Bulk Actions dropdown (Verify & Publish, Approve Products, Upgrade Premium, Notify, Suspend, Remove)

| # | Tab | Contents |
|---|-----|----------|
| 1 | All IBPs | 11-col table: ☑, Business (name + 4OL ID + **branch count**), Type, Owner/Contact, Region, Products count, Plan, Verified, Status, Joined, Actions (View / Edit / Activity Log / Campaigns / Suspend / Remove) |
| 2 | ⏳ Pending | Docs column (RGD submitted / none — "not mandated") · Actions: Verify & Publish / Reject |
| 3 | ✅ Active | cols: Business, Type, Products Listed, Pending Products, Plan, Last Update · Actions: View / Edit / Campaign |
| 4 | ⭐ Premium | 4 KPI cards (Premium IBPs, Monthly Revenue, Featured Ads, Visibility Boost) · cols: Business, Plan Tier, Active Ads, Monthly Value, Renewal · Actions: Manage Ads / Edit |
| 5 | 📦 Products & Services | 3 KPIs (Published/Pending/Rejected) · cols: ☑, Product, IBP Business, Category, Has Image, Submitted, Status · Approve/Reject + bulk approve |
| 6 | 🚫 Suspended | cols: Business, Reason, Suspended By, Date · Actions: Reinstate / Remove |

**Register IBP modal (`m-register-ibp`):** business name, branches, founded year · **manual business-type entry with restricted-type validation warning** (Pharmacy, Gym, Herbal Clinic, Clinic/Hospital, Dental, Wellness/Spa, Home Healthcare, Diagnostic Lab, Mental Health → must go to Facilities) · owner/contact · region/district/street · RGD no., TIN, cert upload (optional — "not mandated") · initial plan + status (skip verification option) · admin note

### C.2 Codebase current state

| Piece | State | Verdict |
|---|---|---|
| `app/(dashboard)/users/page.tsx` | 3 tabs: All / Flagged / Delete Requests | **Missing Active + Premium tabs** |
| `_components/UsersStats.tsx` | 6 KPIs via `useUserDashboardMetrics` (total, active, premium, pending_verification, flagged, delete_requests_pending) | No **NHIS-Linked** KPI; no ⋮ drill-downs |
| `_components/AllUsersTab.tsx` | DataTable + `userColumns` + `useUsers`; view dialog wired | Search box is **cosmetic** (no state); Plan filter static; Export dead; **no NHIS/Region/Engagement cols; no bulk actions; no PHI masking** |
| `_components/FlaggedUsersTab.tsx` | `/api/admin/users/flag?status=pending_review` + actions via `/api/ai/moderation-queue` (dismiss/warn/suspend/ban) | Missing Flagged-By + Reports cols; matches mockup actions |
| `_components/DeleteRequestsTab.tsx` | Wired to `delete_account_requests` | Missing "Days Remaining" urgency display |
| `view-user-dialog` / `flag-user-dialog` / `PromoteToLeaderDialog` | Exist | Extend view dialog with plan/subscription/NHIS sections |
| `/api/admin/users/export` + `/api/admin/users/flag` | Exist | Verify RBAC keys enforced (`users.export`) |
| **No** add-user/invite/suspend/upgrade-plan routes | `user_invites` table exists (email+token, `invite_type`) | Invite flow partially pre-built |
| `app/(dashboard)/ibp/page.tsx` | Single flat directory table via `/api/ibp` GET; 4 client-side KPIs over last 50 rows | ~**10% of mockup** — no tabs, actions, register form, verification, products |
| `app/api/ibp/route.ts` | GET only; `getAdminApiUser()` **without permission key** | ⚠️ RBAC retrofit needed (same class of gap as the anatomy body-map route) |
| No IBP register/verify/suspend/product endpoints | — | All missing |

### C.3 Live schema — what exists vs. gaps

**Exists:** `user_profiles` (status enum incl. suspended/banned/pending_verification, last_active, phone) · `user_subscriptions` + `subscription_plans` (tiers `free/standard/premium/featured` — **exactly the IBP plan tiers in the mockup**) · `delete_account_requests` (reason, reviewer, data-export fields) · `content_moderation_flags` (ai_detected, reported_by, status) · `user_invites` · `ibp` (status, verified_by/at, rejection_reason, is_featured, campaign_budget/total_spend, admin_notes) · `platform_metrics_history` · `transaction_records` · `pharmacy_campaigns`/`notification_campaigns`

**Gaps:**

| Missing | Needed for |
|---|---|
| `user_profiles.public_id` (4OL-XXXXXX, unique) | ID badges across all mockup tables |
| `user_profiles.region`, `nhis_number` (encrypted) | Region column, NHIS filter/KPI |
| Engagement source (sessions, features used) | Active tab + engagement bars |
| `ibp.branches`, `founded_year`, `tin_number`, `registration_docs jsonb`, `suspended_reason`, `suspended_by`, `suspended_at` | Register modal + Suspended tab |
| **`ibp_products`** table (ibp_id, name, category, image_url, status pending/published/rejected/flagged, reviewed_by/at) | Products & Services tab — **no such table exists** |
| `ibp_activity_log` (or reuse platform audit log) | per-IBP Activity Log action |
| IBP plan link | `user_subscriptions` reusable via `ibp.user_id` |

**Proposed migration (additive, one file):**

```sql
alter table public.user_profiles
  add column if not exists public_id text unique,
  add column if not exists region text,
  add column if not exists nhis_number text; -- store encrypted app-side

alter table public.ibp
  add column if not exists branches int default 1,
  add column if not exists founded_year int,
  add column if not exists tin_number text,
  add column if not exists registration_docs jsonb default '[]',
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid references public.user_profiles(user_id),
  add column if not exists suspended_at timestamptz;

create table public.ibp_products (
  id uuid primary key default gen_random_uuid(),
  ibp_id uuid not null references public.ibp(id) on delete cascade,
  name text not null, category text, image_url text,
  status text not null default 'pending'
    check (status in ('pending','published','rejected','flagged')),
  rejection_reason text,
  reviewed_by uuid references public.user_profiles(user_id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table public.ibp_activity_log (
  id uuid primary key default gen_random_uuid(),
  ibp_id uuid not null references public.ibp(id) on delete cascade,
  admin_id uuid references public.user_profiles(user_id),
  action text not null, details jsonb default '{}',
  created_at timestamptz default now()
);
```

### C.4 Implementation approach

**API layer (RBAC-enforced, `requireAdminApiUser`):**
- `/api/admin/users` GET — filters (search/plan/status/nhis/region/sort), masking applied server-side; PATCH — status changes (suspend/activate) → `users.edit`
- `/api/admin/users/invite` POST — creates `user_invites` row + SMS/email dispatch → `users.edit`
- `/api/admin/users/export` — enforce `users.export`, watermark header per PHI banner
- `/api/admin/users/[id]/plan` PATCH — subscription change → `users.edit`
- `/api/ibp` — retrofit `requireAdminApiUser("ibp.view")` on GET; POST register → `ibp.edit`
- `/api/ibp/[id]` PATCH — verify/reject/suspend/reinstate/remove → `ibp.edit` (remove → see C.5 D2)
- `/api/ibp/[id]/products` + `/api/ibp/products/bulk` — approve/reject → `ibp.edit`
- KPI RPC `get_user_kpi_stats()` (adds nhis_linked) + `get_ibp_kpi_stats()` (total, active, pending, premium, products_live, products_pending, suspended)

**UI layer:** extend `users/page.tsx` to 5 tabs; new `ActiveUsersTab`/`PremiumUsersTab`; wire AllUsersTab search/filters/bulk + masking; new `InviteUserDialog`. Rebuild `ibp/page.tsx` as 6-tab shell (`?tab=` sync) with `_components/` tabs: `AllIbpsTab`, `PendingIbpsTab`, `ActiveIbpsTab`, `PremiumIbpsTab`, `IbpProductsTab`, `SuspendedIbpsTab`, `RegisterIbpDialog`, `IbpViewDialog`, `IbpActivityDialog`. Hooks: `hooks/supabase-calls/useIBP.ts` (TanStack Query, invalidate on mutations).

**Restricted-type validation:** shared const `RESTRICTED_IBP_TYPES` checked in both the register form (client warning, matching mockup) and the POST schema (zod refine, server truth).

### C.5 RBAC alignment (Epic 31)

| Action | Permission | Roles holding it today |
|---|---|---|
| View users list/details | `users.view` | admin, registrar, moderator, support_agent, finance_admin, compliance_officer, analyst |
| Suspend/flag/invite/plan changes | `users.edit` | admin (+super_admin) |
| Export users | `users.export` | admin |
| **Process delete requests** | `deleteaccount.approve` | **compliance_officer only (+super_admin)** — Delete-Requests tab actions must be gated by this key, not `users.edit` |
| View IBPs | `ibp.view` | admin, registrar, analyst |
| Verify/suspend/approve products | `ibp.edit` | admin |
| **Permanent IBP removal** | proposed **`ibp.delete`** (new key) | admin only (decision C-D2) |

Notes:
- `admin_role` attribute-based masking: PHI (full phone/email/NHIS) shown unmasked **only to super_admin**; all other roles get masked `+233 24 *** ***4` / `kwa****@gmail.com` — serializer lives in the users API route, matching the mockup PHI banner and B.11 item 3.
- Flagged tab currently posts to `/api/ai/moderation-queue` — **confirmed 2026-08-20: both GET and POST still use bare `getAdminApiUser()` with no permission key** (5th retrofit route — see Part G.2; propose `ai.view` for GET, `ai.manage` for POST).
- Registrar keeps read-only IBP view (matches field-registration workflow).

### C.6 Interconnections with other menus

| Link | Mechanism |
|---|---|
| Users → **Transactions** | `user_subscriptions`/`transaction_records` joins (Premium tab payment method + renewal); mockup ⋮ "Churn/Funnel" |
| Users → **Notifications** | Bulk "Send Notification" → `notification_campaigns` (Epic 27 dispatch) |
| Users → **Security/Compliance menu** | Delete Requests = `deleteaccount.view/approve`; Flagged = `content_moderation_flags` shared with AI Moderation menu |
| Users → **Fitness/Health modules** | Engagement score + "Features Used" derived from `tracker_logs`, `medication_reminders`, session events |
| IBP → **Marketing & Ads** | `campaign_budget`/`total_spend` already on `ibp`; Premium tab "Manage Ads" → campaign creation modal (mockup `m-create-campaign`) |
| IBP → **Facilities** | Mutual-exclusion: restricted IBP types redirect to Facilities registration; linked-profile banner |
| IBP → **Transactions** | IBP subscription revenue (Premium tab "Monthly Revenue") via `transaction_records.transaction_type='subscription'` |
| IBP → **Reviews/Notifications** | SA connection banner; product approvals can trigger IBP push notifications |

### C.7 Phased plan

| Phase | Scope | Depends on |
|---|---|---|
| 1 | Migration (public_id, region, nhis, ibp columns, `ibp_products`, `ibp_activity_log`) + KPI RPCs | — |
| 2 | Users uplift: Active + Premium tabs, working search/filters, masking, Invite dialog | Phase 1 |
| 3 | IBP uplift: 6-tab shell, register modal, verify/suspend/reinstate, RBAC retrofit of `/api/ibp` | Phase 1 |
| 4 | Products & Services approval workflow + bulk actions + activity log | Phase 3 |
| 5 | Engagement analytics, NHIS verification queue, broadcast integration | Phases 2–3 |

### C.8 Open decisions

- **C-D1 — Engagement data source:** no sessions table exists. Derive from `last_active` + module-row counts (cheap, Phase 2), or add an `app_sessions` table fed by the mobile SDK (richer, later)? Recommendation: derive first.
- **C-D2 — `ibp.delete` key:** introduce a dedicated permission for permanent IBP removal (recommendation) or keep it under `ibp.edit`?
- **C-D3 — 4OL-XXXXXX IDs:** backfill `public_id` for all existing `user_profiles` + IBPs at migration time (recommendation: `4OL-` + zero-padded sequence), or only assign going forward?
- **C-D4 — NHIS KPI:** real NHIS linkage table vs. a `nhis_number` presence count for now (recommendation: presence count; integration later).
- **C-D5 — IBP plan pricing:** mockup shows Standard ₵60/mo, Premium ₵150/mo, Featured ads ₵350 — confirm against `subscription_plans` seed before wiring the Premium tab.

---

## Part D — Dashboard + Task Manager (✅ Implemented)

### D.1 Mockup inventory

#### `#page-dashboard` (line 1714)

**Header:** time-period select (7d/30d/90d/year) · 📥 Export Report · 🔐 Security · 📣 Broadcast
**Critical alerts banner:** 2 alerts with deep links ("Fix MFA →" Admins, "Security Center →")

| Row | Components |
|---|---|
| 1 | **8 clickable KPI cards** (Total Users, Active Facilities, Revenue MTD, Transactions Today, AI Queries/Day, Premium Subs, HCPs, Security Score) — each card is a **link to its menu** and has a **⋮ drill-down menu** (e.g. Users card: View Users / Broadcast / Export CSV / View Flags) |
| 2 | 📈 Revenue Trend chart (subscriptions + transaction-fee lines, monthly/quarterly toggle) · 🖥️ System Health (API response, DB latency, uptime, active sessions, Firebase FCM) · ⚡ Quick Actions (6 wired buttons: Broadcast, Manage Users, Review Facilities, View Transactions, Review Jobs, Force MFA) |
| 3 | 💰 Revenue Streams MTD (7 bars: subscriptions, provider plans, fees, enterprise wellness, jobs premium, advertising, FacilityScout) · 👥 Users by Plan (donut Free/Starter/Pro/Elite + "Manage →") · 📊 Feature Usage 30d (7 features incl. Anatomy Map, Medication Reminders) |
| 4 | 🟢 Live Platform Activity feed (typed tags CRITICAL/WARN/AI/APPROVED/INFO + "View All Logs →") · 🤖 AI Hub Overview (models, pending flags, accuracy, anomalies) · 🗺️ Regional Coverage (facilities + users per region + "Full Map →") |
| 5 | 🏥 Health Features Status (7 features w/ live/staging badges) · ⏳ Admin Pending Tasks (6 queue items, each deep-linked: facilities, MFA, HCP, jobs, AI flags, reviews) · ⚖️ Compliance & GRA (GH-DPA, tax ID, VAT, filings, scans, encryption) |

#### `#page-tasks` (line 13260) — "Super Admin only"

**Header:** 📥 Export Tasks · + New Task (modal `m-create-task`)
**KPIs (4):** New · In Progress · Under Review ("SA sign-off pending") · Completed (this quarter)
**Kanban — 4 columns** (New Task / In Progress / Under Review / Complete) with per-column **+** add button. Cards carry: priority badge (⚫ Critical / 🔴 High / 🟡 Medium / 🟢 Low) · **T-XXX human ID** · title · description · assignee initials avatar · category chip w/ emoji (🛠 Dev, 🔐 Security, 📊 Reports, 🏥 Facilities, 💰 Finance, 📣 Marketing, 🏢 IBP, ⚖️ Compliance, 🩺 HCP…) · due date with **urgent styling** (`tk-due-urgent`) · **progress bar on in-progress cards** · completion tag (✅ Apr 2026)

### D.2 Codebase current state

#### Dashboard (~90% of mockup structure)

| Piece | State | Verdict |
|---|---|---|
| `dashboard/page.tsx` (245 lines) | Time filter, 8 KpiCards, all 13 section components wired to `/api/dashboard/overview?timeFilter=` | Structure matches mockup |
| 14 `_components/` (CriticalAlerts, RevenueTrendChart, SystemHealth, QuickActions, RevenueStreams, UsersByPlan, FeatureUsage, ActivityFeed, AIHubOverview, RegionalCoverage, HealthFeaturesStatus, PendingTasks, ComplianceGRA) | Render from `PlatformOverviewMetrics` | See gaps below |

**Gaps:**
1. **KPI cards are not clickable and have no ⋮ drill-down menus** — the mockup's central dashboard-as-hub navigation is missing (decision D-D1)
2. **QuickActions buttons are dead** — labels only, no href/onClick (targets exist: `/notifications`, `/users`, `/facilities`, `/transactions`, `/jobs`, `/admins`)
3. **Export button disabled** — needs `/api/dashboard/export` (`dashboard.export` key already in catalog)
4. **System Health is "Awaiting instrumentation"** — API latency/uptime/sessions/FCM have no data source
5. **Revenue trend chart shows "Awaiting data"** + Security Score KPI "Awaiting data" — revenue pipeline gap (financial pipeline was deferred by user instruction in Epic 31)
6. **PendingTasks** wired to live queue metrics (5 items: facilities, HCP, FacilityScout, delete requests, security threats) but mockup has 6 (adds: admins w/o MFA, job posts, AI flags, flagged reviews) — extend `metrics.queues`
7. ⚠️ **RBAC:** `/api/dashboard/overview` uses `getAdminApiUser()` **without `dashboard.view`** — retrofit (same class as `/api/ibp`)

#### Task Manager (~85% — Epic 22 already built the core)

| Piece | State | Verdict |
|---|---|---|
| `supabase/migrations/20260813_epic22_admin_task_manager.sql` | `admin_tasks` table (title, description, status×4, priority×4, category, assignee_id, due_date, board_position, completed_at) + RLS + RPCs | ✅ Matches mockup data model |
| `useAdminTasks.ts` | stats/list/create/move hooks, optimistic drag updates | ✅ |
| `KanbanBoard.tsx` | 4 columns matching mockup, HTML5 drag-drop, per-column **+** opens `NewTaskDialog` (title, description, priority, category, assignee from admins list, due date) | ✅ Core works |
| `TaskStats.tsx` | 4 KPIs from `useAdminTaskStats` | ✅ |
| Nav item gated by `tasks.view` | navigation.ts | ✅ |

**Gaps:**
1. **No progress bar** on in-progress cards — `admin_tasks` has no `progress_percent` column (decision D-D5)
2. **No human-readable IDs** — cards show `id.slice(0,8)` instead of mockup's `T-004` (add `task_seq` int + sequence default)
3. **No urgent/overdue due-date styling** (mockup `tk-due-urgent`)
4. **Header buttons dead** — "+ New Task" (only per-column + works) and "Export Tasks"
5. No card click-to-edit / delete action
6. Category is free text — mockup uses a fixed emoji-tagged vocabulary
7. ⚠️ **RBAC nuance:** mockup subtitle says *Super Admin only*, but ROLE_DEFAULTS grant `tasks.view` + `tasks.edit` to **admin** and `tasks.view` to **registrar**, and the RLS policy also admits registrar role for writes (decision D-D4). Server routes now exist and enforce the keys (retrofitted upstream 2026-08-20 — see Part G), but the UI still writes client-side through RLS, so `tasks.edit` is bypassed until the UI is switched to those routes.

### D.3 Implementation approach

**Dashboard uplift:**
- New reusable `KpiCardMenu` (DropdownMenu) + `href` prop on `KpiCard`; menu items and click targets resolved via `usePermission()` so every drill-down entry is RBAC-visible only when the user holds the target permission (e.g. "View Flags" requires `ai.view`)
- Wire QuickActions to real routes + `notifications.create`/`users.view`/… guards; hide Force MFA unless `security.settings`
- `/api/dashboard/export` (CSV of overview metrics) gated by `dashboard.export`
- Retrofit `requireAdminApiUser("dashboard.view")` on `/api/dashboard/overview`
- Extend overview RPC/`metrics.queues` with: `admins_missing_mfa`, `pending_job_posts`, `pending_ai_flags`, `flagged_reviews` (sources: `user_profiles.mfa_enabled`, `job_postings.status`, `content_moderation_flags`, reviews table)
- System Health: phase it — Supabase ping/DB latency from a scheduled edge function writing to `platform_metrics_history`; FCM status from notification provider health check

**Task Manager uplift:**
- Migration addendum: `alter table admin_tasks add column progress_percent int check (progress_percent between 0 and 100)`, `add column task_seq int unique` fed by a sequence (display `T-` + lpad)
- KanbanBoard: progress bar when `in_progress`, red due badge when overdue/today, card dialog (view/edit/delete — edit gated by `tasks.edit`)
- Header: "+ New Task" opens the same dialog (status `new`); Export Tasks → `/api/admin/tasks/export` gated by `tasks.edit` (or new `tasks.export`)
- Replace client-side direct writes with the API routes (`/api/admin/tasks` GET/POST, `/api/admin/tasks/[id]` PATCH/DELETE) — upstream retrofitted them to enforce `tasks.view`/`tasks.edit` on 2026-08-20 (Part G); remaining work is pointing the UI at them so RLS alone no longer decides who can write
- Category picker: fixed list w/ emojis from mockup (Dev, Security, Reports, Facilities, Finance, Marketing, IBP, Compliance, HCP, Content, Admin)

### D.4 RBAC alignment (Epic 31)

| Action | Permission | Roles today |
|---|---|---|
| View dashboard | `dashboard.view` | all roles |
| Export dashboard report | `dashboard.export` | admin, finance_admin |
| View tasks | `tasks.view` | admin, registrar |
| Create/move/edit tasks | `tasks.edit` | admin (+super_admin) |
| KPI drill-down items | resolved per-target (`users.view`, `ai.view`, `security.view`…) | dynamic |

Notes:
- The dashboard is the RBAC showcase: every card link/menu must degrade gracefully per role (an `analyst` sees views but no Broadcast/Force-MFA entries).
- Mockup "Super Admin only" for Task Manager vs. current grants — recommend keeping role-based (`tasks.edit` = admin) rather than hard super-admin gate; registrar downgrade to view-only (decision D-D4).
- Critical-alerts banner items (MFA, security) gate on `security.view`/`admins.view`.

### D.5 Interconnections with other menus

| Link | Mechanism |
|---|---|
| Dashboard → **every menu** | KPI card click-through + ⋮ menus (Users, Facilities, Transactions, AI Hub, Subscriptions, HCP, Security, Map) — the hub pattern |
| Dashboard → **Notifications** | Broadcast quick action + header button → Epic 27 campaign builder |
| Dashboard → **Admins/Security** | Critical alerts, Force MFA, Security Score |
| Pending Tasks card → **approval queues** | facilities/HCP/FacilityScout/delete-requests/jobs/AI flags/reviews deep links (mirrors the queue counts those menus show) |
| Task Manager → **compliance work** | Task categories map to menu domains (IBP, HCP, Facilities, Finance/GRA, Security/ISO) — the mockup's sample tasks literally reference GH-DPA deletion requests and IBP KYC queues from Part C |
| Task Manager → **Admins** | Assignee picker sourced from admin users (`useUsers({ admin: true })`) |

### D.6 Phased plan

| Phase | Scope |
|---|---|
| 1 | RBAC retrofits: tasks API routes ✅ done upstream 2026-08-20 (Part G); `/api/dashboard/overview` **still open** + QuickActions wiring + header buttons |
| 2 | KPI click-through + ⋮ drill-down menus (permission-aware) + extended queue metrics |
| 3 | Task Manager addendum (progress_percent, task_seq, overdue styling, card dialog, export) |
| 4 | Data sources: revenue pipeline (per user's deferral), System Health instrumentation, Security Score computation |

### D.7 Open decisions

- **D-D1 — KPI drill-down menus:** implement the full ⋮ menus now (recommended) or defer to a later polish pass?
- **D-D2 — Security Score source:** compute from checklist (MFA coverage, open threats, last scan age) in an RPC (recommended) vs. leave "Awaiting data" until Security Center instrumentation exists.
- **D-D3 — System Health:** add scheduled edge-function instrumentation now (recommended: minimal ping + `platform_metrics_history` row) or ship the card with live Supabase-only metrics first.
- **D-D4 — Task Manager audience:** keep `tasks.edit` = admin / `tasks.view` = registrar (recommended, RBAC-native) vs. mockup's hard "Super Admin only" gate.
- **D-D5 — Progress bars:** add `progress_percent` to `admin_tasks` (recommended) vs. skip bars.
- **D-D6 — T-XXX IDs:** add `task_seq` sequence column (recommended) vs. keep UUID short-hash.

---

## Part E — Chats menu (Groups · Support · Flagged) (✅ Implemented)

### E.1 Mockup inventory (`#page-chats`, line 7483 of admin-panel.html)

**Header:** 📥 Export · **+ New Group** (opens `m-create-group`)
**Module-connections banner:** HCP Group Chats · Users · Facilities · Notifications
**KPIs (5):** Total Groups (48, +3 this month) · Group Members (12,840) · Unread Support (5) · Avg Response (2m 14s, "below 5m target") · Satisfaction (94%, +2%)

| # | Tab | Contents |
|---|-----|----------|
| 1 | 💬 Groups (48) | **SA-only Global Message Search banner** (search across all group message histories — audit/compliance) · toolbar: search, Category (Health Conditions / HCP Professional / Fitness & Wellness / Medication / Community Support / Facility), Status (Active/Inactive/Archived), Sort, + Create Group · table: Group Name + subtitle, Category, Members, Group Admin(s) + 4OL-ID, Permissions (e.g. "Verified only · No media"), Messages (7d), Msgs/Member, Status, Created, Actions (View/Edit/Delete or ▶️ Activate) · pagination · bulk bar: Export Selected / Archive Selected / Delete Selected |
| 2 | 🎟️ Support (badge 5) | Unread-alert banner ("2 unassigned waiting over 30 min") · toolbar: search, Type (Billing/Technical/Health Consultation/Account/BedTracker/Other), Priority, Agent (incl. Unassigned), Status (Open/Unread/Pending/Resolved/Escalated), Export · table: TKT-XXXX ID, User (masked name + user# + region), Topic/Summary, Type, Last Message, Agent, **Wait Time** (red when > 30m), Priority, Status, Actions (Open/Assign/Escalate or Note) · bulk bar: Bulk Assign / Escalate Selected / Mark Resolved / Export · **Agent Load side panel** (agents with open-ticket counts + unassigned urgent count) |
| 3 | 🚩 Flagged (badge 3) | Alert banner (counts by reason) · toolbar: search, Reason (Spam / Medical Misinformation / Hate Speech / Harassment / Off-Topic), Group, Auto/Manual flag, Export · table: Group, User (masked), Flagged Message, Reason, **Confidence %**, Flagged At, Actions (Context / Warn / Remove / Ban) |

**Modals:**
- `m-create-group` (line 12492): Name, Description, Category (7 options incl. BedTracker Emergency), Group Type (Open All Users / Verified Users Only / HCP Verified Only / Premium Users / Admin Only), Max Members (0 = unlimited), Region Restriction, Assign Group Admin (4OL-ID or name), **6 group-permission checkboxes** (send messages / share media / share links / admin approval for new members / admin-only announcements / moderation alerts), Group Rules textarea.
- `m-view-group` (line 12525): 4 mini KPIs (Members, Messages 7d, Admins, Flagged) · editable Name/Category/Description/Group Type/Status · **Group Admins manager** (add/remove, roles Super Admin/Moderator) · Suspend Group / Export Members / Send Announcement buttons.

### E.2 Codebase current state

| Piece | State | Verdict |
|---|---|---|
| `chats/page.tsx` (135 lines) | 3 tabs with live count badges via `get_chat_tab_counts` RPC, `?tab=` URL sync | ✅ structure matches mockup |
| `ChatStats.tsx` | 4 KPIs from `/api/chat/analytics` (`get_support_analytics` RPC) | **Satisfaction KPI missing** (mockup has 5) |
| `GroupsTab.tsx` | Search + status filter (single dead option), table: name, members, creator, last message, created; View/Edit/Delete actions; SA Global Search banner exists but **commented out** | ~50%: no Category/Permissions/Messages(7d)/Msgs-per-Member/Status columns, no sort, no bulk bar |
| `CreateGroupDialog.tsx` | Name, description, category (general/specialty/facility/support/announcements), verified-only toggle, max members | **Category vocabularies differ**; no Group Type, region restriction, permission checkboxes, rules, or assign-admin |
| `ViewGroupDialog.tsx` | Read-only details + last message | No mini KPIs, no admin manager, no Suspend/Export Members/Send Announcement |
| Header **+ New Group** button | **No onClick** — doesn't open the dialog (only the in-tab "+ Create Group" works) | dead button |
| `SupportTab.tsx` + `add-ticket-dialog.tsx` | `chat_support` via `useChats`; filters status (Open/Closed) + priority; view/toggle/delete actions | **No agent assignment, wait time, TKT-XXXX ids, type/agent filters, escalation, Agent Load panel** — yet the schema already has the columns (E.3) |
| `FlaggedTab.tsx` | `get_flagged_content` + `moderate_content` RPCs (migrations `20260710_content_moderation_rpc.sql`, `20260710_message_moderation_sync.sql`); dismiss/warn/remove with notes modal; AI badge | ~80%: **no Ban button** (hook supports it), no Confidence column (`ai_confidence` exists!), no Context dialog, no reason/group/auto-manual filters |
| Stubs | `ChatSection.jsx`, `DeleteTicketDialog.jsx`, `EditTicketDialog.jsx` are 2-line dead files; root `TicketModal.jsx` unused | delete during implementation |
| RBAC | Navigation gated on `chats.view`; catalog has `chats.view/reply/moderate` (admin = all, moderator = view+moderate, support_agent = view+reply) | ✅ catalog sufficient; enforcement is the gap (E.4) |

### E.3 Schema assessment — the surprise: support schema already leads the UI

`full-tables.sql` line 592: `chat_support` **already has** `assigned_to`/`assigned_at`, `escalated_at`/`escalated_to`, `resolution_notes`/`resolved_at`/`resolved_by`, `category`, `tags`, `response_time_minutes`, `satisfaction_rating` — everything the mockup's Assign/Escalate/Resolve/Avg-Response/Satisfaction features need, **none of it exposed in the UI**. Gaps:

| Table | Gap vs mockup | Proposed change |
|---|---|---|
| `chat_support` | Status only Open/Closed vs mockup Open/Unread/Pending/Resolved/Escalated; no human ID | Extend check constraint to `('Open','Unread','Pending','Resolved','Escalated')` (backfill: Closed → Resolved); display id as `TKT-` + lpad (no new column — decision E-D2) |
| `conversations` | No status, region restriction, group permissions, group rules | Add `status text default 'active' check (status in ('active','inactive','archived'))`, `region_restriction text`, `group_permissions jsonb default '{}'` (keys: allow_media, allow_links, approval_required, announcements_only, moderation_alerts), `group_rules text` |
| `conversations` | Category vocabulary mismatch (see E.5 decision) | Keep free-text `group_category`; enforce the chosen vocabulary as a shared const + zod, like IBP restricted types (Part C) |
| Group admins | Already modeled: `conversation_members.role in ('member','admin','owner','group_leader')` + `fn_make_group_leader` RPC | Reuse for m-view-group admin manager — no new table |
| Messages (7d) / Msgs-per-Member / Agent Load / Wait time | Derived metrics | Extend `get_support_analytics` or new RPC `get_group_activity(conversation_id)`; wait time computed client-side from `created_at` vs now for unresolved tickets |
| Satisfaction KPI | `satisfaction_rating` already aggregated in `get_support_analytics` (`satisfaction_average`) | Pure frontend: add 5th `KpiCard` |

Proposed migration: `20260818_epic_chats_group_enrichment.sql` (all additive).

### E.4 RBAC alignment

| Surface | Permission | Enforcement plan |
|---|---|---|
| Page + all reads | `chats.view` | Navigation already gated |
| Ticket assign/escalate/resolve, group create/edit/suspend/archive | `chats.moderate` (or new `chats.manage` — decision E-D3) | Move writes to server routes; today they're client-side Supabase (RLS only) so `chats.moderate` is **never checked** — same retrofit class as tasks (Part D) |
| Reply to tickets/conversations | `chats.reply` | support_agent's key |
| **Global Message Search** | **super_admin only** (PHI: cross-group message content) | Render banner only when `isSuperAdmin`; server RPC checks role, not just a permission key |
| Ban action (Flagged) | `chats.moderate` | `moderate_content` RPC already logs `action_taken`; add role re-check inside RPC (Epic 30 RPC-audit pattern) |
| `/api/chat/analytics` | `getAdminApiUser()` **without permission key** | **RBAC retrofit route** (one of five — see Part G.2, which added `/api/ai/moderation-queue` to the list) → `requireAdminApiUser("chats.view")` |
| `/api/chat/{messages,members,support,moderation,groups,attachment}` | n/a | Mobile-facing bearer-token routes scoped to own resources — leave as-is, not admin RBAC territory |

Role mapping to mockup tabs: admin/super_admin → all 3 tabs + all actions; moderator → Groups view + Flagged moderation (no ticket assignment unless E-D3 grants it); support_agent → Support tab assign/reply (gets view+reply, **not** moderate → Warn/Remove/Ban buttons hidden).

### E.5 Interconnections with other menus

| Link | Mechanism |
|---|---|
| Chats → **Users** (Part C) | Ticket requester / flagged sender links to `/users`; group-admin picker uses masked 4OL-IDs; Warn/Ban writes `user_profiles.status` + moderation flag |
| Chats → **HCP** | HCP Professional groups: admin picker restricted to verified HCPs; "HCP Verified Only" group type checks HCP verification status |
| Chats → **Facilities** | `facility_conversations` join already exists; Facility-category groups link to facility profile |
| Chats → **Notifications** (Epic 27) | "Send Announcement" (m-view-group) + Warn-user actions create notification rows / campaign posts |
| Chats → **AI Hub** | Auto-flags feed the AI moderation queue (`ai_detected`, `ai_confidence` already surfaced); mockup's "Medical Misinformation" reason ties to Epic 29 moderation analytics |
| Chats → **Dashboard** (Part D) | Unread Support + Satisfaction KPIs mirror dashboard's support metrics; Pending Tasks queue can deep-link escalated tickets |

### E.6 Phased plan

| Phase | Scope |
|---|---|
| 1 | RBAC retrofits: `/api/chat/analytics` → `requireAdminApiUser("chats.view")`; wire header **+ New Group**; delete 4 dead stub files; add Satisfaction KpiCard (data already in analytics response) |
| 2 | Migration (E.3) + Groups tab completion: category/status/permissions/messages-7d columns, sort, bulk bar, Activate action; CreateGroupDialog full form (group type, region, permissions, rules, assign admin); ViewGroupDialog mini-KPIs + admin manager + Suspend/Announcement |
| 3 | Support tab: status vocabulary extension, TKT-XXXX display, assign/escalate/resolve server routes (`chats.moderate`), wait-time styling, Agent Load panel, bulk actions |
| 4 | Flagged tab: Ban button + Confidence column + Context dialog + reason/group/auto-manual filters; super-admin Global Message Search RPC |

### E.7 Open decisions

- **E-D1 — Ticket status vocabulary:** extend `chat_support.status` to the mockup's 5 values (Open/Unread/Pending/Resolved/Escalated, backfill Closed → Resolved) (recommended) vs. keep Open/Closed and map "Resolved" display-only.
- **E-D2 — TKT-XXXX ids:** format `TKT-` + lpad(existing bigint) at display time (recommended, no schema change) vs. add a sequence column like tasks' T-XXX (D-D6).
- **E-D3 — Group management permission:** reuse `chats.moderate` for group create/edit/suspend + ticket triage (recommended — keeps the catalog lean) vs. add a dedicated `chats.manage` key.
- **E-D4 — Group category vocabulary:** adopt the mockup's 7 (Health Conditions / HCP Professional / Fitness & Wellness / Medication / Community Support / Facility / BedTracker Emergency) and migrate the codebase's existing 5 values (general→Community Support, specialty→HCP Professional, facility→Facility, support→Community Support, announcements→Health Conditions? needs review) (recommended) vs. keep the current 5.
- **E-D5 — Global Message Search scope:** super_admin only (recommended, PHI) vs. extend to moderator under `chats.moderate`.
- **E-D6 — Region restriction list:** mockup lists 7 regions; Ghana has 16 — use the full 16-region const (recommended, consistent with BedTracker modal at line 12574 which already lists all 16).

---

## Part F — Map & Footprint menu + Outdoor Workout route pins (✅ Implemented)

### F.1 Mockup inventory (`#page-map`, line 7213 of admin-panel.html)

**Header:** 📥 Export Map Data · 🔍 Full Screen · View Facilities (→ Facilities menu)
**Module-connections banner:** Facilities · IBP Businesses · HCP · Med Enquiry (Delivery) · Reviews · Users (by region)
**KPIs (5):** Facilities Plotted (1,287, 10 regions) · IBPs on Map (312) · Active Collectors (14, GPS tracked) · Coverage (38%, 62% uncovered) · Footprint Points (4,820, +142 today)

| # | Tab | Contents |
|---|-----|----------|
| 1 | 🗺️ Map View | Filters: Region, District, Facility Type (7 types), Status, **Footprint/Collector select** · Footprints ON/OFF toggle · map with color-coded pins (red = teaching/major hospital, blue = district/general, green = clinic/CHPS/pharmacy, **purple = IBP business**), per-collector colored footprint trails, **UNCOVERED area overlays**, zoom controls, map legend · Satellite/Map/Download Snapshot/View All Facilities buttons |
| 2 | 👣 Footprint Tracker | Collector select + date range + region filters + Refresh/Export · **per-collector toggle cards** (trail color, points today, GPS Active/Weak, last seen) · footprint log table: FP-XXXXXX ID, Collector, Region, Area/District, GPS Coordinates, Facility Visited, Activity (Registered/Survey/Documented), Timestamp · pagination over 4,820 points |
| 3 | 📊 Coverage Report | Per-region table: Facilities Registered, Footprint Points, Collectors Assigned, Districts Covered (x/y), Coverage % progress bar, Status (Good/Moderate/Low/Critical), Actions (**+ Assign Collector** / 🔺 Prioritize) |
| 4 | 👷 Collectors | + Add Collector · table: COL-XXX ID, Assigned Region, GPS Status, Facilities Registered, Total Footprint Pts, Last Active, Actions (Footprint / Report) |

### F.2 Codebase current state — a real map already exists

| Piece | State | Verdict |
|---|---|---|
| `map/page.tsx` (80 lines) | 4 filters (Region/District from `constant/ghana-locations.json`, Facility Type, Status) + `GoogleMapContainer`; header buttons dead | ~30%: no KPIs, no tabs, no IBP/footprint layers |
| `GoogleMapContainer.jsx` (314 lines) | **Real Google Maps** (`@react-google-maps/api`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) · viewport-bbox + zoom-aware GeoJSON via `get_facilities_map` RPC (server-side filters) · pins styled by status · **registrar trails already drawn** as colored LineStrings via `get_registrar_trails` RPC (`useRegistrarTrails(1)`, color per registrar via `getColorForId`) · geocoder fitBounds on region/district | Infrastructure for Map View + Footprint trails **already built** — better than the mockup's simulated map |
| `map/overview/page.jsx` | Dead page — `BasicMapRender` commented out | delete or repurpose |
| `BusinessPinsToggle.jsx` (21 lines) + duplicate `FilterDropdown.jsx` (`.tsx` exists) | Unused / duplicate | delete `.jsx` dupes during implementation |
| KPIs / Footprint Tracker tab / Coverage Report tab / Collectors tab | **All absent** — `get_registrar_trails` is the only footprint data source; no footprint log table, no coverage RPC, no collector management | 0% |
| RBAC | Navigation gates `/map` on `facilities.view`; map reads are client-side RPCs through RLS | Enforcement gap class again (F.4) |

### F.3 Outdoor Workouts (Fitness menu) — current state vs mockup

**Mockup** (`#tc-fit-outdoor`, line 5790): 4 KPIs (Outdoor Users, Verified Routes, Pending Routes, Group Events) · **5 sub-tabs**: Routes (Pending Verification Queue + Route Analytics + All Routes table with View/Edit/**🗺️ Map action**), Group Events, Outdoor Challenges, Incentives (FitCoins earning formula config), Reviews · modals `m-add-route` (12708), `m-verify-route` (12757: note + Official/Community status + FitCoins base + Reject/Verify&Publish), `m-add-group-event`, `m-add-outdoor-challenge`, `m-route-incentives`, `m-view-participants`.

**Codebase**: `fitness/_tabs/OutdoorTab.tsx` (829 lines) with **3 of 5 sub-tabs** (routes/events/reviews) · full add/view dialogs for route/event/review · `add-outdoor-route-dialog.tsx` already has **GPX file upload with parsing** (`points`, `bounds`, `distanceKm`) + all mockup fields (category, difficulty, area, region, surface, verification_status, registered_by, fitcoins_reward, features tags, images) — it is essentially feature-complete vs `m-add-route`. Schema: `fitness_outdoor_routes` (`gps_data jsonb` reserved for the GPS track, `area`, `region`, verification status, fitcoins columns), `fitness_outdoor_events` (**has `latitude`/`longitude`/`area` columns**), `fitness_outdoor_reviews`.

Gaps: Pending Verification Queue card + `m-verify-route` flow · Outdoor Challenges sub-tab (top-level `ChallengesTab` exists — reuse) · Incentives config card (`m-route-incentives`) · the 🗺️ Map action on route rows · Participants modal for events.

### F.4 Location pins for Outdoor Workout routes (user request)

The GPS foundation already exists — every route can carry a full track (`gps_data.points`). Proposed design:

1. **New RPC `get_outdoor_route_pins`** (or extend `get_facilities_map` with a `p_include` param): returns **active + verified** routes (`verification_status in ('official_business','community_verified') and is_active`) as GeoJSON Point features. Anchor = **first point of `gps_data.points`** (route start), fallback = bounds center, fallback = region geocode. Properties: id, name, category, difficulty, distance_km, rating (from reviews), verification status.
2. **Layer toggles on the Map page**: Facilities · IBPs · Outdoor Routes · Footprints — one legend (mockup already defines the color scheme; suggest 🟢 green pin for routes to keep purple for IBP).
3. **Pin click → InfoWindow** with route summary + **"View Route" button** → deep link `/fitness?tab=outdoor&route=<id>` which opens the existing `view-outdoor-route` dialog (extend OutdoorTab to read the `route` URL param). **Mobile app**: same RPC powers the user-facing Outdoor Workouts map layer; pin tap navigates to the route detail screen (RLS: public SELECT on active + verified rows only).
4. **Route polyline option**: since `gps_data` holds the full track, optionally draw the route path (LineString, like registrar trails) on zoom-in, pin only on zoom-out.
5. **Data-quality guardrail**: routes submitted without a GPX file get an admin warning badge "No GPS — pin falls back to region center"; the verify dialog (`m-verify-route` port) should require GPS confirmation before publishing.
6. **Events pins (bonus)**: `fitness_outdoor_events.latitude/longitude` already exist — event pins with date labels are a near-free second layer.

Schema addendum (small): denormalize `start_lat`/`start_lng` on `fitness_outdoor_routes` (populated from `gps_data` on insert/update trigger) so the pins RPC stays index-friendly; add `region`/district index for the Coverage report.

### F.5 RBAC alignment

| Surface | Permission | Enforcement plan |
|---|---|---|
| Map page + facility pins | `facilities.view` | Navigation already gated |
| Outdoor route pins layer | `fitness.view` additionally (layer only rendered when both keys present) | Client guard + RPC role check |
| **Collector GPS / footprint data** | `users.view` — staff location is sensitive PII | Footprint tab hidden without `users.view`; `get_registrar_trails` RPC re-checks role (Epic 30 audit pattern) |
| Collector management (Add/Assign) | `users.edit` | New server routes (client-side writes today bypass RBAC — same retrofit class as Parts C–E) |
| Route verify/publish, IBP pin moderation | `fitness.edit` / `ibp.edit` | Verify flow writes `verified_by` = current admin |
| Coverage Report | `facilities.view` (read) · Assign Collector = `users.edit` | |
| Map exports | `facilities.export`? — no such key exists | Decision F-D5: reuse `users.export` pattern → add `map.export` key or gate on `facilities.view` + super_admin |

### F.6 Interconnections with other menus

| Link | Mechanism |
|---|---|
| Map → **Facilities** | `get_facilities_map` already serves facility pins; "View All Facilities" deep link; pin click → facility detail |
| Map → **IBP Businesses** (Part C) | IBP pin layer — note: `ibp` table has `gps_address text` but **no numeric lat/lng columns** → parse or add columns (decision F-D3) |
| Map → **Users/Admins** (Collectors) | Collectors = registrar/admin users; footprint trails reuse `get_registrar_trails`; Coverage "+ Assign Collector" links to Admins menu |
| Map → **Fitness** (Outdoor) | Route pins ↔ Outdoor Routes tab (this part); route 🗺️ Map action opens `/map` focused on the route |
| Map → **Dashboard** (Part D) | Regional Coverage card already deep-links "Full Map →"; Coverage % KPI feeds dashboard |
| Map → **Reviews** | Route rating on pin InfoWindow from `fitness_outdoor_reviews`; facility ratings from reviews module |

### F.7 Phased plan

| Phase | Scope |
|---|---|
| 1 | KPI row (5 cards) + 4-tab scaffold on `/map`; wire header buttons; delete dead files (`overview/page.jsx`, `.jsx` dupes); RBAC re-check in `get_registrar_trails` |
| 2 | Map View completion: layer toggles (Facilities/Footprints/IBP/Outdoor Routes), legend, UNCOVERED overlays, footprint toggle + collector filter |
| 3 | Outdoor route pins: `get_outdoor_route_pins` RPC + `start_lat/start_lng` trigger + InfoWindow + `/fitness?tab=outdoor&route=` deep link; mobile RLS policy |
| 4 | Footprint Tracker tab (toggle cards + log table) + Coverage Report RPC (districts from `ghana-locations.json`) + Collectors tab |
| 5 | Outdoor tab completion in Fitness: verification queue + `m-verify-route` flow, Challenges sub-tab (reuse ChallengesTab), Incentives config, participants modal |

### F.8 Open decisions

- **F-D1 — Footprint data source:** new `collector_footprints` table (mobile/collector app posts GPS points — matches mockup's FP-XXXXXX log) (recommended) vs. derive from existing registrar activity only (limits the log to registration events).
- **F-D2 — Coverage % definition:** districts with ≥1 active facility ÷ districts in `ghana-locations.json` per region (recommended — the const already exists) vs. GPS-coverage-area heuristic.
- **F-D3 — IBP pins:** add `latitude`/`longitude` to `ibp` (recommended, mirrors facilities) vs. parse `gps_address` text at query time vs. defer IBP layer.
- **F-D4 — Route pin anchor:** start point of GPS track (recommended) vs. bounds center; and draw full polyline on zoom-in (recommended, data already stored).
- **F-D5 — Map export permission:** add `map.export` catalog key (recommended) vs. gate Export on super_admin only.
- **F-D6 — Collector GPS privacy:** restrict footprint tabs to roles holding `users.view` (admin/super_admin/registrar — recommended) vs. visible to all `facilities.view` holders.

---

## Part G — Upstream Sync Status (2026-08-20) (✅ RBAC retrofit fully applied)

The upstream repo advanced 17 commits (`bc4cc6c..95857bb`); the local clone was fast-forwarded to `95857bb`. Headline: **Epic 31 was merged into `main`, its RBAC migrations were applied to the live Supabase project (2026-08-19), and the epic is marked complete in TASKS.md.** The `epic-31-rbac-permissions` branch was deleted on the remote after merge. Every statement in Parts A–F was re-verified against `95857bb`; deltas below.

### G.1 What upstream closed (from this document's findings)

| Doc finding | Upstream resolution |
|---|---|
| Epic 31 "on branch, unmerged" assumption throughout | Merged (`baf9250`); `lib/permissions.ts` catalog, ROLE_DEFAULTS, `hasPermission()` resolver + unit tests now live on `main`; CI added (`.github/workflows/ci.yml`, vitest) |
| RBAC migrations not yet applied to production | Applied 2026-08-19 — this closed a **live privilege-escalation hole**: `handle_new_user()` had been accepting `role` straight from signup metadata. Two more gaps fixed while applying: `anon` had EXECUTE on `is_platform_admin`/`has_4ol_permission`/`get_effective_admin_permissions` (`20260819_rbac_revoke_anon_execute.sql`) and an `is_app_admin()` `uuid = text` cast bug (`20260819_backfill_untracked_top_rated_objects.sql`) |
| Part D gap 7 — Task Manager API routes unenforced | ✅ Retrofitted: `/api/admin/tasks` GET → `tasks.view`, POST → `tasks.edit`; `/api/admin/tasks/[id]` PATCH → `tasks.edit`; `/api/admin/tasks/stats` → `tasks.view` |
| Sidebar not fully permission-filtered | ✅ Every nav item now carries a `permission` key (children inherit parent's); Map still `facilities.view`, Chats `chats.view` as assumed in Parts E/F |
| Roles & Permissions management surface missing | ✅ `RolesPermissionsTab` embedded as an Admins tab; `/api/admin/rbac` + `/api/admin/rbac/overrides`; role-default saves now atomic via `replace_role_permissions()` RPC (`20260819_atomic_role_defaults_replace.sql`) |
| Fail-open risk on RBAC RPC errors | ✅ `PermissionsProvider`/`admin-api-auth` degrade to the static ROLE_DEFAULTS mirror **only** when the migration is genuinely missing (`isRbacMigrationMissing()`, Postgres 42883/42P01); any other error fails closed. Suspended admins (`user_profiles.status`) now blocked in the provider too |
| Global search over-exposure | ✅ `/api/admin/search` now filters results per-resource by the caller's actual view permission instead of blanket `dashboard.view` — a good model for Part E's Global Message Search |
| Notifications hardcoded role check | ✅ Leftover `ADMIN_WRITE_ROLES` override removed from `notifications/campaigns/[id]`; full `notifications.view/create/edit/delete` enforcement across `/api/notifications/*` |

### G.2 What remains open (verified against `95857bb`)

**The legacy-route retrofit list grew to 5 — routes still on bare `getAdminApiUser()` with no permission key (all re-verified 2026-08-20):**

| Route | Part | Proposed key |
|---|---|---|
| `/api/ibp` GET | C | `ibp.view` |
| `/api/dashboard/overview` | D | `dashboard.view` |
| `/api/anatomy/body-map` | A | `anatomy.view` |
| `/api/chat/analytics` | E | `chats.view` |
| `/api/ai/moderation-queue` GET+POST | C (Flagged tab) | `ai.view` / `ai.manage` — newly confirmed this sync |

Also still open:
- **Client-side write bypass** (Parts C/D/E/F): chats, tasks, collectors, IBP writes still go through the Supabase client (RLS only). The tasks routes are now enforced but the UI doesn't call them yet; chats writes have no server routes at all.
- **All feature gaps in Parts A–F** — no upstream commit touched anatomy, ibp, chats, map, fitness/outdoor, dashboard overview, or medication modules. Every tab/form/table gap, migration proposal, and open decision (B.11, C-D1–D5, D-D1–D6, E-D1–D6, F-D1–D6) stands as written.

### G.3 New upstream surfaces (relevant to future menu analyses)

- **Devices page** `/notifications/devices` (new nav item, `notifications.view`): push-device analytics — total devices, users with devices, multi-device users, 30-day active, platform-split donut, devices-per-user table. Plus device sign-in endpoints (`/api/auth/device-sign-in/send-otp`, `/api/auth/device-context`) and `auth_user_exists_by_email()` RPC. When the Notifications mockup menu is analyzed, this page already exists.
- **Period Tracker enrichment:** `period_user_settings.region` (`20260817_add_region_to_period_user_settings.sql`), content categories (`period.content` key now exercised via `/api/period/categories` + `TopicCategorySelect`), trivia rewards/manual batching/`social_platform` leads, `period_daily_logs.medication_name`. Relevant when the Period Tracker mockup menu is analyzed.
- **AI trivia:** async generation + question modal in the AI Hub period workspace.
- **Catalog note:** `lib/permissions.ts` has **no** `ibp.delete`, `chats.manage`, or `map.export` keys — decisions C-D2, E-D3, F-D5 are unaffected. Any new key now requires updating the SQL catalog seed + `ROLE_DEFAULTS` mirror + `replace_role_permissions()` in the same migration.

### G.4 Clone hygiene

- Local `main` fast-forwarded to `95857bb`; local `epic-31-rbac-permissions` branch remains (fully merged — safe to delete with `git branch -d` when desired; left in place per no-deletion protocol).
- This gap-analysis document is untracked on `main`; commit it when the implementation epic starts.

## Part H — Facilities menu (All Facilities · Pending Approval · Top Rated · Featured) (✅ Implemented — 2026-08-21)

> **Implementation evidence (2026-08-21):** H-Phase 1–4 executed on branch `feat/gap-analysis-parts-lmn-security`. Migration `20260821_facilities_management_extension.sql` (HEFRA number, top-rated rank/setter columns, feature window + pause, status reason trail, `facility_reviews.is_anonymous`; `facilities.feature` key pre-existed — no catalog change). Six RBAC-guarded routes under `app/api/facilities/` (list, `[id]/status` bulk-capable, `[id]/top-rated` with the 10-slot cap, `[id]/featured` PUT/PATCH pause, `stats`, `export`). Route-backed hooks in `hooks/supabase-calls/useFacilitiesApi.ts`; client-side `adminToggleFacilityFeatured/TopRated` hooks retired. Facilities page rebuilt: registry with status tabs + type pills + KPI stats + CSV export + bulk approve/suspend; Top Rated tab (rank board, reorder, cap guard) and Featured tab (Paid/Admin badges, window, pause/resume, honest "—" CTR per H-D4) live; Review Facility dialog ports m-approve-facility (3-day SLA banner, evidence cards, approve/reject with reason). Legacy `/facilities/featured|top-rated` jsx pages now redirect to `?tab=` (H-D1). Gates: tsc/vitest/eslint/build clean. H-D6 anonymous review composer deferred (column landed).

> **Status correction (2026-08-21):** despite the earlier ✅ marker, the H-Phase plan below was never executed — no H migrations, no new `/api/facilities*` management routes, no Top Rated/Featured tab wiring were committed. Treat this part as an open implementation backlog (same correction applied to Parts I/J/K; Part I was subsequently implemented on 2026-08-21). *(Superseded by the implementation evidence above.)*

Discussion-only analysis, 2026-08-20, verified against `95857bb`. Sources: mockup `page-facilities` (L3454–3738), `m-add-facility` (L11837–11941), `m-approve-facility` (L11944–12151), sidebar L1547–1553.

### H.1 Mockup inventory

- **Sidebar:** Facilities parent (🔗 badge 6) with 4 children — All Facilities, ⏳ Pending Approval, ⭐ Top Rated, 🌟 Featured.
- **Header buttons:** 📥 Export CSV · View Map · Review Pending (23) · + Register Facility.
- **Alerts:** SA Alert banner (approval is super-admin only, hidden until an approval happens); IBP Advisory alert.
- **KPI cards (6):** Total · Active · Pending · Top Rated · Avg Rating · Rejected/Suspended.
- **Type pills (14):** Dental, Diagnostic Lab, Eye Clinic, Health School, Herbal Center, Homes, Hospital/Clinic, Osteopathy, Personal Trainer, Pharmacy, Physiotherapy, Prosthetics, Psychiatric Center, Wellness/Gym.
- **Tabs (8):**
  - *All* — HEFRA badge, Plan, Rating, ⋮ menu; bulk Approve/Export/Feature/Suspend.
  - *Pending* — Submitted By, HEFRA No., Days Waiting; per-row Approve/Reject; bulk "Approve All Verified".
  - *Active* — Bookings (30d), Last Updated, ⏸️ Pause.
  - *Inactive* — Inactive Since, Reason, Reactivate, ✉️ Email.
  - *Suspended* — Suspended Since, Reason, Lift suspension.
  - *Rejected* — Rejected On, Reason.
  - *Top Rated* — SA-only banner; mini-KPIs (Max 10 slots, Impressions); Rank badge; Set By (SA chip); move up/down/remove.
  - *Featured* — Paid vs Admin-Set; Priority P1–P4; Start/End; Impressions; CTR; Expiring; pause/renew.
- **m-add-facility (6 sections):** Facility Details · Location (GPS detect, auto lat/lng) · Services & Amenities · Owner details · Operational Hours (7-day grid) · Field Data Collector auto-fill (COL-001 identity from Part F's `map_collectors`).
- **m-approve-facility:** SLA alert (3-day target) · identity header with collector chip + days waiting · two-column evidence view · GPS-verified badge · HEFRA note · Top-Rated toggle (SA-only) · Admin Audit Note · Anonymous App Review composer · SA Decision (note + Approve & Publish / Reject & Return to Collector; owner notified).

### H.2 Codebase state

- `app/(dashboard)/facilities/page.tsx` — modern page, **6 of 8 tabs** (status tabs only; no Top Rated / Featured), top-3 type pills only, inert Export CSV, `?status=` URL sync.
- `hooks/supabase-calls/useFacilities.ts` (673 lines, 15 hooks): `useFacilityProfiles`, `useFeaturedFacilities`, `useTopRatedFacilities`, `useToggleFacilityFeatured/TopRated` (**client-side writes**), `useCreateFacilityProfile` (RPC `adminRegisterFacilityWithProfile`), `useUpdateFacilityProfile`, `useApproveFacility` (RPC `adminChangeFacilityStatus` + temp→approved storage move), `useRejectFacility`, `useDeleteFacility`.
- **RBAC holes:** `/api/facilities/featured/route.ts` and `/api/facilities/top-rated/route.ts` use the bare Supabase client with **no `requireAdminApiUser`** — same class of hole closed for tasks in G.1.
- **Orphaned legacy `.jsx` routes:** 12 per-type pages, `top-rated`, `featured`, `add-facility`, `[type]` — pre-redesign, not reachable from the modern sidebar.
- `navigation.ts` has a single flat Facilities item (`facilities.view`) — no children.
- **Schema facts:** `facility_profile` has `status` (pending/active/inactive/suspended/rejected), `is_top_rated`, `is_featured`, `featured_order`, `submitted_by/approved_by`, `rejection_reason`, `verification_documents jsonb`, `subscription_tier/subscription_expires_at`, `view_count`, `rating_average/rating_count`, `accepts_nhis`, latitude/longitude — but **no** `hefra_registration_number`, no `top_rated_rank/set_by/set_at`, no `feature_type/feature_start/feature_end/is_featured_paused`, no `status_reason/status_changed_at`. **No bookings table anywhere**; no `is_anonymous` on `facility_reviews`. `facility_subscriptions` + `subscriptions` exist (plan infrastructure). Keys: `facilities.view/create/edit/delete/approve` (admin + super_admin); registrar gets view/create/edit.

### H.3 Gaps

| ID | Gap |
|---|---|
| H1 | Top Rated / Featured exist only as orphaned legacy `.jsx` routes; not integrated into the tabbed page |
| H2 | No port of `m-approve-facility` review dialog (SLA, evidence, audit note, anonymous review composer, SA decision) |
| H3 | Pending tab lacks Submitted By / HEFRA No. / Days Waiting columns and lifecycle actions |
| H4 | RBAC holes: unguarded featured/top-rated API routes + client-side toggle writes (bypasses server enforcement) |
| H5 | No `hefra_registration_number` column |
| H6 | No top-rated rank/setter metadata; no featured type/window/pause metadata |
| H7 | No bulk actions (Approve All Verified, bulk Feature/Suspend/Export) |
| H8 | Only 3 of 14 type pills; category/status filters and Export inert |
| H9 | No sidebar children (Pending/Top Rated/Featured deep links) |
| H10 | No collector linkage (Part F `map_collectors` COL-XXX identity) in register/approve flows |

### H.4 Proposed plan

1. **H-Phase 1 — migration `20260821_facilities_management_extension.sql`:** add `hefra_registration_number text`; `top_rated_rank int`, `top_rated_set_by uuid → user_profiles`, `top_rated_set_at timestamptz`; `feature_type text CHECK ('paid','admin')`, `feature_start/feature_end timestamptz`, `is_featured_paused bool`; `status_reason text`, `status_changed_at timestamptz`; `facility_reviews.is_anonymous bool`; new permission key **`facilities.feature`** (SQL catalog seed + `ROLE_DEFAULTS` mirror + `replace_role_permissions()`, per G.3 catalog note — super_admin only).
2. **H-Phase 2 — hardened server routes:** GET `/api/facilities` (filters + pagination), PATCH `/api/facilities/[id]/status`, PUT|DELETE `/api/facilities/[id]/top-rated` (10-slot cap, rank reorder), PUT|PATCH `/api/facilities/[id]/featured`, GET `/api/facilities/export`, GET `/api/facilities/stats`. All `requireAdminApiUser("facilities.*")`; top-rated/featured writes gated on `facilities.feature`.
3. **H-Phase 3 — hooks:** replace client-side toggles with route-backed TanStack mutations; retire the two unguarded legacy routes.
4. **H-Phase 4 — UI rebuild:** 8 tabs on `facilities/page.tsx` (Top Rated + Featured as TabsContents, SA-only gating via `useHasPermission`), 14 type pills, review-facility dialog port of `m-approve-facility`, register dialog collector block, bulk actions, working filters + CSV export, `?tab=&status=` sync.
5. **H-Phase 5 — interconnections:** Map page (Part F) facility pins + collector deep links; sidebar children; dashboard drill-downs; transactions/subscriptions join on the Featured tab (Paid vs Admin-Set); reviews tab feed; facilityscout cross-link; legacy `.jsx` routes redirect to `/facilities?tab=…`.

### H.5 Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| H-D1 | Tabs on one page vs separate pages for Top Rated/Featured | Tabs + redirects from legacy routes |
| H-D2 | HEFRA number as column vs `verification_documents` jsonb | Column (filterable, shown in table) |
| H-D3 | Featured metadata as columns vs a `facility_feature_history` table | Columns (simplest; history deferred) |
| H-D4 | Bookings (30d) / CTR columns with no source table | `view_count` as Impressions; "—" placeholders for Bookings/CTR until booking tracking exists |
| H-D5 | New `facilities.feature` key | Yes, super_admin-only default |
| H-D6 | **Anonymous admin review composer** — publishing admin-authored reviews anonymously is a compliance/trust decision | **User decision required** — implement composer only after sign-off; `is_anonymous` column lands with the migration either way |
| H-D7 | 3-day approval SLA | Display-only (days-waiting highlight), no enforcement |

---

## Part I — Diseases & Conditions menu (✅ Implemented — 2026-08-21)

> **Implementation evidence (2026-08-21):** I-Phase 1–4 executed on branch `feat/gap-analysis-parts-lmn-security`. Migration `20260821_conditions_management_extension.sql` (severity/NHIS/like/save counters; reuses `icd11_code` from the anatomy extension; `diseases.export` key seeded for admin + content_manager; `diseases.feature` pre-existed). Seven RBAC-guarded routes under `app/api/diseases/` (list/create, `[id]` detail/update/delete, `[id]/status`, `[id]/feature` with the 12-slot cap, `stats`, `linkages`, `export`). Route-backed hooks in `hooks/supabase-calls/useDiseasesApi.ts` replace client-side CRUD (incl. add/view dialogs). All four tabs live: status/featured filters, ICD-11/Severity/Likes/Saves columns, bulk Feature/Publish/Delete + CSV export; Carousel (occupancy + slot management), Engagement (computable metrics, counters at 0 pending the content_engagement pipeline per I-D5) and Linkages (read-only counts + deep links per I-D6) tabs replaced the "Coming Soon" placeholders. Gates: tsc/vitest/eslint/build clean. I-Phase 5 interconnections remain open (mobile carousel contract, symptom-checker deep links).

Discussion-only analysis, 2026-08-20, verified against `95857bb`. Sources: mockup `page-diseases` (L3738–3904), `m-add-condition` (L11806–11819), `m-feature-carousel` (L11822–11834), sidebar L1567 (flat item — matches codebase nav, no change needed).

### I.1 Mockup inventory

- **Header buttons:** 📥 Export CSV · 🎠 Feature on Carousel · + Add Condition.
- **KPI cards (6):** Total Conditions · Categories · Total Likes · Total Saves · Carousel Features · Avg Engagement.
- **Tabs (4):**
  - *All Conditions* — filters (search, Category, Status incl. Under Review, Carousel featured/not); columns: Condition, ICD-11, Category, Body Parts, Specialists, Likes, Saves, Carousel, Status, Actions (👁️ ✏️ ⭐feature 🗑️, ✅ approve on drafts); bulk Export / Feature Selected / Publish / Delete; pagination.
  - *Carousel Features* — alert "up to **12** conditions in rotating carousel"; slot table: Slot #, Condition, Category, Views (24h), Taps, CTR, Duration, Featured Since, Active toggle; actions edit/move up/move down/remove; + Add to Carousel.
  - *Engagement Analytics* — Top Liked / Top Saved bar lists, Category Breakdown, Engagement Trends (30d: views, time on page, like/save/share rates), Carousel Performance (views, avg CTR, best slot, rotations, saves).
  - *Page Linkages* — Content Cross-Links (Conditions→Symptoms 1,240 / →Anatomy 847 / →Specialists 634 / →Nearby Facilities 847 dynamic / →Medications 312 / →Healthy Living 188; + Add Linkage button) and In-App Page References (detail page, list/filter, home carousel, symptom-checker result link, body-part→conditions, specialist→conditions Active/In Development).
- **m-add-condition:** Name · ICD-11 code · Category · Severity (Low/Moderate/High/Critical) · Description (Ghanaian context) · Symptoms comma-separated · Specialist · NHIS Coverage · Status · Feature-on-Carousel select.
- **m-feature-carousel:** alert "up to **5** featured items on home screen, currently 3 active" · condition select · position 1st–5th · start/end dates · banner image URL.

### I.2 Codebase state

- `app/(dashboard)/diseases/page.tsx` — **All tab wired** (search works, URL-paginated DataTable, view/edit/delete row actions); **Carousel / Engagement / Linkages are "Coming Soon" placeholders**; Category/Status selects, Export and all bulk buttons inert; ICD-11 column commented out; no Likes/Saves columns.
- `add-condition-dialog.tsx` is **richer than the mockup** (Lexical rich-text sections for about/diagnosis/treatment/complications/symptoms/prevention/contact/more/attribution, types + causes field arrays, TreeMultiSelect body parts/categories, image drop zone) — keep it; mockup-only fields: **ICD-11, Severity, NHIS Coverage, inline Status, Feature-on-Carousel**.
- `useCondition.ts`: CRUD hooks are **client-side Supabase writes (RLS only); no `/api/diseases` routes exist** — same RBAC hole class as Parts C–F. `useConditionStats` already carries an explicit comment: *no likes/engagement-event table exists (Epic 30.1 `analytics_events`, not built yet)* — it substitutes `totalViews` and `reviewRate`.
- **Schema:** `conditions` — status CHECK `draft/published/archived/pending_review`; `is_featured`, `featured_order`, `featured_from`, `featured_until`, `view_count`, `metadata jsonb`, `author_id`, `reviewed_by/reviewed_at`, `is_pinned`. **No `icd_11`, no severity, no NHIS coverage, no like/save counters.** Junctions: `condition_body_parts`, `condition_categories`, `condition_causes`, `condition_types`; **no condition↔symptoms junction** (symptoms live in `conditions.symptoms` jsonb); medications link via `medications.condition_json`.
- **Roles:** `diseases.view/create/edit/delete` held by `admin` + `content_manager` (matches mockup's "Managed by Content Manager"). No feature/publish-specific key.

### I.3 Gaps

| ID | Gap |
|---|---|
| I1 | Carousel Features tab is a placeholder — mockup has full slot-management table (reorder, toggle, duration, dates) |
| I2 | Engagement Analytics tab placeholder — but Likes/Saves/Taps/CTR have **no source tables** |
| I3 | Page Linkages tab placeholder |
| I4 | ICD-11 absent from schema, form and table (column exists commented-out) |
| I5 | Likes/Saves KPIs + columns have no data source (Epic 30.1 `analytics_events` unbuilt) |
| I6 | No feature-carousel dialog (`m-feature-carousel` port with slot cap, window, banner image) |
| I7 | Filters (category/status/carousel) and Export CSV inert |
| I8 | Bulk actions inert (Feature Selected, Publish, Delete, Export) |
| I9 | No server API routes → client-side writes bypass RBAC enforcement |
| I10 | No publish/review workflow action (mockup ✅ approve on drafts; `reviewed_by/reviewed_at` unused) |

### I.4 Proposed plan

1. **I-Phase 1 — migration `20260821_conditions_management_extension.sql`:** `conditions` + `icd_11 text`, `severity text CHECK (low/moderate/high/critical)`, `nhis_coverage text CHECK (covered/partial/not_covered)`, `like_count int DEFAULT 0`, `save_count int DEFAULT 0` (counter shells; populated by triggers once Epic 30.1 lands). New key **`diseases.feature`** (SQL catalog seed + `ROLE_DEFAULTS` for `admin`/`content_manager` + `replace_role_permissions()`, per G.3). Carousel slot cap stored in `platform_settings` (or `conditions.metadata` convention).
2. **I-Phase 2 — server routes:** GET/POST `/api/diseases`, PATCH/DELETE `/api/diseases/[id]`, PATCH `/api/diseases/[id]/status` (publish/archive/pend — sets `reviewed_by/reviewed_at`), PUT|DELETE `/api/diseases/[id]/feature` (slot cap + `featured_order` reorder), GET `/api/diseases/stats`, GET `/api/diseases/linkages`, GET `/api/diseases/export`. All `requireAdminApiUser("diseases.*")`.
3. **I-Phase 3 — hooks:** route-backed mutations replacing client-side CRUD; `useFeaturedConditions`, `useConditionLinkages`.
4. **I-Phase 4 — UI:** Carousel tab (slot table: order, move up/down, active toggle via `is_featured`, duration from `featured_from/until`, add-to-carousel dialog with cap alert); Engagement tab (computable now: top-viewed, category breakdown, review rate; Likes/Saves columns from new counters with "awaiting mobile event pipeline" note where zero); Linkages tab (real junction counts + deep links); All-tab filters wired, ICD-11 column restored, bulk actions + CSV export, add-dialog gets ICD-11/Severity/NHIS/status/carousel fields, ✅ publish action for drafts/pending_review.
5. **I-Phase 5 — interconnections:** mobile home carousel contract (`is_featured + featured_order + featured_from/until` query); Symptoms menu deep link (symptom-checker results → condition); Anatomy (`condition_body_parts` ↔ body parts); Medication (`medications.condition_json` count); Facilities ("nearby facilities" note links to Facilities with type filter); dashboard engagement drill-down.

### I.5 Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| I-D1 | Add `icd_11` column | Yes — mockup indexes the whole database by ICD-11 |
| I-D2 | Likes/Saves without an event source | Counter columns now (default 0), UI shows them; real data arrives with Epic 30.1 `analytics_events` triggers. Alternative "—" placeholders rejected: schema churn twice |
| I-D3 | **Carousel slot cap contradiction:** tab alert says **12**, modal says **5** | Single enforced cap = **12** (the management surface), home-screen rotation is an app-side concern. User to confirm |
| I-D4 | Server routes for conditions | Yes — closes the same RBAC hole class Parts C–F closed |
| I-D5 | Engagement tab scope pre-`analytics_events` | Ship computable metrics + clearly-labelled placeholders; no fake data |
| I-D6 | Linkages tab "+ Add Linkage" | Read-only counts + cross-menu deep links for now — there is no backing linkage-edit model; revisit with Epic 30.1 |
| I-D7 | Bulk Publish/Delete/Feature | Implement via Phase 2 routes, gated `diseases.edit` / `diseases.delete` / `diseases.feature` |

---

## Part J — Healthcare Professionals menu (✅ Implemented — 2026-08-21)

> **Implementation evidence (2026-08-21):** J-Phase 1–4 executed on branch `feat/gap-analysis-parts-lmn-security`. Migration `20260821_hcp_management_extension.sql` (profession_type with 14 Ghana-regulated professions, facility affiliation, region, group-chat assignment, enquiry opt-in; `hcp.create`/`hcp.verify` keys pre-existed — no catalog change). Five RBAC-guarded routes under `app/api/hcp/` (list+onboard, `[id]/verify`, `[id]` edit/suspend/reactivate, `bulk` approve/suspend, `export`). Route-backed hooks in `hooks/supabase-calls/useHcpApi.ts` + onboarding dialog (m-hcp-onboard port; submissions land pending per J-D2/J-D7 — licence checks against MDC/PCG/NMC/AHPC/GPC remain manual). HCP page rebuilt from the OperationsModuleDashboard shell: profession tabs over one registry (J-D1), regulatory-body alerts, licence queue with approve/reject, suspend/reactivate, bulk bar, derived `4OL-XXXXXX` display IDs (no new column), group-chat cards deep-linking to Chats. Gates: tsc/vitest/eslint/build clean. J-D4 med-enquiry responder counters show "—" until a responder column exists.

> **Status correction (2026-08-21):** despite the earlier ✅ marker, the J-Phase plan below was never executed — no HCP migrations (professional IDs, license verification, regulatory-body catalog) and no `/api/hcp` management routes exist. Open implementation backlog. *(Superseded by the implementation evidence above.)*

Discussion-only analysis, 2026-08-20, verified against `95857bb`. Sources: mockup `page-hcp` (L6768–7010), `m-hcp-onboard` (L12449–12489), sidebar L1579–1584.

### J.1 Mockup inventory

- **Sidebar:** Healthcare Professionals parent (badge 12) with 3 children — All Professionals, ⏳ Pending (12), 💬 Group Chats.
- **Header buttons:** 📥 Export · 📋 Onboarding Form · + Add Professional.
- **SA Module Connections alert:** chips linking HCPs to Facilities, Medication, Med Enquiry, Group Chats, Reviews.
- **KPI cards (6):** Total HCPs · Verified & Active · Pending Approval · Group Chats Active · Doctors (MDC) · Prescription Enquiries.
- **Tabs (7):** All HCPs (count chip) · ⏳ Pending (count chip) · 👨‍⚕️ Doctors · 👩‍⚕️ Nurses & Midwives · 💊 Pharmacists · 🩺 Allied Health · 💬 Group Chats.
- *All* — filters: search, **14 profession types**, **5 regulatory bodies** (MDC/PCG/NMC/AHPC/GPC), status, 16 regions; columns: Professional (+ `4OL-200001` ID badge), Profession/Specialty, Regulatory Body chip, License No. (`MDC/YYYY/NNNN`), Facility Attached, Region, Group Chat, Status, Joined; actions 👁️ ✏️ 💬 ⋮ (Copy ID, View License, Reassign Facility, Deactivate); bulk Approve Selected / Add to Group Chat / Send Notification / Suspend Selected.
- *Pending* — license-verification alert (check against MDC/PCG/AHPC portals); columns: Professional, Profession, License No. (Claimed), Regulatory Body, Submitted, Documents (`2 docs uploaded` / `1 doc — Pending`), actions 👁️ ✅ ❌.
- *Doctors/Nurses/Pharmacists/Allied* — regulatory-body alert each (incl. license format); Doctors adds specialty/status filters + **Med Enquiries** column; Pharmacists adds **Med Enquiries Answered**; Allied shows inline pending approve/reject rows.
- *Group Chats* — + New Group Chat; 6 specialty chat cards (name, "MDC-verified only" note, Live/Active badge, members · online · last-msg, latest message preview); click opens chat.
- **m-hcp-onboard:** Full Name · Profession/Role (14) · Specialty · Regulatory Body (5) · License Number · Year Licensed · Affiliated Facility · Region (16) · Phone · Email · **Group Chat Assignment (auto-assign by profession)** · License Certificate upload · ID upload · **Can Respond to Medication Enquiries?** · manual-verification alert; submits as "pending verification".

### J.2 Codebase state

- `app/(dashboard)/hcp/page.tsx` is an **`OperationsModuleDashboard` shell with three `TabPlaceholder` tabs** (all/pending/chats) — **zero live data anywhere in the module**.
- `/api/hcp` GET exists but uses bare `getAdminApiUser()` with **no permission key** — a **newly discovered retrofit candidate** not in G.2's list of 5. It joins `hcp_verifications` + `user_profiles` + `conversations` (heuristic `group_category ilike hcp/health or is_verified_only`) and computes metrics (total/pending/verified/expiring/groupChats) — reusable as the stats endpoint once guarded.
- **Schema:** `hcp_verifications` — `user_id` unique → `user_profiles`, `license_number`, `license_type` (free text), `issuing_body` (free text), `license_expiry`, `specialty`, `years_of_practice`, `documents jsonb`, `verification_status` CHECK `pending/under_review/verified/rejected/expired`, `verified_by/verified_at`, `rejection_reason`, `next_verification_due`. **No** affiliated facility, region, group-chat assignment, med-enquiry flag, or controlled profession vocabulary.
- `medication_enquiries` table **exists** but enquiries link to the **pharmacy** (`pharmacy_id → facility_profile`), not to individual HCPs — no per-HCP "Med Enquiries" source.
- Group-chats infra exists via Part E: `conversations` (`group_category`, `is_verified_only`, `max_members`) + `conversation_members` (member/admin/owner/group_leader roles).
- **Roles:** `hcp.view` + `hcp.verify` exist; `admin` holds both, `super_admin` bypasses. No `useHcp` hook; no create/edit/suspend endpoints.

### J.3 Gaps

| ID | Gap |
|---|---|
| J1 | All three tabs are placeholders — no registry table, KPIs, or actions anywhere |
| J2 | Mockup has 7 tabs; codebase has 3 shells (no Doctors / Nurses / Pharmacists / Allied views) |
| J3 | `/api/hcp` unguarded (no `hcp.view`) and read-only — no verify/reject/onboard/edit/suspend endpoints |
| J4 | No onboarding form (`m-hcp-onboard` port) |
| J5 | Schema gaps: no affiliated facility, region, group-chat assignment, `can_respond_enquiries`; `license_type`/`issuing_body` free-text vs mockup's controlled vocabularies |
| J6 | Approve/reject workflow unwired despite `hcp.verify` key existing (`verified_by/at`, `rejection_reason` columns unused) |
| J7 | No bulk actions (Approve Selected, Add to Group Chat, Send Notification, Suspend Selected) |
| J8 | No filters (profession type / regulatory body / status / region) |
| J9 | No sidebar children (All / Pending / Group Chats deep links) |
| J10 | Per-HCP Med Enquiries counters have no source column |
| J11 | Group-chat cards need member/online counts from `conversation_members` (Part E reuse) |

### J.4 Proposed plan

1. **J-Phase 1 — migration `20260821_hcp_management_extension.sql`:** `hcp_verifications` + `profession_type text CHECK (14-value list)`, `affiliated_facility_id uuid → facility_profile` (nullable; free-text `affiliated_facility_name` fallback for "Private Practice"), `region region_enum`, `group_chat_id uuid → conversations`, `can_respond_enquiries bool DEFAULT false`, `year_licensed int`; seed `issuing_body` to the 5 controlled values; new key **`hcp.create`** (SQL catalog seed + `ROLE_DEFAULTS` for `admin` + `replace_role_permissions()`, per G.3).
2. **J-Phase 2 — server routes:** GET `/api/hcp` (guard `hcp.view`; filters + pagination + stats), POST `/api/hcp` (onboard → `pending`, `hcp.create`), PATCH `/api/hcp/[id]/verify` (`hcp.verify`; approve sets `verified/verified_by/verified_at`, reject sets `rejected` + reason), PATCH `/api/hcp/[id]` (edit, suspend/deactivate, reassign facility), PUT `/api/hcp/[id]/group-chat`, POST `/api/hcp/bulk`, GET `/api/hcp/export`.
3. **J-Phase 3 — hooks:** `useHcpList`, `useVerifyHcp`, `useOnboardHcp`, `useHcpGroupChats` (conversations + `conversation_members` counts), display-ID helper matching Part C's `4OL-XXXXXX` convention.
4. **J-Phase 4 — UI:** rebuild on the established Tabs/DataTable/KpiCard/PageHeader stack (retire the `OperationsModuleDashboard` shell for this module): 7 tabs — profession tabs are **filtered views of the same table** (`profession_type` + body-specific alerts); pending queue with documents viewer (`documents jsonb`); onboarding dialog port; bulk bar; working filters; group-chats tab with clickable cards deep-linking into Chats.
5. **J-Phase 5 — interconnections:** sidebar children with `?tab=` deep links; Facilities (Reassign Facility → facility picker, links Part H); Chats Part E (group cards → `/chats?group=`; "New Group Chat" reuses Part E's create-group dialog with category `HCP Professional` — no duplicate builder); Users Part C (HCP row → user profile); Notifications (bulk Send Notification → campaigns); Med Enquiry menu (future — placeholder counts until a responder column exists); dashboard drill-downs.

### J.5 Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| J-D1 | Profession tabs as separate queries vs filtered views | Filtered views over one table (`profession_type`) |
| J-D2 | Onboarding permission key | New `hcp.create` (admin + super_admin) rather than overloading `hcp.verify` |
| J-D3 | Facility affiliation model | FK to `facility_profile` + free-text fallback for private practice |
| J-D4 | Per-HCP Med Enquiries counters | "—" placeholders; requires a responder column on `medication_enquiries` — defer to the Med Enquiry menu analysis |
| J-D5 | Group-chat creation from HCP tab | Reuse Part E create-group dialog (category `HCP Professional`); auto-assign on onboarding matches HCP's `profession_type` |
| J-D6 | Suspend/Deactivate semantics | `verification_status` drives HCP state; full account deactivation goes through Part C users routes for cross-menu consistency |
| J-D7 | Regulatory-portal verification (MDC/PCG/NMC/AHPC/GPC) | Manual-check alert + audit note only — no external API integration in this phase |

---

## Part K — Jobs menu (✅ Implemented — 2026-08-21)

> **Implementation evidence (2026-08-21):** K-Phase 1–4 executed on branch `feat/gap-analysis-parts-lmn-security`. Migration `20260821_jobs_management_extension.sql` (qualification/licence/experience/radius/demographics fields, featured window, approval trail, widened job_type incl. locum/volunteer + status incl. pending_review CHECKs rebuilt, metadata-only `hcp_digital_cvs` per K-D3; `jobs.view`/`jobs.manage` keys pre-existed — no catalog change). Nine RBAC-guarded routes under `app/api/jobs/` (list+create, `[id]` edit/close/repost/feature, `[id]/review` approve→published / reject→draft with reason, `applicants` with licence-badge merge, `applications/[id]` status transitions, `bulk` close/repost, `export`, `cvs`). Route-backed hooks in `hooks/supabase-calls/useJobsApi.ts` (incl. masked-name helper per K-D7). Jobs page rebuilt from the OperationsModuleDashboard shell: All Listings (filters, bulk close/repost, feature toggle), Post a Job (draft vs submit-for-review) + Pending Requests approval queue, Applicants (masked names, licence badges, pipeline select), Digital CVs (vault-aspirational alert), Premium Services and Business Strategy static cards with honest "—" revenue (K-D1/K-D2). Gates: tsc/vitest/eslint/build clean. K-D4 geo radius stored but live matching awaits the geolocation pipeline.

> **Status correction (2026-08-21):** despite the earlier ✅ marker, the K-Phase plan below was never executed — no Jobs migrations (applicant documents, digital CVs, placements) and no `/api/jobs` management routes exist. Open implementation backlog. *(Superseded by the implementation evidence above.)*

Discussion-only analysis, 2026-08-20, verified against `95857bb`. Sources: mockup `page-jobs` (L9270–9671), sidebar L1585–1590 (children: All Listings, Post a Job, Applicants (24), Digital CVs). No Jobs-specific modals in the mockup — Post a Job is an inline tab form.

### K.1 Mockup inventory

- **Header buttons:** 📥 Export · + Post a Job. **Document Security alert:** AES-256 encrypted applicant documents, consent-gated employer access, GH-DPA 2012.
- **KPI cards (4):** Active Job Listings · HCP Applicants · Pending Review · Placements (MTD).
- **Tabs (6):** 💼 All Listings · ✏️ Post a Job · 👥 Applicants (24) · 📄 Digital CVs · ⭐ Premium Services · 💼 **Business Strategy**.
- *All Listings* — filters (Type: Full-Time/Part-Time/Contract/**Locum/Volunteer**; 8 specialties; Region; Status Active/Closed/Draft/Expired); columns: Job ID (`JOB-2026-0084`), Position + qualification subtitle, Facility (+ `FAC-00001`/`IBP-00412` ID, Public/Private), Type badge, Location + **distance km**, Applicants, Posted, Deadline, Status; actions 👁️ ✏️ Close / Repost (expired); bulk Export / Close Selected.
- *Post a Job* — two-column: **form** (Position Title, Employment Type, Specialty, Minimum Qualification, Min Experience, Required Professional Licence, Salary, Deadline, **Distance Radius (km)**, Job Description, 5 Target Demographics checkboxes; Save Draft / Submit for Review; "Facility Admin Only" badge) + **Pending Facility Requests queue** (Preview/Approve/Reject) + Posting Stats MTD (submitted/approved/rejected/avg time/premium).
- *Applicants* — filters (Job, Status Applied/Under Review/Shortlisted/Hired/Rejected, Qualification, Max distance km); columns: Applicant (**name-masked** `Ama K****`), `HCP-2024-1842` ID, Job Applied, Qualification, Licence badge, Distance, Documents (🔒 Encrypted + CV badges), Applied, Status; actions View CV / Shortlist / Contact / Remove; bulk Shortlist / Bulk Notify / Reject Selected.
- *Digital CVs* — encrypted-vault alert; filters (Type: Unemployed/Employed-Open/Nat. Service/Student-Intern; Specialty); columns: HCP, Specialty, Qualification, Licence Body, Status, Documents (Cert/Trans/Licence/CV badges), Open to Offers, Last Active; actions View Profile/CV; + Document Encryption Settings + Document Vault Stats cards.
- *Premium Services* — 6 priced product cards (Featured Listing ₵150/wk · Advanced HCP Search ₵80/mo · CV Boost ₵25/mo · Targeted Job Alerts Free+Premium · Facility Recruitment Plan ₵400/qtr · Urgent Locum Matching ₵120/req) + Premium Revenue MTD breakdown.
- *Business Strategy* — 6 static strategy cards (placement commission, MoH/GHS partnership, CPD upsell, diaspora recruitment, workforce analytics, CHPS rural incentive).

### K.2 Codebase state

- `app/(dashboard)/jobs/page.tsx` = `OperationsModuleDashboard` shell, **5 `TabPlaceholder` tabs** (all/post/applicants/cv/premium) — no Business Strategy tab; all five components are 11-line placeholders with **mojibake-corrupted emoji icons** (the UTF-8 corruption incident). Zero live data.
- `/api/jobs` GET exists but uses bare `getAdminApiUser()` with **no `jobs.view` key** — third newly discovered retrofit candidate (with `/api/hcp`, Part J). Joins `job_postings`+`facility_profile`, `job_applications`+`user_profiles`, `subscription_plans`; computes metrics — reusable as the guarded stats endpoint.
- **Schema — `job_postings`** (solid base): `facility_id → facility_profile`, title, description, `requirements text[]`, `job_type` CHECK `full_time/part_time/contract/temporary/internship` (**no locum/volunteer**), specialty, experience_level, salary_min/max, location, region, status CHECK `draft/published/closed/filled/expired` (**no pending_review**), published_at/expires_at, view_count, application_count, created_by. **Missing:** minimum_qualification, min_experience_years, required_licence, distance_radius_km, target_demographics, featured/premium fields, approval workflow fields.
- **Schema — `job_applications`:** `job_id`, `applicant_id → user_profiles`, cover_letter, resume_url, portfolio_url, status CHECK `pending/reviewed/shortlisted/rejected/hired` (maps to mockup), reviewed_by/at/notes. No distance, no documents/consent model.
- **No digital-CV/vault tables**, no consent infrastructure. **No general `transactions` table** (only `escrow_transactions` for Medication Enquiry) — Premium Revenue has no source. `subscription_plans` exists (facility-oriented, `max_listings`).
- `user_profiles` has **no GPS columns** — applicant distance cannot be computed yet. No `useJobs` hook; no zod schema.
- **Roles:** `jobs.view` + `jobs.manage` held by `admin`; `super_admin` bypasses.

### K.3 Gaps

| ID | Gap |
|---|---|
| K1 | All 5 tabs placeholders (with corrupted icons); zero data/actions anywhere |
| K2 | 6th tab (Business Strategy) missing entirely |
| K3 | `/api/jobs` unguarded (no `jobs.view`) and read-only — no post/approve/close/repost/shortlist/bulk endpoints |
| K4 | No Post-a-Job form (mockup's full form incl. demographics, distance radius, Save Draft / Submit for Review) |
| K5 | No approval workflow: Pending Facility Requests queue needs a `pending_review` posting status + approve/reject |
| K6 | Schema gaps: qualification/experience/licence/radius/demographics fields; `job_type` CHECK lacks locum/volunteer; no featured fields |
| K7 | Applicants tab: no filters, masking, licence/distance/documents columns, lifecycle actions, bulk |
| K8 | Digital CVs: no table, vault, or consent model at all |
| K9 | Premium Services: no jobs products, no revenue source (no transactions table) |
| K10 | No sidebar children (4 deep links) |
| K11 | Filters and Export inert everywhere |
| K12 | Distance km columns have no GPS source (`user_profiles` has no lat/lng) |

### K.4 Proposed plan

1. **K-Phase 1 — migration `20260821_jobs_management_extension.sql`:** `job_postings` + `minimum_qualification text`, `min_experience_years int`, `required_licence text`, `distance_radius_km int`, `target_demographics jsonb`, `is_featured bool`, `featured_until timestamptz`, `approved_by uuid → user_profiles`, `approved_at timestamptz`, `rejection_reason text`; rebuild `job_type` CHECK to add `locum`/`volunteer`; rebuild `status` CHECK to add `pending_review`; new table `hcp_digital_cvs` (`user_id` unique → user_profiles, specialty, qualification, licence_body, employment_status CHECK, open_to_offers bool, documents jsonb, consent jsonb, updated_at) — metadata only, **no AES vault** (infra scope).
2. **K-Phase 2 — server routes:** GET `/api/jobs` (guard `jobs.view`; filters + pagination), POST `/api/jobs` (`jobs.manage`; draft or pending_review), PATCH `/api/jobs/[id]` (edit/close/repost/feature), PATCH `/api/jobs/[id]/review` (approve → published / reject + reason), GET `/api/jobs/applicants` (filters), PATCH `/api/jobs/applications/[id]` (shortlist/hire/reject + notes), POST `/api/jobs/bulk`, GET `/api/jobs/export`.
3. **K-Phase 3 — hooks:** `useJobPostings`, `useJobApplications`, `usePostJob`, `useReviewJobPosting`, `useUpdateApplication`, display-code helpers (`JOB-YYYY-NNNN`, `HCP-YYYY-NNNN` — derived, no new columns).
4. **K-Phase 4 — UI:** 6 tabs on the established stack (retire the shell); All Listings table + filters + bulk; Post a Job form (zod) + Pending Requests queue + Posting Stats; Applicants table with name masking + licence badges joined from `hcp_verifications` (Part J); Digital CVs table + settings/stats cards; Premium Services product cards + revenue "—" pending a transactions source; Business Strategy static cards; GH-DPA/encryption alert copy retained but labelled aspirational where vault doesn't exist.
5. **K-Phase 5 — interconnections:** Facilities Part H (facility picker in post form, FAC-ID display); HCP Part J (HCP-ID deep links, licence data reuse); Users Part C (applicant profiles); Notifications (Bulk Notify → campaigns); sidebar children with `?tab=` deep links; dashboard drill-downs.

### K.5 Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| K-D1 | Business Strategy tab scope | Static content cards, no data wiring |
| K-D2 | Extend `job_type`/`status` CHECK constraints | Yes — drop + re-add with `locum`/`volunteer` and `pending_review` |
| K-D3 | Digital CV vault (AES-256, consent, HSM) | Out of scope for admin panel — build `hcp_digital_cvs` metadata table now; encryption/consent infra deferred to a platform-security epic. Alert copy adjusted accordingly |
| K-D4 | Distance columns with no GPS source | "—" placeholders until applicant GPS exists; keep `distance_radius_km` on postings as a preference field |
| K-D5 | Display IDs (`JOB-2026-0084`, `HCP-2024-1842`) | Derived display convention (year + sequence), matching Parts C/J — no new columns |
| K-D6 | Posting approval workflow | Yes — `pending_review` status; `jobs.manage` approves/rejects; "Facility Admin Only" badge kept as copy (facility portal is future scope) |
| K-D7 | Premium revenue figures | Static product/pricing cards now; revenue values "—" until a transactions source exists |

---

## Part L — BedTracker (PKM) (Implemented 2026-08-21)

> **Status: IMPLEMENTED.** Migration `supabase/migrations/20260821_bedtracker_extension.sql` (tables, RPCs incl. `get_bedtracker_route_suggestions`, RBAC keys, seed), API routes under `app/api/bedtracker/**` behind `requireAdminApiUser("bedtracker.*")`, hooks `hooks/supabase-calls/useBedTracker.ts`, dedicated page `bedtracker/page.tsx` with 6 working tabs (Live Overview, Bed Registry, Facilities, Ambulance Dispatch, Analytics, Design Strategy), `register-facility-dialog` (m-bt-facility mirror) and `emergency-dispatch-dialog` (m-bt-emergency mirror with deterministic haversine routing, ETA derived from `distance_km`), plus `/api/facilities/options` picker feed. `_deprecated/` sub-pages deleted. Remaining deferrals: L-D5 GPS-as-text (no Leaflet yet), timestamptz twins; migration pending application to live DB.

Mockup scope: `admin-panel.html` `#page-bedtracker` (L8318–8576), sidebar sub-menu (L1600–1607), modals `m-bt-facility` (L12563–12598) and `m-bt-emergency` (L12601–12627).

### L.1 Mockup inventory

- **Header actions:** Export Map Data, **+ Add Facility** (`m-bt-facility`), red **Emergency Dispatch** (`m-bt-emergency`).
- **Alerts:** SA Module Connections strip (Facilities, Map, Emergency Alerts, User Queries, Attending HCPs) + LIVE critical alert ("Korle Bu ICU: 0 beds — 3 ambulances rerouted", View Dispatch).
- **6 KPI cards:** Facilities Online (1,287 / 10 regions), Total Beds (8,420), Available Now (46% occupancy), Critical Wards (2), Ambulances (42: 38 active / 4 standby), Queries Today (184).
- **6 tabs:** 🟢 Live Overview, 🛏️ Bed Registry, 🏥 Facilities, 🚑 Ambulance Dispatch, 📊 Analytics, 💼 Design & Strategy.
  - **Live Overview:** Region / Ward Type (8 types) / Status (Available, Low <10%, Full) filters + Refresh; 8 ward summary cards with occupancy bars; Ghana map (Google Maps) with dots green/orange/red + pulsing emergency; legend; right rail: ACTIVE ALERTS cards (Dispatch/View) + AVAILABLE NOW cards.
  - **Bed Registry:** search + ward-type/status/region filters + Export; table: Facility, Ward Type, Total Beds, Occupied, Available, Availability % bar, Status badge, Last Updated ("2m ago"), Updated By ("Tablet Dashboard"), Actions (Update / Alert). Footer: "2,847 ward records across 1,287 facilities".
  - **Facilities:** search + type (Teaching/Regional/District/CHPS/Clinic/Military) / region / dashboard-status filters + Add Facility; table: Facility (+ FAC code), Type, Region, Wards Tracked (8/8), Total Beds, Available, Overall Status, Tablet Dashboard (🟢 Online / ⚫ Offline), Last Ping, Actions (View Wards / Edit / Ping).
  - **Ambulance Dispatch:** AI-routing alert; search + status (En Route/Available/Responding/Standby) / region + Emergency Dispatch; table: Ambulance ID (AMB-xxxx), Service (NAS Ghana), Region, Driver, Current Status, Patient/Case, Destination, AI Routing ("Rerouted — Was: Korle Bu"), ETA, GPS Live, Actions (Track / Call / Dispatch).
  - **Analytics:** 4 KPIs (Avg Occupancy 46%, Full-Ward Events 7d, Avg AI Reroute Time 4.2 min, Facility Uptime 92%); Ward Occupancy by Type bar chart; Queries by User Type (Ambulance Units / Emergency Operators / App Users / HCPs).
  - **Design & Strategy:** 6 static cards — Design Principles, Technical Architecture, Business Model (SaaS GH₵ tiers, hardware lease, NAS licence, B2G analytics), User Segments & Query Types, Automation & AI Features.
- **`m-bt-facility` (Register BedTracker Facility):** Facility Name, Facility Type (7 options), GHS Facility Code, Region (16), GPS Coordinates, Facility Admin Name & Contact, Wards to Track (8 checkboxes), Hardware Option (Lease/Purchase/BYO), Subscription Tier (Starter/Growth/Enterprise); tablet-provisioning alert.
- **`m-bt-emergency` (Emergency Dispatch):** Case Type (RTA/Obstetric/Cardiac/Trauma/Respiratory/Neurological/Pediatric/Other), Patient Gender, Age Group, Required Ward, Dispatching Ambulance (fleet dropdown), **AI Routing Suggestion** (top-3 nearest same-ward facilities with beds, distance + ETA, Select), Notes, Confirm Dispatch.

### L.2 Codebase state

- [`bedtracker/page.tsx`](file:///c:/Users/FM/CascadeProjects/GhanaHealthTech/4OurLife-Admin/app/(dashboard)/bedtracker/page.tsx) — `OperationsModuleDashboard` shell with the same 6 tabs (labels already match mockup). All 6 tab components in `_components/` are 11-line `TabPlaceholder`s with mojibake-corrupted icons (0% wired). A `_deprecated/` folder (analytics/design/dispatch/facilities/registry pages) survives from an earlier iteration.
- [`app/api/bedtracker/route.ts`](file:///c:/Users/FM/CascadeProjects/GhanaHealthTech/4OurLife-Admin/app/api/bedtracker/route.ts) — GET only, **unguarded** (`getAdminApiUser()`, no permission key — fourth retrofit candidate after `/api/facilities/featured|top-rated`, `/api/hcp`, `/api/jobs`). Parallel-fetches `bed_tracker_facilities` + `bed_tracker_alerts` + `ambulance_dispatches` and computes basic metrics. No POST/PATCH/DELETE anywhere.
- **Schema (full-tables.sql L1124–1199):**
  - `bed_tracker_facilities` — flat per-ward-type columns for **4 of the 8** mockup ward types (icu, general, maternity, pediatric only — no surgical/medical/psychiatric/geriatric); has `alert_threshold`, `auto_alert_enabled`, `updated_by`; missing GHS code, GPS, admin contact, hardware/subscription, tablet-online/last-ping.
  - `bed_tracker_alerts` — already well-shaped (severity CHECK, is_resolved, notification_sent, metadata jsonb).
  - `ambulance_dispatches` — dispatches exist (reference, emergency_type, pickup/destination GPS, driver_id, vehicle_id text, status, priority, eta_minutes) but there is **no `ambulances` fleet table** — mockup's AMB-xxxx units, service provider, driver assignment, GPS-live status have no home. `vehicle_id` is a loose text column.
- **RBAC:** `bedtracker.view` / `bedtracker.manage` already exist in `PERMISSION_CATALOG` and `ROLE_DEFAULTS` — no new keys needed (unlike Parts H–K), but the unguarded GET must be retrofitted.

### L.3 Gaps

| ID | Gap | Severity |
|----|-----|----------|
| L1 | All 6 tabs are `TabPlaceholder`; `_deprecated/` sub-pages dead weight | High |
| L2 | `/api/bedtracker` GET unguarded; no write endpoints (update beds, resolve alert, register facility, dispatch) | High |
| L3 | Ward model covers 4 of 8 ward types and is flat (no per-ward rows, no "Wards Tracked"/"Updated By" per ward) | High |
| L4 | No `ambulances` fleet table (Dispatch tab + dispatch modal fleet dropdown) | High |
| L5 | `bed_tracker_facilities` missing GHS code, GPS, admin contact, hardware option, subscription tier, tablet online/last ping | High |
| L6 | No bed-update audit history (mockup: "Last Updated / Updated By", strategy: full audit trail) | Medium |
| L7 | No write path: ward bed update, alert resolve, facility register/edit, emergency dispatch create | High |
| L8 | No AI/deterministic routing suggestion endpoint (nearest same-ward facility with beds by GPS distance) | Medium |
| L9 | KPI cards: Facilities Online, Critical Wards, Ambulances count, Queries Today have no source (queries need `analytics_events`) | Medium |
| L10 | Analytics: occupancy/uptime derivable from L3/L5; Full-Ward Events from alerts; Queries-by-User-Type needs Epic 30.1 (defer) | Medium |
| L11 | Mojibake icons in all 6 tab components (UTF-8 corruption) | Low |
| L12 | Design & Strategy tab absent from codebase (static cards, same treatment as Jobs Business Strategy K10) | Low |
| L13 | Map visualisation (Live Overview) — no map component exists in the admin app yet | Medium |

### L.4 Proposed implementation plan (discussion)

**Phase 1 — Migration `20260821_bedtracker_management_extension.sql` (additive):**
1. New `bed_tracker_wards`: `id`, `bed_tracker_facility_id` FK, `ward_type` CHECK (`general`,`icu`,`surgical`,`medical`,`maternity`,`pediatric`,`psychiatric`,`geriatric`), `total_beds`, `occupied_beds`, `available_beds` (generated or trigger-maintained), `last_updated_at`, `updated_by` FK user_profiles, `update_source` CHECK (`tablet`,`admin`,`api`), UNIQUE(facility, ward_type). Backfill: copy the 4 existing flat column sets into rows.
2. New `ambulances`: `ambulance_code` text UNIQUE (AMB-xxxx), `service_provider`, `region`, `driver_user_id` FK user_profiles nullable, `status` CHECK (`available`,`en_route`,`responding`,`standby`), `current_gps` text, `last_ping_at`, `is_active`.
3. `bed_tracker_facilities` ADD: `ghs_facility_code`, `gps_coordinates`, `facility_admin_name`, `facility_admin_phone`, `hardware_option` CHECK (`lease`,`purchase`,`byo`), `subscription_tier` CHECK (`starter`,`growth`,`enterprise`), `tablet_online` boolean, `last_ping_at`.
4. New `bed_tracker_ward_updates` history: ward FK, previous/next counts, actor, source, created_at (audit trail).
5. `ambulance_dispatches` ADD `ambulance_id` uuid FK → `ambulances`; `status` CHECK (`pending`,`assigned`,`en_route`,`in_progress`,`completed`,`cancelled`); add `patient_gender`, `patient_age_group`, `required_ward`, `rerouted_from_facility_id`, `ai_routing_used` boolean for the dispatch-modal fields.
6. RBAC: keys already exist — only retrofit the route guard, no catalog change.

**Phase 2 — Server routes (all `requireAdminApiUser`):**
- `GET /api/bedtracker` → `bedtracker.view`: ward grid, facilities grid, fleet, alerts, KPI metrics (critical wards = wards where available=0; uptime = tablet_online ratio).
- `POST/PATCH /api/bedtracker/facilities` → `bedtracker.manage` (register from `m-bt-facility` payload; edit; ping-toggle).
- `PATCH /api/bedtracker/wards/[id]` → `bedtracker.manage` (bed count update; writes history row; if available hits 0 and `auto_alert_enabled`, inserts `bed_tracker_alerts` row — reuses existing alerts table and, via Notifications interconnection, fires the alert cascade).
- `POST /api/bedtracker/dispatches` → `bedtracker.manage` (emergency dispatch; `GET /api/bedtracker/route-suggestions?ward_type=&gps=` returns deterministic top-3 nearest facilities: haversine on `gps_coordinates` where same ward type has beds > 0 — no ML, document as "AI" per mockup language).
- `PATCH /api/bedtracker/alerts/[id]` resolve.

**Phase 3 — Hooks:** `useBedTrackerOverview`, `useBedTrackerWards` (with mutation), `useBedTrackerFleet`, `useAmbulanceDispatches`, `useRouteSuggestions` (TanStack Query, URL-sync filters per shared conventions).

**Phase 4 — UI rebuild (delete `_deprecated/`, rewrite 6 tabs):**
- **LiveOverviewTab:** KpiCard row + ward summary cards (occupancy bars from wards aggregate) + Active Alerts / Available Now rails + map component (decision L-D5); Refresh = invalidate.
- **BedRegistryTab:** DataTable from wards join facilities (Facility, Ward Type, Total/Occupied/Available, % bar, Status, Last Updated relative, Updated By source badge, Update dialog, Alert action).
- **BedTrackerFacilitiesTab:** DataTable + register/edit dialog (zod schema mirroring `m-bt-facility`, incl. wards-to-track multi-select and hardware/subscription selects).
- **AmbulanceDispatchTab:** fleet DataTable + emergency-dispatch dialog (`m-bt-emergency`, route-suggestions panel with Select buttons).
- **BedTrackerAnalyticsTab:** occupancy-by-type bars + full-ward-events (from alerts) + uptime; Queries-by-User-Type placeholder pending Epic 30.1.
- **DesignStrategyTab:** static strategy cards (reuse the K10 static-card pattern).
- Fix mojibake icons (L11) in all tab components.

**Phase 5 — Interconnections:**
- **Facilities (Part H):** register dialog resolves against `facility_profile` (facility picker instead of free-text name); facility detail can show "BedTracker: tracked" badge.
- **Notifications:** ward-full alert → alert cascade (push/SMS/in-app) reusing the notifications queue once that menu is implemented.
- **Users:** Queries Today KPI joins the Epic 30.1 `analytics_events` backlog.
- **HCP (Part J):** "Attending HCPs" chip links to `/hcp` filtered list.
- **Map menu:** shared map component should live in `components/redesign/` for reuse by both BedTracker and Map pages.

### L.5 Open decisions

| ID | Decision | Recommendation |
|----|----------|----------------|
| L-D1 | Ward model: new `bed_tracker_wards` table vs extending flat columns | Table — mockup needs 8 ward types, per-ward "Updated By", 2,847-record registry; flat columns don't scale |
| L-D2 | `ambulances` fleet statuses | CHECK (`available`,`en_route`,`responding`,`standby`) matching mockup dropdown |
| L-D3 | "AI routing" implementation | Deterministic nearest-available (haversine + same-ward filter) labelled as AI per mockup; no ML in this phase |
| L-D4 | Tablet dashboard (15" PWA, offline sync, USSD) | Out of scope — admin only tracks `tablet_online`/`last_ping_at`; tablet app is a separate project |
| L-D5 | Map library for Live Overview | Leaflet + OpenStreetMap tiles (no API key, matches offline-friendly posture) vs Google Maps (needs key + billing) — user decision |
| L-D6 | Queries-Today / Queries-by-User-Type analytics | Show "—" placeholder until Epic 30.1 `analytics_events` exists (same deferral as I6/K-D5) |
| L-D7 | Hardware/subscription fields | Metadata-only on `bed_tracker_facilities`; no billing/payments integration (no transactions table — see K-D7) |

---

## Part M — Marketing (Campaigns / Subscriptions / Discounts) (Implemented 2026-08-21)

> **Status: IMPLEMENTED.** Migration `supabase/migrations/20260821_marketing_extension.sql` (user_subscriptions linkage, review/bulk RPC support, RBAC keys), full server-backed API surface under `app/api/marketing/**` behind `requireAdminApiUser("marketing.*")` (campaigns incl. batch + review, plans, discounts, subscribers incl. remind, analytics), hooks `useMarketing`/`useSubscriptions`/`useDiscounts` migrated off client-side Supabase, unified `marketing/page.tsx` with All Campaigns / Subscriptions / Discounts / Linkages / Analytics tabs, `MarketingStats` with Pending Review KPI, full-lifecycle `marketingColumns` actions and `add-marketing-dialog` on server routes. M-D6 cleanup done: `/marketing/ads` + `/marketing/create` .jsx pages deleted; `/marketing/subscriptions|discounts` collapsed into `redirect()` tab deep-links; legacy dialogs removed; sidebar nav data updated. Remaining deferrals: M-D7 timestamptz twins, Meta WhatsApp creds (user-only).

Mockup scope: `admin-panel.html` sidebar Marketing sub-menu (L1617–1621: Campaigns, Subscriptions, Discounts), `#page-marketing` (L8578–8735), `#page-subscriptions` (L8736–8836), `#page-discounts` (L8837–8912), modals `m-create-campaign` (L12231–12326), `m-review-biz-campaign` (L12377–12400), `m-edit-plan` (L10947–10963), `m-create-discount` (L12403–12416).

### M.1 Mockup inventory

- **Campaigns page:** header buttons Analytics Report, **Review Submissions** (`m-review-biz-campaign`), **+ New Campaign** (`m-create-campaign`); 5 KPIs (Draft 4, Live 2, Paused 1, Ended 8, **Pending Review 2** — business submissions); 3 tabs: **All Campaigns**, **Analytics**, **Page Linkages**.
  - **All Campaigns:** search, Status filter (Draft/Live/Paused/Ended/Pending Review), Type filter (App Promotion/Feature Launch/Seasonal/Business Submitted/Referral), Channel filter (Push/SMS/Email/In-App Banner/Social), date range, Export; table: checkbox, Campaign, Type, Status, Target, Impressions, Clicks, CTR, Budget, Period, Actions (View/Edit/Analytics/Pause; Pending rows get Review/Approve/Reject; Ended rows get Copy); bulk bar: Export Report, Launch Selected, End Selected.
  - **Analytics:** Campaign Performance 30d (Impressions/Clicks/Avg CTR/Conversions/Ad Spend), ROI Summary (Revenue/ROAS/CPA/Premium Upgrades/Best Channel), Channel Breakdown bars, Top Campaigns by CTR, User Acquisition Funnel (Impressions→Clicks→Installs→Sign-ups→Upgrades).
  - **Page Linkages:** Marketing Integrations status card (Push, Twilio SMS, SendGrid, HealthMiles, Business Ad Portal beta) + App Pages Linked to Campaigns card.
- **Subscriptions page:** header Export, **Edit Plans** (`m-edit-plan`), + Create Plan; 4 KPIs (Premium Users 4,812, MRR ₵120,300, Retention 94%, At Risk 83); 4 plan cards (Free, Starter ₵25, Pro ₵45 POPULAR, Elite ₵89) with feature lists + subscriber counts; 3 tabs: **All Subscribers** (masked user, Plan, Monthly Value, Subscribed Since, Next Renewal, Payment Method [MTN MoMo / Vodafone Cash / Paystack Card], Status, Actions View/Edit/Cancel/Remind), **At Risk** (risk reason, last contact, Send All Reminders), **Billing History** (month filter, Transaction ID, Paid/Failed, Export).
- **Discounts page:** header Export, **+ Create Code** (`m-create-discount`); 4 KPIs (Active Codes, Total Uses 30d, Total Discounted, Avg Discount %); filters Type (% Off/Fixed/Free Trial/Partner) + Status (Active/Expired/Scheduled/Paused); table: checkbox, Code (monospace), Type, Discount, Eligible Users, Uses, Limit, Expiry, Linked Campaign, Status, Actions (View/Edit/Copy/Pause; expired rows Clone/Delete); bulk: Pause/Clone/Delete.
- **`m-create-campaign`:** two-pane with **live mobile preview**; Marketing Type (Ads/Push/In-App Banner/SMS/Email/Partnership), Organization, Headline, Campaign Content, Start/End datetime, **media dropzone** (images ≤10 MB, video ≤50 MB, take-photo), CTA select; footer: Save as Draft / Schedule Campaign.
- **`m-review-biz-campaign`:** business-submitted ad review — details card (Business, Name, Type, Target, Budget, Requested Dates), creative preview + channels, review notes, approved start/end dates, **Approve & Launch / Reject**.
- **`m-edit-plan`:** editable plan table (Free/Starter/Pro/Elite price + features) + Add New Plan.
- **`m-create-discount`:** Promo Code, Discount Type (% Off/Fixed/Free Trial), Value, Eligible Plans, Eligible Users (All/New/NHIS-Linked/Free-Plan), Usage Limit, Per-User Limit, Start/Expiry, Linked Campaign.

### M.2 Codebase state

- [`marketing/page.tsx`](file:///c:/Users/FM/CascadeProjects/GhanaHealthTech/4OurLife-Admin/app/(dashboard)/marketing/page.tsx) (97 lines) — real Tabs shell with **5 tabs** (All Campaigns, Subscriptions, Discounts, Analytics, Linkages), `?tab=` URL sync, `MarketingStats` KPI row. Header buttons (Analytics Report / Review Submissions / + New Campaign) have **no handlers**.
- **Tab wiring:** `AllCampaignsTab` (81 lines) is live — `useMarketingProfiles` + DataTable + view dialog — but search input is inert, and Status/Type/Channel/date filters, bulk actions, Pause/Approve/Reject actions are all absent. `SubscriptionsTab` / `DiscountsTab` (81 lines each) similar shells. `AnalyticsTab` / `LinkagesTab` (13 lines) are placeholders. `MarketingStats` wired but renders **5 status cards, missing Pending Review**, and has mojibake icons.
- **Duplication:** `/marketing/subscriptions` and `/marketing/discounts` exist as **separate routes with their own add/view dialogs**, alongside the tabs — plus legacy `.jsx` pages `/marketing/ads` and `/marketing/create`.
- **CRITICAL architecture gap:** there are **no `/api/marketing` routes at all**. Every hook (`useMarketing.ts`, `useDiscounts.ts`, `useSubscriptions.ts`) queries Supabase **client-side** via `getSupabaseClient()` — including **mutations in `add-marketing-dialog.tsx` (490 lines)**. This bypasses RBAC entirely and contradicts the shared convention (`requireAdminApiUser` server routes). This is the largest retrofit in any part so far.
- **RBAC:** `marketing.view/create/edit/delete` keys exist and are assigned — the server layer just doesn't exist to enforce them.
- **Schema (full-tables.sql):**
  - `marketing_profile` (L187–202) — campaign shape exists (marketingType, status enum, headline, description, imageUrl, cta, links, organization, startDate/endDate as **text**) but missing: campaign Type taxonomy, Channels, Target segment, Budget, Impressions/Clicks/CTR, `pending_review`/`rejected` statuses + reviewer fields, business-submission origin.
  - `marketing_discounts` (L727–751) — strongest fit: code, discount_type CHECK (`percentage`,`fixed`,`bogo` — mockup wants `free_trial`,`partner` instead of `bogo`), max_uses/usage_limit, valid window, `approved_by` — missing eligible-plans/eligible-users segmentation, per-user limit, linked-campaign FK, Scheduled/Paused states (only `is_active` bool).
  - `marketing_subscriptions` (L752–774) — this is the **plan catalog** (name, price, period, privileges[]) with **no user FK**; the mockup's subscriber/billing tables (user, plan, renewal date, payment method, risk status, transaction IDs) have **no home** — consistent with K-D7 (no transactions table; only `escrow_transactions`).

### M.3 Gaps

| ID | Gap | Severity |
|----|-----|----------|
| M1 | All marketing data access is client-side Supabase; no server routes → RBAC unenforceable (biggest retrofit of any part) | High |
| M2 | Header buttons inert: Analytics Report, Review Submissions, + New Campaign | High |
| M3 | All Campaigns tab: filters (status/type/channel/date), Pause/Resume, bulk Launch/End, Approve/Reject actions missing | High |
| M4 | No Pending Review lifecycle: status enum lacks `pending_review`/`rejected`; no reviewer fields; no review dialog (`m-review-biz-campaign`) | High |
| M5 | Create-campaign dialog: verify against `m-create-campaign` (media dropzone, live preview, Save Draft/Schedule); schedule vs draft statuses | High |
| M6 | Analytics tab placeholder: performance/ROI/channel/funnel cards (data source gap — M-D4) | Medium |
| M7 | Linkages tab placeholder: static integration-status cards | Low |
| M8 | Subscriptions tab: plan cards from `marketing_subscriptions`, Edit Plans dialog (`m-edit-plan`), Create Plan; subscriber table has no schema home (needs `user_subscriptions`) | High |
| M9 | At Risk tab + Remind action + Billing History tab — payment-failure and transaction data don't exist (defer, K-D7 precedent) | Medium |
| M10 | Discounts tab vs `m-create-discount`: eligible plans/users, per-user limit, linked campaign, status lifecycle, Clone, bulk actions | High |
| M11 | Duplicate surfaces: tabs vs `/marketing/subscriptions|discounts` routes; legacy `.jsx` pages | Medium |
| M12 | Mojibake icons in MarketingStats/AllCampaignsTab | Low |
| M13 | marketing_profile startDate/endDate stored as text (not timestamptz) | Medium |

### M.4 Proposed implementation plan (discussion)

**Phase 1 — Migration `20260821_marketing_management_extension.sql` (additive):**
1. `marketing_profile` ADD: `campaign_type` CHECK (`app_promotion`,`feature_launch`,`seasonal`,`business_submitted`,`referral`), `channels` text[] CHECK subset (`push`,`sms`,`email`,`in_app_banner`,`social`), `target_segment` text, `budget` numeric, `impressions` int, `clicks` int, `conversions` int, `submitted_by_business` uuid nullable, `reviewed_by` FK, `reviewed_at`, `review_notes`, `approved_start_date`, `approved_end_date`; extend status enum with `pending_review`, `rejected`, `scheduled`. (Enum extension via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.)
2. `marketing_discounts` ADD: `eligible_plans` text[], `eligible_users` CHECK (`all`,`new`,`nhis_linked`,`free_plan`), `per_user_limit` int, `campaign_id` FK → `marketing_profile`, `status` text CHECK (`active`,`expired`,`scheduled`,`paused`) superseding `is_active`.
3. New `user_subscriptions`: `user_id` FK user_profiles, `plan_id` FK marketing_subscriptions, `status` CHECK (`active`,`at_risk`,`cancelled`,`expired`), `subscribed_at`, `next_renewal_at`, `payment_method` CHECK (`mtn_momo`,`vodafone_cash`,`paystack_card`), `auto_renew`, `risk_reason`, `last_reminded_at`. (Billing history / MRR deferred — M-D5.)
4. No new permission keys — `marketing.*` already catalogued; enforce via new server routes.

**Phase 2 — Server routes (new, all `requireAdminApiUser`; client-side hooks migrate off Supabase):**
- `GET/POST /api/marketing/campaigns`, `PATCH/DELETE /api/marketing/campaigns/[id]` → `marketing.view/create/edit/delete` (list with filters + pagination; pause/resume; bulk launch/end via `[id]` batch endpoint).
- `POST /api/marketing/campaigns/[id]/review` → `marketing.edit` (approve/reject with notes + approved dates — the `m-review-biz-campaign` flow).
- `GET/POST/PATCH /api/marketing/discounts` → `marketing.*` (clone, pause, bulk).
- `GET/POST/PATCH /api/marketing/plans` → `marketing.edit` (`m-edit-plan` writes `marketing_subscriptions`).
- `GET /api/marketing/subscribers` + `POST .../remind` → `marketing.view/edit` (remind action queues via Notifications interconnection).
- `GET /api/marketing/analytics` → `marketing.view` (server-computed CTR/ROI where data exists; "—" placeholders otherwise).

**Phase 3 — Hooks rewrite:** `useMarketingProfiles`, `useDiscounts`, `useSubscriptions` re-pointed at the new server routes (keep query-key factories; same TanStack Query/URL-sync conventions).

**Phase 4 — UI:**
- Wire header buttons (+ New Campaign → verified `add-marketing-dialog`, Review Submissions → pending-review queue dialog, Analytics Report → Analytics tab).
- AllCampaignsTab: full filter bar, row actions per status (Pause/Activate/Review/Approve/Reject/Copy), bulk bar, Pending Review KPI.
- SubscriptionsTab: plan cards + Edit Plans/Create Plan dialogs + subscribers DataTable (masked names) + At Risk sub-view; Billing History shows deferred placeholder (M-D5).
- DiscountsTab: full table + create/edit dialog matching `m-create-discount` + Clone + bulk actions.
- AnalyticsTab + LinkagesTab built from `/api/marketing/analytics` (static cards where data is absent).
- Fix mojibake icons; delete `/marketing/ads`, `/marketing/create` `.jsx` pages; collapse `/marketing/subscriptions|discounts` routes into tab deep-links (`/marketing?tab=…`).

**Phase 5 — Interconnections:**
- **Notifications:** campaign channels (Push/SMS/Email) and subscriber Remind actions enqueue via `notification_campaigns` (existing table + `/api/notifications/campaigns` route); `m-pharmacy-notif` (L12630) belongs to that menu but consumes campaign infra.
- **IBP Businesses:** `business_submitted` campaigns carry `submitted_by_business` FK for the review flow; IBP portal (separate project) posts into the same table.
- **Users:** subscriber rows join `user_profiles`; masked display follows the Jobs applicant pattern (K5).
- **Period Tracker / Fitness:** `m-period-campaign` (L10932) and `fitness_ai_campaigns` reuse the campaign delivery path.
- **Transactions:** Billing History/MRR join the deferred transactions backlog (K-D7).

### M.5 Open decisions

| ID | Decision | Recommendation |
|----|----------|----------------|
| M-D1 | Mockup has 3 sidebar sub-pages; codebase consolidated into 1 page + 5 tabs | Keep consolidated tabs (already built, URL-synced); keep sidebar children as deep-links `/marketing?tab=subscriptions` |
| M-D2 | Client-side Supabase retrofit scope | Full migration to server routes in this part — marketing is the only module with zero API surface |
| M-D3 | Business ad submissions | Store in `marketing_profile` with `campaign_type=business_submitted` + review fields; separate submissions table not needed yet |
| M-D4 | Impressions/Clicks/CTR/Funnel data source | No event tracking exists — allow manual budget entry now; metrics show "—" until Epic 30.1 `analytics_events` (L-D6 precedent) |
| M-D5 | Billing History / MRR / At-Risk payment data | `user_subscriptions` table now; billing-history tab shows "—" until a transactions/payment-gateway source exists (K-D7) |
| M-D6 | Duplicate routes cleanup | Delete `.jsx` pages; redirect `/marketing/subscriptions|discounts` to tab deep-links; keep dialogs once, reused by tabs |
| M-D7 | `marketing_profile` date columns as text | Migrate to timestamptz in the same migration (requires data backfill — flag as breaking-ish, needs user sign-off) |

### M.6 Mockup-parity depth build — addendum (Implemented 2026-08-22)

> **Status: IMPLEMENTED (both repos).** The Part M retrofit shipped the API/RBAC layer; this build closed the remaining **depth** gap against `admin-panel.html` plus the mobile delivery/redemption rails. Migration `supabase/migrations/20260822_marketing_unification.sql` (admin repo, re-runnable, additive) drives everything; **all UI degrades gracefully until it is applied**.

**Phase 0 — `user_subscriptions` unification.** `public.user_subscriptions` was defined three times with incompatible shapes (business / Part M / fitness-entitlement). The fitness shape (`tier_id` → `subscription_tiers`, backs `get_my_entitlement()`) is now the single source of truth; the migration upgrades whichever shape exists in-place, widens the tier key CHECK, seeds Starter/Pro/Elite, re-points `get_marketing_overview()` at tiers, and reserves `source in ('paystack','admin_grant','promo')`. `marketing_subscriptions` stays as legacy plan catalog until fully drained.

**Phase 1 — Admin mockup depth.**
- Routes rebased on unified tables: plans, subscribers (+ remind incl. `at_risk`), overview RPC, discounts (campaign-name merge).
- `SubscriptionsTab`: 4 KpiCards (Premium Users / MRR / Retention / At-Risk), plan-card grid with POPULAR badge + edit, sub-tabs All Subscribers (plan/method/renewal-window filters + export), At Risk (banner + Send All Reminders), Billing History deferred placeholder (M-D5).
- `DiscountsTab`: 3 KPIs, search/type/status filters, export, create/edit dialog matching `m-create-discount` (eligible plans/users, per-user limit, linked campaign), Clone/Pause/Resume/Copy-code row actions, bulk pause/delete.
- Campaigns: telemetry columns (Impressions/Clicks/CTR), date-range + server-side channel filters, CSV export; `add-marketing-dialog` gained campaign type, budget, delivery channels, target segment.

**Phase 2 — Mobile delivery rails** (branch `feat/fitness-mockup-parity`): home carousel only shows campaigns eligible for `in_app_banner`; `push_promotions_enabled` opt-in toggle in Notification Preferences; `subscriber_reminder` / `screen=premium` marketing notifications deep-link to the paywall, others to the inbox.

**Phase 3 — Telemetry loop.** `analytics_events` table + `log_marketing_event(uuid, text)` SECURITY DEFINER RPC (authenticated; impression/click only) + `get_campaign_event_stats(uuid[])` (service-role). Mobile emits via `lib/marketing-telemetry.ts` — clicks in `CampaignBox`, impressions on the active carousel slide (per-session dedupe). Admin campaign/analytics routes merge the counts; RPC failures swallowed (pre-migration).

**Phase 4 — Promo redemption.** `POST /api/user/redeem-promo` (JWT identity + service-role writes): validates code window/status/uses, `per_user_limit` via `discount_redemptions`, `eligible_users` (all/new/free_plan/nhis_linked), `eligible_plans`; only `free_trial`/`partner` codes grant access (percentage/fixed/bogo → 422 "applies at checkout"), superseding the prior active subscription and inserting `user_subscriptions` with `source='promo'`. Paywall (`premium.tsx`) gained plan selection + promo-code field wired to it; entitlement cache invalidates on success.

**Phase 5 — Deep-link CTAs.** New CTAs `upgrade_now` / `refer_friend` in `MARKETING_CTA_OPTIONS` + `CTA_CONFIG`; mobile `cta-actions.ts` gained `upgrade` (in-app paywall via expo-router; legacy `subscribe` honors an external link when present) and `referral` (link, else native share sheet) handlers.

**Remaining user-manual steps:** apply `20260822_marketing_unification.sql` to the live DB; Meta/Twilio/SendGrid creds (unchanged from Part M).

---

## Part N — FacilityScout (Implemented 2026-08-21)

> **Status: IMPLEMENTED.** Migration `supabase/migrations/20260821_facilityscout_extension.sql` (scout submissions, collectors, rewards queue, config, `get_facility_scout_leaderboard` RPC, RBAC keys), API routes under `app/api/facilityscout/**` behind `requireAdminApiUser("facilityscout.*")` with submitter-name masking for non-super_admins, bulk-capable assign/reject endpoints, hooks `hooks/supabase-calls/useFacilityScout.ts`, dedicated page `facilityscout/page.tsx` with 5 working tabs (All Submissions, Pending Review with bulk assign/reject, Rewards Queue with disbursement, Leaderboard, Settings tier/rules editor) and `assign-dialog` (m-scout-assign mirror with SLA priorities). `_deprecated/` sub-pages deleted. Remaining deferrals: N-D5 disbursement marks rewards sent without MNO payout API; migration pending application to live DB.

Mockup scope: `admin-panel.html` `#page-facilityscout` (L13074–13257), sidebar sub-menu (L1636–1642: All Submissions, Pending, Rewards, Leaderboard, Settings), modal `m-scout-assign` (L10993–11005).

### N.1 Mockup inventory

- **Header:** time-range select, Export, **+ Assign Collector** (`m-scout-assign`); programme explainer alert (users submit unregistered facilities via GPS + photo; field collectors verify; rewards = mobile data; **max 10 pending submissions per user**).
- **6 KPI cards:** Total Submissions (248), Pending Review (6), Facilities Added (182), Duplicates (44), Rewards Queue (8), Data Rewarded (1,284 MB).
- **5 tabs:** 📲 All Submissions, ⏳ Pending Review, 🎁 Rewards Queue, 🏆 Leaderboard, ⚙️ Settings.
  - **All Submissions:** search + Status filter (New-Unmatched / Matched-Duplicate / In Field Review / Registered / Rewarded / Rejected) + Facility Type + Region + Export; table: Sub ID (`SCT-2026-xxx`), Submitted By (masked), User ID badge, Facility Name (user-given), Type, GPS coordinates, Photo count, Region, Submitted, **Match badge** (🆕 New / ✅ Registered / 🔃 Duplicate), Status, Actions (View / Map / Assign; registered rows View Facility; duplicates Show Match).
  - **Pending Review:** alert + Assign-to-Collector select + region filter; checkbox table with Assigned To column; row actions View/Map/Assign/Reject; bulk **Bulk Assign / Reject Selected**.
  - **Rewards Queue:** MNO-API explainer alert; **Reward Tiers card** (Hospital 1 GB, Pharmacy 500 MB, Clinic 250 MB, Lab 250 MB, CHPS 100 MB); **Rewards Summary card** (disbursed count, data sent, pending, MTN/Vodafone mix, Estimated Cost MTD); table: Sub ID, User, User ID, Phone (masked), Facility Registered, Type, Reward, Network, Status, **Disburse** action; bulk Disburse + Export Rewards Log.
  - **Leaderboard:** time-range + region filters; table: Rank (🏅 top-3), User, User ID, Region, Submissions, Registered, Duplicates, Data Earned, Success Rate.
  - **Settings:** **Reward Tier Configuration** (editable MB per facility type, Save Tiers) + **FacilityScout Rules** (Max Pending Per User 10, GPS Match Radius 50 m, Photo Required, Auto-duplicate Detection mode, Field Collector Auto-assignment, Reward Disbursement auto/manual).
- **`m-scout-assign`:** Submission ID (readonly), Facility Name, GPS (readonly), Assign to Collector (with active-task counts + Unassign), **Priority with SLA** (Normal 5-day / High 3-day / Urgent 24-hour), Admin Notes, Confirm Assignment.

### N.2 Codebase state

- [`facilityscout/page.tsx`](file:///c:/Users/FM/CascadeProjects/GhanaHealthTech/4OurLife-Admin/app/(dashboard)/facilityscout/page.tsx) — `OperationsModuleDashboard` shell with matching 5 tabs. All 5 tab components are 11-line `TabPlaceholder`s (0% wired); `_deprecated/` folder (leaderboard/pending/rewards/settings) survives.
- [`app/api/facilityscout/route.ts`](file:///c:/Users/FM/CascadeProjects/GhanaHealthTech/4OurLife-Admin/app/api/facilityscout/route.ts) — GET only, **unguarded** (`getAdminApiUser()` — fifth retrofit candidate after facilities/featured|top-rated, hcp, jobs, bedtracker). Parallel-fetches `collector_submissions` + `data_collectors` + `facility_scout_referrals` with useful metrics (pendingReview, activeCollectors, rewardsDue, rewardLiability). No write endpoints.
- **RBAC:** `facilityscout.view` / `facilityscout.review` exist in catalog and ROLE_DEFAULTS — sufficient (review covers assign/reject/disburse); no new keys needed.
- **Schema (full-tables.sql):**
  - `data_collectors` (L1200–1220) — good fit for the collector roster in the assign modal (employee_id, region[], assigned_areas, submission counters, is_active, vehicle_assigned).
  - `collector_submissions` (L1221–1238) — **models field-collector submissions, not app-user submissions**: `collector_id` NOT NULL, no submitter user FK, no submission reference (SCT-xxxx), no match-result/duplicate columns, no assignment/priority/SLA fields; status CHECK (`pending`,`approved`,`rejected`,`needs_review`) lacks the mockup lifecycle (`field_review`,`registered`,`rewarded`,`duplicate`).
  - `facility_scout_referrals` (L1299–1315) — closest to the Rewards Queue (reward_amount, reward_paid, expiry_date) but `reward_amount` is a generic numeric — the mockup rewards are **mobile-data bundles in MB** with a network (MTN/Vodafone/AirtelTigo); no submission FK, no phone for MNO delivery.
  - No settings storage for reward tiers/rules (N-D6).

### N.3 Gaps

| ID | Gap | Severity |
|----|-----|----------|
| N1 | All 5 tabs are `TabPlaceholder`; `_deprecated/` pages dead weight | High |
| N2 | `/api/facilityscout` GET unguarded; no write endpoints (assign, reject, disburse, settings save) | High |
| N3 | No app-user submission model: `collector_submissions` requires `collector_id`, lacks submitter FK, SCT reference, match/duplicate result, priority/SLA | High |
| N4 | Submission lifecycle statuses missing (field_review/registered/rewarded/duplicate) | High |
| N5 | Rewards: no data-bundle semantics (MB amount, network, phone, MNO delivery status), no submission link | High |
| N6 | No settings persistence for reward tiers + programme rules | Medium |
| N7 | Leaderboard has no aggregation source (per-user submissions/registered/duplicates/data earned) | Medium |
| N8 | KPI cards: Facilities Added / Duplicates / Data Rewarded need new columns/queries | Medium |
| N9 | Map action per submission (View GPS) — depends on shared map component (L-D5/L13) | Low |

### N.4 Proposed implementation plan (discussion)

**Phase 1 — Migration `20260821_facilityscout_extension.sql` (additive):**
1. New `facility_scout_submissions`: `submission_ref` text UNIQUE (SCT-YYYY-nnn, generated), `submitted_by` FK user_profiles NOT NULL, `facility_name`, `facility_type` CHECK (`hospital`,`pharmacy`,`clinic`,`lab`,`chps`), `gps_location`, `photos` text[], `region`, `match_status` CHECK (`new`,`duplicate`) DEFAULT 'new', `matched_facility_id` FK facility_profile, `status` CHECK (`pending`,`field_review`,`registered`,`rewarded`,`rejected`), `assigned_collector_id` FK data_collectors, `priority` CHECK (`normal`,`high`,`urgent`), `sla_due_at`, `admin_notes`, `reviewed_by`/`reviewed_at`/`review_notes`. (Keep `collector_submissions` untouched — it serves the separate Data Collectors workflow.)
2. `facility_scout_referrals` ADD: `submission_id` FK → `facility_scout_submissions`, `reward_mb` integer, `network` CHECK (`mtn`,`vodafone`,`airteltigo`), `delivery_phone` text, `delivery_status` CHECK (`pending`,`sent`,`failed`).
3. New `facility_scout_config` (single-row): reward-tier MB per type (jsonb or 5 columns), `max_pending_per_user` int, `gps_match_radius_m` int, `photo_required` boolean, `duplicate_detection` CHECK (`gps_name`,`gps_only`,`manual`), `collector_auto_assign` boolean, `reward_disbursement` CHECK (`auto`,`manual`), `updated_by`/`updated_at`.
4. RBAC: keys exist — only retrofit the route guard.

**Phase 2 — Server routes (all `requireAdminApiUser`):**
- `GET /api/facilityscout` → `facilityscout.view`: submissions (filters: status/type/region/search), collectors, rewards queue, leaderboard aggregates, KPI metrics.
- `POST /api/facilityscout/submissions/[id]/assign` → `facilityscout.review` (collector + priority + notes; sets `sla_due_at`, status → `field_review`; bulk assign variant).
- `POST .../reject` → `facilityscout.review` (notes; duplicate flag optional → sets `match_status=duplicate` + `matched_facility_id`).
- `POST /api/facilityscout/rewards/[id]/disburse` → `facilityscout.review` (mark sent; MNO API integration out of scope — N-D5; bulk variant).
- `GET/PATCH /api/facilityscout/config` → `facilityscout.view` / `facilityscout.review`.

**Phase 3 — Hooks:** `useScoutSubmissions`, `useScoutCollectors`, `useScoutRewards`, `useScoutLeaderboard`, `useScoutConfig` (+ mutations) — TanStack Query, URL-sync filters.

**Phase 4 — UI rebuild (delete `_deprecated/`, rewrite 5 tabs):**
- **AllSubmissionsTab:** DataTable with match/status badges, masked users (K5 pattern), per-status row actions.
- **PendingReviewTab:** checkbox table + assign dialog (mirrors `m-scout-assign` incl. collector active counts + SLA priority) + bulk assign/reject.
- **RewardsQueueTab:** tier + summary cards, disburse table, bulk disburse.
- **LeaderboardTab:** aggregated ranking table with medal ranks.
- **SettingsTab:** reward-tier editor + rules form writing `facility_scout_config`.
- KPI row from GET metrics; Map action reuses the shared map component once built (L-D5).

**Phase 5 — Interconnections:**
- **Facilities (Part H):** `registered` submissions create/link a `facility_profile` row (registrar flow); "View Facility" deep-links to Facilities menu.
- **Users:** masked submitter display; leaderboard joins `user_profiles`; "max 10 pending" enforced app-side against `submitted_by`.
- **Data Collectors module:** assign dropdown draws from `data_collectors` (region-filtered, active-count computed).
- **Notifications:** assignment/disbursement events enqueue via `notification_templates`/automation rules.
- **Dashboard:** Facilities Added via Scout feeds platform_metrics_snapshots growth figures.

### N.5 Open decisions

| ID | Decision | Recommendation |
|----|----------|----------------|
| N-D1 | User submissions: new `facility_scout_submissions` table vs extending `collector_submissions` (make collector_id nullable + add user FK) | New table — the two lifecycles differ (community submission vs staff data entry); avoids breaking the collectors module |
| N-D2 | SCT reference format | `SCT-{year}-{sequence}` generated on insert (mockup format) |
| N-D3 | Duplicate detection | Store `match_status` + `matched_facility_id` set by admin (or future GPS+name RPC); auto-detection algorithm itself deferred — mode stored in config |
| N-D4 | Reward unit | Mobile data MB (`reward_mb`) not cash; keep legacy `reward_amount` for old referral rows |
| N-D5 | MNO data-bundle disbursement API | Out of scope — Disburse marks `delivery_status=sent` + audit; real MTN/Vodafone integration deferred (same posture as other external APIs) |
| N-D6 | Settings storage | Single-row `facility_scout_config` table (consistent, queryable) vs `platform_settings` key-value — recommend dedicated table |
| N-D7 | SLA enforcement | Store `sla_due_at` + show overdue badges only; no background job/alerting in this phase |

---

## Part O — AI Hub (`page-ai`, mockup L2191–2307) (✅ Implemented)

**Mockup scope:** sidebar L1649–1654 (AI Hub + 4 children: AI Models / AI Moderation / Recommendations / AI Analytics), header buttons `📊 AI Report` + `+ Deploy Model`, 4 KPI cards (Active Models 8, Pending Flags 23, Avg Accuracy 94.2%, Queries Today 23,450), 4 tabs. Adjacent AI surfaces: `m-ai-plan` (L10890, AI Generate Fitness Plan), `m-ai-challenge` (L10904, AI Generate Challenge), and the Period Trivia/Content workspace. Mockup role table (L10880) defines an **AI Manager** role scoped to "AI Hub, Moderation, Analytics, Models".

**Mockup inventory:**
- **Models tab:** registry table — Model Name (+ description), Type badge (Classification/NLP/Medical NLP/Recommendation/Anomaly Detect/Generative AI/Translation/Regression), Version, Accuracy (colour-coded), Queries/Day, Latency, Last Trained, Status (Active/Beta/Staging), row actions 📊 analytics / 🔄 refresh / ⚙️ settings + ⋮ Copy Details / Export Logs / Pause Model; empty state with Deploy CTA.
- **Moderation tab:** auto-moderation summary alert (156 auto-moderated / 23 human review / 3 escalations); filters (search, Group, Risk Level, Status); table — Content Preview (+ flag summary), Group badge, masked Author (`user#4821`), AI Flag Reason, Risk (HIGH/MEDIUM) + confidence bar (e.g. 97%), Flagged, Status (Pending/Approved), actions View / Approve + ⋮ Copy / View Author / Remove Post; pagination.
- **Recommendations tab:** Recommendation Engine Stats card (generated today, CTR, relevance score, bookings via AI rec, satisfaction), Top Recommended Categories progress bars, segment table (User Segment / Recommendation Type / Items Served / CTR / Conversions / Satisfaction / Model Version).
- **Analytics tab:** 3 cards — AI Usage Trend (queries, peak hour, 7-day avg, MoM growth, projected monthly), Model Performance bars, AI Cost & Efficiency (API Cost ₵4,230, cost/query ₵0.18, compute hours, cache hit rate, error rate); yellow alert recommending retrain when a model is below accuracy threshold (Twi 82.4% vs 90% target).

**Codebase state:** the strongest pre-built module so far.
- [app/(dashboard)/ai/page.tsx](app/(dashboard)/ai/page.tsx) (567 lines, real): 4 KpiCards + 4 tabs, fetches `/api/ai/metrics`, `/api/ai/analytics`, `/api/ai/moderation-queue`, `/api/ai/recommendations`; moderation actions wired to the `moderate_content` RPC.
- [app/(dashboard)/ai-hub/](app/(dashboard)/ai-hub/) holds 5 `PlaceholderPage` stubs (`/ai-hub`, `/models`, `/moderation`, `/recommendations`, `/analytics`) duplicating the live `/ai` page; **exception:** `ai-hub/period` is a real 441-line workspace (trivia + content drafting, mojibake in title).
- Routes: `moderation-queue` GET/POST already RBAC-guarded (`ai.view`/`ai.manage`, Epic 31 done). `metrics`, `analytics`, `recommendations` use bare `getAdminApiUser()` → **retrofit candidates #6–#8**. `recommendations` is a stub returning `source: "not_configured"` pending Epic 29 tables.
- Schema ([full-tables.sql](full-tables.sql)): `content_moderation_flags` (L925 — 6 content types, `ai_detected`/`ai_confidence`/`ai_reason`, **no risk level, no group**), `fitness_ai_calls` (L1467 — usage log: model_name, tokens, cost, latency, status; **no model registry behind it, no cache-hit**), `fitness_ai_campaigns` (L1454). Epic 29 migration `20260812_epic29_ai_analytics_and_moderation.sql` already ships `get_ai_analytics` RPC + fixed `moderate_content` RPC.
- RBAC: `ai.view`/`ai.manage` exist and are in `ROLE_DEFAULTS` — no new catalog keys needed; the mockup "AI Manager" role maps to exactly these two keys.

**Gaps:**

| # | Gap |
|---|-----|
| O1 | No **model registry**: no `ai_models` table — Version/Accuracy/Last Trained/Status/Pause/Deploy have no persistence; Models tab only shows usage aggregation (model/requests/tokens/avgLatency) derived from `get_ai_analytics.byModel` |
| O2 | `fitness_ai_calls` is fitness-named but is the platform-wide AI usage log (what `get_ai_analytics` reads); rename is breaking → keep name, document semantics, extend columns |
| O3 | Moderation **risk level** missing — mockup shows HIGH/MEDIUM + confidence bar; schema has only `ai_confidence` |
| O4 | Moderation **group filter** missing — flags store `content_type`/`content_id`, no community-group dimension |
| O5 | Status vocabulary mismatch: `moderation_status` enum (pending_review/actioned/dismissed) vs mockup Pending/Approved/Removed — needs display mapping |
| O6 | Recommendations tab is a **stub**; mockup engine stats/categories/segment table has no source table (Epic 29's `ai_recommendations` never built) |
| O7 | Analytics tab lacks trend/peak-hour/MoM/projection series; Cost card needs cache-hit + per-query cost |
| O8 | **Accuracy metric has no source** (no eval/ground-truth pipeline) — yet the under-threshold alert is a deterministic, shippable rule |
| O9 | Route guards: retrofit `metrics`, `analytics`, `recommendations` to `requireAdminApiUser("ai.view")` |
| O10 | IA duplication: live dashboard at `/ai`, placeholders at `/ai-hub/*` — sidebar children imply sub-pages |
| O11 | `ai-hub/period/_components/Workspace.tsx` title has mojibake; moderation author display must follow masked-user pattern (K5) |
| O12 | "AI Manager" role from mockup role table not guaranteed in `ROLE_DEFAULTS` mapping — verify/add with `ai.view` + `ai.manage` |

**Proposed implementation plan**

1. **Migration** `20260821_ai_hub_extension.sql` (additive, reconcile against `full-tables.sql`):
   - New `ai_models` (`id`, `name`, `model_key` UNIQUE, `description`, `model_type`, `version`, `accuracy_latest` numeric NULL, `accuracy_target` numeric DEFAULT 90, `latency_p50_ms`, `status` CHECK in `active`/`beta`/`staging`/`paused`, `last_trained_at` timestamptz, `config` jsonb, `deployed_by` FK user_profiles, timestamps). Seed the 8 mockup models per O-D1.
   - `ALTER fitness_ai_calls` ADD `ai_model_id` uuid NULL REFERENCES `ai_models`, `cache_hit` boolean DEFAULT false.
   - `ALTER content_moderation_flags` ADD `risk_level` text NULL CHECK in (`high`,`medium`,`low`) — NULL means derived from confidence (O-D3).
   - New `ai_recommendation_stats` (`stat_date` date, `user_segment`, `recommendation_type`, `items_served` int, `clicks` int, `conversions` int, `satisfaction` numeric, `model_version` text; UNIQUE (`stat_date`, `user_segment`)) — written by the recommender pipeline / manual import (O-D4).
   - New RPC `get_ai_hub_overview()` returning KPI row: active model count, pending flags, avg accuracy (registry), queries today (from `fitness_ai_calls`).
2. **Server routes:** `/api/ai/models` GET + `[id]` GET/PATCH (pause/resume/refresh/accuracy update) guarded `ai.view`/`ai.manage`; retrofit guards on `metrics`/`analytics`/`recommendations`; implement `recommendations` GET reading `ai_recommendation_stats` + category/segment aggregates (empty-state contract when table empty).
3. **Hooks:** `hooks/api-calls/useAiModels.ts`, `useAiRecommendationStats.ts` (TanStack Query; mutations with sonner toasts + cache invalidation); keep existing fetches but route through hooks.
4. **UI rebuild** on `/ai` page: Models tab → registry DataTable (9 columns + row-action menu incl. Pause with confirm dialog) with usage shown in a secondary "Usage" view; Deploy Model dialog (react-hook-form + zod: name, type, version, accuracy target); Moderation tab → risk badge derived per O-D3, confidence `Progress` bar, group/risk/status filters, masked author (K5), status label mapping per O5; Recommendations tab → two stat cards + category bars + segment DataTable fed by new route; Analytics tab → 3-card grid (trend mrows, performance bars from registry accuracy, cost from `estimated_cost` sums) + deterministic under-threshold alert (O8).
5. **Interconnections:** Chats/Facilities (moderation already mutates `messages`/`conversations` via `moderate_content`; `facility_review` flags link to Facilities menu), Fitness (`fitness_ai_calls`/`fitness_ai_campaigns`, `m-ai-plan`/`m-ai-challenge` generation modals, period workspace stays under the hub IA), Notifications (`notification_automation_rules` on moderation outcomes), Settings → Admins (AI Manager role wiring per O12), Dashboard home KPI tiles can reuse `get_ai_hub_overview()`.

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| O-D1 | Seed `ai_models` with the 8 mockup models vs start empty + Deploy form | Seed (registry drives the whole Models tab; accuracy values as editable baselines) |
| O-D2 | Accuracy source until an eval pipeline exists | Manual registry column (`accuracy_latest`), show "—" when NULL |
| O-D3 | Risk level derivation | Server-derived from `ai_confidence` (≥90 high, ≥70 medium, else low) with nullable override column |
| O-D4 | Recommendations data source | `ai_recommendation_stats` table written by pipeline/manual import; UI empty state until rows exist (no fake metrics) |
| O-D5 | Cost & cache metrics | Sum `estimated_cost` for API cost; add `cache_hit` column now, rates compute once API layer writes it |
| O-D6 | IA: single tabbed hub vs 4 sub-pages | Single tabbed page at `/ai` with `?tab=` sync; sidebar children deep-link via `?tab=`; `/ai-hub/*` placeholders redirect (keep `period` workspace) |
| O-D7 | Rename `fitness_ai_calls` | Defer (breaking) — keep name, document as platform AI usage log |

---

## Part P — Settings (`page-settings`, mockup L9674–10321) (✅ Implemented)

**Mockup scope:** sidebar L1675 (top-level Settings), header buttons `Audit Log` / `Sync All` / `Save All Changes`, maintenance-mode banner, and **10 tabs**: Platform, Notifications, Plans & Pricing, Feature Flags, Security, API Keys, Integrations, Billing & GRA, Compliance, Maintenance.

**Mockup inventory:**
- **Platform tab:** Platform Identity card (name, short name, tagline, App Store description, domains, support/finance emails, phone/WhatsApp, store/social URLs), Regional & Localisation (country, currency GHS, language incl. Twi/Ga/Hausa/Dagbani, timezone, date/phone formats), User & Registration Defaults (default plan, trial duration, max login attempts, lock duration, min password length, session timeout, email/phone/social-sign-in toggles), AI & Content Settings (6 per-model toggles), Reset to Defaults + Save.
- **Notifications tab:** channel toggles (FCM/Email/SMS/in-app/admin alerts), 8 trigger toggles (welcome SMS, payment confirmations, period/medication/appointment reminders, job alerts, FacilityScout rewards), templates table (name/channel/trigger/last edited/status + Edit/Preview), 30-day delivery stats card.
- **Plans & Pricing tab:** 4 user plan cards (Free/Starter ₵25/Pro ₵55/Elite ₵120) with editable price + feature list + subscriber counts; Provider plans table (Basic ₵80 → Enterprise Wellness ₵2,000+); Discount & Promo Codes table (code/discount/plan/uses/expiry/status) — cross-links Marketing Discounts.
- **Feature Flags tab:** Core Health (7 toggles), Platform (7), Beta/Staged (4, controlled rollout), Feature Access by Plan matrix (feature × Free/Starter/Pro/Elite entitlements).
- **Security tab:** Authentication & Access toggles (MFA for all admins, IP whitelist enforcement + CIDR textarea, session timeout, AI audit logging, geo-restriction), Audit & Compliance card (last scan, audit log count, failed logins 7d, active sessions, GH-DPA status, Export Audit Log / Run Security Scan / **End All Sessions**).
- **API Keys tab:** security warning, keys table (name, environment, masked preview, created, last used, status + Reveal/Rotate/Revoke), Generate New Key; **Webhooks** table (endpoint URL, events, last triggered, success rate, status + Add/Edit/Delete).
- **Integrations tab:** 6 provider cards — Paystack, Hubtel SMS, SendGrid, Firebase FCM, Google Maps (usage/cost/budget cap), HEFRA Registry (Limited/read-only/Force Sync) — each with Configure/Test actions.
- **Billing & GRA tab:** 4 KPIs (Revenue ₵48,240 / Infra Costs / Net Revenue / Overdue Invoices), Platform Subscription Plan card (Enterprise ₵24,000/mo), Infrastructure & API Costs table (service/provider/cost 30d/budget/usage%).
- **Compliance tab:** GH-DPA 2012 card (controller registration, DPO, retention, erasure), GRA Tax card (TIN, VAT 17.5% breakdown NHIL/GETFUND, filing calendar), Data Security & Encryption (AES-256-GCM, TLS 1.3, HSM, ISO 27001 status), Health Sector card (HEFRA license, Medical/Pharmacy Council, PHI policy).
- **Maintenance tab:** maintenance mode toggle (**Super Admin only**), maintenance page/admin-access toggles, message + estimated downtime + scheduled start, Activate + Notify Users via Push; System Health card (API latency, DB status, storage, uptime, Restart Services/Clear Cache/Health Report); Backup & Recovery card; Maintenance History table.

**Codebase state:** partially built but **the highest-risk security surface in the panel**.
- [app/(dashboard)/settings/page.tsx](app/(dashboard)/settings/page.tsx) (770 lines): **6 of 10 tabs** (`general`, `plans`, `features`, `api-keys`, `integrations`, `maintenance`) — missing Notifications, Security, Billing & GRA, Compliance; no `?tab=` URL sync.
- **All 6 settings routes use bare `getAdminApiUser()` — GET and PUT alike** (`/api/settings`, `/api/settings/api-keys`, `/api/settings/feature-flags`, `/api/settings/integrations`, `/api/settings/maintenance`, `/api/settings/plans`). Any authenticated admin — including read-only roles — can today flip maintenance mode, edit plans, and toggle feature flags. **This is the single most urgent RBAC retrofit in the panel.**
- Schema: migration `20260811_platform_settings.sql` created `platform_settings` (single `global` row; identity fields, maintenance fields, `security_settings jsonb`), `feature_flags` (name/enabled/rollout %), `platform_api_keys` (provider CHECK incl. paystack/momo/openai/firebase, `key_hint`/`key_hash` — no plaintext), `platform_integrations` (status/webhook_url/config jsonb). All 4 have RLS enabled **with no policies** (service-role access only — fine, but undocumented). Note: these tables are **absent from the `full-tables.sql` live dump** → reconcile before migrating.
- RBAC: **no `settings.*` keys exist.** Only adjacent keys: `security.view`, `security.settings`, `integrations.keys` — and `security.view` is explicitly filtered out of one role default (L200). `notification_templates` + `notification_automation_rules` ([full-tables.sql](full-tables.sql) L1239–1273) already back the Notifications tab; `subscription_plans` (L1337) backs Plans.

**Gaps:**

| # | Gap |
|---|-----|
| P1 | **Zero RBAC on all settings mutations** — 6 routes, GET+PUT, bare `getAdminApiUser()`; maintenance toggle must be Super-Admin-only per mockup |
| P2 | No `settings.*` permission keys in `PERMISSION_CATALOG`/`ROLE_DEFAULTS` |
| P3 | 4 of 10 tabs unbuilt (Notifications, Security, Billing & GRA, Compliance); no `?tab=` URL sync |
| P4 | Security tab has no persistence shape: mockup needs MFA/IP whitelist/session/geo toggles + CIDR list; only generic `security_settings jsonb` exists; audit metrics (failed logins, sessions) have no source |
| P5 | API Keys: no Generate/Rotate/Revoke mutation endpoints, no webhooks table (mockup Webhooks card), no key-usage logging |
| P6 | Billing: no cost/budget source table; revenue metrics need the deferred transactions source (K-D7) |
| P7 | Compliance has no persistence — attestations (GH-DPA reg no, GRA TIN, HEFRA license, VAT rates, filing dates) are pure mockup content |
| P8 | Feature Flags: mockup needs grouping (Core/Platform/Beta) + per-plan entitlement matrix; table has only name/enabled/rollout |
| P9 | Platform tab schema thin: localisation (currency/timezone/date/phone format), registration defaults (login attempts, lock duration, password length, session timeout, verification toggles), AI model toggles all missing |
| P10 | Maintenance: no history table, no "Notify Users via Push" hookup, no actor record on activate/lift |
| P11 | Plans overlap: `subscription_plans` (user) vs `marketing_subscriptions` (Part M catalog) vs mockup Provider plans — single source of truth needed |

**Strategic security enhancements** (this part's emphasis):
1. **Least-privilege key split:** `settings.view`, `settings.manage`, `settings.security` (Security tab + maintenance activate), `settings.billing`; maintenance activate/lift gated on `settings.security` AND Super-Admin role check server-side (mockup rule), with actor id recorded.
2. **Guard all 6 routes now** — `requireAdminApiUser(...)` per tab scope; this closes the panel's biggest open hole.
3. **API key hygiene:** generate returns the full key **exactly once** (never persisted — store `key_hash` + `key_hint` only; the mockup "Reveal" becomes "regenerate/rotate" semantics — P-D2); Rotate = new hash + invalidate old; Revoke with confirm dialog; every action audit-logged.
4. **IP whitelist self-lockout guard:** server validates the acting admin's IP against the new CIDR list before saving (P-D4) so nobody bricks their own access.
5. **Settings change audit:** new `settings_change_log` (actor, route, before/after diff jsonb, at) written by every PUT — feeds the Audit Log button and Admins → Activity Logs.
6. **Feature-flag rollout safety:** PUT validates `rollout_percentage` and rejects enabling a flag whose dependent model is paused in `ai_models` (Part O interconnection).

**Proposed implementation plan**

1. **Migration** `20260821_settings_security_extension.sql` (additive, reconcile against live dump first):
   - `ALTER platform_settings` ADD identity columns (short_name, tagline, app_store_description, primary_domain, admin_url, finance_email, whatsapp, store/social URLs), localisation (country, currency, timezone, date_format, phone_format), registration defaults (default_user_plan, free_trial_days, max_login_attempts, lock_duration_mins, min_password_length, session_timeout_mins, email_verification_required, phone_otp_required, social_signin_enabled), `ai_feature_toggles jsonb`, `compliance jsonb`, `updated_by` uuid FK.
   - New `platform_webhooks` (id, endpoint_url, events text[], secret_hash, status, last_triggered_at, success_count/fail_count, created_by, timestamps).
   - `ALTER feature_flags` ADD `category` CHECK (`core`,`platform`,`beta`) NULL; new `feature_plan_entitlements` (feature_flag_id FK, plan text CHECK, entitlement text, UNIQUE(flag, plan)).
   - New `infra_cost_budgets` (service, provider, budget_30d numeric, notes) + `ALTER platform_integrations` ADD `usage_30d jsonb`.
   - New `maintenance_history` (started_at, ended_at, duration_mins, type CHECK scheduled/emergency, notes, actor uuid FK).
   - New `settings_change_log` per enhancement 5.
   - Extend `platform_api_keys`: `revoked_at`, `rotated_from_id`.
2. **Server routes:** retrofit all 6 existing routes to RBAC; add `/api/settings/security` GET/PUT (`settings.security`), `/api/settings/api-keys/generate|rotate|revoke` POST, `/api/settings/webhooks` GET/POST + `[id]` PATCH/DELETE, `/api/settings/compliance` GET/PUT, `/api/settings/notifications` GET/PUT over `notification_templates`/`notification_automation_rules`, `/api/settings/maintenance` POST activate/lift (Super-Admin + history row) + push-notify action via Notifications interconnection.
3. **Hooks:** `hooks/api-calls/useSettings.ts`, `useSettingsSecurity.ts`, `useApiKeys.ts`, `useWebhooks.ts`, `useCompliance.ts` (TanStack Query, sonner toasts, invalidation; optimistic toggle for flags with rollback on 403).
4. **UI rebuild:** extend the existing page to 10 tabs + `?tab=` sync; Notifications tab = templates DataTable + trigger switches bound to `notification_automation_rules`; Security tab = toggle card + CIDR textarea (mono) + audit metrics card (audit log count from `settings_change_log` + admins session telemetry; failed logins show "—" until source exists); API Keys tab = Generate dialog showing key once + Revoke confirm + Webhooks table; Billing tab = cost-budget table live + revenue KPIs "—" (K-D7); Compliance tab = read-heavy attestation cards editable via `settings.compliance` gate; Maintenance tab = banner state sync + history DataTable.
5. **Interconnections:** Notifications menu (templates/rules shared), AI Hub (AI & Content toggles mirror `ai_models` status — Part O), Marketing (Plans promo codes read `marketing_discounts` — Part M), Admins menu (Security Center tab + activity logs consume `settings_change_log`; MFA policy toggle drives Admins MFA alert), middleware (maintenance_mode check reads `platform_settings` — the mockup banner is the admin-side mirror), dashboard home KPI tiles.

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| P-D1 | Permission key granularity | 4 keys: `settings.view`/`settings.manage`/`settings.security`/`settings.billing` (+ existing `security.*`/`integrations.keys` reused) |
| P-D2 | API key "Reveal" | Hash-only storage; Reveal becomes Rotate-with-one-time-display (never store plaintext) |
| P-D3 | Security toggles storage | Keep `security_settings jsonb` (shape: mfa_required, ip_whitelist[], geo_restriction, session_timeout) — avoids column churn; zod-validate server-side |
| P-D4 | IP whitelist lockout | Server-side guard: reject save if acting admin's IP falls outside new CIDR list |
| P-D5 | Billing revenue metrics | Defer to transactions source (K-D7); Infra cost table ships now |
| P-D6 | Compliance attestations | `platform_settings.compliance jsonb` + `settings_change_log`; no new tables |
| P-D7 | Plans source of truth | `subscription_plans` governs user plans; Provider plans added as rows with `audience` column; `marketing_subscriptions` (Part M) becomes read-view over it |

---

## Part Q — Design System: Color, Typography & Dark Mode (cross-cutting) (✅ Implemented)

**Scope:** overall color scheme, fonts and typography of the admin panel; a professional font + typographic scale + alignment system for all pages; Dark Mode (Light/Day ↔ Dark) switching for admins.

**Codebase state — current baseline:**
- **The declared font is never loaded.** [app/layout.js](app/layout.js) sets `<body className="font-inter custom-tippy dashcode-app">`, and [tailwind.config.js](tailwind.config.js) maps `fontFamily.inter: ["Inter", "sans-serif"]` — but there is **no `next/font` usage anywhere, no `@font-face`, no Google Fonts import**, and no `.font-inter` rule in [app/globals.css](app/globals.css) (962 lines). The app silently renders in the browser default sans-serif.
- **Dark mode is ~90% scaffolded but never wired:** `next-themes@0.4.6` is already in `package.json`, `tailwind.config.js` already has `darkMode: "class"`, yet there is **no `components/theme-provider.tsx`**, no toggle, and only **15 `dark:` variant usages in the entire codebase**. [app/globals.css](app/globals.css)'s `@theme` block (shadcn semantic tokens: background/foreground/card/primary emerald #10b981, muted #64748b, chart-1…6, sidebar #064e3b) is **light-only**. A bespoke `.data-table-dark` class (L812–839) is the only ad-hoc dark surface.
- **Root layout is a client component (`"use client"` in `layout.js`)** — an anti-pattern that blocks a proper theme bootstrap (no FOUC-prevention script, no `suppressHydrationWarning`), and carries DashCode template residue (`dashcode-app`, `custom-tippy`, flatpickr light-theme import).
- **Typography is chaotic:** 778 lines use arbitrary `text-[10px]`…`text-[14px]` sizes (no scale); 1,488 lines use font-weight utilities spanning all 7 levels (thin→black); no `font-feature-settings`/tabular figures anywhere; numeric table columns are not consistently right-aligned.
- **Color discipline:** 83+ lines in `.tsx`/`.ts` hardcode hex values; the `:root` `--clr-*` palette (greens/blues/reds) and shadcn `@theme` tokens coexist; the emerald sidebar is hardcoded CSS. The converged redesign kit (`components/redesign/`: Layout, Sidebar, Topbar, PageHeader, KpiCard, DataTable, Modal) is the natural carrier for this system.

**Gaps:**

| # | Gap |
|---|-----|
| Q1 | Font dead-end: `font-inter` class resolves to nothing; Inter (or any) font file never loaded; body falls back to browser default |
| Q2 | `next-themes` installed but unwired; no ThemeProvider, no toggle, no persisted preference |
| Q3 | Client root `layout.js` → dark-mode FOUC risk; no theme-init script; needs conversion to server `layout.tsx` |
| Q4 | No dark token set — shadcn `@theme` and `--clr-*` are light-only; 15 `dark:` usages total |
| Q5 | No typographic scale — 778 arbitrary-px text sizes |
| Q6 | Weight sprawl — 7 weights in use; brief limits to regular/medium/semibold |
| Q7 | No tabular figures; numeric columns not consistently right-aligned — jittering digits in KPIs/tables |
| Q8 | 83+ hardcoded hex values in components + bespoke `.data-table-dark` instead of tokens |
| Q9 | Emerald sidebar hardcoded; needs dark-mode elevation treatment (dark-on-dark loses separation) |
| Q10 | No legibility/contrast audit; muted text and chart palette need dark variants |
| Q11 | No alignment/spacing system — mixed px gaps, inconsistent card/table padding |
| Q12 | DashCode template residue (`dashcode-app`, `custom-tippy`, flatpickr light theme) |

**Proposed design system**

1. **Font:** **Inter** (variable) via `next/font/google` — already nominally declared, highly legible at small sizes, and natively supports tabular figures (`tnum`), satisfying every brief requirement. Subset `latin`; preload handled by next/font (zero layout shift, no external request). **Mono accent:** JetBrains Mono via `next/font` for API keys, IDs, GHS codes, CIDR ranges (mockup uses monospace for exactly these).
2. **Typographic scale (data-density-first, ~1.25 ratio):** `--text-2xs` 11px (badges, table meta) / `xs` 12px (table cells, secondary) / `sm` 13px (**base — body & forms**) / `md` 14px (labels, emphasis) / `lg` 16px (card titles) / `xl` 18px (page subtitles) / `2xl` 22px (page titles) / `3xl` 28px (KPI values). Line-height: 1.35 for UI text, 1.2 for headings/KPIs. Tight tracking (-0.01em) at ≥18px.
3. **Weight discipline — exactly three:** 400 regular (body/cells), 500 medium (labels, table headers, nav), 600 semibold (titles, KPI values, active states). `font-bold`+ banned in new code; legacy refactored opportunistically when a file is touched.
4. **Numbers:** `tabular-nums` + right alignment for every numeric table column and KPI value — exposed as a `tnum` utility class applied by default in `DataTable` numeric cells.
5. **Alignment & spacing system:** 4px spacing grid (Tailwind default steps only — no arbitrary px gaps); content left-aligned, numbers right-aligned, status badges left-of-action; consistent 16px card padding / 12px table cell padding / sticky table headers; 8-column grid for dashboard layouts.
6. **Dark Mode:** `next-themes` `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) + convert tokens to shadcn v4 CSS-first dual mode: HSL variables under `:root` and `.dark`, wired through `@theme inline`; `--clr-*` brand palette gains dark variants (surfaces slate-900/950 family, emerald primary kept, borders lifted to ~8% white); sidebar keeps emerald in light, switches to elevated slate in dark; charts get lightness-shifted `--color-chart-*` overrides; `.data-table-dark` deleted. Toggle (sun/moon/monitor) in `Topbar`, persisted via localStorage.

**Implementation phases:**
1. **Foundation:** convert `layout.js` → `layout.tsx` (server component, `suppressHydrationWarning` on `<html>`, next/font Inter + JetBrains Mono, ThemeProvider mount); delete DashCode residue (Q12).
2. **Tokens:** dual-mode HSL token set in `globals.css`; map every existing `--clr-*`/`@theme` consumer to tokens; remove `.data-table-dark`.
3. **Type system:** `--text-*` scale tokens + `tnum` utility; DataTable numeric-column right-align/tnum defaults; ESLint guard against new `font-bold`/arbitrary text sizes (warning level).
4. **UI:** Topbar theme toggle + persistence; KpiCard/PageHeader/DataTable/Sidebar/Topbar audited against tokens; contrast check (WCAG AA) for muted text + chart series in both modes.
5. **Propagation:** every Part H–P rebuild consumes the tokens (no new raw hex); existing pages retrofitted module-by-module as their Parts are implemented — no big-bang repaint.

**Interconnections:** Topbar (toggle home), DataTable/KpiCard kit (numeric formatting contract used by Parts H–P tables), Settings (optional per-admin theme preference can later persist to `platform_settings`/user profile — Part P), all chart surfaces (Epic 9 chart palette), mojibake sweep (same files touched during Parts H–P rewrites).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| Q-D1 | Primary font | Inter variable via `next/font/google` (brief-aligned; alternatives: Geist, IBM Plex Sans) |
| Q-D2 | Base size | 13px base / 12px table cells — maximum legible data density for an admin panel |
| Q-D3 | Weight policy | 400/500/600 only; lint-guard new code, grandfather legacy |
| Q-D4 | Dark strategy | Class-based `next-themes`, default `system` + manual override; localStorage persistence |
| Q-D5 | Hex cleanup scope | Token-only in rebuilt/new code now; lint rule; legacy retrofitted per Part implementation |
| Q-D6 | Mono font | JetBrains Mono for keys/IDs/codes; fallback `ui-monospace` |
| Q-D7 | Chart palette | Same 6 hues, `.dark` lightness-shifted overrides — no new hues |

---

## Part R — Notifications (`page-notifications`, mockup L7932–8317) (✅ Implemented)

**Mockup scope:** sidebar L1645, header `Export Log` + `Send Notification` (opens `m-broadcast` L10853 — title, target audience with live counts, channel, message, send-now/schedule), SA module-connections bar (Users / Medication / Med Enquiry / BedTracker / Marketing / Transactions / Facilities / Chats), 6 KPI cards (Sent Today, Open Rate, Scheduled, Failed, Pharmacy Mktg, Sent This Month), and **7 tabs**: All Log, Scheduled, Pharmacy Marketing, BedTracker Alerts, Templates, Automation Rules, Best Time.

**Mockup inventory:**
- **All Log:** filters (search, Type — Push/SMS/Email/In-App/Pharmacy Mktg/BedTracker/Med Reminder; Target; Status; date range; Export); 13-column table (checkbox, Title/Message, Type, Source, Target, Sent, Delivered, Opened, Open Rate, Sent At, By — incl. "System (Auto)", Status incl. Unread/failed rows, actions View/Copy/Resend); pagination.
- **Scheduled:** review-before-send alert + table (Title, Type, Source, Target, Scheduled For, Created By, View/Edit/Cancel) + `+ Schedule New`.
- **Pharmacy Marketing:** geo rules explainer; Map Radius Picker (0.5/2/5 km + user coverage estimate) + Radius Performance card (open-rate per radius + insight); filters (condition, region, proximity, status); 12-column table (Pharmacy + IBP-verified badge, Medication Available, Condition Targeted, Users Notified, Region, Distance, Open Rate, Conversions, Sent At, Status, Stats/Resend); 4-rule compliance footer (IBP-verified/PCGH-licensed, region match, opt-out respected); `m-pharmacy-notif` create-campaign modal.
- **BedTracker Alerts:** queue-bypass alert banner; filters (alert type — Capacity Full/Low/Available/Emergency Reroute/Critical; ward; recipient); table (Alert badge, Facility, Ward, Beds Available e.g. 0/40, Recipient, Sent, Time, Status, View/Repeat).
- **Templates:** 7-column table (Name + trigger description, Type, Source Module, Times Used, Last Used, Status, View/Edit) + New Template.
- **Automation Rules:** 9-column table (Rule Name, Trigger, Source Module, Channel, Target, Condition, Status, Last Fired, Edit/Pause) + Add Rule.
- **Best Time:** 3 time-of-day cards × 4 segments (All/Free/Premium/HCPs) open-rate bars + per-segment recommendation tiles (best window + avoid windows).

**Codebase state:** mature and RBAC-complete — the gap is breadth, not foundations.
- [app/(dashboard)/notifications/page.tsx](app/(dashboard)/notifications/page.tsx) (819 lines): **4 of 7 tabs** — Campaigns (with create form: title/body/type/scheduled_at/template), Notification Log, Templates, Automation Rules. Missing: Scheduled, Pharmacy Marketing, BedTracker Alerts, Best Time; no broadcast modal; no `?tab=` URL sync.
- Routes: **all 7 already Epic-31-guarded** (`notifications.view`/`create`/`edit`/`delete` keys all exist and used) — `/api/notifications` (aggregates `notifications` + `notification_campaigns` + `notification_templates`), `templates`, `rules` (+ `[id]`), `segment-preview` (POST), `campaigns/[id]`. Zero retrofit work here — the cleanest module in Parts H–R.
- Schema ([full-tables.sql](full-tables.sql)): `notifications` (L622 — per-user inbox: title/body/type/metadata/is_read/**read_at**/campaign_id/is_broadcast; **no channel, no delivered/opened counters, no sender**), `notification_campaigns` (L1695 — scheduled_at/sent_at/failed_at/failure_reason/**delivery_stats jsonb**/segment_filter; **no created_by**), `notification_templates` (L1239), `notification_automation_rules` (L1256). `bed_tracker_alerts` exists (Part L). Leaflet CSS already imported globally (`globals.css`) — radius map needs no new dependency.

**Gaps:**

| # | Gap |
|---|-----|
| R1 | **Delivery/open tracking missing** — mockup All Log shows Sent/Delivered/Opened/Open Rate per row; schema only has per-user `is_read`/`read_at` and campaign-level `delivery_stats jsonb`; no `delivered_at`/`opened_at`, no channel column |
| R2 | 3 of 7 tabs unbuilt (Pharmacy Marketing, BedTracker Alerts, Best Time) + Scheduled not split out from Campaigns |
| R3 | `m-broadcast` modal unbuilt — no broadcast composer with segment counts; `segment-preview` route exists but nothing consumes it in the composer |
| R4 | Pharmacy Marketing: no campaign model linking pharmacy medication availability → condition-targeted geo sends; no radius config; no per-campaign conversions/open rates; no opt-out enforcement record |
| R5 | Best Time analytics: no hour-bucket aggregation of opens by segment — needs RPC over delivery events (or deferral per Epic 30.1 precedent) |
| R6 | `notification_campaigns.created_by` missing → "By" column (Marketing Mgr / System Auto) can't persist |
| R7 | Templates tab lacks Times Used / Last Used counters; Automation Rules lack Last Fired + Condition display columns |
| R8 | BedTracker Alerts tab has no cross-link view over `bed_tracker_alerts` with recipient/delivery columns (Part L interconnection) |
| R9 | No `?tab=` URL sync; no Export Log action |

**Proposed implementation plan**

1. **Migration** `20260821_notifications_extension.sql` (additive):
   - `ALTER notifications` ADD `channel` text CHECK (`push`,`sms`,`email`,`in_app`,`pharmacy_marketing`,`bedtracker`) NULL (backfill `in_app`), `delivered_at` timestamptz, `opened_at` timestamptz (backfill from `read_at`), `sent_by` uuid NULL (NULL = System Auto).
   - `ALTER notification_campaigns` ADD `created_by` uuid FK user_profiles, `status` CHECK (`draft`,`scheduled`,`sending`,`sent`,`failed`,`cancelled`) derived from existing timestamps where possible.
   - New `pharmacy_marketing_campaigns` (id, pharmacy_id FK facility_profile, medications text[], condition_target text, region text, radius_km numeric CHECK in (0.5,2,5), users_notified int, open_rate numeric, conversions int, status, opt_outs int, sent_at, created_by; rules constants enforced in route logic, not DB).
   - New RPC `get_notification_analytics(window)` → KPI row (sent today/this month, open rate, scheduled count, failed count, pharmacy count) + `get_best_time_stats()` → hour-bucket × segment open rates from `notifications.opened_at`.
2. **Server routes (all guarded, keys already exist):** extend `/api/notifications` with tab-scoped queries (scheduled filter, channel filter, date range, CSV export); add `/api/notifications/pharmacy` GET/POST + `segment-preview` reuse for radius coverage; add `/api/notifications/bedtracker-alerts` GET reading `bed_tracker_alerts` joined `bed_tracker_facilities`; add `/api/notifications/best-time` GET over the new RPC; broadcast POST via `campaigns` with `is_broadcast` + `segment_filter`.
3. **Hooks:** extend existing fetches into `hooks/api-calls/useNotifications.ts` (TanStack Query per tab), `useBroadcast.ts`, `usePharmacyCampaigns.ts`; optimistic read-marking with rollback.
4. **UI rebuild:** extend page to 7 tabs + `?tab=` sync; BroadcastDialog (react-hook-form + zod; target counts live from `segment-preview`; schedule picker); All Log DataTable with delivery columns right-aligned/tnum (Part Q), masked user targets (K5), failed-row highlight + Resend; Scheduled split from Campaigns with Cancel (confirm); Pharmacy Marketing tab = Leaflet radius map (Leaflet already in bundle — resolves Part L's L-D5 map question by precedent) + performance card + campaign DataTable; BedTracker tab = alert DataTable cross-linking Part L; Best Time = 3 segment cards with Progress bars + recommendation tiles (data from RPC; empty state until volume exists).
5. **Interconnections:** Settings → Notifications tab (Part P) toggles write `notification_automation_rules` consumed here; BedTracker (Part L alerts feed the BedTracker tab); IBP/Med Enquiry (pharmacy availability events trigger campaigns per the 4-rule footer); Medication Reminder (reminder-driven sends); Marketing (Part M campaigns can dispatch via broadcast composer); Billing (payment-failure SMS — deferred transactions source, K-D7); Admins (MFA-required in-app alerts row per mockup).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| R-D1 | Delivery tracking granularity | Per-row `delivered_at`/`opened_at` on `notifications` + campaign `delivery_stats` rollup on read — no external provider webhooks yet |
| R-D2 | Best Time data source | Live RPC over `notifications.opened_at` (honest zero until volume); do NOT use Epic 30.1 `analytics_events` (still unbuilt) |
| R-D3 | BedTracker tab source | Read-view over Part L's `bed_tracker_alerts` — no duplicate table |
| R-D4 | Pharmacy geo enforcement | Enforce the 4 send-rules server-side in the campaign route; radius stored per campaign; map read-only preview |
| R-D5 | Broadcast segment counts | Reuse `segment-preview` POST synchronously in the dialog (debounced) |
| R-D6 | Scheduled tab | Filter view over `notification_campaigns` (`status=scheduled`), not a new entity |
| R-D7 | Export Log | CSV streamed from the filtered GET — server-side, respects active filters |

---

## Part S — KPI & Card Alignment System (cross-cutting) (✅ Implemented)

**Scope:** all KPIs and cards across every page — text/icon alignment, no offshoot text outside cards, no oversized cards, no misaligned typography inside cards — implemented as one consistent system.

**Codebase state — audit results (quantified):**
- **155 `<KpiCard>` usages across ~35 files** built on [components/redesign/KpiCard.tsx](components/redesign/KpiCard.tsx) — the kit exists and has good bones (`h-full w-full min-w-0`, `truncate` label, loading/error/empty states, 10 colour variants).
- **Icon split is the biggest visual defect: 112 KpiCards use emoji strings (`icon="📊"`) vs 42 lucide components.** Emoji metrics vary per OS/font → inconsistent baselines and widths inside the `size-9` tile, and they clash with Part Q's professional Inter system.
- **KpiCard's own typography violates Part Q:** label is `text-[10px] font-black uppercase tracking-[0.1em]`, value is `text-2xl sm:text-3xl font-black tracking-tighter`, delta badge `font-extrabold` — i.e. weight 900/800 where the brief caps at 600.
- **Grid anarchy: 23 distinct column variants** across dashboard pages (`grid-cols-1` ×160, `grid-cols-2` ×68, `md:grid-cols-2` ×66, … up to `xl:grid-cols-7` and `xl:grid-cols-8` ×1 each). No shared breakpoint ladder → KPI rows collapse and stretch differently on every page (the "oversized cards" symptom).
- **Number formatting inconsistent:** only 90 `toLocaleString` call sites; KpiCard renders whatever string/number it's passed → ungrouped digits, jittering widths, no `tabular-nums` (Part Q).
- **Overflow risk:** 68 fixed `w-[Npx]`/`min-w-[…]` usages in dashboard pages; only 59 `truncate`/`line-clamp` sites; long values (e.g. currency strings) can push card boundaries on narrow columns.
- Card surface is otherwise healthy: 41 shadcn `<Card>` usages, only 5 ad-hoc raw-div stat cards — convergence already happened; this part polices consistency rather than rebuilding.

**Gaps:**

| # | Gap |
|---|-----|
| S1 | 112 emoji-icon KpiCards — misaligned glyph metrics, unprofessional vs Part Q brief |
| S2 | KpiCard internal weights 800/900 — violates 400/500/600 cap; 10px labels below legible floor |
| S3 | 23 grid variants, no KPI breakpoint ladder → stretched/oversized cards per page |
| S4 | No value formatting contract — no grouping, no tnum, raw values can overflow card |
| S5 | Long labels/values: label truncates but value has no overflow guard (`break-words`/clamp missing) |
| S6 | 68 fixed-pixel widths + 5 ad-hoc stat cards bypass the kit |
| S7 | No icon-size contract (lucide icons passed at varying sizes into the same `size-9` tile) |
| S8 | Card padding/height drift on the 41 shadcn `<Card>` sites (p-0…p-8 variants, unequal heights in mixed rows) |

**Proposed system**

1. **`KpiGrid` component** (`components/redesign/KpiGrid.tsx`) — the only sanctioned KPI-row container; one responsive ladder: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (default), `variant="wide"` → `lg:grid-cols-3`, `variant="six"` → `xl:grid-cols-6`; uniform `gap-4`; auto `items-stretch`. All 23 ad-hoc variants migrate to these three.
2. **KpiCard typography → Part Q contract:** label `text-xs font-medium text-muted-foreground` (drop uppercase micro-labels); value `text-[22px] font-semibold leading-tight tnum break-words`; delta badge `font-medium text-2xs`. Icon tile stays `size-9`.
3. **Icon contract:** new `KpiIcon` helper enforcing lucide at `size-4.5` (18px) inside the tile; a codemod pass swaps the 112 emoji icons to a fixed lucide mapping (📊→BarChart3, 👥→Users, ⚠️→AlertTriangle, 💳→CreditCard, 🛏️→BedDouble, etc.); ESLint rule bans new `icon="<emoji>"` on KpiCard.
4. **Value contract:** `formatKpiValue(value, { compact?: boolean })` util — `toLocaleString("en-GH")` grouping, compact notation (`Intl.NumberFormat notation:"compact"`) when a value exceeds the card's safe width (prevents offshoot), currency prefix `₵`; KpiCard applies `tnum` + `break-words` so nothing escapes the card boundary.
5. **Card polish:** equal heights enforced via `items-stretch` + `h-full` (already in KpiCard; extend to content cards); card padding standardised to `p-5` (KpiCard) / `p-4` table-in-card; the 5 ad-hoc stat cards and 68 fixed-px widths converted to fluid `min-w-0` grid children.
6. **Mockup parity:** mockup KPI cards = value + label + delta chip + ⋮ menu — KpiCard already models all four; the system above only normalises their rendering, so no mockup feature is lost.

**Rollout across all pages:**
1. Ship `KpiGrid` + `KpiIcon` + `formatKpiValue` + KpiCard typography update (1 PR — instantly affects all 155 sites via the shared component).
2. Per-page grid migration to `KpiGrid` (mechanical; folded into Parts H–R implementations as each module is rebuilt; standalone sweep for already-implemented modules: Dashboard, Users, Chats, Admins, Medication, Reviews, Tasks, Transactions).
3. Emoji→lucide codemod in the same module sweeps (pairs with the existing mojibake fix pass — same files).
4. ESLint guards: no new emoji KpiCard icons, no new fixed-px card widths, no raw `grid-cols` on KPI rows.

**Interconnections:** Part Q (typography/weight/tnum tokens — S is Q's first consumer), Parts H–R module rebuilds (each consumes KpiGrid), dashboard home hub (KpiCard `href` deep links), DataTable (same numeric-formatting contract), dark mode (icon-tile `bg-*-50` backgrounds need `.dark` variants — folded into Part Q token work).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| S-D1 | Grid ladder | Three sanctioned variants (4/3/6 cols) via `KpiGrid`; everything else requires explicit sign-off |
| S-D2 | Emoji→lucide migration | Fixed mapping table + codemod; reviewed per module sweep |
| S-D3 | Label style | Drop ALL-CAPS 10px micro-labels → `text-xs font-medium` sentence case |
| S-D4 | Overflow strategy | `break-words` + compact notation over truncation for values (never hide digits); labels keep `truncate` |
| S-D5 | Value size | Fixed 22px semibold (no responsive jump `text-2xl→3xl` — the jump causes cross-page height mismatch) |
| S-D6 | Migration order | Shared components first (instant global effect), then per-module sweeps alongside Parts H–R |

---

## Part T — WhatsApp Community (✅ Implemented)

**Scope:** mockup "WhatsApp Community" surface = the **WhatsApp tab inside the Fitness page** (L5709–5788), the **Bulk Broadcast modal** `m-whatsapp-broadcast` (L11007–11019), the **Groups modal** `m-whatsapp-groups` (L11022–11038), and the "WhatsApp Support" number field in Settings/Platform (L9722, folded into Part P). No standalone WhatsApp sidebar page exists in the mockup — it is a Fitness community channel + a Super-Admin broadcast capability.

**Mockup inventory**

| Component | Contents |
|-----------|----------|
| KPI row (4) | Community Members 842 (+28/wk), Active Groups 5, Messages Sent 12.4K (+8%), Avg Open Rate 68% (+3%) |
| Fitness Groups table | 6 cols: Group (emoji + subtitle), Members, Type (Challenge/Community/Event/Gym/Wellness), Last Message, Status (Active/Low Activity), Actions (View/Broadcast/Settings) + “+ New Group” |
| Quick Broadcast card | Target group select (incl. “All Fitness Groups (1,348)”), Broadcast Type (Announcement/Event Reminder/Challenge Update/FitCoins Reward/Safety Alert/Motivation), Message textarea, Send Now / Schedule / Preview / Attach Media |
| Recent Broadcasts table | 8 cols: Sent, Group, Type, Preview, Sent To, Open Rate %, Status, Actions (View/Resend) + Export |
| Super Admin Commands | 6 buttons: Bulk Broadcast, Manage Groups, Engagement Report, Connect WhatsApp API, Export Members, Auto-Reply Rules |
| Bulk Broadcast modal | Broadcast Name, **Template ID (Meta-approved only)**, Target Audience (All WhatsApp Opt-ins/Premium/Facility Owners/HCP Network), Message ≤1024 chars, Media URL, compliance alert (“Meta-approved templates; custom needs 24h approval”) |
| Groups modal | 5-col table: Group Name, Members, Linked To (Admin Panel/HCP Module/IBP Module/User Segments), Status (Active/Paused), Actions + Create New Group |

**Codebase state:** **zero WhatsApp implementation** — no pages, routes, components, tables, or migration mention “whatsapp” anywhere in `app/`, `components/`, `lib/`. This is the single largest remaining greenfield gap. Supabase Edge Functions infrastructure already exists (`deploy-chat-edgestoVercel` pattern), and a `supabase/functions/notify` hook exists that the notification system already consumes.

**Gaps:**

| # | Gap |
|---|-----|
| T1 | No WhatsApp data model at all (groups, broadcasts, templates, opt-in consent) |
| T2 | No channel abstraction — Part R `notifications.channel` enum needs a `whatsapp` value so the same delivery pipeline serves both |
| T3 | Meta Business API integration absent (template registry, send, delivery/receipt webhooks) — external API, audit-only per convention |
| T4 | No consent/opt-in field or audit trail (GH Data Protection Act — WhatsApp marketing needs recorded consent) |
| T5 | No permission keys (`whatsapp.view/broadcast`); broadcast is Super-Admin-scoped in mockup |
| T6 | Fitness tab slot: `/fitness` page needs the 8th tab wired to new data |

**Enhancement suggestions — connectivity strategy**

1. **Channel-abstracted delivery (the spine).** Extend Part R’s plan: `notifications.channel` = `push | whatsapp`; one Broadcast Composer (Part R `m-broadcast`) with a Channel picker — WhatsApp selected only for opt-in segments, and only resolvable to an approved template. This makes WhatsApp a **channel of the existing notifications architecture, not a parallel silo** — reuse campaigns, scheduling, delivery tracking, and analytics RPCs.
2. **New tables** (migration `20260821_whatsapp_community.sql`): `whatsapp_groups` (name, type, linked_to enum, member_count, status), `whatsapp_group_members` (user_id FK, joined_at, left_at), `whatsapp_templates` (meta_template_id, name, language, status CHECK approved/pending/rejected, category, synced_at), `whatsapp_broadcasts` (name, template_id FK, audience_filter jsonb, message, media_url, scheduled_at, sent_at, status, delivery_stats jsonb, created_by), plus `user_profiles.whatsapp_opt_in boolean + whatsapp_opt_in_at` consent stamp.
3. **Meta integration via Edge Function** (`supabase/functions/whatsapp-send`): server route enforces RBAC + template-status check → Edge Function calls Meta Cloud API with credentials held **only** in Edge secrets; inbound webhook writes delivery receipts back to `whatsapp_broadcasts.delivery_stats`. Credentials never reach the admin panel (aligns with Part P key hygiene).
4. **Consent-first targeting:** audience selectors query only `whatsapp_opt_in = true`; the opt-in toggle lives on the Users detail page (Part B interconnect) and records timestamp + source for GH-DPA auditability.
5. **Super-Admin Commands** map to: Bulk Broadcast → channel-aware composer; Manage Groups → groups modal as `/fitness?tab=whatsapp` sub-view; Engagement Report → Part R analytics RPC with `channel='whatsapp'` filter; Connect WhatsApp API → Settings/Integrations card (Part P `platform_integrations` row for Meta Business Account ID); Export Members → CSV; Auto-Reply Rules → defer (Phase 2, needs inbound message storage).
6. **Fitness-tab KPIs** served by a `get_whatsapp_stats()` RPC over the new tables (same pattern as other Fitness tab RPCs).

**Phasing:** P1 schema + consent field + groups CRUD (read/view only); P2 broadcast composer channel picker + Edge Function send + delivery receipts; P3 analytics/engagement report + export; Auto-Reply deferred. Permission keys: `whatsapp.view` (Content/Ops) + `whatsapp.broadcast` (Super Admin) — matches the mockup’s Super-Admin-only command card.

**Interconnections:** Part R (channel enum, broadcast composer, delivery tracking — WhatsApp is R’s second channel), Part B Users (opt-in toggle), Part J Fitness (8th tab), Part P Settings (Meta integration card + support number), Part S (KpiGrid for the 4 KPIs), AI Hub (future: AI-suggested broadcast copy via recommendations).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| T-D1 | Architecture | Channel inside the notifications pipeline, NOT a standalone module/silo |
| T-D2 | Placement | Fitness tab (mockup parity) + Super-Admin broadcast entry from Notifications; no separate sidebar item |
| T-D3 | Meta API | Edge Function with secrets; admin panel never stores Meta tokens (Part P hygiene) |
| T-D4 | Templates | Registry synced from Meta; queue-time enforcement — no approved template, no send |
| T-D5 | Consent | `whatsapp_opt_in` + timestamp on user_profiles; segments filter opt-ins only (GH-DPA) |
| T-D6 | Auto-Reply Rules | Defer to Phase 2 — requires inbound message storage first |

---

## Part U — DevOps Menu Visibility (✅ Implemented)

**Question:** should the DevOps cluster (Cloud Infrastructure / CI-CD Pipeline / Application Security / Rate Limiting / Caching & CDN) be visible in the admin panel?

**Facts:** the mockup contains all 5 as **read-only monitoring dashboards** (L10323–10445). The codebase has **zero** DevOps pages/routes. Parts H–T assigned none of them to any role; `m-roles` assigns “Everything” only to Super Admin.

**Recommendation: hide from the default navigation; gate behind a permission.**

1. These pages add **zero business-user value** — they are operational telemetry for engineers. Showing them to Content/Ops/Support admins only adds clutter and attack surface (infra details, IP whitelists, cache topology are sensitive).
2. **Mechanism (zero-cost given existing architecture):** add one permission key `devops.view`, assign it to **Super Admin only** (optionally a future DevOps role). `navigation-config.ts` already filters the sidebar via `useHasPermission` (Epic 31), so the cluster simply never renders for everyone else — and the middleware/route guard blocks direct URL access. **No hiding hacks, no dead code — just an unassigned-by-default key.**
3. **Scope limit:** implement only as read-only dashboards fed by live sources (Supabase/Vercel status, Edge Function metrics, rate-limit counters from the API layer). **No write controls** (no restart/scale/cache-purge buttons from the admin panel) — infra mutations stay in Vercel/Supabase consoles. If live sources prove unavailable during implementation, downgrade further: don’t build the pages at all, link out to consoles (audit-only precedent).
4. **Alternative considered:** remove from the mockup scope entirely. Rejected only because the permission-gated approach keeps mockup parity at near-zero cost; if T-D-level sign-off prefers trimming scope, deleting the cluster from Parts H–U is equally valid.

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| U-D1 | Visibility | Hidden by default; `devops.view` key → Super Admin only (sidebar filter + route guard) |
| U-D2 | Scope | Read-only monitoring; no infra mutation controls ever in the admin panel |
| U-D3 | Build priority | Last of all parts — after H–T; drop entirely if live telemetry sources unavailable |
| U-D4 | Data source | Live status endpoints first; static/mock content is not acceptable for infra dashboards |

---

## Part V — Fitness Menu (`#page-fitness`, mockup L4813–6043) (✅ Implemented 2026-08-21)

*Full-menu analysis added 2026-08-20. Parts F.3 (Outdoor) and T (WhatsApp tab) already covered those two tabs in depth; this part completes the picture for the remaining 10 tabs.*

### V.1 Mockup inventory (12 tabs + 20 modals)

Header: Export · **+ Exercise** (`m-add-exercise`) · **+ Route** (`m-add-route`) · **+ New Plan** (`m-add-plan`). Page KPI strip (6): Fitness Users, Active Plans, Live Challenges, Exercises Library, FitCoins Issued, AI-Generated Plans.

| # | Tab | Mockup content |
|---|-----|----------------|
| 1 | 📊 Dashboard | 4 mini-stats (Active Today / Avg Streak / Avg Plan Completion / AI Plans Active) · **Top Challenges** · **Most Used Plans** · **FitCoins Leaderboard** (medals) · **Top Exercises by Usage** (progress bars) · **Quick Actions** (Add Exercise / Create Plan / New Challenge / Add Trainer / Broadcast Challenge / Archive Old Logs `m-archive-logs`) |
| 2 | 🏋️ Exercises | Toolbar: search + **6 selects** (Category / Muscle Group / Difficulty 1–5 / Goal Tags / Tier / Status) + Export CSV + Add. Table: #, Name+desc, Category, Muscle Groups, Equipment, Difficulty ⭐, Sets·Reps, Rest, Tier, Featured, Status, Actions (Edit/View/Attach/Copy/Deactivate) |
| 3 | 📋 Plans | Table: Plan Name, Type, **Profile Hash**, Tier, Level, Days/Wk, Weeks, Users, Compl.%, **AI Cost**, Status, Actions · AI generate (`m-ai-plan`) |
| 4 | 🏆 Challenges | Table: Challenge, Type, **Origin**, Goal, Dates, Participants, Completions, Compl.%, Reward, Status, Actions · modals `m-add-challenge`, `m-ai-challenge`, leaderboard/challenge admin |
| 5 | 👤 Fitness Users | Table (13 cols): User, Tier, Body Type, Experience, Goals, Current Plan, Streak, Workouts, FitCoins, Plan %, AI Calls, Last Active, Actions |
| 6 | 👨‍🏫 Trainers | Table: Trainer, Title, Credentials, **Documents**, Specialisations, Experience, Location, Plans, Users, Avg Rating, Verified, Featured, Actions · `m-add-trainer`, `m-review-trainer` (document verification) |
| 7 | 📅 Schedule & Notifications | **Weekly Workout Schedule Heatmap** (7×3 grid, intensity legend) · Delivery funnel: Workout Reminder 91%/63%/42%, Streak Alerts 78% · **Notification Log (24h)** table (Type/Sent/Delivered/Opened/Action) · Preferred Time Slots bar · **Super Admin Commands**: Schedule Overview / Notification Stats / View User Schedule / Edit Notif Templates / Send Bulk Reminder / Bulk Reschedule ⚠️ / Maintenance Mode ⚠️ / Peak Load Report / A/B Test ⚠️ |
| 8 | 🤖 AI Studio | 3-step wizard: ① Context Input (type, difficulty, duration, FitCoin budget, target tier, theme, instructions) → ② **Platform Insights auto-injected** (top exercise, most active day, popular goal, avg streak, dominant body type, last challenge compl.%) → ③ Review 3 AI concepts (AI Score, tags, reward) → **Use & Publish / Edit First**; Super Admin approval gate; cost note $0.04–0.08/gen |
| 9 | 📝 AI Log | **Monthly AI Budget** card (used/limit + bar) · KPIs: Total Calls / Successful / Failed / Total Tokens · 4 cost-breakdown chips by call type · Filters: Type / Triggered By / Status / Model + Export · Table: Call ID, Type, Triggered By, Entity ID, Model, Tokens In, Tokens Out, Cost, Latency, Date, Status, Actions (**Retry** on failed) |
| 10 | 🌳 Outdoor | *(fully analyzed in Part F.3)* |
| 11 | 📱 Health Integrations | KPIs: Connected Users / Steps Synced (24h) / Active Wearables / Failed Syncs · **Connected Platforms** table (Platform, Users, Status, Last Sync, Data Types, Actions) + `m-add-health-platform` · **Sync Health** progress bars (HealthKit / Health Connect / wearable-only / permission revoked) · Platform Settings (auto-sync frequency, toggles, historical backfill) · **Recent Sync Failures** table (User, Platform, Error, Failed At, Retries, Actions) — GH-DPA note |
| 12 | 💬 WhatsApp | *(fully analyzed in Part T; implemented 2026-08-20)* |

Modals referenced: `m-add-exercise`, `m-add-route`, `m-add-plan`, `m-add-challenge`, `m-add-trainer`, `m-archive-logs`, `m-ai-plan`, `m-ai-challenge`, `m-review-trainer`, `m-schedule-templates`, `m-schedule-bulk`, `m-add-health-platform`, `m-whatsapp-broadcast`, `m-whatsapp-groups`, `m-verify-route`, `m-add-group-event`, `m-view-participants`, `m-add-outdoor-challenge`, `m-manage-leaderboard`, `m-route-incentives`.

### V.2 Codebase current state

**Page** `app/(dashboard)/fitness/page.tsx` — all 12 tab IDs registered with `?tab=` sync; header KPI row fed by `get_fitness_dashboard_kpis` RPC (`useFitnessDashboardKpis`).

**Implemented tabs (9):** `DashboardTab` (Top Challenges ✅, FitCoins Leaderboard ✅, Top Exercises ✅, Quick Actions ✅ — **"Most Used Plans" card missing**), `ExercisesTab` (search + table + add/view dialogs; **no 6-filter toolbar, no CSV export**), `PlansTab` (add/view/AI-generate dialogs ✅), `ChallengesTab` (add/view ✅; no AI-challenge/leaderboard modals), `UsersTab` (**4 generic columns only** — User Profile / Activity / Engagement / Status), `TrainersTab` (add/view ✅; `m-review-trainer` absent), `ScheduleTab` (**hard-coded mock heatmap + mock stats — not live data**), `OutdoorTab` (feature-complete per F.3), `WhatsAppTab` (implemented Part T).

**Placeholder tabs (3):** `ai_studio`, `ai_log`, `health` render "Coming Soon" panels — yet the schema for all three already exists (see below).

**Dialogs (18)** in `_components/`: add/view for exercise, plan, challenge, trainer, outdoor route/event/review, AI generate plan, event participants, verify route, user search select.

**API routes (4):** `/api/fitness/generate`, `/generate-admin`, `/outdoor-incentives`, `/outdoor-routes/[id]/verify`.

**Schema — already present in `full-tables.sql` (no new tables needed for most of V):** `fitness_exercises`, `fitness_users`, `fitness_plans` + `fitness_plan_exercises`, `fitness_challenges` + `fitness_challenge_participants` + `fitness_challenge_teams`, `fitness_trainers`, `fitness_content_schedule`, `fitness_ai_campaigns` + `fitness_ai_calls` (model_name, response_time_ms, token_usage, estimated_cost, status success/error/timeout), `fitness_health_platforms` + `fitness_health_sync_logs`, `fitness_leaderboards`, `exercise_sessions` / `exercise_logs` / `exercise_views`, `fitness_dashboard_cache`, outdoor trio + incentives.

**Permissions:** `fitness.view/create/edit/delete` already in catalog + ROLE_DEFAULTS (admin/content_manager). Schedule bulk ops & AI publish map to existing super-admin-only pattern; no new keys strictly required (optional: `fitness.ai_publish`, `fitness.schedule_admin` if finer gating wanted).

### V.3 Gap matrix

| Tab | Status | Gap |
|-----|--------|-----|
| Dashboard | 🟡 80% | Missing "Most Used Plans" card (data: `fitness_plans` join count) |
| Exercises | 🟡 60% | Add 6 filter selects (map to existing columns), CSV export, tier/featured columns |
| Plans | 🟢 90% | Add Profile Hash + AI Cost columns (schema check: `fitness_plans` columns) |
| Challenges | 🟢 85% | Origin column + `m-ai-challenge` link into AI Studio |
| Fitness Users | 🔴 40% | Rebuild table to 13 mockup columns from `fitness_users` + `exercise_logs` aggregates |
| Trainers | 🟢 85% | Documents column + `m-review-trainer` verification dialog |
| Schedule | 🔴 20% | Mock data → live: heatmap from `fitness_content_schedule`/`exercise_sessions`, funnel + log from notification delivery (Part R columns), commands wired to real actions; super-admin commands gated |
| AI Studio | 🔴 placeholder | 3-step wizard over `fitness_ai_campaigns` + `/api/fitness/generate-admin`; insights step = live aggregates; publish gate = super_admin |
| AI Log | 🔴 placeholder | Budget card + cost chips + log table over `fitness_ai_calls`; Retry action re-invokes generation; monthly budget constant/settings |
| Health | 🔴 placeholder | Platforms table over `fitness_health_platforms`, failures over `fitness_health_sync_logs`, settings card (write gated super_admin), GH-DPA compliance note |

### V.4 Phasing

- **P1 (quick wins):** Dashboard "Most Used Plans" card; Exercises filter toolbar + CSV export; Plans/Challenges/Trainers column completion; Fitness Users 13-column rebuild.
- **P2 (data-live):** Schedule tab rewire to live tables + super-admin command gating.
- **P3 (AI + Health):** AI Log (read-side, cheap) → AI Studio wizard → Health Integrations tab.

**Interconnections:** Part S (KpiGrid six for page strip), Part R (notification funnel reuses delivered_at/opened_at), Part O AI Hub (AI Log shares cost-audit pattern), Part T (WhatsApp tab already here), Part F.3 (Outdoor tab already done).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| V-D1 | AI monthly budget source | Constant in settings table (`platform_settings`) vs hard-coded $20 default — recommend settings row, super_admin editable |
| V-D2 | Health platform registry | Admin-curated table (mockup parity) — real HealthKit/Health Connect ingestion is mobile-side; admin tab is registry + sync-failure monitoring only |
| V-D3 | Schedule heatmap source | `exercise_sessions` week-grid aggregation RPC vs `fitness_content_schedule` — recommend sessions (real behaviour) with schedule as overlay |
| V-D4 | AI Log Retry | Re-runs generation against live provider (cost incurred) → gate to `fitness.edit` + confirm dialog |
| V-D5 | Fitness Users columns | Derived aggregates (Streak, Plan %, AI Calls) via RPC not per-row client joins — table is 8K+ rows |

---

## Part W — Admin Profile Modal (top nav bar) (✅ Implemented 2026-08-21)

*Analyzed 2026-08-20. Mockup: `m-profile` modal L10500–10578, triggered by the top-bar user chip (`tb-user`, L1704). Codebase: `components/redesign/modals/ProfileModal.tsx` (116 lines), opened from the sidebar-footer dropdown in `NewAdminDashboardShell.tsx`.*

### W.1 Mockup inventory

**Trigger (top nav bar, right side):** avatar initials `FN` + name `Francis N. Mensah` + sub-line `Superadmin · 4OL-000001` + chevron → opens `m-profile`.

**Modal structure (modal-lg):**

1. **Header:** 👤 Admin Profile · subtitle `Name · Role · 4OL-ID`
2. **Hero card:** large initials avatar · name · `Super Administrator · 4 Our Life` · 3 badges: Role pill, `ID: 4OL-000001`, `✅ MFA Active`
3. **Last Login block:** `Today, 09:14 AM` + `IP: 196.168.1.42`
4. **Personal Information** (editable → Save Profile): First Name · Last Name · Email Address · Phone Number · Role (locked) · **Department** · **Location**
5. **Security & Access:**
   - Read-only stats: Account Status (`✅ Active`) · MFA Status (`✅ Enabled (TOTP)`) · **Active Sessions** (`1 device`) · **Login Streak** (`24 days`) · Account Created
   - Change Password + Confirm Password inputs → **Update Password**
   - **Reconfigure MFA** button
   - **Admin Permissions** checklist (6 fixed items): Full platform access / Manage all admins / Billing & GRA data / Security & audit logs / API key management / Maintenance mode control
6. **Recent Activity (Your Account)** table: Action | Page / Module | IP Address | Time (last 4 events: Logged In, Updated Settings, Approved Facility, Viewed Transactions)
7. **Footer:** Close · **⏻ End Other Sessions** · 💾 Save Profile

### W.2 Codebase current state

**Trigger misplacement:** the mockup's trigger is the **top nav bar user chip**; the codebase's top-right header avatar is an **inert `<Avatar>` with no onClick** (L546). The modal is only reachable from the **sidebar footer dropdown** (Profile / Settings / Log out).

**ProfileModal.tsx — what exists:** hero card with role/ID/MFA badges ✅ · Personal Information as **read-only inputs** (first, last, email, phone, role) · Security card with Account Status, MFA Status, Account Created, Last Login ✅ · Update Password / Reconfigure MFA buttons (**dead, no handlers**) · Save Profile → `alert("Profile updates coming soon")`.

**Missing vs mockup:** Department + Location fields · Last Login **IP** · Active Sessions count · Login Streak · password change form (working) · MFA reconfiguration (working) · Admin Permissions checklist · Recent Activity table · **End Other Sessions** · editable personal info + working Save.

**Structural issue:** the modal reads `user_profiles` directly via the **browser Supabase client** (`getSupabaseBrowserClient().from('user_profiles').select('*')`) — RLS-dependent, inconsistent with the Epic-31/Parts-H–U convention where all admin data flows through `requireAdminApiUser` server routes.

### W.3 Tech infrastructure available (no greenfield needed)

| Need | Existing asset | Gap |
|------|---------------|-----|
| Profile fields | `user_profiles`: first/last name, phone, email (auth), avatar_url, role, admin_role, status, created_at, `last_login_at`, `mfa_enabled`/`mfa_verified_at`, `whitelisted_ips` | No `department` / `location` columns |
| Last Login + IP | `admin_sessions` (ip_address, user_agent, started_at) + `start_admin_session` RPC (epic 11) called from `DashboardWrapper.tsx` via sessionStorage token lifecycle | `last_login_at` is **never written anywhere** (no trigger, no writer) |
| Active Sessions | `admin_sessions where is_active and admin_id = self` — already queried by `/api/admin/security-overview` (gated `security.view`) | No self-service route |
| End Other Sessions | `end_admin_session(token, reason)` RPC + `/api/admin/session` DELETE — but **only ends the caller's own single token** | Need `end_other_admin_sessions(p_admin_id, p_keep_token)` RPC |
| Recent Activity | `admin_activity_logs` (admin_id, action_type enum, target_table, description, ip_address, created_at) + `log_admin_activity` RPC (epic 11) — already written by some routes (e.g. `/api/period/data`) | No self-scoped read route (`/api/security/audit-logs` reads `activity_logs`, requires `security.view`) |
| Permissions checklist | `/api/admin/me` returns effective permission keys (null = super_admin) | Map keys → the 6 mockup buckets client-side |
| MFA | `mfa_enabled` flag, Part P SecurityTab `mfa_required` toggle, `/api/security/settings` advertises `mfa_methods: ["totp"]` | **No actual TOTP enroll/verify flow anywhere** — flag is currently cosmetic |
| Password change | `requires_password_change` flag, `actions/user.actions.ts` uses `auth.admin.updateUserById` | No self-service route; `updateUserById` **bypasses current-password verification** |

### W.4 Structural proposal

**One modal, five guarded endpoints (self-service = any authenticated admin, no new permission keys):**

1. `GET /api/admin/profile` → allowlisted profile fields + last_login_at + last login IP (latest `admin_sessions` row) + active session count + MFA status + account created. Replaces the browser-client read.
2. `PATCH /api/admin/profile` → allowlist **only** `first_name, last_name, phone_number, department, location`; server rejects role/status/permissions/email (email change goes through Supabase auth email-confirmation flow, separate control). Writes `log_admin_activity('profile_updated')`.
3. `POST /api/admin/profile/password` → re-authenticate with current password (see W.5) then `updateUserById`, then end other sessions with reason `password_change` (the enum value already exists), set `requires_password_change = false`.
4. `POST /api/admin/profile/end-other-sessions` → new RPC `end_other_admin_sessions(p_admin_id, p_keep_session_token)`; logs `security`-severity activity row.
5. `GET /api/admin/profile/activity?limit=10` → caller's own `admin_activity_logs` rows only (`eq admin_id = auth.user.id`, server-enforced — never client-side filtering).

**Migration (`20260821_admin_profile_extension.sql`):** `alter table user_profiles add column if not exists department text, add column if not exists location text` · `end_other_admin_sessions` RPC (service_role only) · extend `start_admin_session` to set `user_profiles.last_login_at = now()` (fixes the never-written column).

**UI:** extend `ProfileModal.tsx` section-by-section to W.1 using existing shadcn Dialog/Input/Badge/Table primitives (drop the hand-rolled overlay for Dialog consistency with Parts H–U dialogs). **Wire the top-bar avatar to open the same modal** (mockup parity) while keeping the sidebar-footer dropdown entry. Permission checklist = read-only chips derived from `/api/admin/me` — mutations stay on the Admins/Roles pages (Epic 31 boundary).

### W.5 Security recommendations

1. **Move all reads/writes behind `requireAdminApiUser`** — the current browser-client `select('*')` leaks the entire `user_profiles` row (whitelisted_ips, notes, login_attempts) to the client; the server route returns only the allowlisted projection.
2. **Password change must verify the current password.** `updateUserById` does not — the route must first `signInWithPassword` (email + current password) in a throwaway check or use Supabase Auth's rate-limited update flow; otherwise a hijacked logged-in browser changes the password with zero friction.
3. **Honest session revocation limit:** `admin_sessions` is our audit ledger, but Supabase JWTs cannot be revoked before expiry. "End Other Sessions" must therefore also set `requires_password_change`/invalidate via short JWT expiry policy — document this as audit-grade invalidation + forced re-login, not cryptographic revocation. (Same caveat applies to Part P security actions.)
4. **Self-scoped activity only:** the profile activity route must never accept an `admin_id` parameter; it is hard-bound to the authenticated caller. Cross-admin logs stay behind `security.view` (`/api/security/audit-logs`).
5. **MFA = Supabase Auth MFA (built-in TOTP)** via `supabase.auth.mfa.enroll/challenge/verify` — no hand-rolled TOTP secret storage in our DB; `user_profiles.mfa_enabled` mirrors factor status. If sign-off prefers deferring, the Reconfigure MFA button shows the honest disabled state (Part T-D6 precedent).
6. **IP capture reuse:** the `getClientMeta` pattern from `/api/admin/session` (x-forwarded-for first hop + user-agent) is the single source of truth for login IP display.

**Alignment with recent parts:** RBAC guard pattern (Epic 31/H–U) · Part P (SecurityTab `mfa_required` becomes enforceable once real TOTP exists; settings_change_log unchanged) · Part S (no KPIs here — modal) · Part U (no devops surface) · shared conventions (zod schemas in `schemas/`, TanStack Query hook in `hooks/supabase-calls/useAdminProfile.ts`, sonner toasts, additive migration + full-tables.sql reconciliation).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| W-D1 | Trigger placement | Wire the top-bar avatar chip (mockup parity) AND keep the sidebar-footer dropdown — both open the same modal |
| W-D2 | Data access | All modal data via the 5 guarded server routes; remove browser-client `select('*')` |
| W-D3 | MFA implementation | Supabase Auth MFA (TOTP) — no custom secret storage; defer = honest disabled button if sign-off prefers |
| W-D4 | Password change | Server route with current-password re-auth + auto end-other-sessions (reason `password_change`) |
| W-D5 | Login Streak | Derived from consecutive-day `admin_sessions` starts (90-day window); honest `—` when history insufficient — no mock data |
| W-D6 | Permissions checklist | Read-only, derived from `/api/admin/me` mapped to the 6 mockup buckets; editing stays on Admins/Roles |
| W-D7 | Department/Location | Add nullable columns (additive migration) — free-text, no enum vocabulary yet |

---

## Part X — Compact (Density) Mode & Tablet Responsiveness (✅ Implemented 2026-08-21)

*Analyzed 2026-08-20. Mockup: density button `ts-density-btn` (top bar, L1702), compact CSS L793–807, responsive tiers L194–195 + L828–863. Codebase: **no density mode exists** — legacy `components/redesign/Topbar.tsx` has a dead density button imported nowhere; `NewAdminDashboardShell.tsx` has no toggle.*

### X.1 Mockup inventory

- **Toggle:** top-bar button ⇄ `body.ts-compact` class; `ts-active` state styling.
- **Compact rules (all `!important` overrides):** table cells `td 6px 12px / .75rem` · `th 7px 12px` · KPI cards `.sc 13px`, value `1.3rem` · card header `10px 16px` / body `13px 16px` · page header margin `16px` · KPI grid gap `10px` · buttons `30px` height.
- **Responsive tiers:** ≤1400px 6-KPI grid → 3 col · ≤1100px 2-col grids → 1 · **≤1024px (tablet):** grids step down, tables gain `overflow-x: auto` touch-scrolling · **≤767px (mobile):** sidebar becomes off-canvas drawer + bottom nav, density button **hidden**, all grids → 1–2 col.

### X.2 Codebase current state

- Density toggle: **absent** (dead legacy button only). No persistence, no CSS hook.
- Responsiveness: solid base already — sidebar `collapsible="icon"`, `KpiGrid` ladders (1/2/4|6), DataTable `MobileCardConfig` card fallback, Part Q Inter/root-layout work.
- Gaps: no automatic tablet adaptation of density; no per-user preference; tab triggers still use fixed `text-[10px]/[11px]` scales in places (Part Q contract applies).

### X.3 Proposal — token-based density (not class-spam)

The mockup's approach (global `!important` overrides) doesn't translate to Tailwind 4 + shadcn. Implement density as **CSS custom properties** — the same mechanism Part Q used for dark mode:

1. **`[data-density="comfortable|compact"]` on `<html>`** redefining spacing tokens: `--row-py`, `--card-p`, `--kpi-value-size`, `--control-h`, `--grid-gap`. Shared primitives (DataTable rows, Card, KpiCard, Button size maps) consume the tokens once → every page follows automatically, zero per-page edits.
2. **Dynamic tablet behavior (the core request):** a `useDensity` hook — `matchMedia('(max-width: 1024px)')` **auto-switches to compact** on iPad/tablet viewports (768–1024px: iPad portrait 768/834, landscape 1024/1180/1194) and back when resized up; an explicit user choice (header toggle) **overrides and persists** in `localStorage` (`4ol-density`). iPad gets compact-by-default without any tap.
3. **Sidebar:** auto-collapse to icon mode below `lg` (SidebarProvider `defaultOpen={false}` + `matchMedia`), manual override retained.
4. **Table contract by breakpoint:** ≥1280px full table · 768–1279px compact table (token-driven) with horizontal touch scroll · <768px existing `MobileCardConfig` card view. No density toggle rendered <768px (mockup parity).
5. **Enhancements beyond mockup:** org-wide default density as a `platform_settings` key (super_admin, Part P pattern) with per-user override winning · keyboard shortcut `Ctrl/Cmd+Shift+D` · modals/drawer panels exempt from ultra-tight spacing · **touch-target floor: compact mode may reduce visual padding but never below 44px hit areas** (Apple HIG) — critical for iPad · `prefers-reduced-motion` already honored in the panel, keep transitions out of density switching.

**Security:** none (pure UI) except the optional settings key follows Part P `settings.security`/change-log convention.

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| X-D1 | Auto-compact threshold | ≤1024px auto-compact; user override always wins and persists |
| X-D2 | Mechanism | CSS custom properties + `data-density` attribute (Part Q dark-mode pattern), never per-component `!important` |
| X-D3 | Org default | Optional `platform_settings.default_density` (super_admin); per-user localStorage wins |
| X-D4 | Touch targets | Compact never drops below 44px hit areas on ≤1024px viewports |
| X-D5 | Legacy Topbar.tsx | Delete (dead code, unimported) |

---

## Part Y — Platform Schematic Visibility & Auto-Update (✅ Implemented 2026-08-21)

*Analyzed 2026-08-20. Mockup: `page-schematic` L2749–2876; permissions matrix L2080 grants it to **Super Admin only** (+ Developer row L10879 "Security, Schematic, Settings, AI Hub (read)"). Codebase: `app/(dashboard)/schematic/page.tsx` + nav entry.*

### Y.1 Is it necessary for all admins? **No.**

- **Mockup content is sensitive competitive material:** full system architecture (gateway/WAF topology), tech stack, **business model pricing** (consumer ₵25/mo, facility ₵150/mo, transaction fees), and the 2025–2027 roadmap. Mockup's own matrix shows only Super Admin sees it.
- **Codebase drift:** nav entry uses `permission: "dashboard.view"` — held by **8 roles**, so every admin currently sees it. The page itself is a different (useful) thing: **live health telemetry** via `/api/health` (API status, Supabase latency, env-configured service map) + a 4-node architecture map.
- **Security finding:** `/api/health` is **unguarded** — no `requireAdminApiUser`. Any visitor to the deployed admin URL can read the service/env-configuration map (which integrations are configured). This must be fixed regardless of the visibility decision.

### Y.2 Recommendation

1. **Keep the page, gate it Super Admin-only** — new key `schematic.view` (super_admin-only in ROLE_DEFAULTS, no ROLE_DEFAULTS entry = invisible to all else), nav entry re-pointed to it. Identical mechanism to Part U `devops.view`; the two pages are siblings in the "engineering telemetry" cluster. Developers needing it later get the key via RBAC override — no code change.
2. **Guard `/api/health`** with `requireAdminApiUser("schematic.view")` (sole consumer is the schematic page — verified).
3. **Auto-update = derive, never hard-code.** The mockup's static HTML sections go stale by design; every section should be generated from live sources so the page updates itself:
   - *Architecture + service health* → already live (`/api/health` + `/api/devops/health` overlap — merge data sources, keep one page)
   - *Tech stack* → derived from `package.json` at build time (name+version table; zero maintenance)
   - *Permissions/RBAC map* → derived from `PERMISSION_CATALOG`/`ROLE_DEFAULTS` (already in `lib/permissions.ts`)
   - *Schema/migration state* → migration file count + latest timestamp from `supabase/migrations`
   - *Business model & roadmap* (if kept) → `platform_settings` keys editable by super_admin under Settings (Part P change-log applies) — not JSX literals
   - *Version stamp* → build metadata (`VERCEL_GIT_COMMIT_SHA` / build time) in the page header
4. **No mutation controls** on the page (Part U-D2 precedent) — Export PDF / Share from the mockup stay read-side (client print-to-PDF is sufficient).

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| Y-D1 | Visibility | `schematic.view`, super_admin-only (Part U pattern); delete `dashboard.view` assignment |
| Y-D2 | `/api/health` | Auth-guard immediately (current state leaks env-config map) |
| Y-D3 | Business/roadmap content | Move to `platform_settings` (super_admin editable) or drop from the page entirely — never static JSX |
| Y-D4 | DevOps overlap | Keep both pages; schematic = architecture/stack identity, devops = live queues/telemetry |

---

## Part Z — Delete Account Requests Menu (✅ Implemented 2026-08-21)

*Analyzed 2026-08-20 (first full analysis — no prior Part covered this menu). Mockup: `page-delete-account` L12909–13071 + sidebar entry with badge L1678. Codebase: `app/(dashboard)/delete-account-request/` (page + 3 components), nav + permissions, Epic 21 migration.*

### Z.1 Mockup inventory

- **Header:** Export Log · Copy Public Link · **+ Manual Entry**; policy banner citing Google Play/App Store compliance + public form URL `https://4ourlife.com.gh/delete-account`.
- **KPI strip (5):** Pending Review / In Verification / In Grace Period / Completed / Cancelled.
- **Tab — All Requests:** filters (Status, Reason) + Export; 12-col table: Request ID, User, User ID, Phone, Plan, Reason, **Data Download**, Submitted, Grace End, Status, per-status actions (Verify / Process / Remind Download / Resend OTP / Contact User / Process Now).
- **Tab — Pending:** 5-business-day review SLA banner; table with Days Waiting; actions **Prompt Download**, **Begin Grace Period**.
- **Tab — Grace Period:** auto-purge warning; Grace Start, Scheduled Deletion, Days Remaining; action **Outreach**.
- **Tab — Completed:** "41 accounts deleted" summary + GH-DPA erasure statement + **12-month compliance log retention**; masked phone; Processed By; per-row View Log.
- **Tab — Settings & Policy:** Public Form URL (Copy/Open) + App Deep Link + live-check banner; **Deletion Policy Settings:** Grace Period (days), OTP Expiry (minutes), Auto-process after grace (yes/no), Prompt data download (yes/no), Cancellation reminders (7d/3d/none), Compliance Log Retention (6/12/24 months).

### Z.2 Codebase current state (stronger foundation than it looks)

**Already built:** nav entry gated `deleteaccount.view` with 5 child links · permissions `deleteaccount.view/approve` in catalog + defaults · page with 5 tabs + `?tab=` sync · **KPIs live** via `get_delete_account_request_stats()` RPC · **Epic 21 migration**: 5-state CHECK vocabulary, `grace_period_started_at`, `expire_delete_account_grace_periods()` anonymization RPC (deliberately scoped to `user_profiles` only — `auth.users` email erasure explicitly deferred), **pg_cron daily schedule already wired** (`20260812_schedule_delete_account_grace_expiry.sql`) · user-facing submission route hardened (server-derived user_id, duplicate guard) · Users menu has a parallel `DeleteRequestsTab`.

### Z.3 Gap matrix

| # | Gap | Severity |
|---|-----|----------|
| 1 | Pending / Grace / Completed tabs **all render the same unfiltered `AllRequestsTab`** — status filtering never wired | 🔴 Core |
| 2 | Tab labels hard-code counts "Pending (4)" / "Grace Period (3)" — must come from stats RPC | 🔴 |
| 3 | **Zero admin mutation routes** — no Verify / Begin Grace / Process Now / Cancel / Prompt Download endpoints; `deleteaccount.approve` is granted but never enforced anywhere | 🔴 Core |
| 4 | Table: 5 columns vs mockup's 12 (no Request ID, Phone, Plan, Data Download, Grace End, Days Remaining); row actions are `console.log` | 🔴 |
| 5 | Header buttons dead: Export Log, Copy Public Link, Manual Entry | 🟡 |
| 6 | Settings tab = static text stub; no `platform_settings` keys; grace window **hard-coded `INTERVAL '30 days'`** inside the expiry RPC | 🟡 |
| 7 | Hook reads via **browser Supabase client** (RLS-dependent) — same structural breach as Part W; should move behind a guarded route | 🟡 |
| 8 | No data-export/download flow despite `data_export_url` column | 🟡 |
| 9 | Completed tab must mask PII (mockup does: `+233 27 *** 5540`) — server-side masking, not CSS | 🟡 Security |
| 10 | Public deletion form (`https://4ourlife.com.gh/delete-account`) is a **cross-repo dependency** (mobile/web app) — admin panel can only surface the URL setting | ℹ️ |

### Z.4 Implementation proposal

1. **One guarded list route** `GET /api/delete-account-requests?status=&reason=&page=` (`deleteaccount.view`) replacing the browser-client hook; server joins `user_profiles` name/phone/plan, **masks phone in response for completed rows**.
2. **One action route** `PATCH /api/delete-account-requests/[id]` (`deleteaccount.approve`) with zod action enum: `verify → begin_grace → process_now | cancel | remind_download | resend_otp`. State-machine enforcement server-side (only legal transitions per Epic 21 lifecycle); every transition writes `admin_activity_logs` (severity `warning` for irreversible ones) + sets `reviewed_by/reviewed_at`. `begin_grace` also revokes login (existing `setUserAuthBan` path) and stamps `grace_period_started_at`.
3. **Tabs become thin filters** over the one hook (status param); tab counts from the stats RPC.
4. **Settings tab** → `platform_settings` keys (`deletion_grace_days` default 30, `deletion_otp_expiry_mins`, `deletion_auto_process`, `deletion_prompt_download`, `deletion_reminders`, `deletion_log_retention_months`) behind Part P change-log; **parameterize the expiry RPC** to read `deletion_grace_days` instead of the hard-coded interval (small additive migration).
5. **Export Log** reuses Part R's CSV pattern (`notifications.export` precedent → new `deleteaccount.export` key, admin defaults).
6. **Manual Entry** dialog gated super_admin (edge case: support-assisted requests), inserts with `status='pending_review'` + audit row.
7. **Irreversibility guards (mandate-aligned):** `process_now` and auto-purge surface double-confirm dialogs; the page shows next scheduled purge date + affected count from the cron state so admins always see what will happen automatically.

**Open decisions:**

| # | Decision | Recommendation |
|---|----------|----------------|
| Z-D1 | Tab architecture | Single guarded list route + status param; delete the 3 duplicated tab renderings |
| Z-D2 | Actions | One PATCH route, server-enforced state machine, audit-logged; `deleteaccount.approve` finally enforced |
| Z-D3 | Grace period | Configurable via `platform_settings.deletion_grace_days`; expiry RPC parameterized |
| Z-D4 | PII | Phone/identity masked server-side for completed + exported rows (GH-DPA) |
| Z-D5 | Manual Entry | Keep but super_admin-only (mockup parity), or drop — recommend keep-gated |
| Z-D6 | `auth.users` email erasure | Stays deferred per Epic 21's explicit warning — separate reviewed migration + legal sign-off |
| Z-D7 | Public form | Cross-repo (mobile/web); admin panel stores/validates the URL setting only |

---

## Part AA - Transactions Menu (`page-transactions`, mockup L8913-9266) (✅ Implemented 2026-08-22)

**Mockup scope:** header date-range + Export Report; 4 KPI cards (Total Transactions / Revenue / Customers / Gross Profit); Revenue Analytics area chart + Payment Methods donut; main transactions table with Type filter (Subscription Fee / IBP Service Fee / Product Sale / Marketing Fee / Refund / Payout), More filter (Failed Only / Pending Only / High Value >₵500), Import/Export and user#xxxx vs IBP-xxxxx/FAC-xxxxx entity split; 6 sub-tabs — Service Charge % (SA-only rates editor), Subscriptions (consumer KPIs: Renewals/New/Upgrades/Churn), Failed (attempts + Notify/Retry), Refunds (approval workflow + New Refund), Tax & VAT (GRA 17.5% consumption tax + 25% income tax, TIN, quarterly filings), Expenses (SA-only cost buckets + P&L).

**Pre-build codebase state:** the 7-tab shell + `?tab=` URL sync existed but every surface was hardcoded mock data except SubscriptionsTab (which read legacy facility subscriptions), and **zero** `/api/transactions` routes existed. RBAC keys `transactions.view/manage/export` were already in the catalog (finance_admin holds all three).

### What was built

1. **Unified ledger** — migration `20260822_transactions_ledger.sql` (additive, re-runnable): `transactions` (category, direction, amount, status, payer_class **user|business**, payer_user_id/payer_business_id, entity_kind **consumer|ibp|facility**, plan_key, txn_type_detail, source/source_id, fee tracking), `refunds` (pending_approval workflow), `service_charge_rates` (seeded with the 6 mockup rates), `tax_filings` + `finance_config` (GRA TIN), `operational_expenses`, `finance_visibility_config` (10 metric keys), RPC `get_transactions_overview()` (service-role), new catalog keys `transactions.expenses` + `transactions.rates` (no role grants ⇒ super-admin-only), and idempotent backfill from `user_subscriptions` (non-free tiers) + `escrow_transactions` (product sales + platform fees).
2. **10 RBAC-guarded routes** under `/api/transactions*`: ledger list (segment/category/status/date/high-value/search filters), overview (with server-side metric masking), row actions (retry/dispute/cancel), refund request + refund queue + approve/reject (approve is SA-only and writes the outgoing ledger row), rates GET/PUT (PUT SA-only), tax summary + filing updates (remit SA-only), expenses GET/POST/PUT (hard SA-only), visibility config GET/PUT (SA-only). All audit-logged to `activity_logs`.
3. **Hook layer** — `hooks/supabase-calls/useTransactions.ts`: typed list/overview/refund/rate/tax/expense/visibility queries + mutations with sonner toasts and query invalidation.
4. **UI depth (all 7 tabs re-based onto real data):** KPI cards, revenue area chart and payment-method donut now render from the overview RPC with `🔒 Hidden by Super Admin` empty states; Recent tab gains the Business-vs-User segmented control, Type/More filters, debounced search, server pagination, CSV export and row actions (View dialog / Retry / Refund / Dispute); Service Charge tab wires the SA-only rates editor + fee revenue; Subscriptions tab shows consumer subscription payments with Renewals/New/Upgrades/Churn KPIs + plan/type filters; Failed tab shows the at-risk banner + attempts/Notify/Retry; Refunds tab implements the approval queue + New Refund dialog; Tax & VAT renders ledger-computed GRA liability + quarterly filings + CSV report; Expenses tab is SA-only with cost-bucket bars, P&L, add-expense dialog and the Metric Visibility governance dialog.

### Business vs User filtering (requirement)
`payer_class` (user|business) + `entity_kind` (consumer|ibp|facility) are indexed ledger columns. The Recent tab's segmented control (`All / 👤 Users / 🏢 Businesses`) drives `?segment=` server-side; KPIs, charts and exports segment automatically because they aggregate the same ledger. Deep links supported: `/api/transactions?payer=<uuid>` plus `?segment=` allow Users/IBP/Facilities menus to jump straight into a payer's money trail.

### Super-Admin metric visibility governance (requirement)
`finance_visibility_config` stores per-metric toggles; the SA manages them via the **🔐 Metric Visibility** dialog (Expenses tab). Enforcement is **server-side**: `/api/transactions/overview` nulls masked fields and flags `<metric>_hidden` for non-SA callers; `/api/transactions/tax` masks the liability summary the same way. Expenses/P&L/rate editing are hard-SA (permission keys with zero role grants), so they can never leak regardless of toggles.

### Decisions applied (recommended defaults)

| # | Decision | Outcome |
|---|----------|---------|
| AA-D1 | Ledger storage | New `transactions` table (not a view) — supports refunds/fees/status lifecycle |
| AA-D2 | Paystack | Ledger accepts `source='paystack'` now; live gateway integration deferred |
| AA-D3 | Expenses source | Manual SA entry (seeded May-2026 buckets matching the mockup) |
| AA-D4 | GRA figures | Computed from the ledger (17.5% on subscriptions, 25% on service fees); filings are manual records |
| AA-D5 | Never-exposable | Expenses, P&L, net profit and rate editing are hard super-admin surfaces |
| AA-D6 | Import | CSV export shipped; CSV *import* deferred (needs column-mapping dialog) |

### Manual step for the user
- Apply `supabase/migrations/20260822_transactions_ledger.sql` to the live Supabase DB. All UI degrades gracefully pre-migration (empty states / 403-locked SA tabs).

---

## Part AB — Medication Enquiry (admin `page-medenquiry`, mockup L7012–7210 + mobile `medication-enquiry-mockup.html`) (✅ Admin depth implemented 2026-08-22 · mobile screens deferred per M-D9)

**Admin mockup scope:** header Export + Settings; Business Logic banner (Free Tier / Premium / Escrow Payment / Pickup-Delivery); Connected Menus bar (Pharmacies · HCP Prescribers · Users · Escrow Transactions · Notifications · IBP Wholesalers); 4 KPI cards (Total Enquiries 30d / Pending-Unmatched / Escrow Active + ₵ held / Match Rate); **6 tabs** — All Enquiries (search + Type With-Rx/OTC/HCP-Rx + 7 statuses + Tier filters, 12-col table incl. Best Price + distance + prescription badge, actions View/Copy/Alert/Escrow), Pending (elapsed-hours SLA, Broadcast to pharmacies / Notify User), Escrow (Release/Refund), Delivery (driver, distance, Track/Confirm), Pharmacy Responses (per-pharmacy/IBP performance: responses, avg response time, availability rate, fulfilled, rating), Disputes (user claim vs pharmacy claim, Release to Pharmacy / Refund User). Sidebar: parent badge `8` + 4 children with tab deep-links.

**Pre-build codebase state:** nav has a single `/medenquiry` item (`medication.view`) with **no children/badge**; the page is a 4-tab placeholder shell (All/Pending/Escrow/Delivery) — mockup's Pharmacy Responses + Disputes tabs, KPIs, banner and actions all missing. Four orphan `PlaceholderPage` stubs at `/medication-enquiry[/pending|escrow|delivery]` (IA duplication). **Zero** API routes touch `medication_enquiries`/`escrow_transactions`; no hooks.

### Existing infrastructure (build is largely wiring)
- `medication_enquiries` table exists and is rich: user, prescription_id, medication name/desc, dosage, quantity, urgency (normal/urgent/emergency), status (pending/confirmed/processing/shipped/delivered/cancelled/rejected), `pharmacy_id` FK → `facility_profile`, delivery address/GPS/status enum, tracking/courier/ETA/proof, payment fields, `escrow_id` FK, insurance, + `drug_id` FK (Part B catalog).
- `escrow_transactions` covers Escrow + Disputes tabs outright: amount, `escrow_status` (pending/held/released/refunded/disputed/resolved), held/released/refunded timestamps, `released_to`, `platform_fee`, full dispute column set.
- Part AA already backfills the ledger from `escrow_transactions` and seeds the 4.5% `med_enquiry` service rate; Part B ships `drugs` catalog + `pharmacy_campaigns` + PharmacyCampaignModal (Broadcast reuse); Part J ships `hcp_verifications.can_respond_enquiries` and defers J-D4 counters to this build.

### Schema gaps (migration `2026082x_med_enquiry_depth.sql`)
1. **`enquiry_responses`** (new): enquiry_id FK, responder facility/IBP, price, available, accepted, responded_at — powers Best Price, Match Rate, Pharmacy Responses tab.
2. `medication_enquiries` adds: `enquiry_type` (with_rx/otc/hcp_request), `hcp_prescriber_id` FK → `hcp_verifications`, `prescription_url` (storage), `fulfilment_mode` (pickup/delivery), `pickup_confirmation_code`, plus mobile submission fields from the mobile mockup: `unit` (tablets/capsules/bottles/…), `search_radius_km`, `search_area_mode` (current/custom), `custom_area`, `notify_on_availability`.
3. Status vocabulary extended to the mockup set (Pending Match / Matched / In Escrow / Pickup Ready / Delivery in Progress / Completed / Cancelled).
4. RPC `get_med_enquiry_overview()` (KPIs, match rate, escrow held, pharmacy performance) with Part AA's graceful `{error}` degradation.
5. Catalog keys `medenquiry.view` / `medenquiry.manage` (SQL + `lib/permissions.ts` mirror).

### RBAC proposal
`medenquiry.view` → admin, finance_admin, support_agent · `medenquiry.manage` (broadcast/notify/confirm) → admin · Escrow Release/Refund gated via existing `transactions.manage` (finance_admin + SA; writes Part AA ledger rows incl. the 4.5% fee) · **dispute resolution super-admin only** (refund-approval precedent).

### Interconnections
Transactions AA (ledger writes on release/refund, fee at seeded 4.5%, disputes deep-link `/transactions?tab=refunds`) · Medication Reminder B (shared `drug_id` autocomplete + verification flow; Broadcast → `pharmacy_campaigns` + Epic-27 notifications; reminder Pharmacy-Notif eligibility keyed on confirmed responses) · HCP J (`can_respond_enquiries` routing; unlocks J-D4 counters; HCP-Rx enquiry rows show prescriber) · Facilities H / IBP C (responder profile links, performance feeds ratings) · Notifications R (status campaigns) · Map F (delivery GPS, distance display) · Users C (submitter links with Part B privacy-masking convention).

### Mobile rollout analysis (`medication-enquiry-mockup.html`, future app update — 4OL Mobile Plasence)
**Mockup content:** "Find Medication" submission form — medication name (required, wired to the Part B `search_drugs` autocomplete), dosage, quantity + unit selector (9 units), 3-way urgency picker (Low/week, Medium/48h, High/today — maps to the DB's `normal/urgent/emergency`), prescription photo capture with encrypted-storage privacy note, Search Area (current GPS vs custom location), radius slider 1–20 km, "notify me when available" checkbox, submit → search; HealthMiles promo card (pickup-via-app-directions reward → FitCoins linkage). **Discrepancy flagged:** the mockup's bottom nav shows the IBP/business layout (Home/My Business/Finance/Marketing/More); the consumer rollout must use the consumer tab bar. *(Confirmed by product owner 2026-08-22: the IBP bottom nav in this mockup was a mockup mistake — ignored.)*
**Mobile connectivity audit:** 4OL Mobile Plasence has **zero** enquiry code today (only a schema snapshot in a stray `.sql` file); connectivity arrives via the shared API surface (`${API_URL}/api/...` served by this admin repo's `app/api` — same pattern as fitness/search/chat), Supabase Storage for prescription uploads, and the existing expo-notifications pipeline for "notify when available".
**Menu positioning recommendations (consumer):**
1. **Primary:** a hidden tab-bar screen group `(tabs)/FindMedication/` mirroring the `(fitness)` pattern (`href: null`) — keeps the 5-visible-tab bar intact while giving the feature a route home: `index` (form), `results` (response comparison sorted by price×distance), `enquiry-detail` (status timeline: matched → escrow paid → pickup code / delivery tracking), `history`.
2. **Entry points:** "💊 Find Medication" tile in the Home quick-actions row (next to Top Rated); a contextual CTA inside Reminders (`MedicationList`) — "need to refill? find it nearby" (highest-intent audience, shares the drug catalog); Pharmacy facility-profile action "Ask for availability"; Map tab pharmacy pin action.
3. **IBP/pharmacy side:** enquiry inbox card in `(ibpTabs)/index` with respond-with-price-and-availability flow feeding `enquiry_responses` (this is what populates the admin Pharmacy Responses tab).
**Mobile UX enhancements:** urgency-driven SLA copy + push reminders; responses screen with best-price highlight and distance badges; escrow explainer before payment (funds held until confirmation); pickup confirmation code screen with QR; delivery tracking timeline reusing `delivery_status`; HealthMiles awarded on confirmed pickup (FitCoins integration); Rx-photo client-side compression; plan-gating notice (FAQ #10: Starter+) with upgrade deep-link; offline-friendly draft state for the form.

### Decisions to confirm before implementation

**All decisions M-D1–M-D9 confirmed by product owner 2026-08-22 ("proceed with recommendations and implement all") and implemented as recommended.**

| # | Decision | Recommendation |
|---|----------|----------------|
| M-D1 | Duplicate `/medication-enquiry` stubs | Delete + redirect to `/medenquiry` (mockup id `page-medenquiry`; nav audit agrees) |
| M-D2 | `enquiry_responses` | Create table now, Pharmacy Responses UI Phase 2 — schema-first keeps the mobile contract stable |
| M-D3 | Escrow Release/Refund | finance_admin + SA via existing `transactions.manage` (no new key) |
| M-D4 | Dispute resolution | Super-admin only |
| M-D5 | Prescription storage | `prescription_url` column + Supabase Storage bucket (no prescriptions table) |
| M-D6 | Drivers | `courier_name` + metadata jsonb now; dedicated drivers table deferred |
| M-D7 | Status vocabulary | Extend CHECK to the mockup's 7 states |
| M-D8 | Mobile positioning | Hidden `(tabs)/FindMedication` group (fitness pattern) + Home tile + Reminders CTA; consumer tab bar, not the IBP nav shown in the mockup |
| M-D9 | Mobile rollout timing | Admin depth first (this part); mobile screens a future update on `feat/fitness-mockup-parity`, consuming the same `/api/medenquiry` surface |

### Implementation evidence (admin depth, 2026-08-22)
- **Migration** `supabase/migrations/20260822_med_enquiry_depth.sql`: `medication_enquiries` columns (enquiry_type, hcp_prescriber_id, prescription_url, fulfilment_mode, pickup_confirmation_code, unit, search_radius_km, search_area_mode, custom_area, notify_on_availability, delivery_distance_km) with legacy backfill; status CHECK swapped to the 7 mockup states with legacy mapping; `enquiry_responses` table (+RLS on, no policies); catalog keys `medenquiry.view`/`medenquiry.manage` seeded for admin/finance_admin/support_agent; `get_med_enquiry_overview()` SECURITY DEFINER RPC (KPIs + pharmacy_performance) revoked from public and granted to service_role only.
- **API routes** `app/api/medenquiry/*`: list (filters q/type/status/tier, privacy-masked submitter names, server-derived best price/response counts), overview + pharmacies (RPC wrappers with Part AA graceful `{ok:true, empty:true}` degradation), `[id]` GET/PATCH (notify_user/mark_pickup_ready/confirm_delivery/cancel + audit log), `[id]/broadcast` (pending_match only, regional pharmacy selection capped at 25 → `pharmacy_campaigns`), `[id]/escrow` PATCH (release/refund behind `transactions.manage`, ledger writes with `med_enquiry` fee rate), disputes GET + disputes/[id] PATCH (super-admin-only verdict + ledger writes).
- **Hooks** `hooks/supabase-calls/useMedEnquiry.ts` (query + mutation layer, sonner toasts, invalidation).
- **UI** `app/(dashboard)/medenquiry`: 6 tabs (All / Pending / Escrow / Delivery / Pharmacy Responses / Disputes) with URL-as-source-of-truth, Business Logic banner, Connected Menus chips, 4 KPI cards, Export; DataTable + MobileCardConfig everywhere; double-confirm dialogs with reason for Release/Refund and dispute verdicts; elapsed-time SLA highlighting on Pending.
- **Nav/IA**: `/medenquiry` children deep-links + `medenquiry.view` permission; duplicate `/medication-enquiry[/pending|escrow|delivery]` stubs replaced by redirects (M-D1); `lib/permissions.ts` catalog + ROLE_DEFAULTS mirror updated.
- **Facilities ↔ Medication Enquiry linkage (2026-08-22)**: list route gains a `pharmacy=<facility_id>` filter (UUID-validated) and returns `pharmacy_id` + facility embeds; `/medenquiry?pharmacy=` shows a clearable filter pill (with facility-profile shortcut) on the All tab and survives tab switches; facility profile dialog gains a 🔬 Med Enquiries button for pharmacy/IBP types; enquiry detail dialog exposes a clickable Matched Pharmacy card and per-response facility links (shared `FacilityViewDialog` mounted on the medenquiry page); Pharmacy Responses leaderboard rows deep-link to both the facility profile and the filtered enquiry ledger; `get_med_enquiry_overview()` now returns `pharmacy_id` per performance row.
- **Pending user action:** apply `20260822_med_enquiry_depth.sql` to the live DB (UI degrades gracefully until then).

---

## Part AC — App Reviews & Periodic Rating Popup (Reviews menu "App" target, mockup L6674–6767) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22 as part of the Reviews & Ratings menu mapping. Mockup: `page-reviews` filter bar includes **Target: All / Facility / Doctor / Service / App** and explicit "4OL App · App Review" rows; Flagged tab shows Flag Reason / Flagged By; Pending tab shows account-age auto-approval rules. Codebase pre-build: `/reviews` had 3 facility-only tabs, 4 KPI cards via `get_review_kpi_stats`, and **all row actions were `console.log` stubs**; the mobile app had facility reviews (`CommentInput.tsx` star flow → direct client insert into `facility_reviews`, no RLS) and a manual Settings "Rate App" store deep-link with placeholder store IDs — no table, no RPC, no periodic prompt on either side.*

### What was built (Strategy A — "Gate & Route" in-app modal)

1. **Migration `20260822_app_reviews.sql`** (additive, re-runnable): `app_reviews` table (rating 1–5 CHECK, optional comment, `app_version`, `platform`, `prompt_source`, `status review_status default 'pending'`, `admin_note`, `reviewed_at`); `user_profiles.last_review_prompt_at` throttle column; RLS enabled with admin-only SELECT/UPDATE policies (user write path is RPC-only); 5 SECURITY DEFINER RPCs — `get_app_review_prompt_state()` (account ≥30 days + no prompt/review in 30 days), `submit_app_review()` (server-enforced 30-day re-review cap), `record_app_review_prompt('shown'|'dismissed'|'submitted')`, `admin_moderate_app_review()` (epic30 `is_app_admin()` gate), `get_app_review_kpi_stats()` (30-day deltas). All REVOKE-public + granted to authenticated/service_role.
2. **Admin UI — 📱 App Reviews tab** on `/reviews` (`?tab=app`, existing `reviews.view` permission, no new catalog keys): 4 KPI cards (Total + monthly delta / Avg Rating / Pending / Low ≤2★ support pool), status filter pills + feedback search, DataTable with reviewer, stars, feedback, platform/version badge, status, date; **live moderation actions** (✅ Approve / 🚩 Reject with confirm dialog) wired to `admin_moderate_app_review` — the first real mutations on the Reviews menu. Pre-migration shows a dedicated "apply 20260822_app_reviews.sql" error card (graceful degradation, `retry: false`). Hooks in `hooks/supabase-calls/useAppReviews.tsx`.
3. **Mobile — periodic monthly popup** (4OL Mobile Plasence): `lib/store-links.ts` extracts the Settings store deep-link into one shared helper (`openAppStoreReview`, env-driven store IDs with web fallback); Settings "Rate App" refactored onto it. `components/rate-app/RateAppModal.tsx` — stars + comment → `submit_app_review` RPC → sentiment routing: **≥4★ thank-you + store deep-link** (public store stays the real review surface), **≤3★ comment becomes required and routes to the internal support funnel** (Contact Support mailto). `components/rate-app/RateAppPromptController.tsx` — mounted in `app/(app)/_layout.tsx` next to PromotionModal; evaluates once per session per user, 8s settle delay, AsyncStorage mirror (`4ol_last_review_prompt_at`) skips the RPC within the month, server is authoritative, stamps the throttle clock on show (dismissed modal still counts as the month's prompt), `analytics_events` tracking (`rate_prompt_shown/dismissed`, `review_submitted`), silent degradation offline/pre-migration. Guardrails: never during onboarding/auth (enabled only after profile load, no forced password change).

### Decisions applied (R-D1–R-D5 confirmed by product owner 2026-08-22 — "Proceed and implement")

| # | Decision | Outcome |
|---|----------|---------|
| R-D1 | Popup strategy | Strategy A — in-app gate-and-route modal (Strategy B OS-native + C remote-config deferred as complements) |
| R-D2 | Throttle authority | Server-side (`user_profiles.last_review_prompt_at` + `app_reviews` history); AsyncStorage mirror only for offline skip |
| R-D3 | ≤3★ routing | In-app feedback funnel — required comment stored in `app_reviews` + Contact Support mailto; never pushed to the store |
| R-D4 | Admin scope | App-slice first — 📱 App Reviews tab with real moderation; Doctor/Service targets + facility-stub wiring + flag reasons deferred |
| R-D5 | Re-review cadence | Allowed every 30 days (matches popup cadence); server enforces the cap |

### Manual steps for the user
- Apply `supabase/migrations/20260822_app_reviews.sql` to the live Supabase DB — admin tab shows an explanatory error card until then; mobile popup simply never fires.
- Set real store IDs in mobile env: `EXPO_PUBLIC_APPLE_APP_ID`, `EXPO_PUBLIC_ANDROID_APP_ID` (currently placeholders; the ≥4★ store CTA falls back to the web store page until set).

### Remaining gaps (documented, not blocking)
- Facility-review row actions on the other tabs remain `console.log` stubs (no moderation RPC for `facility_reviews`); `facility_reviews` still has **no RLS** and mobile inserts client-side (RBAC-bypass pattern to close later).
- Mockup's Doctor/Service targets, bulk actions, Flag Reason/Flagged By audit columns, account-age auto-approval banner, and the `get_review_kpi_stats` average-rating drift between `KPIs.sql` and the migration version are still open.

---

## Part AD — Global Search (S-D) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22. Pre-build: admin `/api/search/dynamic` returned unfiltered table rows (PII leak) and was still referenced by dead mobile hooks (`use-dynamic-search.ts`, `use-search-results.ts`); the live DB had ghost `global_search` / `admin_global_search` RPCs never captured in any migration; search analytics did not exist.*

### What was built

1. **Migration `20260822_global_search_v2.sql`** (additive, re-runnable): `global_search_v2` SECURITY DEFINER RPC — trigram + `ts_rank` hybrid over **conditions, symptoms, healthy_living_info (with legacy-column fallback), facility_profile (active only, no PII columns), drugs**; search analytics (`search_executed` / `search_zero_results`) logged inside the RPC; ghost `global_search` / `admin_global_search` captured via pg_proc-guarded `DO` blocks so live definitions are never overwritten.
2. **Admin:** `/api/search/dynamic` rewritten to return **410 Gone** (deprecation + PII leak closed).
3. **Mobile (4OL Mobile Plasence):** single `hooks/use-global-search.ts` (`useGlobalSearch`, 300 ms debounce, min 2 chars, stale-request guard) that tries `global_search_v2` and **falls back to legacy `global_search` pre-migration**; recent searches persisted in AsyncStorage; Home screen rewired onto the hook with a Recent Searches dropdown; dead hooks deleted.

### Decisions applied (S-D1–S-D5 confirmed by product owner)

| # | Decision | Outcome |
|---|----------|---------|
| S-D1 | Search scope | conditions, symptoms, healthy_living_info, facility_profile (active, no PII), drugs; jobs/FAQs skipped |
| S-D2 | Legacy endpoint | `/api/search/dynamic` → 410 Gone |
| S-D3 | Ranking | trigram + ts_rank hybrid in one SECURITY DEFINER RPC |
| S-D4 | Analytics | logged inside the RPC (search_executed / search_zero_results) |
| S-D5 | Ghost RPCs | captured in migration, pg_proc-guarded |

### Manual steps for the user
- Apply `supabase/migrations/20260822_global_search_v2.sql` — mobile silently uses the legacy RPC until then.

---

## Part AE — Top Rated Placement Windows (T-D) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22. Pre-build: Top Rated items went live the moment they were added with no scheduling; `search_top_rated_items` was granted to anon; the admin page had stub UI (no CSV export, no table search, dead View buttons, fake totals, no delete confirmation, N+1 module-count queries); mobile ignored expiry and had unstable sort ties.*

### What was built

1. **Migration `20260822_top_rated_placement_windows.sql`** (additive, re-runnable): `publish_from` / `expire_at` columns on `top_rated_items`; trigger-based snapshot refresh on window changes; anon revoked from `search_top_rated_items`.
2. **Admin `/top-rated`:** window status chip column (active/scheduled/expired via `getTopRatedWindowStatus`), status filter + debounced table search, real totals, AlertDialog delete confirmation (subscription-sourced rows protected), View deep-links per module (`/facilities`, `/fitness?tab=outdoor`, `?tab=challenges`, `?tab=exercises`, `?tab=plans`), Export CSV; Add dialog gained `publish_from`/`expire_at` datetime inputs; N+1 module counts replaced by a single client-counted query.
3. **Mobile:** `use-top-rated.ts` + `useTopRatedFacilities` apply lazy window filters (`expire_at` null-or-future, `publish_from` null-or-past) with a plain-query fallback pre-migration, plus `added_at` desc sort tiebreaker.

### Decisions applied (T-D1–T-D5 confirmed by product owner)

| # | Decision | Outcome |
|---|----------|---------|
| T-D1 | Module scope | keep the 6 existing modules |
| T-D2 | Scheduling | placement windows + lazy expiry + status chip + Expired filter (no live countdown/slot rotation) |
| T-D3 | Snapshot | trigger-based refresh |
| T-D4 | Page stubs | Export CSV, search, View links, real totals, AlertDialog, N+1 kill — all done |
| T-D5 | Access | anon revoked; mobile sort tiebreaker aligned |

### Manual steps for the user
- Apply `supabase/migrations/20260822_top_rated_placement_windows.sql` — mobile filters fall back gracefully until then.

---

## Part AF — Encyclopedia Library Uncapping (L-D) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22. Pre-build: Diseases / Symptoms / Healthy Living libraries paginated letter and category browsing at 20 rows, hiding the rest behind a Load More button that also **replaced** instead of appended in search mode; list queries selected heavy JSONB columns.*

### What was built (mobile only — 4OL Mobile Plasence)

- `use-condition.ts` / `use-symptom.ts` / `use-healthy-living.ts`: letter and category branches now load the whole bounded slice in one shot (`MAX_LIBRARY_ROWS = 500`, `hasMore: false` auto-hides Load More); search stays paginated but returns rows **cumulatively** (`.range(0, page*limit-1)`) so Load More appends (L-D4); column projections (L-D2): conditions `id, name, slug`, symptoms `id, name`, healthy living `id, name, slug, description, image_url`. No screen changes needed — the Load More button hides itself for letter/category and appends for search.

### Decisions applied (L-D1–L-D5 confirmed by product owner)

| # | Decision | Outcome |
|---|----------|---------|
| L-D1 | Uncap | letter + category uncap; search stays paginated |
| L-D2 | Projection | list-only columns (no heavy JSONB) |
| L-D3 | Row cap | MAX_LIBRARY_ROWS = 500 |
| L-D4 | Load More | dead path removed; cumulative range fixes replace-vs-append |
| L-D5 | Scope | Diseases, Symptoms, Healthy Living |

---

## Part AG — Map Hardening + Outdoor Route Pins (M-D) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22. Pre-build: `get_facilities_map` was NOT SECURITY DEFINER, PUBLIC/anon-callable, trusted the caller's `p_status` (null enumerated Rejected/Pending facilities), never escaped ilike wildcards, and had **zero** rate limiting (mobile bypasses the admin API); `facility_profile` had no RLS policies in any migration; the mobile map showed facilities only — no outdoor route pins.*

### What was built

1. **Migration `20260822_map_hardening.sql`** (re-runnable, signature unchanged): `get_facilities_map` rewritten SECURITY DEFINER + locked `search_path`; REVOKE public/anon, GRANT authenticated/service_role; auth gate; **DB-level per-user throttle 40 req/min** via private `map_rpc_throttle` ledger (admins/service_role exempt); server-enforced `status='active'` for non-admins; wildcard escaping; 100 sq-deg envelope cap. `facility_profile` RLS: active/approved SELECT for authenticated, full visibility for app admins + owners, admin/owner writes.
2. **Mobile:** `useGetFacilitiesMapData` no longer sends `p_status` (server enforces) and fails fast on throttle/auth errors instead of retrying (previous markers stay on screen via placeholderData); new `useOutdoorRoutePins` hook + green `RoutePinMarker` layer on the map (active + approved routes only, anchor = GPS start point / bounds center) — pin tap deep-links to `outdoor/route-detail` with `from: 'map'`. Layer hides while a facility filter/search is active; degrades to empty pre-migration.

### Decisions applied (M-D1–M-D5 confirmed by product owner)

| # | Decision | Outcome |
|---|----------|---------|
| M-D1 | RPC hardening | SECURITY DEFINER + grants + server-enforced status + escaping + envelope cap |
| M-D2 | Rate limiting | DB-level per-user throttle 40/min inside the RPC |
| M-D3 | Route pins | mobile layer via `get_outdoor_route_pins` + deep link to route detail |
| M-D4 | RLS | facility_profile policies added |
| M-D5 | Do-not-touch | collector GPS, coverage, IBP pins, non-active statuses stay disconnected |

### Manual steps for the user
- Apply `supabase/migrations/20260822_map_hardening.sql` — until then the RPC keeps its old permissive behavior and the pin layer shows nothing.

---

## Part AH — Chat Connectivity & Safety (CH-D) (✅ Implemented 2026-08-22)

*Analyzed 2026-08-22. Pre-build: the entire chat schema (`conversations`, `conversation_members`, `messages`, …) existed live-only with no migration capture; group discoverability was unfiltered; mobile had no "Report message" path feeding the Flagged moderation queue; mobile tickets knew only Open/Closed; mobile group creation lacked the admin form's category/type fields and promised "processed shortly" while creation is immediate; message sending had no throttle.*

### What was built

1. **Migration `20260822_chat_schema_capture.sql`** (re-runnable, pg_proc/table-guarded): captures the ghost chat schema including the live-only `conversations` enrichment columns (`group_type`, `status`, `group_permissions`, `group_rules`, `region_restriction`, `is_group`, `group_name`, `group_description`) and the `report_chat_content` RPC (authenticated-only, feeds the Flagged queue).
2. **Admin routes:** conversations discover hardened (`status='active'` + premium/admin group types excluded + verified/HCP gates); group creation enriches `group_category` / `group_type` / `group_permissions` / `group_rules` (non-fatal); message send throttled 30/min per user (429); support ticket status transitions push `dispatch_notification` to the requester (TKT display id + Resolved rating invite).
3. **Mobile (4OL Mobile Plasence):** long-press **Report message** sheet (reason chips + optional detail) → `report_chat_content` RPC directly, anonymous to the reported party, graceful failure pre-migration; **ticket parity** — 5 admin statuses rendered, `TKT-XXXX` display ids, 1–5★ satisfaction rating UI on Resolved tickets via existing `PATCH /api/chat/support`; **group creation** — category chips mirroring admin `GROUP_CATEGORIES` + `group_type: 'open'` pass-through + misleading "processed shortly" copy corrected; legacy dead chain deleted (`src/services/chatsupport.ts`, `ChatSupportModal.tsx`, `Notifications-1.tsx`).

### Decisions applied (CH-D1–CH-D6 confirmed by product owner)

| # | Decision | Outcome |
|---|----------|---------|
| CH-D1 | Ghost schema | captured pg_proc-guarded, never overwriting live definitions |
| CH-D2 | Report message | mobile → `report_chat_content` RPC directly (no new admin route) |
| CH-D3 | Discover | status + group_type gating on the conversations route |
| CH-D4 | Ticket parity | admin push-on-transition + mobile 5 statuses, TKT ids, rating UI |
| CH-D5 | Group fields | admin pass-through + mobile category chips + copy fix |
| CH-D6 | Throttle | 30/min message send on the admin route; legacy service deleted |

### Manual steps for the user
- Apply `supabase/migrations/20260822_chat_schema_capture.sql` — on the live DB it is a near no-op (guarded captures) but it makes fresh restores possible and grants `report_chat_content` to authenticated.

---

## Shared conventions (all parts)

- All server routes: `requireAdminApiUser("<resource>.<action>")` (RBAC Epic 31 pattern — merged and production-applied as of 2026-08-19)
- Data access: TanStack Query hooks in `hooks/supabase-calls/`, zod schemas in `schemas/`
- UI: shadcn Tabs/Card/DataTable, KpiCard, PageHeader; sonner toasts; `?tab=` URL sync
- Migrations: additive `supabase/migrations/YYYYMMDD_*.sql`; reconcile with `full-tables.sql` live dump; new permission keys must update both the SQL catalog seed and the `lib/permissions.ts` mirror
- Missing RPCs found during analysis (`get_body_part_stats`) must be persisted in migrations to survive a fresh restore
