/**
 * Route entry only — see features/chat/README.md.
 * Handler lives in features/chat/api/messages-read.ts.
 *
 * MOBILE CONTRACT: hooks/chat/useDirectMessages.ts calls this. Verbs below must match the
 * handler exactly; tests/contract/api-routes.test.ts follows this re-export
 * and reads them from the module that defines them.
 */
export { POST } from "@/features/chat/api/messages-read";
