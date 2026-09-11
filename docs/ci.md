# CI — the two workflows, and the secrets they need

## The short answer

Add **three** repository secrets. Nothing else in `.env.example` belongs in
GitHub — the rest is deployment runtime configuration, not CI configuration.

| Secret | Used by | What breaks without it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `ci.yml` — test + build | The live RPC signature check **skips**. See below. |
| `SUPABASE_SECRET_KEY` | `ci.yml` — test + build | Same. This is the service-role key; never name it `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `ci.yml` — build | The build still passes, but the bundle it produces has no anon key baked in. |

Settings → Secrets and variables → Actions → New repository secret.

## ⚠️ CI passes today without any of them, and that is the trap

This was measured, not assumed: with `.env.local` moved aside and no
environment at all, `pnpm build` still reports **Compiled successfully**, and
`pnpm test` reports **123 passed, 1 skipped**.

That "1 skipped" is `tests/contract/rpc-signatures.test.ts` — the check that
the 48 Postgres functions the Expo app calls still exist with unchanged
signatures. It skips itself when credentials are absent so a fork PR stays
green. **Skipped and passed look almost identical in the Actions log.**

So the secrets do not make CI go from red to green. They make it go from
*green-but-half-blind* to *green-and-meaning-it*. With them set, that suite
runs 66 assertions against the live database instead of 65 and a shrug.

## Optionally, two more

The Playwright route sweep (`pnpm test:smoke`, 83 tests) is **not** wired into
CI. It is the only thing that proves a route is reachable rather than merely
present. Adding it needs a job that builds, starts the server, and signs in:

| Secret | Purpose |
| --- | --- |
| `E2E_ADMIN_EMAIL` | Admin login for the sweep |
| `E2E_ADMIN_PASSWORD` | " |

Worth doing before this branch merges, since most of the cleanup's evidence
came from that sweep.

## Why there are two workflows

They are deliberately separate and should stay that way.

- **`ci.yml`** — the quality gate. Runs on every push to the release branches
  and on every PR: typecheck, lint, unit + contract tests, and a full
  production build. The build job exists because `tsc` does not catch a broken
  route-group layout, a client component importing server-only code, or a bad
  dynamic import.
- **`dependency-audit.yml`** — security. Also runs on a **weekly schedule**, so
  a CVE published against an already-pinned dependency surfaces without anyone
  pushing. That is the reason it is a separate workflow: a schedule applies to
  a whole workflow, and `ci.yml` should not re-run its build every Monday.

It needs **no secrets** — it reads the lockfile, it does not build or run
the app.

### `dependency-audit.yml` had never once succeeded

It ran `npm ci`. There is no `package-lock.json` in this repo and never has
been: the lockfile is `pnpm-lock.yaml` and `package.json` pins pnpm through
`packageManager`. `npm ci` exits `EUSAGE` before installing anything —
verified locally — so every run failed at the install step, and the audit it
was meant to perform has never run. It uses pnpm now, and Node 22 to match
`ci.yml`.

**Expect it to go red the first time.** `pnpm audit --audit-level=high` exits 1
against the current tree with **16 high and 12 moderate** advisories —
`lodash` (`_.template` code injection) is a direct dependency; the rest are
transitive build tooling (`postcss`, `browserslist`, `brace-expansion`,
`nanoid`, `immutable`, `ws`). That red is the workflow finally doing its job,
not a regression. Triaging it is separate work.

## Not CI secrets

Everything else in `.env.example` — `OPENAI_API_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `TWILIO_*`, `AWS_*`, `TRIVIA_DEVICE_PEPPER`,
`PERIOD_LEAD_ENCRYPTION_KEY`, `API_KEY` — is runtime configuration for the
deployment environment. Neither workflow reads any of it, and adding them to
GitHub would widen the blast radius of a compromised Actions run for no gain.
