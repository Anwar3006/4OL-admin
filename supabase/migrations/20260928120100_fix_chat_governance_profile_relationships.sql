-- Expose the direct PostgREST relationships used by the governance screens.
alter table public.conversation_join_requests drop constraint if exists conversation_join_requests_user_id_fkey;
alter table public.conversation_join_requests add constraint conversation_join_requests_user_id_fkey foreign key (user_id) references public.user_profiles(user_id) on delete cascade;
alter table public.conversation_join_requests drop constraint if exists conversation_join_requests_requested_by_user_id_fkey;
alter table public.conversation_join_requests add constraint conversation_join_requests_requested_by_user_id_fkey foreign key (requested_by_user_id) references public.user_profiles(user_id) on delete cascade;
alter table public.conversation_invitations drop constraint if exists conversation_invitations_invited_user_id_fkey;
alter table public.conversation_invitations add constraint conversation_invitations_invited_user_id_fkey foreign key (invited_user_id) references public.user_profiles(user_id) on delete cascade;
alter table public.conversation_invitations drop constraint if exists conversation_invitations_invited_by_user_id_fkey;
alter table public.conversation_invitations add constraint conversation_invitations_invited_by_user_id_fkey foreign key (invited_by_user_id) references public.user_profiles(user_id) on delete cascade;
notify pgrst,'reload schema';
