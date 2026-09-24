-- Rollback for 20260924004000_p203a_fix_group_conversation_rpc.sql
--
-- ⚠ This restores a state that is broken in TWO ways: the ambiguous 5-arg
-- overload comes back (so a 5-argument named call raises 42725 again), and both
-- overloads go back to passing text into uuid columns, so neither can create a
-- group at all (42804). Group creation was dead for two months in this state.
--
-- Only run it if the fixed version breaks something worse. Groups created while
-- the fix was live are untouched and remain valid.

-- 1. Put the 6-arg version back to its broken body (text into uuid columns),
--    including dropping the search_path pin it did not have.
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
    p_created_by,
    p_avatar_url,
    CASE WHEN p_facility_id IS NOT NULL THEN 'facility' ELSE 'general' END
  )
  RETURNING id INTO v_conv_id;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, p_created_by, 'owner');

  FOREACH v_member IN ARRAY p_member_ids LOOP
    IF v_member != p_created_by THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (v_conv_id, v_member, 'member')
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

alter function public.fn_create_group_conversation(text, text, text, text, text[], uuid)
  reset search_path;

-- 2. Recreate the dropped 5-arg overload exactly as it was, ambiguity included.
create or replace function public.fn_create_group_conversation(
  p_avatar_url text,
  p_name text,
  p_description text,
  p_created_by text,
  p_member_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog, public'
as $function$
DECLARE
  v_conv_id UUID;
  v_member  TEXT;
BEGIN
  INSERT INTO conversations (type, name, description, created_by, avatar_url)
  VALUES ('group', p_name, p_description, p_created_by, p_avatar_url)
  RETURNING id INTO v_conv_id;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, p_created_by, 'owner');

  FOREACH v_member IN ARRAY p_member_ids LOOP
    IF v_member != p_created_by THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (v_conv_id, v_member, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$function$;

revoke execute on function
  public.fn_create_group_conversation(text, text, text, text, text[]) from public;
grant execute on function
  public.fn_create_group_conversation(text, text, text, text, text[])
  to authenticated, service_role;
