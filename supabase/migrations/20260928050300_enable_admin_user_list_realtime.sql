-- Intentionally a no-op. The user list polls the server-side, PHI-masked API
-- instead of subscribing browser clients to raw user_profiles Realtime rows.
-- Retained because an earlier live migration with this timestamp was applied.
do $block$
begin
  null;
end;
$block$;
