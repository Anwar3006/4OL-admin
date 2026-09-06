# Architecture Blueprint & Engineering Guidelines

This document defines the canonical architecture, structural design patterns, data access rules, state management guidelines, and security safeguards for the **4 Our Life Admin Dashboard** and any future companion products derived from this template.

---

## 1. System Overview & Technology Stack

The application is a Next.js (App Router, Turbopack) administrative dashboard backed by a Supabase Postgres database in `eu-west-1`. A companion Expo mobile application (`4-Our-Life-App`) shares the same database and API contract.

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
- **Styling**: TailwindCSS + Radix UI / Shadcn primitives
- **Database**: Supabase Postgres (PostgREST API + RLS + PL/pgSQL RPCs)
- **State Management**: Zustand for global UI dialog state; TanStack React Query for async data fetching
- **Testing**: Vitest for unit & contract tests; Playwright for end-to-end integration

---

## 2. Directory & Layer Architecture

The codebase enforces strict separation of concerns across four primary top-level directories:

```
4-Our-Life/
├── app/                        # Next.js App Router routing shell & pages only
│   ├── (auth)/                 # Public auth routes (login, forgot-password, etc.)
│   ├── (dashboard)/            # Admin dashboard routes (thin page wrappers)
│   └── api/                    # Server-side API endpoints & webhooks
├── components/                 # Shared, cross-feature UI design system
│   ├── redesign/               # Core design tokens (PageHeader, KpiCard, KpiGrid)
│   ├── ui/                     # Primitives (button, card, dialog, table, input)
│   └── Data-Table/             # Shared data table components
├── features/                   # Self-contained domain feature modules
│   └── <feature-name>/         # e.g., features/facilities, features/ai
│       ├── api/                # Feature API handlers / server functions (optional)
│       ├── data/               # Data fetching hooks & feature dialog hooks
│       ├── schema/             # Hand-written Zod schemas & TypeScript types
│       ├── ui/                 # React components & tabs for this feature
│       └── README.md           # Mandatory feature documentation
├── lib/                        # Cross-cutting system utilities
│   ├── db/                     # Canonical Supabase database clients (browser, server, admin)
│   ├── csv.ts                  # Standardized CSV export generator
│   ├── format.ts               # Standardized currency/date/number formatters
│   └── permissions.ts          # Role-based access control (RBAC) helpers
└── stores/                     # Global state infrastructure
    └── dialog-store.ts         # Core Zustand dialog store & global dialog hooks
```

### Key Architectural Rules

1. **Routing Shell (`app/`)**: Pages under `app/(dashboard)/<feature>/page.tsx` must remain thin wrappers (~15–30 lines) that render the primary feature component from `@/features/<feature>/ui/<FeaturePage>`.
2. **Feature Encapsulation (`features/`)**: A domain feature lives inside a single directory under `features/`. Every feature module **MUST** contain a `README.md` explaining its responsibility, data sources, and components (enforced automatically by `tests/unit/feature-layout.test.ts`).
3. **No Cross-Feature Scaffolding**: Components specific to a single feature must not pollute `components/`. Cross-feature sharing is allowed only for generic infrastructure (e.g., `PageHeader`, `KpiCard`, `formatCurrency`).

---

## 3. Database & Data-Access Architecture

Database access follows a strict **3-Client Supabase Architecture** managed under `@/lib/db/`.

| Client | Creator Function | Import Specifier | RLS Status | Usage Context |
|---|---|---|---|---|
| **Browser Client** | `getBrowserClient()` | `@/lib/db/browser` | **Enforced** | Client Components & browser hooks |
| **Server Client** | `getServerClient()` | `@/lib/db/server` | **Enforced** | Server Components & Server Actions |
| **Admin Client** | `getAdminClient()` | `@/lib/db/admin` | **Bypassed** (Service Role) | Route Handlers under `app/api/**` |

### Security & Data Access Rules

1. **RLS Enforcement Trap**:
   PostgREST returns an **empty array/set (`[]`) without throwing an error** if a table has Row-Level Security (RLS) enabled but lacks a matching policy for the caller's role. A query that returns `[]` looks like valid empty data.
2. **Admin API Mutation Pattern**:
   All administrative writes, updates, deletes, and reads against RLS-locked tables **MUST** route through an API Handler (`app/api/**`) using `getAdminClient()` paired with explicit permission checks:

```ts
import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function POST(req: Request) {
  // 1. Authorise. requireAdminApiUser returns a result object, not a user —
  //    check `.ok` and hand the failure to adminAuthErrorResponse, which sets
  //    the right status. Permissions are dotted: "facilities.edit".
  const auth = await requireAdminApiUser("facilities.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  // 2. Service-role client for the privileged write.
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("facility_profile").insert(...);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

The table is `facility_profile`, not `facilities` — there is no `facilities`
table. Check a column or table name against `lib/db/database.types.ts` before
writing a query; an unknown column does not degrade, it fails the **whole**
PostgREST request.

### Two clients outside the three

- **`lib/db/isolated-auth.ts`** — deliberately NOT the app's session. One
  caller: the public `/delete-account` page, which signs a user in and out
  without disturbing the admin signed into the same browser.
- **`lib/supabase.ts`** — the legacy **anon** client, session in localStorage
  rather than cookies. Two callers remain and both are suspect; do not add a
  third. Reads through it hit the empty-set trap above.

---

## 4. State Management & Dialog Store Architecture

Dialogs throughout the application are managed using a decoupled **Zustand Store + Feature-Owned Hook Pattern**.

```
stores/dialog-store.ts (Generic Zustand Store Core + Global Dialogs)
      │
      ├── features/facilities/data/dialog-hooks.ts
      ├── features/marketing/data/dialog-hooks.ts
      ├── features/admins/data/dialog-hooks.ts
      └── features/chat/data/dialog-hooks.ts
```

### Design Pattern

1. **Central Store (`stores/dialog-store.ts`)**:
   Holds the global Zustand state map `Record<DialogTypes, DialogConfig>`, core `openDialog`/`closeDialog` methods, and global dialogs (such as `useGalleryModal`).
2. **Feature-Owned Dialog Hooks (`features/<feature>/data/dialog-hooks.ts`)**:
   Each feature exposes its own strongly-typed hook wrappers for opening and closing its dialogs:

```ts
// features/facilities/data/dialog-hooks.ts
import { useDialogStore } from "@/stores/dialog-store";

export const useAddFacilityDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-facility"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-facility"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-facility", { data }),
    close: () => closeDialog("add-facility"),
  };
};
```

---

## 5. Mobile Contract & Automated Safeguards

Because the mobile Expo app (`4-Our-Life-App`) shares this database and API surface, the application enforces automated safeguards against regressions:

1. **API Route Contract (`tests/contract/api-routes.test.ts`)**:
   Asserts that all contracted mobile endpoints exist, export expected HTTP verbs, and follow frozen route specifiers documented in `docs/mobile-contract.md`.
2. **RPC Signature Suite (`tests/contract/rpc-signatures.test.ts`)**:
   Asserts that database stored procedures invoked by client apps retain exact parameter names, return types, and schemas.
3. **Feature Layout Compliance (`tests/unit/feature-layout.test.ts`)**:
   Asserts that every feature under `features/` adheres to directory structure rules and contains a `README.md`.

---

## 6. Step-by-Step New Feature Creation Blueprint

When creating a new domain feature (e.g., `features/telemedicine`):

1. **Create the feature directory**:
   ```bash
   mkdir -p features/telemedicine/{api,data,schema,ui}
   ```
2. **Add `features/telemedicine/README.md`**:
   Document the purpose, components, and endpoints of the new feature.
3. **Define schemas and types in `features/telemedicine/schema/types.ts`**:
   Zod validation schemas, plus the row/response shapes `ui/` and `api/` must
   agree on. Derive row types from the generated schema rather than retyping
   columns by hand — that is what stops them drifting:
   ```ts
   import type { Database } from "@/lib/db/database.types";
   type Row = Database["public"]["Tables"]["telemedicine_sessions"]["Row"];
   ```
   Do **not** type the shared clients with `<Database>`; see `lib/db/README.md`
   for why (it crashes `tsc`).
4. **Define feature dialog hooks in `features/telemedicine/data/dialog-hooks.ts`**:
   Create typed hook wrappers using `useDialogStore`.
5. **Create feature components in `features/telemedicine/ui/`**:
   Build tab components and dialogs using shared design system primitives (`PageHeader`, `KpiCard`, `KpiGrid`).
6. **Add thin page shell in `app/(dashboard)/telemedicine/page.tsx`**:
   Render `<TelemedicinePage />` from `@/features/telemedicine/ui/TelemedicinePage`.
7. **Verify structural compliance**:
   ```bash
   pnpm type-check
   pnpm test
   ```
