# Medication Reminder

The drug database, drug interactions, pharmacy verification queue, adherence
analytics, logged reminders and the pharmacy campaign tool.

Ninth feature migrated under E3.2. `features/anatomy` is the exemplar.

## Layout

```
features/medication-reminder/
  ui/       MedicationReminderPage (tab shell) + 11 tabs/dialogs, and
            ReminderDetailsPage (the /view-medication-reminder-details route)
  api/      5 route handlers
  data/     useMedicationReminder, useDrugs, drug-import-mapping
  schema/   (empty — nothing here is shared between ui/ and api/ yet)
```

## Routes

All seven URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/medication/drugs` | GET, POST | `api/drugs.ts` | `medication.view` / `medication.edit` |
| `/api/medication/drugs/[id]` | PATCH, DELETE | `api/drugs-detail.ts` | `medication.edit` |
| `/api/medication/drugs/import` | POST | `api/drugs-import.ts` | `medication.edit` |
| `/api/medication/interactions` | GET, POST | `api/interactions.ts` | `medication.view` / `medication.edit` |
| `/api/medication/verification` | GET, POST | `api/verification.ts` | `medication.view` / `medication.edit` |

Pages: `/medication-reminder` → `ui/MedicationReminderPage`,
`/view-medication-reminder-details` → `ui/ReminderDetailsPage`.

**`/api/send-reminders` is not part of this feature**, and is not where
reminders are sent. It is a six-line placeholder returning 501, left in `app/`
because there is no logic to move. The real dispatch already exists elsewhere:
a `pg_cron` job (`medication-reminder-job`, every minute) POSTs to the
`send-reminders` **Supabase edge function**. Do not "implement" the placeholder
without checking whether you would be double-sending.

## A fourth Supabase client, and the page it broke

`ui/ReminderDetailsPage.jsx` read `medication_reminders` through
`app/utils/supabaseClient.js` — a **fourth** Supabase client that E1.2 missed
because it is a `.js` file outside the audit. It is a plain `createClient`, so
it keeps its session in `localStorage` rather than cookies and therefore
queries as **`anon`**, not as the signed-in admin.

`medication_reminders` is RLS-locked to the row owner or a `super_admin`, so
this page read **0 of 3 rows and rendered nothing, without erroring** — the
exact silent-empty failure `lib/db/README.md` exists to prevent. It now uses
`getBrowserClient()`, and the page renders real data; verified in a browser
against a real reminder id.

⚠️ **That fix is minimal, not complete.** It works because the session belongs
to a `super_admin`. A `medication.view` admin who is not `super_admin` still
sees nothing, because no policy admits them. The rule-1-correct fix is an API
route with `getAdminClient()` after `requireAdminApiUser("medication.view")`.
It was not built here because **nothing in the app links to this page** — it is
an orphan, and the honest question is whether it should exist at all rather
than what client it should use.

**Five other files still use that client.** See `docs/cleanup-handoff.md`; two
of them read tables that do not exist.

## Mobile contract

None of the five routes is contracted. `medication_reminders` and
`medication_adherence` **are** contracted tables, read directly by the Expo
app, so admin writes land in a shape mobile depends on — additive only.

The four RPCs called here (`admin_delete_medication_reminder`,
`get_medication_kpi_stats`, `get_drug_kpi_stats`, `get_drug_adherence_stats`)
are admin-only, uncontracted, and all verified to exist.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; all
five handlers were converted off the deprecated `@/lib/supabase-admin` shim.
`data/*` uses the browser client.

## Things that will surprise you

- **`data/drug-import-mapping.ts` is also imported by a script**,
  `scripts/seed-drugs-from-json.ts`, by relative path. It moved with the
  feature and the script's specifier was updated; scripts resolve `@/` too,
  via the `paths` mapping in `tsconfig.json`.
- **`ReminderDetailsPage` is still `.jsx`** and never type-checked. Its broken
  client survived this long partly because of that — `tsc` never looked at it.
  Converting it is E5.1.
