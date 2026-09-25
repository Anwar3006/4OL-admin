-- Registrar-captured operating scope. These rows are deliberately separate
-- from provider_capabilities: a field observation is useful onboarding data,
-- not evidence that a regulated capability has been verified.

create table public.provider_registration_capabilities (
  provider_id uuid not null references public.providers(id) on delete cascade,
  capability text not null references public.capabilities(key) on delete restrict,
  source text not null check (source in ('registrar', 'admin', 'provider')),
  captured_by uuid references auth.users(id) on delete set null,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_id, capability)
);

create index provider_registration_capabilities_provider_idx
  on public.provider_registration_capabilities (provider_id, captured_at desc);

alter table public.provider_registration_capabilities enable row level security;
revoke all on public.provider_registration_capabilities from anon, authenticated;
grant select on public.provider_registration_capabilities to authenticated;
grant all on public.provider_registration_capabilities to service_role;

create policy "provider registration capabilities member read"
  on public.provider_registration_capabilities for select to authenticated
  using ((select public.is_provider_member(provider_id, 'profile.edit')));

create or replace function public.capture_provider_registration_capabilities(
  p_provider_id uuid,
  p_capabilities text[],
  p_captured_by uuid,
  p_source text default 'registrar'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_kind public.provider_kind;
begin
  if auth.role() <> 'service_role' and not public.is_app_admin()
     and public.get_user_app_role() <> 'registrar' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_source not in ('registrar', 'admin') then
    raise exception 'Invalid capture source';
  end if;
  select kind into v_kind from public.providers where id = p_provider_id;
  if v_kind is null then raise exception 'Provider not found'; end if;
  if exists (
    select 1 from unnest(coalesce(p_capabilities, '{}')) capability
    left join public.capabilities c on c.key = capability
    where c.key is null or (cardinality(c.applies_to) > 0 and not v_kind::text = any(c.applies_to))
  ) then raise exception 'A selected capability does not apply to this provider'; end if;

  insert into public.provider_registration_capabilities (provider_id, capability, source, captured_by)
  select p_provider_id, capability, p_source, p_captured_by
  from unnest(coalesce(p_capabilities, '{}')) capability
  on conflict (provider_id, capability) do update
    set source = excluded.source, captured_by = excluded.captured_by, updated_at = now();
end;
$$;

create or replace function public.set_my_provider_declared_capabilities(
  p_provider_id uuid,
  p_capabilities text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_kind public.provider_kind;
begin
  if not public.is_provider_member(p_provider_id, 'profile.edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select kind into v_kind from public.providers where id = p_provider_id;
  if exists (
    select 1 from unnest(coalesce(p_capabilities, '{}')) capability
    left join public.capabilities c on c.key = capability
    where c.key is null or (cardinality(c.applies_to) > 0 and not v_kind::text = any(c.applies_to))
  ) then raise exception 'A selected capability does not apply to this provider'; end if;

  delete from public.provider_registration_capabilities
  where provider_id = p_provider_id and not capability = any(coalesce(p_capabilities, '{}'));
  insert into public.provider_registration_capabilities (provider_id, capability, source, captured_by)
  select p_provider_id, capability, 'provider', auth.uid()
  from unnest(coalesce(p_capabilities, '{}')) capability
  on conflict (provider_id, capability) do update
    set source = 'provider', captured_by = auth.uid(), updated_at = now();
end;
$$;

create or replace function public.get_my_provider_declared_capabilities(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_provider_member(p_provider_id, 'profile.edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'key', r.capability, 'label', c.label, 'source', r.source,
      'captured_at', r.captured_at
    ) order by c.label)
    from public.provider_registration_capabilities r
    join public.capabilities c on c.key = r.capability
    where r.provider_id = p_provider_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.capture_provider_registration_capabilities(uuid, text[], uuid, text) from public;
revoke execute on function public.set_my_provider_declared_capabilities(uuid, text[]) from public;
revoke execute on function public.get_my_provider_declared_capabilities(uuid) from public;
grant execute on function public.set_my_provider_declared_capabilities(uuid, text[]),
  public.get_my_provider_declared_capabilities(uuid) to authenticated;
grant execute on function public.capture_provider_registration_capabilities(uuid, text[], uuid, text),
  public.set_my_provider_declared_capabilities(uuid, text[]),
  public.get_my_provider_declared_capabilities(uuid) to service_role;

notify pgrst, 'reload schema';
