# Chat

Direct messages, group conversations, group membership, support tickets,
content moderation and the chat analytics tab.

Eleventh feature migrated under E3.2, and **the most contract-sensitive in the
repo**: seven of its eleven routes are frozen for mobile.

## Layout

```
features/chat/
  ui/       ChatsPage (tab shell) + 3 tabs + 2 dialogs + stats + ticket dialog
  api/      11 route handlers, one module per endpoint
  data/     useChat, useConversation (712 lines — the largest hook migrated)
  schema/   chat.ts, conversation.ts, constants.ts
```

The directory is `chat`; the page URL is `/chats` and the API prefix is
`/api/chat`. Those two disagreed before this migration and still do — both are
URL contracts. Only `app/` is a URL.

## ⚠️ Seven routes are mobile contract

| URL | Verbs | Handler | Expo consumer |
| --- | --- | --- | --- |
| `/api/chat/support` | GET, POST, PATCH | `api/support.ts` | `hooks/use-support-tickets.ts` |
| `/api/chat/conversations` | GET | `api/conversations.ts` | `hooks/chat/useConversationList.ts` |
| `/api/chat/messages` | GET, POST, PATCH, DELETE | `api/messages.ts` | `hooks/chat/useDirectMessages.ts` |
| `/api/chat/messages/read` | POST | `api/messages-read.ts` | `hooks/chat/useDirectMessages.ts` |
| `/api/chat/groups` | POST | `api/groups.ts` | `hooks/chat/useCreateGroup.ts` |
| `/api/chat/members` | GET, POST, PATCH | `api/members.ts` | `hooks/chat/useGroupMembers.ts` |
| `/api/chat/attachment` | GET | `api/attachment.ts` | `app/(app)/(auth)/Chat/[id].tsx` |

Each `app/` entry names its consumer in a header comment. The verbs in those
re-exports must match the handlers exactly — `tests/contract/api-routes.test.ts`
follows the specifier and reads the verbs from the defining module, so a
mismatch fails and names the mobile file that breaks. Mutation-tested during
this migration: renaming `messages.ts`'s `DELETE` fails with
*"/api/chat/messages no longer exports DELETE. hooks/chat/useDirectMessages.ts
calls it."*

The four admin-only routes are `analytics`, `global-search`, `moderation` and
`support/[id]`.

## Three RPCs were unprotected — now contracted

Three of the seven frozen routes delegate to functions nothing was watching:

```
/api/chat/messages       -> dispatch_notification
/api/chat/messages/read  -> fn_mark_conversation_read
/api/chat/groups         -> fn_create_group_conversation
```

That is the same gap that let `/api/auth/device-sign-in/send-otp` call a
function which did not exist, and that left `submit_period_trivia` free to
change under a frozen route. All three are now in `CONTRACT_RPCS` with pinned
signatures, verified live.

**`fn_make_group_leader` is deliberately not contracted** — its only caller is
`data/useConversation.ts`, an admin-side hook, not a mobile route.

## Data access and auth

Two different auth models live here, and the split matters:

- **The seven mobile routes authenticate a `Bearer` token**, not the admin
  cookie. Probing them with an admin session returns 401 — that is the handler
  running its own check, not a broken route.
- **The four admin routes** use `requireAdminApiUser("chats.view")` or
  `"chats.moderate"`.

Every handler uses `getAdminClient()` after its own check; all eleven were
converted off the deprecated `@/lib/supabase-admin` shim.

Contracted tables written here: `chat_support`, `user_profiles`,
`facility_profile`. Additive changes only.

## Things that will surprise you

- **`fn_create_group_conversation` is `security_definer: false`**, unlike the
  other two contracted chat RPCs. Whatever calls it runs with the caller's own
  privileges — worth knowing before changing its grants.
- **`data/useConversation.ts` is 712 lines**, the largest hook moved so far,
  and it is imported cross-feature by the Users tab's `PromoteToLeaderDialog`.
- **`schema/constants.ts` was `lib/chats-constants.ts`.** Five UI files and the
  hook share it, which is what `schema/` is for.
