-- Practitioner workspace: expose only the provider owner's verification records
-- to authorised practitioner settings managers, for choosing profile documentation.

create or replace function public.get_my_practitioner_licence_choices(
  p_provider_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_kind public.provider_kind;
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorised to manage this practitioner';
  end if;

  select owner_id, kind
    into v_owner_id, v_kind
  from public.providers
  where id = p_provider_id;

  if not found or v_kind <> 'practitioner' then
    raise exception 'Practitioner provider not found';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'license_number', h.license_number,
        'regulatory_body', h.regulatory_body,
        'specialty', h.specialty,
        'verification_status', h.verification_status,
        'verification_notes', h.verification_notes,
        'submitted_at', h.submitted_at,
        'verified_at', h.verified_at
      )
      order by
        case when h.verification_status = 'verified' then 0 else 1 end,
        h.submitted_at desc
    )
    from public.hcp_verifications h
    where h.user_id = v_owner_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_practitioner_licence_choices(uuid) from public;
grant execute on function public.get_my_practitioner_licence_choices(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
