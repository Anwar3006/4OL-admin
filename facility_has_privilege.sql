-- ============================================================================
-- RPC: facility_has_privilege
-- ============================================================================
-- Check if a facility has a specific privilege from its active subscription
-- Parameters:
--   p_facility_id: The facility UUID
--   p_privilege: The privilege to check (e.g., 'top_rated_placement')
-- Returns: boolean
-- ============================================================================

create or replace function facility_has_privilege(
  p_facility_id uuid,
  p_privilege text
)
returns boolean
language plpgsql
as $$
declare
  v_has_privilege boolean;
begin
  select exists(
    select 1
    from facility_subscriptions fs
    join marketing_subscriptions ms on fs.subscription_id = ms.id
    where fs.facility_id = p_facility_id
      and fs.status = 'active'
      and ms.privileges @> jsonb_build_array(p_privilege)
  ) into v_has_privilege;
  
  return coalesce(v_has_privilege, false);
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function facility_has_privilege to authenticated;