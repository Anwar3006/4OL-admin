/**
 * Route entry only — see features/chat/README.md.
 * Handler lives in features/chat/api/conversations.ts.
 *
 * MOBILE CONTRACT: hooks/chat/useConversationList.ts calls this. Verbs below must match the
 * handler exactly; tests/contract/api-routes.test.ts follows this re-export
 * and reads them from the module that defines them.
 */
export { GET } from "@/features/chat/api/conversations";
