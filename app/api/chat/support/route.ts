/**
 * Route entry only — see features/chat/README.md.
 * Handler lives in features/chat/api/support.ts.
 *
 * MOBILE CONTRACT: hooks/use-support-tickets.ts calls this. Verbs below must match the
 * handler exactly; tests/contract/api-routes.test.ts follows this re-export
 * and reads them from the module that defines them.
 */
export { GET, POST, PATCH } from "@/features/chat/api/support";
