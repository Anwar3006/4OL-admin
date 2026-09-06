/**
 * Route entry only — see features/chat/README.md.
 * Handler lives in features/chat/api/attachment.ts.
 *
 * MOBILE CONTRACT: app/(app)/(auth)/Chat/[id].tsx calls this. Verbs below must match the
 * handler exactly; tests/contract/api-routes.test.ts follows this re-export
 * and reads them from the module that defines them.
 */
export { GET } from "@/features/chat/api/attachment";
