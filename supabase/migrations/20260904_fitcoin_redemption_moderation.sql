-- =============================================================================
-- FitCoins redemption moderation (Mapping Audit G2 gap-closure)
--
-- redeem_fitcoin_reward previously paid out instantly with no review step:
-- a real-world reward (coach call, protein pack, gift card) was granted the
-- moment a user had enough coins, with no fulfilment tracking and no way to
-- catch abuse before something physical shipped. Design: coins stay
-- deducted at request time (reserved), a redemption starts 'pending', an
-- admin approves/rejects it, and rejection refunds the coins. Approved
-- redemptions move to 'fulfilled' once ops has actually delivered the
-- reward.
-- =============================================================================

alter table public.fitcoin_rewards_redemption
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists rejection_reason text;

create index if not exists fitcoin_rewards_redemption_status_idx
  on public.fitcoin_rewards_redemption (status);

-- Admin-only (called from the Next.js API route with the service-role
-- client, gated by requireAdminApiUser("fitcoins.manage") — mirrors the
-- grant-to-service_role-only pattern used by notify_fitness).
create or replace function public.admin_review_fitcoin_redemption(
  p_redemption_id uuid,
  p_action text,
  p_admin_id uuid,
  p_reason text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_redemption record;
begin
  if p_action not in ('approve', 'reject', 'fulfill') then
    raise exception 'Invalid action %', p_action;
  end if;

  select * into v_redemption
  from public.fitcoin_rewards_redemption
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Redemption not found';
  end if;

  if p_action = 'approve' then
    if v_redemption.status <> 'pending' then
      raise exception 'Only pending redemptions can be approved (current status: %)', v_redemption.status;
    end if;
    update public.fitcoin_rewards_redemption
    set status = 'approved', reviewed_by = p_admin_id, reviewed_at = now()
    where id = p_redemption_id;

  elsif p_action = 'reject' then
    if v_redemption.status <> 'pending' then
      raise exception 'Only pending redemptions can be rejected (current status: %)', v_redemption.status;
    end if;
    -- Refund the reserved coins.
    perform public.award_fitcoins(
      v_redemption.user_id,
      v_redemption.cost_at_redemption,
      'reward_redemption_refund',
      p_redemption_id
    );
    update public.fitcoin_rewards_redemption
    set status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), rejection_reason = p_reason
    where id = p_redemption_id;

  elsif p_action = 'fulfill' then
    if v_redemption.status <> 'approved' then
      raise exception 'Only approved redemptions can be marked fulfilled (current status: %)', v_redemption.status;
    end if;
    update public.fitcoin_rewards_redemption
    set status = 'fulfilled', fulfilled_at = now()
    where id = p_redemption_id;
  end if;

  return json_build_object(
    'id', p_redemption_id,
    'status', (select status from public.fitcoin_rewards_redemption where id = p_redemption_id)
  );
end;
$function$;

revoke all on function public.admin_review_fitcoin_redemption(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_review_fitcoin_redemption(uuid, text, uuid, text) to service_role;
