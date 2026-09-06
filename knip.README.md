# Why knip is configured the way it is

`pnpm knip` is the evidence for every deletion in this cleanup (rule 3 in
`CLAUDE.md`: delete on evidence, never on reading). A tool that lies is worse
than no tool, so each entry below exists because the unconfigured run got
something demonstrably wrong.

## `entry`

Knip finds entry points from plugins (Next.js, Vitest, Playwright) and from
`package.json` scripts. Four things it could not find on its own:

- **`tests/smoke/auth.setup.ts`** — the Playwright plugin reads `testDir` and
  the default `*.spec.ts` / `*.test.ts` match. This file is reached only
  through the `setup` project's `testMatch: /auth\.setup\.ts/`, which the
  plugin does not evaluate. Without this line knip reports the smoke suite's
  sign-in step as dead code.
- **`scripts/**`** — seeders invoked as `tsx scripts/x.ts`. The ones wired to
  a `package.json` script are found; the rest are run by hand.
- **`supabase/migrations/*.mjs`** — one-shot migration scripts run with node.
- **`proxy.ts`** — Next.js middleware.

## `ignore`

- **`redesign/**`** — **not code.** This was an unfinished parallel UI when the
  entry was written; today the directory holds nine files and every one is
  documentation, SQL or an image (`SCHEMA_ANALYSIS.md`, `TECH_STACK.md`,
  `SCHEMA_MIGRATION.sql`, `image.png`, …). Knip only analyses JS/TS, so the
  ignore is now a no-op kept for clarity rather than effect.

  **Do not confuse it with `components/redesign/`**, which is a different
  directory holding eight live components — `PageHeader` (36 importers),
  `KpiCard` (52), `DataTable`, `Modal` and friends. That one has never been
  ignored by anything. Earlier notes in `docs/cleanup-handoff.md` conflated
  the two and concluded the ignored tree contained live UI; it does not.
- **`Claude outputs/**`** — scratch, not source.

## `ignoreDependencies`

- **`supabase`** — the CLI. Invoked as a binary for migrations, never
  imported. Knip is right that no code imports it; it is still required.
- **`tailwindcss-animate`** — loaded by Tailwind v4 from CSS, not from JS:
  `app/globals.css` line 3 is `@plugin "tailwindcss-animate";`. Knip analyses
  JS/TS and cannot see a CSS at-rule, so it reports the package as unused. It
  is not: 62 components use its `animate-in` / `fade-in-0` / `zoom-in-95`
  utilities, and removing it silently drops every dialog and popover
  animation — nothing errors, the UI just stops moving. Found while pruning
  dependencies for E6.2, where it was the last "unused" entry left.

## Known false positives, deliberately NOT suppressed

`components/ui/button.tsx`, `card.tsx` and `select.tsx` are reported unused.
**They are not** — `button.tsx` alone has 143 importers.

The cause is worth knowing, because it will recur. Each has a legacy
PascalCase sibling in the same directory:

    components/ui/Button.jsx   components/ui/button.tsx
    components/ui/Card.jsx     components/ui/card.tsx
    components/ui/Select.jsx   components/ui/select.tsx

An import of `@/components/ui/button` carries no extension, so the specifier
is ambiguous: the bundler picks `.tsx` before `.jsx` and gets the shadcn
component, while knip's resolver picks the other one on a case-insensitive
filesystem. Both halves then look unimported.

These are not suppressed because the fix is to delete the `.jsx` half, not to
teach the tool to live with it — the same ambiguity is a real hazard for any
engineer moving this code to a case-sensitive filesystem. The four dead
legacy components (`Breadcrumbs`, `Button`, `Card`, `Select` — all verified at
zero importers with a case-sensitive search) are gone as of this branch.

Five legacy `.jsx` components in that directory are still live and have no
`.tsx` counterpart, so they are unaffected: `HtmlRenderer`, `Icon`, `Modal`,
`Pagination`, `Textinput`. Porting them is E2.2.
