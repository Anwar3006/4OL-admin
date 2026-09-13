# Mobile load test — 4 Our Life

Ramp-to-failure test from the perspective of an Expo app user, against the
production project `rhbbxttxnvcziyqzptqs` (eu-west-1).

## Run it from Ghana

The database is in Ireland. Roughly 100–160 ms of every response is speed of
light between Accra and eu-west-1, and it will not show up if you run this from
a cloud region. Run it on your Mac, on a wired connection if you have one — a
saturated home uplink will look exactly like a saturated server.

## Setup

```bash
brew install k6              # or: docker run --rm -i grafana/k6
pnpm add -w @supabase/supabase-js   # only needed for seed-users.mjs
```

Export the config (values are in `4-Our-Life-App/.env` and the admin repo's
`.env.production` — do not commit them):

```bash
export SUPABASE_URL='https://rhbbxttxnvcziyqzptqs.supabase.co'
export SUPABASE_PUBLISHABLE_KEY='sb_pub_...'      # EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export API_URL='https://office.4ourlife.com'
export SUPABASE_SERVICE_KEY='eyJhbG...'           # SERVICE_KEY, seeding only
```

## 1. Anon pass (safe, start here)

Public read surface only. Touches no user records.

```bash
k6 run -e MODE=anon -e PEAK=200 k6-mobile.js
```

## 2. Authenticated pass

```bash
node seed-users.mjs create 50
k6 run -e MODE=auth -e PEAK=400 k6-mobile.js
node seed-users.mjs destroy          # <- do not skip this
```

`seed-users.mjs` uses the reserved domain `@loadtest.4ourlife.invalid`, so
`destroy` can find and remove every account it made even if
`loadtest-users.json` is lost.

## Reading the result

The ramp holds each concurrency step for two minutes. **The knee is the last
step where the error rate stayed under 1% and p95 under 2.5 s** — read it off
the per-step time series, not the end-of-run summary. Aggregate percentiles
blend all the steps together, including the easy early ones, and will flatter
you by a wide margin.

`abortOnFail` stops the run once the SLO breaks, so a run that ends early has
succeeded at its job.

## What this test does NOT tell you

Most tables are genuinely empty; a handful (`activity_logs` 12,282 rows,
`fitness_body_parts` 4,066, `fitness_exercises` 3,392, `drugs` 3,159) hold real
data. So this measures a real but *partial* load: `facility_profile` has 3 rows
and `symptoms` has 70, and those are the tables the mobile app leans on hardest.

The dominant cost at realistic data volumes is an RLS pattern that scales at
~17.5 µs per row scanned. Seed a realistic dataset on a Supabase branch before
treating any of these numbers as a capacity plan.

## Watch the server side while it runs

```sql
-- connection pressure (max_connections is 60)
select state, count(*) from pg_stat_activity group by state;

-- what is actually burning CPU
select calls, round(mean_exec_time::numeric,1) as mean_ms,
       round(total_exec_time::numeric) as total_ms, left(query, 90) as query
from pg_stat_statements order by total_exec_time desc limit 20;
```
