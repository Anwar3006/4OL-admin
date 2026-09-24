-- Rollback for 20260924005000_p203b_direct_conversations.sql
--
-- ⚠ Restores three functions to states where they raise on every call
-- (42883 uuid = text, and text = subscription_privilege). Nothing calls them
-- today, so that is survivable, but it is a return to broken — prefer fixing
-- forward.
--
-- Data note: dropping conversations.enquiry_id loses the link between chats and
-- the enquiries they are about. The conversations and their messages survive.
-- Direct conversations created by fn_get_or_create_direct_conversation also
-- survive as ordinary rows (type='direct'); nothing else reads that column, so
-- they simply become unlinked general threads. Export first if you care:
--
--     select id, enquiry_id, created_at from public.conversations
--     where enquiry_id is not null;

drop function if exists public.fn_get_or_create_direct_conversation(uuid, uuid);

-- Back to the broken bodies, exactly as they were.
create or replace function public.can_insert_conversation_member(
  target_user_id text,
  target_conversation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  current_user_id text;
  is_user_admin boolean;
  can_manage boolean;
BEGIN
  current_user_id := auth.jwt() ->> 'sub';

  RAISE NOTICE 'Current user: %, Target user: %, Conversation: %',
    current_user_id, target_user_id, target_conversation_id;

  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = current_user_id
      AND role IN ('admin', 'super_admin')
  ) INTO is_user_admin;

  RAISE NOTICE 'Is admin: %', is_user_admin;

  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = target_conversation_id
      AND user_id = current_user_id
      AND role IN ('owner', 'admin', 'group_leader')
      AND left_at IS NULL
  ) INTO can_manage;

  RAISE NOTICE 'Can manage conversation: %', can_manage;

  RETURN (
    target_user_id = current_user_id
    OR
    is_user_admin
    OR
    can_manage
  );
END;
$function$;

create or replace function public.facility_has_privilege(p_facility_id uuid, p_privilege text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.facility_subscriptions fs
        JOIN public.marketing_subscriptions ms ON fs.subscription_id = ms.id
        WHERE fs.facility_id = p_facility_id
          AND fs.status = 'active'
          AND (fs.current_period_end IS NULL OR fs.current_period_end > NOW())
          AND p_privilege = ANY (ms.privileges)
    );
END;
$function$;

create or replace function public.user_can_manage_conversation(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = target_conversation_id
      AND user_id = auth.jwt() ->> 'sub'
      AND role IN ('owner', 'admin', 'group_leader')
      AND left_at IS NULL
  );
$function$;

drop index if exists public.idx_conversations_enquiry;
alter table public.conversations drop column if exists enquiry_id;

notify pgrst, 'reload schema';
