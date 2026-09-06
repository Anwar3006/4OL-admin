# Fitness Mockup Gap Analysis — Mockup vs Mobile vs Admin

**Mockup:** `fitness-dashboard-redesigned.html` (+ `redesign/fitness-dashboard-redesigned-schema.md`)
**Repos:** `4OurLife-MobileApp` (branch `feat/fitness-mockup-parity`) · `4OurLife-Admin` (branch `feat/gap-analysis-parts-lmn-security`)
**Date:** 2026-08-22 · **Status:** ✅ Implemented 2026-08-22 (this document records the locked decisions and shipped evidence)

---

## 1. Locked decisions (product owner, 2026-08-22)

| # | Decision | Resolution |
|---|----------|------------|
| D1 | Notification bell | **Reuses the main app notification system** — no parallel fitness inbox. Bell opens `(modal)/Notifications.tsx` (same unread count, filters, deep links). Server-driven fitness alerts insert into the shared `notifications` table with new types (`workout_reminder`, `challenge`, `streak_alert`, `billing`, `recovery`, `nutrition`). |
| D2 | Gear icon | Stays on the fitness header → **Fitness Profile** (view current selections + update/regenerate via the existing `FitnessOptionsModal`). **Implementation note:** `FitnessOptionsModal` was verified to already BE the Fitness Profile (titled as such, shows selections, "Update Profile & Regenerate") — no new modal was built; its cross-navigator `router.replace` was fixed to dismiss+navigate per `NAVIGATION_RULES.md`. |
| D3 | Theme | Brand **#47BE7D** remains the primary/action color on every Fitness page. Only **layout + motion** are taken from the mockup; **card and button colors** keep the mockup's pastel palette (green/peach/blue/lavender accents). |
| D4 | Social proof | **Real aggregate** — count of `fitness_users` rows created in the last 7 days (+ total members), served by `get_fitness_social_proof()`. |
| D5 | Notifications delivery | **Server-driven feed** — pg_cron scheduled SQL functions write challenge-deadline / streak-at-risk / subscription-renewal rows into `notifications` (push dispatch rides the existing token pipeline). |
| D6 | Billing | Subscriptions schema + paywall built now. **Paystack wiring is manual/later** — the schema carries `paystack_reference` and `source` so payment-origin rows drop in without schema change. **Super admin can assign premium tier / lifetime premium** from the admin panel (source = `admin_grant`). |
| D7 | Coach attribution | Curated "Generated For You" plans are admin-managed; an admin-entered **display name** (`fitness_plans.coach_display_name`) is shown ("by Coach Ama") — never the admin's real name. Input added to the admin plan dialogs. |
| D8 | FitCoins | Admin **FitCoins tab**: reward tiers per activity (`fitcoin_activity_tiers`, consumed by the completion trigger), redemption catalog (`fitcoin_rewards`), recent redemptions + ledger, and coins purpose/usage copy. |
| D9 | Mockup pages | Every dashboard section and linked page of the mockup is implemented on mobile (see §4). |
| D10 | Navigation | Part 1 fixes of `MOBILE_NAVIGATION_AND_ADMIN_MAPPING_AUDIT.md` implemented (transition-based auth guard, dismiss+navigate for cross-group exits, `setParams` queue progression, `dismissTo` terminal anchors) and codified as the standing rule for all future screens (`NAVIGATION_RULES.md` in the mobile repo). |

---

## 2. Schema-name drift correction (G1 follow-through)

The mockup header references fictional tables. Live equivalents used by this implementation:

| Mockup name | Live table(s) |
|---|---|
| `fitness_user_profiles` | `fitness_users` + `user_profiles` |
| `fitness_workout_logs` | `exercise_sessions` (+ `fitness_user_streaks`) |
| `fitness_schedules` | `fitness_plan_days` + `fitness_user_assignments` |
| `fitness_fitcoins` | `user_profiles.fitcoins_balance` + `app_ledger` (category `fitness`) |

---

## 3. Admin panel additions

**Migration** `supabase/migrations/20260822_fitness_monetization_fitcoins.sql` (additive, re-runnable):
- `subscription_tiers` (seeded `free`/`premium`/`lifetime`, GHS pricing, benefits jsonb) + `user_subscriptions` (status `active/expired/revoked`, source `paystack/admin_grant/promo`, `granted_by`, `expires_at` null = lifetime, `paystack_reference`, one-active-per-user partial unique index) + `get_my_entitlement()` RPC (JWT user reads own tier only).
- `notify_fitness()` insert helper (service-role only) + cron functions `fn_fitness_streak_alerts()` / `fn_fitness_challenge_deadlines()` / `fn_fitness_subscription_renewals()` with per-day dedupe; pg_cron scheduling guarded behind extension presence.
- `fitcoin_activity_tiers` (seeded per activity with purpose copy) + `fitcoin_amount_for()` + rebuilt `handle_exercise_session_completed()` reading tier amounts (fallbacks preserve legacy 50/100 values) + `get_fitcoin_config()` RPC.
- `fitness_plans.coach_display_name`.
- Dashboard RPCs: `get_fitness_week(p_user_id)` (weekly totals, 7-day strip with focus labels from `fitness_plan_days`, today's flow/rest-day, next session), `get_fitness_activity_history(p_user_id, p_limit, p_offset)`, `get_fitness_social_proof()`.
- **IDOR hardening:** `get_fitness_dashboard(p_user_id)` rebuilt as SECURITY DEFINER enforcing `p_user_id = auth.uid()` for non-service-role callers.
- RBAC seeds: `subscriptions.view/manage`, `fitcoins.view/manage`, `fitness_notifications.send` (mirrored in `lib/permissions.ts`).

**API routes:** `/api/subscriptions/admin` (super-admin grant/revoke/list), `/api/user/entitlement` (JWT), `/api/fitness/fitcoins` (tiers/rewards/redemptions CRUD), `/api/fitness/notifications` (send fitness alert). `/api/user/notifications` VALID_TYPES extended with the six fitness types.

**UI:** Fitness menu gains **Subscriptions** and **FitCoins** tabs; plan add/view dialogs gain the coach display-name field.

---

## 4. Mobile implementation map (mockup → screen)

| Mockup element | Mobile implementation |
|---|---|
| Back header + bell (badge) + gear | Header with bell → shared `(modal)/Notifications`, unread badge from `getUnreadCount()`; gear → Fitness Profile modal |
| Activity summary card | `ActivitySummaryCard` fed by `get_fitness_week` → `activity-history.tsx` |
| Premium CTA | Personalized CTA → `premium.tsx` paywall (entitlement-gated) |
| Outdoor CTA | Existing card restyled to mockup gradient |
| Stats row (stagger, PRO lock) | `FitnessNavTabs` + stagger offsets; Health Metrics shows PRO badge and gates on entitlement |
| Social proof banner | `SocialProofBanner` ← `get_fitness_social_proof()` |
| Building Your Plan step pills | Generating card upgraded with Analysing/Selecting/Building steps |
| My Plan card | Existing (richer than mockup) — unchanged |
| Schedule day strip | `WeekStrip` ← `get_fitness_week` → `schedules.tsx` |
| Today's Flow + Log Activity | `TodaysFlowCard` (rest-day detection) + quick-log sheet inserting `exercise_sessions` `source='manual'` |
| Active Challenge | Existing card + rank text when available |
| Workout Programs + filter tabs + "Why these?" | `ProgramFilterTabs` client-side filtering + explainer |
| Generated For You 2-col grid + coach | `generated-for-you.tsx` grid; "by {coach_display_name}" |
| Bottom nav | App tab bar unchanged (Home/Discover/Reminders/Messages/More equivalents already exist) |
| Notification sheet | Shared Notifications screen (D1) |

New screens registered in `(fitness)/_layout.tsx`: `activity-history`, `schedules`, `generated-for-you`, `premium`; new modal `(modal)/FitnessProfileModal.tsx`. Hooks: `use-fitness-week.ts`, `use-entitlement.ts`. Design tokens: `lib/fitness-theme.ts`.

---

## 5. Security checklist

- Entitlement reads are token-scoped (`get_my_entitlement()` uses `auth.uid()`; `/api/user/entitlement` derives identity from JWT — never client-supplied).
- Premium grant/revoke restricted to **super admin** (`requireAdminApiUser()` + explicit role check), audit columns `granted_by`/`note`.
- FitCoins issuance remains trigger/`award_fitcoins`-only (service_role); tiers table changes amounts, not authority.
- Notification `metadata.deep_link` validated against the allowlist in `notificationRouting.ts` before `router.push`.
- `get_fitness_dashboard` IDOR closed (§3); new user-scoped RPCs all enforce `auth.uid()` for non-service callers.

## 6. Verification matrix

1. Super admin assigns lifetime premium → mobile entitlement flips → Health Metrics unlocks, paywall shows active state.
2. Cron functions (manual call) → rows appear in shared Notifications inbox with correct deep links.
3. Complete a workout → FitCoins awarded per tier amount → ledger row in admin FitCoins tab.
4. Add plan with coach name → appears as "by …" in Generated For You grid.
5. A→B→C→D fitness flows: back lands on C (guard + dismiss/navigate + setParams + dismissTo).
6. Social proof banner shows `fitness_users` created in last 7 days (verify vs `select count(*) where created_at > now()-interval '7 days'`).
