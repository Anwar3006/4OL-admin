-- The live function was captured with p_user_id text although
-- conversation_members.user_id is uuid. Every mark-read request therefore
-- failed while comparing uuid = text. The API route is the only supported
-- caller and uses the service-role client after it verifies membership.

drop function if exists public.fn_mark_conversation_read(uuid, text);

create function public.fn_mark_conversation_read(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.conversation_members
  set unread_count = 0,
      last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = p_user_id;
end;
$function$;

-- Do not expose a definer function that can reset another member's unread
-- state. The mobile route authorizes membership before invoking it with the
-- service-role server client.
revoke all on function public.fn_mark_conversation_read(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.fn_mark_conversation_read(uuid, uuid)
  to service_role;
