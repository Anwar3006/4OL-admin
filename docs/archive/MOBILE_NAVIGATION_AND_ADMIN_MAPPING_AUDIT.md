# Mobile App Navigation & Mobile↔Admin Connectivity Audit

**Repo under test:** `4OurLife-MobileApp` @ `main` (`027b2d8`) · `4OurLife-Admin` @ `feat/gap-analysis-parts-lmn-security` (`fffbd22`, includes `529366a` — Gap Analysis Parts L/M/N + security controls)
**Date:** 2026-08-21 · **Mode:** analysis/discussion — no code changes made

> **Branch coverage note (verified 2026-08-21):** the admin-side inventory was taken from the working tree of `feat/gap-analysis-parts-lmn-security`, so Part L (`bedtracker/*`, `notifications/bedtracker-alerts`), Part M (`marketing/campaigns|discounts|plans|subscribers`), Part N (`facilityscout/*`), and the security controls are all included in the mapping. Caveat: the branch is pushed but **not merged to `main`** — any deployment cut from `main` will lack the L/M/N API surface and UIs. The new security controls (response headers, admin login lockout, honeypot) do not alter the mobile-facing API contract, so Part 2 findings are unaffected.

---

## Part 1 — Mobile navigation analysis (back-button skips levels)

### Symptom
User travels A → B → C → D; pressing back on D jumps to A instead of C.

### Findings (ranked)

**1. HIGH — Cross-navigator `router.replace()` (primary cause)**
Four navigator groups exist: `(tabs)`, `(modal)`, `(ibpTabs)`, `(auth)` root. A `router.replace()` targeting a route in a *different* navigator drops the user into that navigator's stack wherever it last was, discarding the push history used to get there.

| From (screen C) | Replace target (D) | Back lands on |
|---|---|---|
| `(tabs)/Home/Categories/FitnessOnboarding.tsx` L663 | `(tabs)/(fitness)` index | Home tab root — skips Categories + onboarding |
| `(modal)/FitnessOptionsModal.tsx` L123 | `Home/Categories/FitnessOnboarding` (tabs group) | Wherever Home stack last was |
| `(modal)/DiseaseDetails.tsx` L130 | `Home/Categories/Diseases` (tabs group) | Same — modal layer erased |
| `(tabs)/(fitness)/completed-workout.tsx` L183 | `plan` / fitness index | Combined with replace chain below |

Reproduces the symptom exactly: Home(A) → Categories(B) → FitnessOnboarding(C) → fitness dashboard(D), back → A.

**2. HIGH — Replace chains in the workout flow**
`active-exercise.tsx` self-replaces to advance the queue (L367) and to hand off to `completed-workout` (L391), which replaces *again* into `plan`/fitness index (L183/L208). Two–three consecutive replaces erase the mid-flow screens from the stack.

**3. MEDIUM — Auth-guard effect replaces mid-flow**
`(app)/_layout.tsx` guard effect deps include `segments`, `currentMode`, `userProfile`, `session` → re-runs on **every** navigation and profile/session refetch. Several branches `router.replace` to a group root (`(tabs)/Home`, `(ibpTabs)`, `Business/Security`). A refetch while 3 screens deep can silently wipe the stack.

**4. LOW — `router.navigate` pops to existing instance**
`(fitness)/_components/FitnessNavTabs.tsx` L62 — `navigate` pops back to an already-stacked route instead of pushing (Challenges → Workouts → tap Challenges discards Workouts).

**5. LOW/OK — Intentional collapses**
`dismissTo(Reminders)` in `AddReminderDetails.tsx`, `dismissAll()` in `SearchResultModal.tsx`, OTP → PasswordManager replace — deliberate wizard exits; verify entry-path parity only.

### Recommended direction (fix phase)
1. **Rule: never `replace` across navigator groups.** Exit modals with `router.dismiss()`, then `router.navigate()` to the destination.
2. **Queue progression → `router.setParams()`** in `active-exercise.tsx` (same screen, new params, stack untouched).
3. **Terminal collapse only via explicit `router.dismissTo(anchor)`** — already used once in the codebase; makes landing points declared, not emergent.
4. **Make the auth guard transition-based**: keep previous auth state in a ref; redirect only on actual login/logout/mode *change*, never on routine segment change or profile refetch.
5. **Per-tab expected-stack audit tables** (A→B→C→D ⇒ back ⇒ C) for fitness, Home/Categories, and Reminders wizards.

---

## Part 2 — Mobile ↔ Admin panel mapping

### Connection architecture
- **Shared Supabase project**: both apps hit the same DB. Mobile uses anon key + `auth.uid()`/RLS; admin panel uses service-role for content management and JWT verification for user-facing routes.
- **Admin panel doubles as mobile backend**: mobile calls `${API_URL}/api/...` routes that live in `4OurLife-Admin/app/api`. Authenticated user routes verify the Supabase JWT via `auth.getUser(token)` (e.g. `user/profile`, `user/active`, `user/delete-account-request`).
- **Mobile RPC surface** (13): `activate_fitness_plan`, `get_facilities_map`, `get_fitcoins_dashboard`, `get_fitness_dashboard`, `get_streak_detail`, `global_search`, `join_fitness_challenge`, `redeem_fitcoin_reward`, `increment_*_view_count` (×5).
- **Mobile direct table surface** (34 tables read; writes: `user_profiles`, `workout_reminders`, `medication_reminders`, `medication_adherence`, `user_notes`, `exercise_logs`, `fitness_onboarding_selections`).

### Module map

| Mobile feature | Mobile data path | Admin counterpart | Status |
|---|---|---|---|
| Auth (login/signup/OTP/reset) | Supabase Auth + `user_profiles` | `admin/login-alerts`, `security-center` | ⚠️ see Security S1/S2 |
| Chat & support | `/api/chat/*` (JWT) | `chat/*` routes + `chats` UI | ✅ Connected |
| Delete-account request | `/api/user/delete-account-request` (JWT, legacy `.js`) | `admin/delete-account-requests` + `delete-account-request` UI | ✅ Connected |
| Activity logs | `/api/user/activity-logs` (JWT) | `admin/profile/activity` (admin self) | ✅ Connected |
| Avatar | `/api/user/avatar` (JWT) | — | ✅ OK |
| Search (conditions/symptoms/healthy-living/facilities) | `/api/search/dynamic` (⚠️ NO auth) | none (admin search is admin-authed) | ⚠️ see S5 |
| Phone update | `/api/update-phone` (⚠️ NO auth) | none | 🛑 CRITICAL — see S1 |
| Fitness dashboard/plans | RPCs (missing from both migration sets) | `fitness/*`, `new-fitness` UI | ⚠️ schema drift — G1 |
| Challenges & FitCoins | RPCs `join_fitness_challenge`, `redeem_fitcoin_reward` | no FitCoins/redemption queue UI found | ⚠️ gap — G2 |
| Facilities / Map | `get_facilities_map` RPC + `facility_profile` | `facilities/*`, `view-facility-profile`, `facilityscout`, `bedtracker` | ✅ Connected |
| Reminders & medication | direct writes + `send-reminders` edge fn | `medication-reminder` UI, `medication/drugs`, `send-reminders` | ✅ Connected |
| Health content (diseases/symptoms/healthy living) | direct reads + view-count RPCs | `diseases`, `symptoms`, `healthy_living`, `categories` UIs | ✅ Connected (admin authors, mobile consumes) |
| Period / Plasence | AES-encrypted local store + consent events | `period/*`, `ai-hub/period` | ✅ Connected |
| Push notifications | `/api/user/push-token` (JWT) | `notifications/*` UI | ✅ Connected |
| Marketing | `marketing_profile` direct read | `marketing/*` UI | ✅ Connected |
| IBP business mode | `(ibpTabs)` screens | `ibp/*` routes | ✅ Connected |

### Gaps
- **G1 (HIGH) — Schema drift:** all 8 sampled mobile RPCs exist in **neither** repo's `supabase/migrations`. They live only in the production DB. Neither repo can recreate the database from source; admin analytics and mobile both depend on them.
- **G2 (MEDIUM) — FitCoins redemption has no admin moderation queue**; `redeem_fitcoin_reward` is mobile-only (verify before shipping rewards for real money).
- **G3 (LOW) — Admin has no mobile-release telemetry**: no API route serves app version/force-update checks.

### UI/UX issues
- **Admin IA duplication:** parallel menus `security` vs `security-center`, `fitness` vs `new-fitness`, `schematic` vs `platform-schematic`, `medenquiry` vs `medication-enquiry`, plus standalone `view-*` pages (`view-facility-profile`, `view-medication-reminder-details`, `view-notification`, `view-reviews`) that fragment related workflows.
- **Mobile:** navigation stack bugs (Part 1); `Settings` "Rate App" uses placeholder env IDs; share text points to `https://4ourlife.com` (verify domain).
- **Cross-app consistency:** delete-account on mobile is a reviewed request, admin queue exists — but no mobile-side status visibility after submission.

### Security findings (cross-app, ranked)
- **S1 (CRITICAL) — `/api/update-phone` is unauthenticated** and accepts a client-supplied `userId` + `phone`, then uses the server `SERVICE_KEY` to update the phone in Supabase Auth. Combined with mobile's phone+OTP login (`signInWithPhoneNumber`/`verifyOtp`), this is an account-takeover path. Legacy `route.js`.
- **S2 (CRITICAL) — Parallel password store.** Signup writes `user_profiles.password` = client-side AES of the plaintext; `resetPassword()` in `services/auth.ts` **decrypts** that column and signs in with it — bypassing Supabase's reset-token flow. Key sources are inconsistent (`process.env.ENCRYPT_KEY` for encrypt vs `expoConfig.extra.ENCRYPT_KEY` for decrypt; `ENCRYPT_KEY` absent from `eas.json`), and any embedded key ships inside the app bundle → stored passwords are effectively recoverable.
- **S3 (HIGH) — `SUPABASE_SECRET_KEY` exposed in mobile `app.config.ts` `extra`** (no client consumer found, but if ever set via EAS env it ships a service-role key in the JS bundle and voids all RLS).
- **S4 (HIGH) — Live Google Maps keys committed in `eas.json`** (two `AIzaSy…` keys × 4 build profiles). Restrict/rotate.
- **S5 (MEDIUM) — `/api/search/dynamic` unauthenticated**, no rate limiting, `select("*")` on `facility_profile` (entire facility row exposed). Table allowlist is the only guard.
- **S6 (MEDIUM) — Six legacy `.js` routes** (`delete-user`, `places`, `search/dynamic`, `support`, `update-phone`, `user/delete-account-request`) bypass TS conventions; auth quality is mixed (delete-account-request was hardened; update-phone was not).
- **S7 (MEDIUM) — Biometric flow persists plaintext password** in SecureStore (`silent_password`) after every login.
- **S8 (LOW) — Mobile direct writes depend entirely on RLS completeness** for `user_profiles`, reminders, adherence, notes, exercise logs; RLS migrations must be verified applied to production.

### Recommended sequencing
1. Kill-switch or JWT-gate `/api/update-phone` **today** (S1).
2. Remove `user_profiles.password` read-path from `resetPassword`; migrate to Supabase reset-token flow; stop writing client-encrypted passwords (S2).
3. Backfill missing RPC migrations into one repo (source of truth = admin repo's `supabase/migrations`) (G1).
4. Drop `SUPABASE_SECRET_KEY` from mobile `extra`; rotate/restrict Maps keys (S3/S4).
5. Port the six `.js` routes to TS with the `requireAdminApiUser` / JWT-verify pattern; rate-limit `search/dynamic` and trim its select (S5/S6).
6. Navigation fixes per Part 1 direction (cross-group replace → dismiss+navigate; setParams for queues; transition-based auth guard).
7. Consolidate duplicated admin menus after a routing inventory (UI/UX).

---

## Part 3 — Implementation plan (proposal, discussion only)

Phased so that exploitable issues ship first, each phase independently shippable and testable. Admin work lands on a new branch off `main` (or stacked on `feat/gap-analysis-parts-lmn-security`); mobile work on a `fix/auth-and-navigation` branch of `4OurLife-MobileApp`.

### Phase 0 — Emergency lockdown (hours, no UX impact)
| Item | Approach |
|---|---|
| S1 `update-phone` | **Option A (recommended):** port to `app/api/user/update-phone/route.ts`; extract the JWT-verify logic already duplicated in `user/profile` and `user/active` into a shared `requireSupabaseUser(req)` helper in `lib/`; derive `userId` exclusively from the verified token (reject any client-supplied id); require the new phone to pass an OTP challenge before writing (reuse the existing `send-otp`/`verify-otp` pair). **Option B (interim, same day):** disable the legacy `route.js` (return 503) until the TS version merges — verify first that no shipped mobile build depends on it (grep shows mobile uses Supabase `updateUser` paths, not this route; confirm). |
| S3 secret in `extra` | Delete the `SUPABASE_SECRET_KEY` block from `app.config.ts` `extra`; grep confirms zero client consumers, so removal is safe. Any server-side need belongs in admin env only. |
| S4 Maps keys | In Google Cloud Console: restrict both keys to the two app package names + SHA-1 fingerprints, disable web/other APIs, then rotate. Commit the restriction note; keys in `eas.json` become low-risk once restricted (still consider moving to EAS secrets). |

### Phase 1 — Auth architecture fix (S2, S7) — the biggest change
**Target state:** Supabase Auth is the *only* password authority; no password (plain or encrypted) is ever persisted app-side.

1. **Signup (`services/auth.ts`)** — stop writing `user_profiles.password`; keep the profile row (name/phone/email/etc.).
2. **Reset (`resetPassword`)** — replace decrypt-and-sign-in with Supabase's native flow: `resetPasswordForEmail` (or phone-OTP session via `signInWithOtp`) → deep link back into the app (`app/(app)/(public)/ResetPassword.tsx` already exists) → `supabase.auth.updateUser({ password: newPassword })` inside the recovery session. The `decryptPassword` path disappears entirely.
3. **Change password (`changePassword`, `PasswordManager`)** — `supabase.auth.updateUser({ password })` with current-password re-verification done via a fresh `signInWithPassword` check, not the stored column.
4. **Biometrics (S7)** — stop `silent_password` writes. The Supabase session is already in SecureStore, so biometric unlock should gate *UI access only*: on enable, verify device biometric enrollment + require one password entry (existing modal), store only a `biometric_enabled` flag; on unlock, the existing session resumes with no credentials needed. Handle the edge case (session expired while app locked) by falling back to the login screen after biometric success.
5. **Data migration (after the app version with steps 1–4 is forced/min-version):** `ALTER TABLE user_profiles DROP COLUMN password;` — coordinate with G3's min-version gate so no old client breaks. Until then, an interim migration can revoke RLS read on the column.

Rollback: steps are additive until the column drop; keep the drop as the last gated migration.

### Phase 2 — API modernization & schema truth (S5, S6, G1)
- **S6 legacy routes → TS:** port `delete-user`, `places`, `search/dynamic`, `support`, `update-phone`, `user/delete-account-request` using the established `requireAdminApiUser` (admin-authed) / `requireSupabaseUser` (user-authed) patterns; each port = route file + matching auth + input validation (zod, already in the admin repo) + error shape consistency.
- **S5 `search/dynamic`:** user JWT required (mobile already has the token at call site — one header addition), apply the existing Supabase-backed `checkRateLimit` RPC, replace `select("*")` with an explicit public column list per table.
- **G1 RPC backfill:** dump each missing function from production (`pg_get_functiondef`), wrap as `CREATE OR REPLACE FUNCTION` migrations named `2026XXXX_backfill_fitness_rpcs.sql` in the **admin repo** (source of truth, already 80+ migrations), asserting `SECURITY DEFINER`/`INVOKER` and GRANTs match production. Same exercise for any tables referenced only in prod. Output: a repo that can rebuild the DB.
- **S8 RLS verification:** as part of G1, run a per-table policy audit for the 7 mobile-write tables; add/patch policies where missing; record results in the migration comments.

### Phase 3 — Navigation fixes (Part 1 findings)
Per-offender approach, in dependency order:
1. **Auth guard (`(app)/_layout.tsx`)** first — it can undo every other fix. Keep `prevAuthState`/`prevMode` refs; only call `router.replace` when the state actually *transitions* (login/logout/mode change/password-change flag flip), never on plain `segments` change or profile refetch.
2. **Modal → tabs jumps:** `FitnessOptionsModal` and `DiseaseDetails` — replace the cross-group `router.replace` with `router.dismiss()` followed by `router.navigate(target)` in the same handler (dismiss resolves synchronously enough for a chained navigate; if flaky on Android, defer via one `requestAnimationFrame`).
3. **Workout queue:** `active-exercise` queue advance → `router.setParams({ exerciseId, queueIndex })` (same screen, stack intact, back exits the whole workout — confirm as desired product behavior; if per-exercise back is wanted, use `push` instead). `completed-workout` exit → `router.dismissTo('/(app)/(auth)/(tabs)/(fitness)/plan')` when `planDayId` present, else `dismissTo` fitness index — declared anchors instead of chained replaces.
4. **`FitnessOnboarding` completion (L663):** intentional collapse is fine but make it explicit: `router.dismissAll()` (or `dismissTo` Home) then `router.navigate` to the fitness tab; likewise the two `replace(Home)` abort paths become `dismissTo(Home)`.
5. **`FitnessNavTabs`:** keep `navigate` (tab-like semantics) — product decision; document that mid-stack instances are popped by design.

**Verification:** add an expected-stack table per flow to the doc's test plan (A→B→C→D ⇒ back ⇒ C, back ⇒ B, …), manual matrix on iOS + Android for: onboarding-complete, workout run, disease-details from search, reminders wizard. Low-cost guard: a dev-only `useNavigationState` logger that prints the stack on every focus, used during the test pass.

### Phase 4 — UI/UX consolidation & remaining gaps
**Admin IA consolidation (duplication removal), route-stub pattern already proven in the marketing M-D6 cleanup:**
| Keep (canonical) | Retire → redirect stub | Notes |
|---|---|---|
| `security-center` | `security` | verify which holds the Epic-28 work first; keep the RBAC-gated one |
| `new-fitness` | `fitness` | after confirming new-fitness covers all legacy actions |
| `platform-schematic` | `schematic` | content check needed — may be two genuinely different diagrams |
| `medication-enquiry` | `medenquiry` | naming normalization |
| `facilities/[id]` | `view-facility-profile` | nest under parent module |
| `notifications/[id]` | `view-notification` | same |
| `reviews/[id]` | `view-reviews` | same |
| `medication-reminder/[id]` | `view-medication-reminder-details` | same |

Mechanics per item: confirm feature parity → update `dashboardNavSections` (navigation.ts) → convert retired page to `redirect()` stub (bookmark-safe) → RBAC permission keys remapped → gap-doc entry.

**Remaining gaps:**
- **G2 FitCoins moderation queue:** new admin module mirroring the FacilityScout rewards pattern (`facilityscout/rewards/[id]/disburse`): queue table or view over `fitcoins_*` data, approve/reject routes behind `finance_admin` permission, mobile `redeem_fitcoin_reward` RPC updated to insert a *pending* redemption instead of paying out instantly. Schema must be confirmed against prod (G1 output) first.
- **G3 app-config endpoint:** `app/api/mobile/app-config/route.ts` (public, cached, rate-limited) returning `{ minVersion, latestVersion, forceUpdate, announcements }`; mobile checks on cold start behind the splash and gates the app. This also creates the forced-upgrade lever that Phase 1's column drop depends on.
- **Mobile UX details:** real store IDs via `EXPO_PUBLIC_APPLE_APP_ID`/`ANDROID_APP_ID` EAS secrets; verify `4ourlife.com` domain in share text; add delete-request status visibility (new `/api/user/delete-account-request/status` — JWT-scoped to own request — surfaced in My Account).

### Sequencing summary
```
Phase 0 (day 1):      S1 gate/disable · S3 removal · S4 key restriction
Phase 1 (week 1):     S2 reset-flow migration · S7 biometric redesign · mobile branch
Phase 2 (week 1-2):   G1 RPC backfill + S8 RLS audit · S5/S6 route ports
Phase 3 (week 2):     guard → modals → workout queue → onboarding exit (+ test matrix)
Phase 4 (week 2-3):   IA consolidation · G2 FitCoins queue · G3 app-config · UX details
Merge gate:           feat/gap-analysis-parts-lmn-security → main before any Phase-0 admin deploy
```

### Cross-cutting rules for all phases
- Admin repo = schema source of truth (all migrations land there).
- No client-supplied identity ever trusted: `userId` always derived from the verified JWT.
- Every retired route becomes a `redirect()` stub, never a hard 404.
- Each phase ends with the standard audit gates (`tsc`, vitest, eslint, `next build` for admin; typecheck + jest for mobile).

---

## Part 4 — Likes & Saves for Health Content + Engagement Analytics (✅ Implemented 2026-08-21)

### Current state (verified 2026-08-21)
- **No like/save feature exists anywhere for health content.** `DiseaseDetails.tsx` / `SymptomDetails.tsx` have no favorite UI (grep hits were false positives: `useSharedValue`, comment text). Healthy Living has none either.
- **Only engagement primitive that exists = facility favorites:** `facility_favorites` table, served by `/api/user/favorites` (JWT-authed, `getRequestUser` pattern), surfaced on mobile in the **SavedItems tab** — which renders **facilities only** (`FacilityCard` + `useFavoritesStore` + `useSyncFavorites`).
- **Views are already tracked:** `conditions.view_count` etc., bumped by mobile RPCs `increment_condition_view_count` / `increment_symptom_view_count` / `increment_healthy_living_view_count` (all prod-only per G1).
- **Admin Diseases & Conditions page:** KPI cards exist (Total Views, Review Rate), table shows `view_count`; the tabs `carousel`, **`engagement`**, `linkages` are literal **"Coming Soon" placeholders** (`diseases/page.tsx` L380–414).
- No `favorite|like|save` tables exist in either repo's migrations.

### Proposed design

**1. Data model — one polymorphic table, not per-content tables** (admin repo migration):
```sql
create table public.content_engagement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('condition','symptom','healthy_living','fitness_exercise')),
  content_id uuid not null,
  action text not null check (action in ('like','save')),
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id, action)
);
-- trigger: validate content_id exists in the referenced table (conditions/symptoms/healthy_living_info/fitness_exercises)
-- indexes: (content_type, content_id), (user_id)
```
Why polymorphic: one API, one Saved-Content list, one analytics source; the `content_type` discriminator scales to future content types without new tables. The unique constraint gives free idempotency (re-like = `23505` → return `ok`, same pattern as `facility_favorites`).

**2. API — admin panel (consistent with existing user routes):**
- `app/api/user/content-engagement/route.ts` — reuses the `getRequestUser` JWT pattern from `user/favorites`:
  - `GET` → the caller's saved/liked items, joined to content tables, grouped by `content_type` (powers the mobile Saved list)
  - `POST {contentType, contentId, action}` → upsert-like insert; `user_id` from token only
  - `DELETE ?contentType=&contentId=&action=` → unlike/unsave
- Optional convenience RPC `get_content_engagement_counts(content_type, content_ids[])` returning per-item like/save counts (for detail-screen badges) — or compute via the existing read paths.
- RBAC: user-scoped only; admins read aggregates via the analytics route below (permission `conditions.engagement` / new `engagement.view`).

**3. Mobile UX — where users see saved content:**
- **Save button (bookmark icon)** on the header row of `DiseaseDetails`, `SymptomDetails`, `HealthyLivingDetails` (+ `(modal)` variants); **Like button** optional on the same row (decide: save-only first, like as phase 2 — likes have no user-facing list, saves do).
- **SavedItems tab becomes segmented**: `Facilities | Saved Content` (or chips per type: All / Conditions / Symptoms / Healthy Living). Saved Content cards: title, category badge, saved date, tap → opens the same details screen (deep link by `content_type` + `content_id`).
- State: extend `useFavoritesStore` or a new TanStack Query cache `['content-engagement']` with **optimistic toggles** and cache invalidation on the `GET` list; icon state on detail screens reads from the same cache.
- Empty state per segment mirrors existing SavedItems styling.

**4. Connectivity & tracking guarantees:**
- All writes through the JWT-authed API (never direct anon inserts) → identity is server-derived, auditable, and RLS-independent.
- Views keep flowing through the existing `increment_*_view_count` RPCs (backfilled per G1); likes/saves add the missing engagement dimension.
- Every engagement row carries `created_at` → time-series analytics and trend deltas without a separate events table.
- Integrity: unique constraint prevents double-counting; FK-cascade on user delete covers GDPR/account-deletion flows automatically.
- Anti-inflation (later): per-user daily cap in the API layer if like-farming appears.
- **Note:** a general event pipeline already exists — `analytics_events` (migration `20260811_mobile_parity_events_reviews.sql`, Epic 10.10) with a mobile `logAnalyticsEvent` helper. Use it for *fire-and-forget* engagement telemetry (share taps, time-on-page), while `content_engagement` remains the source of truth for *user-visible* likes/saves (the Saved list needs per-user rows anyway). Gap Analysis Part I (I2/I5) deferred exactly this to `analytics_events` — Part I was never implemented; its I1–I10 gaps stay open except where this Part 4 design covers them (I2, I5).

**5. Engagement Analytics tab wiring (Diseases & Conditions menu):**
- Replace the placeholder with a real component fed by `app/api/diseases/engagement/route.ts` (admin-authed, `requireAdminApiUser("conditions.engagement")`) that aggregates:
  - **KPI cards:** Total Views (existing `sum(view_count)`), Total Likes, Total Saves, Save Rate = saves/views, Like Rate, Unique Engagers
  - **Leaderboard table:** top conditions by views/likes/saves (sortable) — reuses `DataTable`
  - **Trend chart:** engagement by day/week from `content_engagement.created_at` (recharts, already in the admin stack)
  - Optional: symptom + healthy-living scope switch so the same component serves those menus (healthy_living page has the same tab structure).
- Implementation vehicle: a **SQL view or RPC** `content_engagement_stats(content_type)` joining content tables to `content_engagement` aggregates — keeps the route thin and lets the All-Conditions table also show likes/saves columns later.

**6. Sequencing (fits after Phase 2 of Part 3):**
1. Migration (table + trigger + indexes) → admin repo, applied with the G1 backfill batch.
2. Admin API (content-engagement CRUD + diseases/engagement aggregate) + RBAC permission entries.
3. Mobile: save/like buttons on the three detail screens + SavedItems segmentation (one PR).
4. Admin UI: Engagement Analytics component + optional like/save columns on the conditions table.
5. Verification matrix: like → appears in admin KPIs within refresh; save → appears in SavedItems after re-open (cold start); unlike/unsave round-trips; deleted user's rows cascade.

**Open decisions:** (a) save-only vs save+like for v1; (b) whether `fitness_exercise` joins now or later; (c) public like counts on cards (social proof) vs private; (d) does the Symptoms menu get its own Engagement tab instance or share the component via the scope switch.

### Implementation evidence (2026-08-21)

Open decisions resolved: **(a)** both save **and** like ship in v1; **(b)** `fitness_exercise` is in the schema/trigger/API now but has no mobile buttons yet (no exercise detail route to deep-link); **(c)** counts stay private — admin-side analytics only, no public social proof; **(d)** one shared engagement route/tab (`/api/diseases/engagement` + Diseases Engagement Analytics tab) aggregates all four content types with a per-type breakdown.

**Schema (4OurLife-Admin)** — `supabase/migrations/20260821_content_engagement.sql`: `content_engagement` polymorphic ledger exactly per the design (unique `(user_id, content_type, content_id, action)` → 23505 idempotency, FK-cascade on user delete), BEFORE INSERT trigger validating `content_id` against `conditions`/`symptoms`/`healthy_living_info`/`fitness_exercises`, AFTER INSERT/DELETE trigger maintaining `conditions.like_count`/`save_count` counters (columns guarded with if-not-exists), indexes `(content_type, content_id)`/`(user_id)`/`(created_at)`, RLS enabled with no policies (service-role routes only), and the `engagement.view` RBAC seed (admin + content_manager; analyst inherits via `*.view`). Mirrored in `lib/permissions.ts` (PERMISSION_CATALOG + ROLE_DEFAULTS).

**API (4OurLife-Admin)** — `app/api/user/content-engagement/route.ts` (JWT `getRequestUser`, user-scoped GET with server-joined titles / idempotent POST / DELETE via query or body) and `app/api/diseases/engagement/route.ts` (`requireAdminApiUser("engagement.view")`: totals incl. Unique Engagers, 30-day trend, top-liked/top-saved leaderboards across all types, per-type breakdown). `/api/diseases/stats` now reports `engagementPipelineLive` from table presence.

**Admin UI** — `diseases/_components/engagement-tab.tsx` wired to both routes: live Likes/Saves/Unique Engagers KPIs, 30-day likes+saves trend bars, cross-content leaderboards with type badges, engagement-by-content-type grid; amber banner only until the migration is applied. Like/save columns already render in the conditions table (Part I).

**Mobile (4OurLife-MobileApp)** — `hooks/use-content-engagement.ts` (query cache `['content-engagement']`, optimistic `useToggleEngagement`), `components/ContentEngagementActions.tsx` (floating Like + Save buttons) mounted in the header rows of `DiseaseDetails` / `SymptomDetails` / `HealthyLivingDetails` (modal variants — the Categories copies re-export them), and SavedItems (`My Account/Favorites.tsx`) segmented **Facilities | Saved Content** with deep links by `content_type` + `content_id` and inline unsave.
