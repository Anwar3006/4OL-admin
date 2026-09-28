-- Group avatars are public once uploaded, but only a live group manager may
-- create an object in that group's folder. The UUID-shaped path guard keeps
-- the cast safe for every Storage object name.

drop policy if exists "group managers upload group avatars" on storage.objects;

create policy "group managers upload group avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bucket4ol'
  and case
    when name ~ '^chat/group-avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      then public.user_can_manage_conversation(
        (storage.foldername(name))[3]::uuid
      )
    else false
  end
);
