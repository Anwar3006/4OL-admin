-- =============================================================================
-- Read-only pg_proc signature reader for the mobile-contract test.
--
-- tests/contract/rpc-signatures.test.ts compares the live signatures of the 28
-- RPCs the Expo app calls against a checked-in snapshot. supabase-js cannot
-- run arbitrary SQL, and probing each function by CALLING it is not an option:
-- several are volatile and would write rows to production
-- (join_fitness_challenge, redeem_fitcoin_reward, log_manual_activity, the
-- increment_* family).
--
-- So: one narrow, read-only function over pg_proc. Service role only.
-- =============================================================================

create or replace function public.contract_rpc_signatures(p_names text[])
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select coalesce(
    jsonb_object_agg(
      p.proname,
      jsonb_build_object(
        'args', pg_get_function_identity_arguments(p.oid),
        'returns', pg_get_function_result(p.oid),
        'security_definer', p.prosecdef,
        'volatility', case p.provolatile
                        when 'i' then 'immutable'
                        when 's' then 'stable'
                        else 'volatile'
                      end
      )
    ),
    '{}'::jsonb
  )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = any(p_names);
$function$;

comment on function public.contract_rpc_signatures(text[]) is
  'Read-only pg_proc signature reader for the mobile-contract test. Never call the contracted RPCs directly to probe them - several are volatile and would mutate production data.';

revoke all on function public.contract_rpc_signatures(text[]) from public, anon, authenticated;
