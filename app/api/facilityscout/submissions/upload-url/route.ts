/**
 * Route entry only — see features/facility-scout/README.md.
 * Handler lives in features/facility-scout/api/upload-url.ts.
 *
 * MOBILE CONTRACT: hooks/use-facility-scout.ts (Expo app) calls this. Verbs
 * below must match the handler exactly; tests/contract/api-routes.test.ts
 * follows this re-export and reads them from the module that defines them.
 */
export { GET } from "@/features/facility-scout/api/upload-url";
