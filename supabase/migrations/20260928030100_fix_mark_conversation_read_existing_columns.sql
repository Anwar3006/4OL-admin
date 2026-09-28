-- Production conversation_members currently stores unread_count but does not
-- have last_read_at. Keep the repaired UUID contract while only writing the
-- column that exists on this schema.

create or replace function public.fn_mark_conversation_read(
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
  set unread_count = 0
  where conversation_id = p_conversation_id
    and user_id = p_user_id;
end;
$function$;

revoke all on function public.fn_mark_conversation_read(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.fn_mark_conversation_read(uuid, uuid)
  to service_role;
