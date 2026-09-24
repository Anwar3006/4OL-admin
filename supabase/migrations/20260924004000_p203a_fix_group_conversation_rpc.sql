-- P2-03 step 1 · Resolve the fn_create_group_conversation duplicate — and fix
-- the survivor, which turned out to be broken too.
--
-- ── The duplicate (the landmine the handover flagged) ────────────────────
--
-- Two live overloads existed, created by the `CREATE OR REPLACE` trap P0-15
-- documented: changing a function's parameter list does not replace it, it adds
-- a second one.
--
--   A  (p_avatar_url, p_name, p_description, p_created_by, p_member_ids)
--      5 args · SECURITY DEFINER · search_path pinned · no anon grant
--   B  (p_name, p_description, p_created_by, p_avatar_url, p_member_ids,
--      p_facility_id uuid DEFAULT NULL)
--      6 args · SECURITY INVOKER · no search_path · granted to anon and PUBLIC
--
-- Note the parameter ORDER differs: A takes avatar_url first, B takes name
-- first. A positional call would have filed the group's name as its avatar URL.
--
-- Because B's `p_facility_id` has a DEFAULT, a call supplying only the five
-- shared names matched BOTH candidates. Verified live before this migration:
--
--   ERROR: 42725 function public.fn_create_group_conversation(p_name => unknown,
--   p_description => unknown, p_created_by => unknown, p_avatar_url => unknown,
--   p_member_ids => text[]) is not unique
--
-- **B is authoritative**, on three independent pieces of evidence: the only
-- caller (`app/api/chat/groups/route.ts`, which the patient app reaches through
-- `/api/chat/groups`) sends all six named arguments; `tests/contract/
-- rpc-signatures.json` pins B's exact signature including
-- `security_definer: false`; and B is a strict superset of A, also setting
-- `group_category` and linking `facility_conversations`. A is dropped.
--
-- ── The part nobody had noticed: B could never insert a row ──────────────
--
-- Dropping the duplicate and then actually CALLING the survivor produced:
--
--   ERROR: 42804 column "created_by" is of type uuid but expression is of type text
--
-- `conversations.created_by` and `conversation_members.user_id` are **uuid**,
-- while both overloads declare `p_created_by text` / `p_member_ids text[]` and
-- insert them raw. There is no implicit text→uuid cast, so **every** call failed
-- on the first INSERT. Group creation has been dead since whichever migration
-- changed those columns to uuid: the newest row in `conversations` is from
-- **2026-07-27**, and there are 4 groups and **0 direct conversations** in the
-- entire table.
--
-- This is the same shape as every other bug in this phase — code that was
-- written, never exercised, and therefore never found to be broken. It is also
-- why "drop the duplicate" was not a safe stopping point: P2-03 is about to
-- build one-to-one chat on top of this, and the foundation did not work.
--
-- ── What changes, and what deliberately does not ─────────────────────────
--
-- Fixed: `p_created_by::uuid` and `v_member::uuid`, plus a guard so a NULL or
-- empty string in p_member_ids is skipped rather than raising 22P02.
--
-- **Parameter types stay `text`.** Casting inside keeps the signature identical,
-- so the contract pin still matches, PostgREST needs no reload, and no client
-- changes. Changing them to uuid would be a contract break for cosmetics.
--
-- **SECURITY INVOKER is kept.** The contract pins `security_definer: false` and
-- `features/chat/README.md` calls it out as a known quirk. Its only caller uses
-- the service-role client, which bypasses RLS anyway, so promoting it to DEFINER
-- would widen privileges for no benefit. `search_path` is pinned, which it
-- lacked, per the repo convention.
--
-- Left alone on purpose: B's grants to `anon` and PUBLIC. They predate this
-- work, and a SECURITY INVOKER function runs with the caller's own privileges —
-- so RLS, not the grant, is what stops anon writing. Narrowing them is a
-- separate decision with its own blast radius. **Flagged, not silently changed.**
--
-- Dry-run on prod in a rolled-back transaction: one overload left; the 5-arg
-- call resolved instead of raising 42725; group_category came out 'general'
-- without a facility and 'facility' with one; owner + member rows created; the
-- facility_conversations link written.

drop function if exists public.fn_create_group_conversation(text, text, text, text, text[]);

create or replace function public.fn_create_group_conversation(
  p_name text,
  p_description text,
  p_created_by text,
  p_avatar_url text,
  p_member_ids text[],
  p_facility_id uuid default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
DECLARE
  v_conv_id UUID;
  v_member  TEXT;
BEGIN
  INSERT INTO conversations (type, name, description, created_by, avatar_url, group_category)
  VALUES (
    'group',
    p_name,
    p_description,
    p_created_by::uuid,
    p_avatar_url,
    CASE WHEN p_facility_id IS NOT NULL THEN 'facility' ELSE 'general' END
  )
  RETURNING id INTO v_conv_id;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, p_created_by::uuid, 'owner');

  FOREACH v_member IN ARRAY p_member_ids LOOP
    -- The guard is not decoration: the API route passes `memberIds || []`
    -- straight through, so a stray null or '' from the client would otherwise
    -- raise 22P02 and lose the whole group.
    IF v_member IS NOT NULL AND v_member <> '' AND v_member <> p_created_by THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (v_conv_id, v_member::uuid, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  IF p_facility_id IS NOT NULL THEN
    INSERT INTO facility_conversations (facility_id, conversation_id)
    VALUES (p_facility_id, v_conv_id);
  END IF;

  RETURN v_conv_id;
END;
$function$;
