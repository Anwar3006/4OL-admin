# Transactions

Payments, refunds, payouts, expenses, tax/VAT, service charges and revenue analytics.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/transactions/
  ui/       15 files — components
  api/      10 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/transactions` | GET | `api/list.ts` |
| `/api/transactions/[id]` | PATCH | `api/detail.ts` |
| `/api/transactions/[id]/refund` | POST | `api/detail-refund.ts` |
| `/api/transactions/expenses` | GET, POST, PUT | `api/expenses.ts` |
| `/api/transactions/overview` | GET | `api/overview.ts` |
| `/api/transactions/rates` | GET, PUT | `api/rates.ts` |
| `/api/transactions/refunds` | GET, POST | `api/refunds.ts` |
| `/api/transactions/refunds/[id]` | PATCH | `api/refunds-detail.ts` |
| `/api/transactions/tax` | GET, PATCH | `api/tax.ts` |
| `/api/transactions/visibility` | GET, PUT | `api/visibility.ts` |

Permissions: `transactions.expenses`, `transactions.manage`, `transactions.rates`, `transactions.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

RPCs called (all admin-only and uncontracted): `get_transactions_overview`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.

## Things that will surprise you

- **Finance visibility is data-driven**: `finance_visibility_config` gates
  which cards render, so an empty tab may be configuration rather than a bug.
