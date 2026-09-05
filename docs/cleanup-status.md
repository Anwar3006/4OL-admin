# Cleanup — status

Branch: `cleanup`. Updated 5 Sept 2026.

Each item says what changed, what proves it, and what is still unverified.
Nothing here was deleted or rewritten on the strength of a guess.

---

## 1 · Duplicate dashboard layout — **merged, pending your build**

`app/(dashboard)/` contained both `layout.js` and `layout.tsx`. Next.js
resolves one and ignores the other, and `next.config.ts` sets no
`pageExtensions`, so which one won was a framework default.

**`layout.js` won.** Evidence, from the committed production build:

```
.next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js
  ✓ app/(dashboard)/_components/DashboardWrapper.tsx
  ✓ stores/ai-job-context.tsx
  ✓ stores/permission-context.tsx
  ✗ components/security/*          ← nothing from this directory
```

### The finding this turned up

The Part AK security layer — `ForensicWatermark`, `SecurityCanary`,
`IdleSessionGuard`, `BotSignalCollector` — **has never run in production.**
It was written, reviewed, merged and shipped into the file the framework was
ignoring. Four security features and their four backing tables have been
dormant since Part AK landed.

That reverses the risk I first described. The danger was never "someone
deletes the stray JS file". It is that `layout.tsx` reads like the live
layout, so anyone auditing security would conclude the layer is on.

### What changed

`layout.tsx` now holds both trees and is the only layout. Order:

```
PermissionsProvider          server component; reads session from cookies
  └─ AiJobProviderClient
      └─ DashboardWrapper    auth gate + NewAdminDashboardShell
          └─ AdminSecurityLayer
              └─ {children}
```

`AdminSecurityLayer` sits **inside** `DashboardWrapper`, not outside it.
`DashboardWrapper` returns `null` until the session is confirmed, so the
watermark and canary only mount once there is an identity to attribute them
to. A watermark over a pre-auth blank screen identifies nobody.

### Still to do

Run `bash scripts/cleanup/01-run.sh`. It creates the branch, deletes
`layout.js`, and runs typecheck + build. Then check by hand that sign-in,
sign-out and the newly-live security layer all behave — the script prints
the list. **Expect the security layer to need tuning**: it is four pieces of
UI-affecting code being exercised for the first time.

---

## 2 · Supabase clients — **five collapsed to three, callers untouched**

There were five modules, two of them service-role, with four different env
fallback chains between them.

### New canonical modules

| Module | Export | Runs as | RLS |
| --- | --- | --- | --- |
| `lib/db/browser.ts` | `getBrowserClient()` | signed-in admin | enforced |
| `lib/db/server.ts` | `getServerClient()` | signed-in admin | enforced |
| `lib/db/admin.ts` | `getAdminClient()` | service role | **bypassed** |

`lib/db/env.ts` resolves connection settings once. `lib/db/README.md` is the
data-access rule — which client to use where, and why the RLS trap costs
features rather than throwing errors.

### Two real changes

- **`lib/supabase/indexAdmin.ts` no longer builds a service-role client on
  import.** It used to construct one at module scope, so importing the file
  from anywhere — including by accident from a client component — created a
  client holding the service key. It is now a lazy Proxy: same shape for
  callers, but nothing is constructed until first use.
- **`lib/db/admin.ts` throws if evaluated in a browser bundle.** A backstop,
  not permission. The stronger fix is the zero-dependency `server-only`
  package and `import "server-only";` as line 1, which turns a client import
  into a *build* error naming the file. Left out to avoid adding a dependency
  mid-cleanup — worth adding.

### Nothing else changed behaviour

The five old modules are now deprecated re-exports. No call site was edited,
so this half of the work cannot have broken anything. Mobile is untouched:
the Expo app has its own Supabase client and never imports from this repo.

### ⚠️ The thing to look at next

`lib/supabase.ts` exports **two clients that do not share a session**:

- `supabase` — plain `supabase-js`, session in **localStorage**
- `getSupabaseClient()` — `@supabase/ssr`, session in **cookies**

Sign-in writes the session to cookies. So anything using `supabase` is
probably querying as `anon`, not as the signed-in admin — and any table
requiring `authenticated` returns **empty rather than erroring**. That is the
same silent-empty failure that hid three broken features this month
(`healthy_living_body_parts`, `fitness_body_parts`, `drug_body_parts`).

Both exports are preserved exactly as they were, because migrating a caller
from `supabase` to `getBrowserClient()` is a behaviour change — it may start
returning rows where it previously returned none. Usually that is the fix,
but each call site needs looking at. To find them:

```bash
rg -l "from ['\"]@/lib/supabase['\"]" --type ts --type tsx
```

---

## 3 · Parallel modules — **classified, not yet deleted**

Reachability was checked against the real nav,
`app/(dashboard)/_components/admin-shell/navigation.ts`.

### Live (in the sidebar)

`/ai` · `/anatomy` · `/fitness` · `/medenquiry` · `/medication-reminder` ·
`/reviews` · `/schematic` · `/security`

### Not in the sidebar — candidates, **not confirmed dead**

| Route | Note |
| --- | --- |
| `human-anatomy` | 124-byte redirect stub → `/anatomy`. Harmless; may back a bookmark. |
| `new-fitness` | Single `FitnessMenu.jsx`. Superseded by `/fitness`. |
| `ai-hub` | 8 files incl. a 23 KB Workspace. **Substantial — check before touching.** |
| `medication-enquiry` | Third spelling alongside `medenquiry`. |
| `view-reviews` | Superseded by `/reviews`. |
| `platform-schematic` | Superseded by `/schematic`. |
| `security-center` | Superseded by `/security`. |
| `categories`, `unauthorized`, `onboarding-requests`, `referrals`, `view-facility-profile`, `view-medication-reminder-details`, `view-notification` | **Probably live via deep links,** not the sidebar. `unauthorized` is a redirect target for permission failures. |

Absence from the sidebar is weak evidence. Nothing above is safe to delete on
that alone, and several are near-certainly reachable. Settle it mechanically:

```bash
pnpm add -D knip
pnpm knip --include files,exports,dependencies
```

Then delete in themed batches with a build between each.

### Also pending

- `components/redesign/Sidebar.tsx` (10 KB) contains one link, `/login`. The
  real nav is `admin-shell/navigation.ts`. Strong dead-code candidate.
- `AdminDashboardShell.tsx` vs `NewAdminDashboardShell.tsx` — only the New one
  is referenced, from `DashboardWrapper`.
- `lib/csv-export.ts` and `lib/export-csv.ts` — same job, different
  signatures. Pick one.

Renaming for consistency (`healthy_living` → `healthy-living`,
`medenquiry` → `medication-enquiry`) is worth doing but must ship **with
redirects** — admins have these bookmarked, and `medenquiry` is in the nav.

---

## 4 · Type safety — **not started**

`tsconfig.json` sets `strict: true` above `allowJs: true` / `checkJs: false`,
and its `include` lists only `.ts` and `.tsx`. The 79 `.js`/`.jsx` files under
`app/` are never type-checked — including `app/services/dashboard.js` (31 KB).
`eslint.config.mjs` additionally excludes `redesign/**` entirely.

Converting those files blind, with no way to run `tsc` between edits, is how a
cleanup becomes an outage. This one needs the build loop working first.
