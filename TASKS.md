# 4 Our Life final handover backlog

**Audit date:** 8 September 2026  
**Reference:** `/Users/anwarsadat/Downloads/admin-panel.html`  
**Admin:** `/Users/anwarsadat/Desktop/WORK/4-Our-Life`  
**Mobile:** `/Users/anwarsadat/Desktop/WORK/4-Our-Life-App`  
**Database:** Supabase project `rhbbxttxnvcziyqzptqs` (`4 Our Life - 4OL`)

This is the final implementation backlog. The reference HTML is an AI-generated
prototype and contains sample people, counts, dates, alerts, metrics and
JavaScript `alert()`/`confirm()` simulations. Those values are evidence of an
intended workflow only. They must never be copied into production as data,
security facts or completed integrations.

## The four-way change gate

No product or schema change is ready until all four surfaces agree:

1. **Reference intent:** record the intended user outcome from the HTML, while
   rejecting sample data and simulated behaviour.
2. **Admin contract:** name the route, permission, loading/empty/error states,
   audit event and destructive-action confirmation.
3. **Mobile contract:** state whether the feature is admin-only or identify the
   affected screen, API route/RPC/table, offline behaviour and compatibility
   requirement for already-installed builds.
4. **Supabase contract:** verify the live table/function/policy/storage/cron
   state. Additive database changes ship before consumers; breaking RPC or RLS
   changes require a compatible mobile release first.

Every story below must include a four-row impact note in its PR. “No mobile
change” and “no database change” are valid conclusions, but they must be stated
and justified. A visual match alone is not acceptance.

## Verified baseline

| Evidence               | Result                                                                                | Meaning                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reference inventory    | 41 named pages, more than 100 tab concepts, 14,458 lines                              | Broad prototype; many actions are browser-only simulations                                             |
| Admin routes           | All main product areas have a page; roughly 220 API route files exist                 | Most parity work is present structurally                                                               |
| Admin checks           | TypeScript passed; 123 tests passed, 1 live-contract test skipped                     | Local admin code is healthy, but CI does not currently prove the live RPC contract without credentials |
| Admin production build | Not completed in this audit because the sandbox could not write `.next/trace-build`   | Re-run in the repository or CI; this is an audit-environment limit, not a confirmed code failure       |
| Mobile RPC contract    | 48 expected, 48 live, 0 signature differences                                         | Current installed-app RPC contract agrees with Supabase                                                |
| Mobile TypeScript      | Fails with source/config errors                                                       | Mobile is not handover-ready                                                                           |
| Mobile tests           | 30 tests pass; obsolete `__tests__/App.test.tsx` fails because `App` no longer exists | Replace the stale smoke test with an Expo Router root test                                             |
| Live database          | 243 public tables, 300 public functions, 5 public views, 470 policies                 | Extensive backend exists                                                                               |
| Security advisor       | 355 findings, including 4 errors                                                      | Security hardening is a release gate                                                                   |
| Performance advisor    | 747 findings                                                                          | Prioritize measured hot paths; do not blindly delete every unused index                                |
| Authentication         | 10 users; 0 have a verified MFA factor                                                | Prototype MFA indicators are not live facts                                                            |
| Storage                | One public bucket, no size limit, no MIME allowlist                                   | Upload controls need hardening and private buckets                                                     |
| Operational data       | Many new feature tables have zero rows                                                | Screens must show honest empty states; seed/configure only approved production data                    |

## Feature reconciliation

| Area from HTML                                                                                  | Admin + mobile + Supabase finding                                        | Verdict / remaining work                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell, sidebar, search, profile, dark and density modes                                         | Live admin shell, global search, profile modal, themes and density exist | **Implemented.** Include in regression suite                                                                                                                   |
| Dashboard                                                                                       | Live metrics routes and drill-down shell exist                           | **Partial.** Replace remaining `—`/“awaiting instrumentation” values with measured data or an explicit unavailable state                                       |
| Admins, roles, activity and security                                                            | RBAC catalog, overrides, sessions and audit screens exist                | **Partial and release-blocked.** MFA is unused; advisor findings remain; failed-login/blocked-IP metrics are incomplete                                        |
| Users and IBP businesses                                                                        | Admin management and IBP mobile mode exist                               | **Implemented structurally.** Validate low-volume and zero-row states; finish real engagement/session definitions                                              |
| Task Manager                                                                                    | Live `admin_tasks` board and routes exist                                | **Implemented.** Add end-to-end RBAC and audit tests                                                                                                           |
| Reports                                                                                         | Definitions, recipients, runs, snapshots and cron exist                  | **Partial.** No definitions/recipients/runs are configured; AI and delivery depend on missing secrets/providers                                                |
| Facilities, approvals, top-rated and featured                                                   | Routes, tabs, ranking and feature windows exist; mobile reads facilities | **Implemented structurally.** Real booking/CTR cannot be shown until booking events exist; anonymous admin-authored reviews need policy approval               |
| Diseases, symptoms, healthy living and FAQ                                                      | Admin CRUD/carousels/analytics and mobile libraries exist                | **Implemented.** Complete carousel/deep-link regression coverage and content QA; FAQ has only one live row                                                     |
| Human anatomy                                                                                   | Admin map/linking, mobile 3D shell and Supabase mapping tables exist     | **Partial.** Current renderer is a primitive model; licensed production GLBs and clinical/content review are external prerequisites                            |
| Fitness, routes, challenges, FitCoins and subscriptions                                         | Broad admin/mobile/database implementation exists                        | **Partial.** Empty operational tables, payment rail, health-platform native integrations and some notification workflows remain                                |
| Period/Plasence, TTC, trivia and AI content                                                     | Deep admin/mobile/schema implementation exists                           | **Implemented structurally.** Requires clinical/editorial governance, prize fulfilment operations and provider configuration                                   |
| Medication reminder, drug catalog, adherence and interactions                                   | 3,530 drugs and live reminder flows exist                                | **Partial.** Interaction table is empty; hard-coded AI checker metrics must be removed; delivery monitoring needs production proof                             |
| HCP verification and digital CVs                                                                | Admin registry/verification and mobile jobs flow exist                   | **Partial.** Automated licence verification is unavailable without regulator API/access; med-enquiry KPI still shows unavailable                               |
| Jobs                                                                                            | Admin listings/applicants/CVs and mobile browse/apply/alerts exist       | **Partial.** Geospatial matching, alert delivery and CV-boost billing are unfinished                                                                           |
| Medication Enquiry, pharmacy responses, delivery and escrow                                     | Admin and mobile workflows plus tables/RPCs exist                        | **Partial.** Payment escrow and courier tracking are not real; responses and ledger tables are empty                                                           |
| BedTracker and ambulance dispatch                                                               | Admin tables, routes and polling UI exist                                | **Partial.** No facility/ward/ambulance data; mobile BedTracker surface and realtime operational feed are absent                                               |
| Reviews and app-rating prompt                                                                   | Facility/app reviews and mobile prompt exist                             | **Implemented structurally.** Moderation and store-link production QA remain                                                                                   |
| Map, collectors and FacilityScout                                                               | Admin map/footprints/scout exist; mobile route pins exist                | **Partial.** Collector/scout tables are empty; FacilityScout mobile capture/reward flow is absent                                                              |
| Marketing, plans and discounts                                                                  | Admin routes/tabs and tables exist                                       | **Partial.** Campaign delivery and billing depend on providers; several source tables are empty                                                                |
| Chats and support                                                                               | Admin moderation/support and mobile chat/reporting exist                 | **Implemented structurally.** Exercise push delivery, rate limits and PHI handling in end-to-end tests                                                         |
| Notifications, templates, automation and best time                                              | Admin composer and rules plus push infrastructure exist                  | **Partial.** Templates/rules/campaigns/receipts are empty; “best time” needs event volume                                                                      |
| Transactions, service charge, refunds, tax and expenses                                         | Admin ledger/config surfaces and schema exist                            | **Partial.** No payment processor is connected, so money movement/refunds/escrow cannot be claimed as live                                                     |
| AI Hub                                                                                          | Model registry, moderation and period generation routes exist            | **Partial.** OpenAI key is absent; analytics must come from logged calls rather than prototype numbers                                                         |
| Developer tools: cloud, CI/CD, app security, rate limits, CDN, load balancing, errors, recovery | Admin exposes a consolidated, permission-hidden DevOps status page       | **Cannot be a real control plane from these four sources alone.** Each control needs the owning provider API, credentials, topology and change-approval policy |
| Settings, integrations, API keys, maintenance and compliance                                    | Broad settings page and backend tables exist                             | **Partial.** Provider-backed fields must be read-only until the provider is configured; billing values still include unavailable states                        |
| Delete-account requests                                                                         | Admin queue/policy and mobile request/cancel flow exist                  | **Implemented.** Add retention/deletion proof and legal sign-off                                                                                               |

## Plain limits: what cannot be completed yet

These are conditional tasks, not coding estimates:

- **Real payments, refunds and escrow:** Paystack or another processor account,
  merchant approval, webhook secrets, settlement rules and finance ownership are
  absent. The current schema can record state; it cannot move or hold money.
- **WhatsApp campaigns:** Twilio account credentials exist locally, but the
  approved content-template SID and WhatsApp sender are absent. Production sends
  cannot work until the sender and templates are approved.
- **Transactional SES email:** AWS region and verified SES sender are absent.
  A new SES account may also be sandboxed. Resend is configured for support mail,
  but it does not make the SES-dependent OTP/report paths operational.
- **AI generation and narrative reports:** `OPENAI_API_KEY` is absent. Even after
  configuration, generated health content must stay draft until human review.
- **Infrastructure controls:** Cloudflare/Vercel/GitHub/Sentry/Datadog or cloud
  provider APIs and scoped credentials were not supplied. Health/status cards are
  feasible; buttons that deploy, scale, purge caches or change WAF/load-balancer
  rules are not.
- **Automated professional licence checks:** no authoritative Ghana regulator
  API or data-sharing agreement is present. Keep manual verification and audit
  evidence until one exists.
- **Production anatomy models:** a licensed, anatomically suitable male/female/
  organs GLB set is not available. The current primitive renderer cannot be
  represented as clinical anatomy.
- **Historical analytics:** empty event tables cannot be backfilled honestly
  from the prototype. Instrument now and show “insufficient data” until enough
  events exist.
- **MNO reward payouts and courier GPS:** no payout/courier provider, commercial
  agreement or webhook contract is present. Keep rewards and delivery as manual,
  clearly labelled operations.
- **Native attestation and health-platform sync:** require App Attest/Play
  Integrity and Apple Health/Health Connect native capabilities, credentials and
  new signed EAS builds. JavaScript and database work alone cannot activate them.

## Epic 0 — P0 handover release gate

- [ ] **0.1 Establish a reproducible release matrix.** Pin the supported Node,
      pnpm, Xcode, Android Gradle, Expo/EAS and Supabase CLI versions. Acceptance:
      one documented command set runs on a clean machine and in CI.
- [ ] **0.2 Make mobile TypeScript clean.** Fix the missing `styles` reference in
      `DateTimeSelector`, invalid Expo Router `Route` import, icon-name typing,
      `StyleSheet.absoluteFillObject`, notification API changes, stale schema imports,
      implicit-any helpers and Deno-function exclusion/configuration. Acceptance:
      the app TypeScript project returns zero errors; Edge Functions have a separate
      Deno check.
- [ ] **0.3 Replace the obsolete mobile smoke test.** Remove the import of the
      deleted root `App` component and test the Expo Router entry/layout with required
      providers mocked. Acceptance: all four current suites pass with
      `--watchman=false` in CI.
- [ ] **0.4 Protect the user’s current mobile work.** The four modified Plasence/
      fitness files present during this audit must be reviewed and committed or
      intentionally discarded by their owner before backlog implementation begins.
- [ ] **0.5 Run the real production gates.** Admin: lint, type-check, unit,
      contract, Playwright smoke and production build. Mobile: lint, type-check,
      Jest, Expo Doctor, Android/iOS preview builds and smoke matrix. Record artifacts,
      commit SHAs and Supabase migration head.

## Epic 1 — P0 one-source design system

Goal: an authorized person changes a token once and both products consume it.

- [ ] **1.1 Create `@4ol/design-tokens` as the canonical shared package.** Keep a
      single human-edited `tokens.json` containing semantic colour, typography,
      spacing, radius, shadow, motion, breakpoint and z-index tokens. Both repositories
      consume the package directly at a pinned version; generated CSS/TypeScript is a
      build artifact, not another editable source. If no private package registry is
      available, use a dedicated shared Git repository with a pinned dependency.
- [ ] **1.2 Put effect documentation beside every token.** Each token must have
      `description`, `affects`, supported light/dark values, accessibility intent and
      migration notes. Example: changing `color.action.primary` affects primary
      buttons, active navigation, focused controls and links; it must not recolour
      success states.
- [ ] **1.3 Generate platform adapters.** Web output: CSS variables consumed by
      Tailwind/shadcn and chart palette. Mobile output: typed React Native values plus
      a NativeWind preset. Font files remain bundled platform assets, while family
      names and roles come from the shared package.
- [ ] **1.4 Consolidate current theme fragmentation.** Admin currently has 93
      unique exact six-digit colours in code paths despite CSS variables. Mobile has
      about 92, plus `constants/theme.ts`, five files under `theme/`, Fitness, Jobs and
      Plasence palettes. Map/anatomy rendering may keep a documented technical palette;
      all product UI must migrate to semantic tokens.
- [ ] **1.5 Centralize type roles.** Define display, screen title, section title,
      body, label, caption, button, numeric and mono roles with weight/size/line-height/
      letter-spacing. Migrate raw mobile `fontSize`/`fontFamily` styles and the remaining
      admin arbitrary text sizes.
- [ ] **1.6 Add enforcement.** CI fails on new raw UI hex/rgb values, arbitrary
      font sizes or literal font-family names outside explicit allowlisted renderer/
      asset files. CI also fails when generated adapters do not match `tokens.json`.
- [ ] **1.7 Add visual and accessibility regression tests.** Cover light/dark,
      compact/comfortable, 320dp phone, standard phone, tablet and desktop. Verify
      WCAG contrast, dynamic type, focus rings and reduced motion.
- [ ] **1.8 Write the handover guide.** Include “change this token → these screens
      change,” adding a token, deprecating a token, generating outputs, versioning and
      rollback. Acceptance: a non-author can change primary colour and body font from
      the one source and see both apps update without editing feature files.

## Epic 2 — P0 Supabase security and data exposure

- [~] **2.1 Fix the four security-definer views.** `healthy_living_info_view` and
      `notification_log_export` were unused by both apps — flipped to
      `security_invoker=true`, all client grants revoked. `fitness_challenge_leaderboard`/
      `_team_leaderboard` are live and mobile-contracted (`use-fitness-challenges.ts`);
      flipping `security_invoker` would silently drop every other participant's row
      (RLS on `fitness_challenge_entries`/`user_profiles` is own-row-only), so grants
      were tightened (no `anon`, no dead write grants) and the definer property kept,
      deliberately. **Remaining:** replace with a SECURITY DEFINER RPC — needs a
      coordinated mobile release since mobile currently calls `.from()`, not `.rpc()`.
      Migration: `supabase/migrations/20260908_epic2_security_definer_views.sql`.
- [~] **2.2 Audit all 206 security-definer functions.** Pinned `search_path` on all 19
      missing it (2 were also anon-executable — a real, unauthenticated
      privilege-escalation vector, now closed). Found 8 trigger-only functions with
      needless anon/authenticated EXECUTE (triggers don't need caller EXECUTE grants) —
      revoked; first attempt targeted the wrong grant (`anon, authenticated` instead of
      `PUBLIC`, which is what Postgres actually grants EXECUTE to by default) and was a
      no-op, caught by `has_function_privilege()` verification and corrected.
      `anon`-executable count: 65 → 40. The first grep-based classification pass would
      have wrongly flagged ~56 genuinely-used RPCs as dead (mobile calls many through
      local wrapper functions like `rpcJson()`, not raw `.rpc()`) — corrected to a
      three-layer check before revoking anything: (1) whole-source substring search
      across both repos, not just `.rpc(` literals, (2) every RLS policy scoped to
      `anon`/`public` checked for a reference to the candidate name (`is_admin`,
      `get_user_app_role`, `is_app_admin` are genuinely anon-reachable this way — gate
      real public-read policies on `job_postings`/`subscription_plans`/`fitness_plans`
      — correctly left alone), (3) cross-function call graph for indirect exposure via
      triggers. 17 functions cleared all three and had `anon` revoked (kept
      `authenticated`, since several are read via admin `data/` browser-client hooks).
      3 more matched the surface pattern but were excluded on reading the function
      body itself: `get_public_app_config` (self-evidently pre-login-readable design),
      `issue_canary`/`report_canary_hit` (a security honeypot pair — revoking anon
      would defeat the mechanism, not harden it). Of the 17, 6 turned out to have
      *zero* real caller anywhere (admin, mobile, or an RLS policy on any role, not
      just anon) — `award_fitcoins_capped`, `enforce_read_quota`, `get_fitcoin_config`,
      `get_most_used_fitness_plans`, `log_admin_read`, `report_bot_signal` — so
      `authenticated` was revoked from those 6 too, taking them fully service-only
      (`authenticated`-executable count: 143 → 137). Checked `is_conversation_member`
      the same way before excluding it from that batch: it genuinely gates
      `{authenticated}`-scoped SELECT policies on `conversations`/
      `conversation_members`/`messages`/`facility_conversations`. **Not done:** the
      remaining ~173 anon/authenticated-executable functions with a real caller found —
      distinguishing "needs authenticated" from "admin-API-only, needs neither"
      requires checking each caller's exact client (service_role vs browser/server)
      individually; not completed at this depth for all of them. Also: no reliable way
      found to stop Supabase's platform from re-granting anon/authenticated EXECUTE on
      *future* functions regardless of `ALTER DEFAULT PRIVILEGES` — every new SECURITY
      DEFINER function's own migration must explicitly revoke it. Migrations:
      `20260908_epic2_2a_...`, `_2b_...`, `_2c_...`, `_2d_...`, `_2e_...`.
- [x] **2.3 Resolve the 56 RLS-without-policy tables intentionally.** All 56 verified
      service-only or RPC-mediated (grep across both repos + `pg_proc` bodies) — none
      were the "silently broken feature" shape. Revoked the stray anon/authenticated
      table grants Supabase's default privileges had left on all 56 (RLS already
      returned zero rows for these roles; this closes the latent risk of a future
      careless policy reopening them). Migration: `20260908_epic2_3_...`.
- [x] **2.4 Prepare for Data API exposure changes.** anon-granted table count: 217 →
      169 (2.3) → **31**. Closed off future exposure for new tables (verified: a
      freshly created table now gets zero client grants). For the remaining ~169
      existing tables (live RLS policies, unlike 2.3's dormant set — a naive revoke
      here risks breaking real traffic), built a corrected version of the same
      dormant-grant check: a table where `anon` holds a grant but no policy is scoped
      to `anon`/`public` is functionally identical to 2.3's case — the grant is inert,
      just neutralized by an authenticated-only policy set instead of by "no policy at
      all." The first version of that query had a real bug (fragile `roles = '{public}'`
      array-equality instead of `'anon' = any(roles) or 'public' = any(roles)`) that
      silently miscounted `onboarding_requests` as safe to revoke — caught because
      `onboarding_requests` is the one confirmed real exception:
      `app/(app)/(public)/RequestLink.tsx` inserts into it *before* any session exists
      (a "request a business/IBP link" form), backed by a real `{public}` INSERT
      policy. Verified this is the only pre-login write path in the whole app: Expo's
      root layout (`app/(app)/_layout.tsx`) redirects every unauthenticated user out
      of every route except `(public)`/`(legal)`, and grepping those two groups for
      Supabase calls turns up exactly that one `.from()` and zero `.rpc(` calls.
      Revoked `anon` from the other 138 tables (kept `authenticated` — all still have
      live authenticated-scoped policies) plus tidied `condition_stats` (a
      non-sensitive aggregate view with inert write grants). Verified live: 169 → 31,
      `authenticated` untouched at 190, spot checks on `onboarding_requests`/
      `healthy_living_info`/`user_profiles`/`conditions` all behave correctly,
      `pnpm test`/`type-check` clean. The 31 tables still anon-granted all have a real
      anon/public-scoped policy (`job_postings`, `subscription_plans`, `fitness_plans`,
      the canary/honeypot tables, etc.) — none are a leftover dormant grant.
      Migrations: `20260908_epic2_4_...`, `_4b_...`, `_4c_...`.
- [~] **2.5 Harden storage.** `bucket4ol` (the only bucket): added a 50MB size limit +
      MIME allowlist, and scoped its authenticated INSERT policy to public-content
      folders only (it previously let any signed-in user write to *any* path,
      including `prescriptions/`, `jobs/`, `chat/`). Created 4 new private buckets
      (`prescriptions`, `job-documents`, `chat-attachments`, `hcp-verification`).
      Moved the 3 live signed-upload routes (`features/medenquiry|jobs|chat/api/
      attachment.ts`) onto the new private buckets — the blocker was that mobile
      persists the returned `publicUrl` long-term (the Jobs "reuse my saved CV" flow
      keeps it across future, unrelated applications), so it couldn't just become a
      short-lived signed URL without a mobile release. Fix: `publicUrl` is now a
      **~10-year signed URL** instead of a permanent public one — same field, same
      "just fetch this string" behaviour, zero mobile code change, but the file is no
      longer sitting in a fully-public bucket. Verified end-to-end live (signed
      upload → PUT → signed view URL → fetch, all 200) for all three buckets, and
      confirmed the old public-URL pattern now 400s against them. Broadened the new
      buckets' MIME allowlists after realizing the initial ones would have silently
      broken the "other"/"file" upload categories. `pnpm test`/`type-check`/`lint`
      clean. **Not done:** migrating the handful of pre-existing objects already in
      `bucket4ol` under `prescriptions/`/`jobs/`/`chat/` (their old URLs keep working
      as-is; only new uploads go to the new buckets). Malware scanning/quarantine: not
      attempted, no provider configured (same category as the Epic 4 blocked items).
      Migrations: `20260908_epic2_5_...`, `_5b_...`. Code:
      `features/medenquiry/api/attachment.ts`, `features/jobs/api/attachment.ts`,
      `features/chat/api/attachment.ts`.
- [x] **2.6 Remove credentials from cron command text.** Found and fixed a bigger issue
      than credential hygiene: `storage-cleanup`, `send-reminders`,
      `send-workout-reminders` and `send-trivia-live-notifications` had **zero real
      authorization** — `verify_jwt=true` only checks for *any* valid anon-role JWT,
      i.e. the same public key shipped in both apps, so anyone holding it could trigger
      real file deletion / mass push sends on demand. Fixed: a fresh secret in Supabase
      Vault, checked inside each function via a new `x-cron-secret` header; all 4
      functions redeployed with `verify_jwt=false` and their own check; all 4 cron jobs
      rewritten to pull the secret from Vault instead of a literal JWT. Verified live:
      direct calls without the secret get 401; the actual cron ticks succeed (200,
      real business logic ran) per `net._http_response`. Migration: `20260908_epic2_6_...`.
- [~] **2.7 Clear advisor errors and triage warnings.** Security advisor: 4 errors → 2
      (both `security_definer_view`, tracked in 2.1's note). `function_search_path_mutable`
      77 → 58, `anon`-executable 65 → 57, `authenticated`-executable 151 → 143,
      `extension_in_public` 1 → 0. Moved `pg_trgm` to the pre-existing `extensions`
      schema (every other extension was already there) — the 14 dependent trigram GIN
      indexes across 9 tables keep working unrebuilt (operator class is bound by OID,
      not name), but 3 functions with an explicit `search_path=public` and an
      unqualified `similarity()` call would have broken silently, including the
      mobile-contracted `global_search_v2` RPC. Found precisely (not a broad `%`
      regex, which false-positived on ltree's own `%` operator and plain arithmetic
      modulo) and fixed by adding `extensions` to their search_path before the move.
      Verified in a rolled-back transaction beforehand, then live afterward:
      `global_search_v2`/`search_drugs` both work as `authenticated`, and `EXPLAIN`
      confirms the trigram index is still used (Index Only Scan, no sequential-scan
      fallback). Migration: `20260908_epic2_7_...`. **Not done:**
      `auth_leaked_password_protection` is an Auth *service* config toggle with no
      SQL/MCP path — needs a manual flip in the dashboard (Authentication → Providers
      → Email).

## Epic 3 — P0 authentication, authorization and privacy

- [ ] **3.1 Enforce MFA for admin roles.** Add enrolment/recovery UI, a grace
      period, `aal2` checks on privileged routes and break-glass recovery. Do not use
      the prototype’s named “MFA disabled” alerts. Acceptance: every admin role is
      blocked from privileged work until a verified factor is present.
- [ ] **3.2 Test RBAC end to end.** For every sidebar item and write action, verify
      hidden/disabled UI, API permission, database authorization and audit log for
      super admin, admin, content manager, moderator, support, finance, registrar,
      AI manager and developer roles.
- [ ] **3.3 Complete sensitive-read controls.** Extend read audit/quotas beyond
      users/export to CVs, prescriptions, period/TTC, support/chat and deletion data.
      Verify masking at serialization boundaries and prevent bulk enumeration.
- [ ] **3.4 Complete retention and deletion policy.** Map every user-owned table,
      storage object, audit exception, legal hold and backup retention. Prove delete,
      cancel, grace-period expiry and export on a test identity.

## Epic 4 — P1 activate provider-backed capabilities

- [ ] **4.1 Payments:** choose the processor and owner; configure products,
      webhooks, idempotency, reconciliation, refunds, disputes, settlement and finance
      audit. Remove “escrow” wording until funds are actually held under an approved
      arrangement.
- [ ] **4.2 Email:** choose one transactional provider, finish DNS/sender/bounce/
      complaint setup, configure production secrets and test OTP, invite, report and
      account-deletion messages. Retire the duplicate provider path.
- [ ] **4.3 WhatsApp/SMS:** configure approved sender/template IDs, consent and
      opt-out, delivery receipts and retry policy. Test with provider sandbox then a
      controlled production cohort.
- [ ] **4.4 AI:** configure server-only credentials and approved models; add cost,
      latency, failure and moderation telemetry. Enforce source citation and mandatory
      human approval for health content.
- [ ] **4.5 Push and device services:** configure Firebase server credentials and
      EAS credentials; verify token registration, multi-device delivery, receipts and
      stale-token cleanup on physical iOS/Android devices.
- [ ] **4.6 Cron/report operations:** configure `CRON_SECRET`, create initial
      report definitions and recipients, test queue/retry/retention and alert on failed
      runs. Never use real recipients during automated tests.

## Epic 5 — P1 finish honest feature depth

- [ ] **5.1 Remove fake or static operational metrics.** Replace medication AI
      checker `98.1%`/`0.04s`, admin failed-login placeholders, BedTracker “queries
      today,” HCP med-enquiry count and settings billing placeholders with live metrics
      or a consistent “not instrumented/insufficient data” component.
- [ ] **5.2 Activate BedTracker.** Onboard approved facilities/wards/ambulances,
      define update freshness and incident ownership, add Realtime subscriptions with
      polling fallback, audit every availability change and run emergency tabletop
      tests. Decide whether a patient-facing mobile lookup is in scope before adding it.
- [ ] **5.3 Complete FacilityScout mobile capture.** Build consented GPS/photo
      submission, duplicate detection, offline queue, status tracking and manual reward
      fulfilment. Do not expose collector footprints to general admins.
- [ ] **5.4 Complete job matching.** Implement radius matching from validated
      coordinates, alert scheduling/deduplication, saved-job limits and application
      status push notifications. Keep automated licence checks manual per the limit above.
- [ ] **5.5 Complete Medication Enquiry operations.** Build pharmacy/IBP response
      onboarding, SLA/expiry, delivery-provider boundary and dispute evidence. Keep
      monetary state informational until Epic 4.1 is live.
- [ ] **5.6 Complete content linkage and analytics.** Add diseases/symptoms/
      healthy-living carousel-to-mobile tests, anatomy deep links, engagement events
      and link management with orphan prevention. No synthetic historical counts.
- [ ] **5.7 Complete medication safety data.** Establish a licensed interaction
      source, provenance/versioning, pharmacist review and high-severity escalation.
      An empty interaction table must never imply “no interaction.”
- [ ] **5.8 Seed only approved operational configuration.** Create report types,
      notification templates/rules, plans, feature flags, compliance settings and
      facility/scout/BedTracker settings through reviewed migrations/admin workflows.
      Keep production user/activity/financial rows unseeded.
- [ ] **5.9 Resolve duplicate subscription models.** Define ownership between
      `subscription_plans`, `subscription_tiers`, facility subscriptions, user
      subscriptions and scoped period/fitness passes; migrate consumers and publish a
      single entitlement contract.

## Epic 6 — P1 mobile/admin/database contract enforcement

- [ ] **6.1 Make the live RPC signature test mandatory in protected CI.** Supply
      a scoped secret so the existing test no longer skips. Keep its read-only catalog
      function; never probe volatile RPCs by executing them.
- [ ] **6.2 Regenerate the mobile contract on every relevant PR.** Diff all admin
      routes, RPC names/argument names and directly-read tables across `app`,
      `components`, `features`, `hooks`, `lib`, `context` and `services`.
- [ ] **6.3 Add response-shape contract tests.** Test the 31 documented admin
      routes used by mobile with authenticated fixtures and schema validators. Include
      empty, unauthorized, validation and backwards-compatible additive responses.
- [ ] **6.4 Add RLS actor tests.** Use separate anon, user A, user B, admin and
      service clients. Cover every one of the 38 directly-read mobile tables and each
      sensitive storage bucket.
- [ ] **6.5 Add one end-to-end happy and failure path per module.** Prioritize
      sign-in/device approval, facility discovery, reminder delivery, chat/report,
      subscription request, jobs apply, medication enquiry, deletion and admin review.

## Epic 7 — P2 database performance and observability

- [ ] **7.1 Baseline before changing indexes or policies.** Capture query stats,
      table sizes, cache hit rate and top API latency under representative traffic.
- [ ] **7.2 Add covering indexes for the 184 unindexed foreign keys that appear in
      real joins/deletes.** Batch migrations and measure write overhead.
- [ ] **7.3 Rewrite the 139 auth-initplan policies.** Use `(select auth.uid())`
      and equivalent stable expressions, preserving ownership semantics with actor tests.
- [ ] **7.4 Consolidate the 264 multiple-permissive-policy findings.** Merge only
      logically equivalent policies; do not broaden access while optimizing.
- [ ] **7.5 Remove the eight confirmed duplicate indexes.** Verify constraint
      ownership and query plans first. Treat 151 “unused index” notices as candidates,
      not proof, because new/low-traffic tables naturally have no usage history.
- [ ] **7.6 Add service-level telemetry.** Track route latency/error, database
      saturation, Edge Function failures, cron lag, push/email/WhatsApp receipts,
      payment reconciliation and mobile crash-free sessions with actionable alerts.

## Epic 8 — P2 controlled DevOps surface

- [ ] **8.1 Keep the current DevOps page read-only until providers are selected.**
      Show verified build SHA, environment, Supabase health, last backup/migration,
      queue lag and configured/missing provider status without exposing secrets.
- [ ] **8.2 Integrate provider APIs one at a time.** For each of CI/CD, CDN/WAF,
      error tracking and hosting, use least-privilege read scopes first. Any mutation
      requires a preview/diff, explicit permission, audit event and rollback.
- [ ] **8.3 Write disaster-recovery runbooks and test them.** Record RPO/RTO,
      backup ownership, restore drill, secret rotation, provider outage modes and a
      no-Supabase/no-push degraded mobile experience.

## Epic 9 — Final handover package

- [ ] **9.1 Produce an architecture map.** Show admin → API/RPC → tables/storage/
      cron → mobile, with ownership and sensitive-data boundaries.
- [ ] **9.2 Produce operations runbooks.** Include user/admin onboarding, MFA
      recovery, provider setup, content approval, notification/report failures,
      payment reconciliation, incident response and deletion requests.
- [ ] **9.3 Produce a data dictionary and permission matrix.** Generate from live
      schema/RBAC and link every admin tab and mobile feature to its data owner.
- [ ] **9.4 Record all conditional gaps.** Assign an owner and prerequisite to
      payments, SES, WhatsApp, AI, Firebase, native attestation, GLB licensing,
      regulator verification, MNO payout and courier tracking. Do not mark them done
      because their UI exists.
- [ ] **9.5 Run final sign-off.** Product verifies reference intent; admin owner
      verifies workflows/RBAC; mobile owner verifies installed-build compatibility;
      database owner verifies migrations/RLS/advisors/backups. Attach results and tag
      the handover release.

## Definition of done for every story

- The four-way impact note is complete and evidence-based.
- No prototype person, count, date, alert or metric is shipped as real data.
- Permissions are enforced in the API/database, not only by hidden UI.
- Loading, empty, error, retry and unauthorized states are present.
- Sensitive writes are validated, audited and idempotent where retries occur.
- Mobile changes work offline or fail clearly and preserve installed-build
  compatibility.
- Schema changes have a migration, rollback/forward-fix plan, RLS/grants and actor
  tests; generated types/contracts are refreshed.
- Design uses shared semantic tokens; no new raw visual values are introduced.
- Tests and production builds pass, provider-backed flows are tested against the
  provider, and operational ownership is documented.

## Recommended execution order

1. Epic 0 mobile/release gate.
2. Epics 2 and 3 database/auth security.
3. Epic 1 shared design tokens, before further UI work creates more literals.
4. Epic 6 contract enforcement.
5. Epics 4 and 5 provider activation and honest feature depth.
6. Epics 7 and 8 performance/operations after measurement.
7. Epic 9 final evidence and handover sign-off.
