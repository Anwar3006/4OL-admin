# Rewards

The rewards catalogue and the grants ledger behind it: what can be won, the
criteria types a reward can be attached to, and every grant that has been
issued. Read-only for the sources that *generate* rewards (trivia events,
fitness challenges, fitcoin, facility-scout referrals) — this feature curates
the catalogue, it does not run the campaigns.

## Layout

```
features/rewards/
  ui/       RewardsPage
  api/      rewards.ts — one route module, GET + POST + PATCH
```

Only two of the four slots are used. There is no `data/` (the page fetches
`/api/rewards` directly) and no `schema/` (the shapes are local to the two
files). A new hook for this feature belongs in `features/rewards/data/`, not in
a shared hooks directory.

The directory is `rewards`, the page URL is `/rewards` and the API prefix is
`/api/rewards` — all three agree, which is not true of every feature here (see
`features/chat/README.md`).

## Routes

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/rewards` | GET, POST, PATCH | `api/rewards.ts` | `rewards.view` / `rewards.manage` |

`GET` requires `rewards.view`; `POST` and `PATCH` require `rewards.manage`.
Every verb calls `requireAdminApiUser(...)` first and only then takes a
service-role client, which is the order that matters — `lib/db/admin.ts`
bypasses RLS, so the permission check is the only thing standing in front of it.

## Tables and RPCs

**Written:** `reward_catalog` (insert on POST, update on PATCH).

**Read:** `reward_catalog`, `reward_criteria_types` (active rows only),
`reward_grants`, and four sources the page summarises but never writes —
`period_trivia_events`, `fitness_challenges`, `fitcoin_rewards`,
`facility_scout_config`.

**RPC:** `log_admin_activity` after each mutation.

## Mobile

**Nothing mobile depends on this feature.** `/api/rewards` is absent from
`tests/contract/mobile-contract.ts`, and neither `apps/consumer` nor
`apps/business` references the route or the `reward_*` tables. It is an
admin-only surface, so its routes are free to change shape — unlike the chat
and medenquiry routes.

Note that `reward_grants.user_id` is a real user FK, so rows here are affected
when an account is deleted (`ON DELETE CASCADE`). The grants ledger is not
retained past the account it belongs to.
